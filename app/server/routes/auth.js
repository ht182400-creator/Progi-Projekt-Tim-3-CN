const express = require('express');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../config/email');
const fs = require('fs');
const path = require('path');
const verifyToken = require("../middleware/verifyToken");
const { OAuth2Client } = require("google-auth-library");
const { upload, compressImage } = require('../middleware/upload');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Ažurirajte putanju ovisno o strukturi!
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'verification.html');
let verificationTemplate;
try {
    verificationTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch (e) {
    console.error('FATALNA GREŠKA: Ne mogu učitati email predložak:', TEMPLATE_PATH);
}

//CookieOptions kada korisnik stisne zapamti me kod login-a
const cookieOptionsRemember = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, //30 dana
}

//CookieOptions kada korisnike ne zeli zapamceni login
const cookieOptionsNoRemember = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
}

//generira JWT token za login
const generateLoginToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    })
}

//generira JWT token za privremeno spremanje email i password_hash
const generateVerifyToken = (email, password_hash) => {
    return jwt.sign(
        { email, password_hash },
        process.env.VERIFY_SECRET,
        { expiresIn: '10m' }
    );
};

//generira JWT token za reset password
const generateResetPassToken = (id, email) => {
    return jwt.sign(
        { id, email },
        process.env.RESET_SECRET,
        { expiresIn: '10m' }
    );
};

//provjerava ispravan unos emaila
function isEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

//provjera ispravnog unosa lozinke
function isPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,32}$/;
    return passwordRegex.test(password);
}


// RUTA 1: UNOS EMAILA I LOZINKE, SLANJE EMAIL VERIFIKACIJE
router.post('/register', async (req, res) => {
    const { email, password, passwordCheck, termsAndConditions} = req.body;

    if (!email || !isEmail(email)) {
        return res.status(400).json({ message: 'Molimo unesite ispravnu email adresu.' });
    }

    if(!password || !isPassword(password)) {
        return res.status(400).json({message: "Lozinka mora imati 8-32 znakova, veliko i malo slovo, broj i specijalni znak."});
    }

    if (!passwordCheck || password !== passwordCheck) {
        return res.status(400).json({ message: 'Lozinke se ne podudaraju.' });
    }

    if (!termsAndConditions) {
        return res.status(400).json({message: "moras prihvatiti TaC"});
    }

    //provjera postoji li email u users
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userExists.rows.length > 0 ) {
        return res.status(400).json({ message: 'Korisnik s ovim emailom već postoji.' });
    }

    //password hash
    const password_hash = await bcrypt.hash(password, 12);

    //token za verifikaciju maila i spremanje emaila i passworda privremeno
    const token = generateVerifyToken(email, password_hash);

    //link za verifikaciju
    const verificationLink = `${process.env.FRONTEND_URL}/api/auth/verify-token?token=${token}`;
    const emailHtml = verificationTemplate.replace(/{{verificationLink}}/g, verificationLink);

    //saljemo email
    const sent = await sendEmail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Potvrda Registracije | Fertutor.xyz',
        html: emailHtml
    });

    //provjera slanja emaila
    if(!sent) {
        return res.status(500).json({message: "slanje emaila neuspjesno"});
    }

    return res.status(202).json({ message: 'Link za potvrdu poslan je na vaš email. Molimo provjerite sandučić.' });
});


// RUTA 2: PROVJERA TOKENA I POTVRDA EMAILA
router.get('/verify-token', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'Token nije pronađen.' });
    }

    //provjera token, ako je token dobar idemo na zadnji dio registracije
    try {
        jwt.verify(token, process.env.VERIFY_SECRET);
        return res.redirect(`${process.env.FRONTEND_URL}/finish-register?token=${token}`);
    } catch (err) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
    }
});


// RUTA 3: FINALIZACIJA REGISTRACIJE (POSTAVLJANJE LOZINKE I DETALJA)
router.post('/finish-register', upload.single('profileImage'), async (req, res) => {
    const { token, name, surname, date_of_birth, sex, is_professor, city, education } = req.body;

    //pretvaranje u boolean
    const isProfessor =
        req.body.is_professor === true ||
        req.body.is_professor === 'true';

    //provjere
    if (!token) return res.status(400).json({message: "Istekao token"});
    if (!name || !surname || !date_of_birth || !sex || typeof is_professor === "undefined" || !city || !education) {
        return res.status(400).json({ message: 'Molimo unesite podatke u sva polja.' });
    }

    //provjera valjanosti datuma rođenja
    const dob = new Date(date_of_birth);
    const today = new Date();

    dob.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(dob.getTime()) || dob > today) {
        return res.status(400).json({ message: 'Unesite valjani datum rođenja.' });
    }

    //dohvacanje podataka emaila i hash passworda
    let parsed;
    try {
        parsed = jwt.verify(token, process.env.VERIFY_SECRET);
    }
    catch (err) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    //slika za profil
    const profilePicture = req.file ? req.file.filename : null;

    // Komprimiraj sliku ako postoji
    if (profilePicture) {
        const filePath = path.join(__dirname, '../uploads/profiles', profilePicture);
        await compressImage(filePath);
    }

    //upis u bazu users
    await pool.query('INSERT INTO  users (email, password_hash, is_professor, name, surname, profile_picture) VALUES ($1, $2, $3, $4, $5, $6)',
        [parsed.email, parsed.password_hash, is_professor, name, surname, profilePicture]);

    //id novog usera
    const id = await pool.query('SELECT id FROM users WHERE email = $1', [parsed.email]);
    const user_id = id.rows[0].id;

    //upis u baze professors ili students
    if (isProfessor) {
        await pool.query('INSERT INTO  professors (user_id, sex, city, teaching, date_of_birth) VALUES ($1, $2, $3, $4, $5)',
            [user_id, sex, city, education, date_of_birth]);
    } else if (!isProfessor) {
        await pool.query('INSERT INTO  students (user_id, sex, city, education, date_of_birth) VALUES ($1, $2, $3, $4, $5)',
            [user_id, sex, city, education, date_of_birth]);
    }

    //generiramo token da user ostane loginan
    const loginToken = generateLoginToken(user_id);
    res.cookie('token', loginToken, cookieOptionsNoRemember);

    return res.status(200).json({message: "Profil je dovršen!"});
});

//opcionalno dodavanje interesa kod registracije
router.post('/register-interests', verifyToken, async (req, res) => {
    const { interests } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(interests)) {
        return res.status(400).json({ message: "Neispravan format interesa." });
    }

    if (interests.length === 0) {
        return res.status(200).json({message: "Interesi preskočeni."});
    }

    try {
        const dbInterests = await pool.query(
            `SELECT id FROM interests WHERE name = ANY($1::text[])`,
            [interests]
        );

        // Fixed SQL injection - use parameterized queries
        if (dbInterests.rows.length > 0) {
            const insertPromises = dbInterests.rows.map(i => 
                pool.query(
                    `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [userId, i.id]
                )
            );
            await Promise.all(insertPromises);
        }

        return res.status(200).json({ message: "Interesi spremljeni." });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Greška pri spremanju interesa." });
    }
});

//login
router.post('/login', async (req, res) => {
    const { email, password, rememberLogin } = req.body;

    if (!email || !password) {
        return res.status(400).json({message: 'Molimo upišite podatke u sva polja'});
    }

    //provjera postoji li korisnik
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        return res.status(400).json({message: 'Ne postoji korisnik s tim emailom'});
    }

    //podaci o useru
    const userData = user.rows[0];

    //provjera jeli upisana lozinka tocna
    const isMatch = await bcrypt.compare(password, userData.password_hash);
    if (!isMatch) {
        return res.status(400).json({message: 'Krivi podaci za login'});
    }

    // Check if user is suspended
    if (userData.is_suspended) {
        return res.status(403).json({message: 'Vaš račun je suspendiran. Kontaktirajte administratora.'});
    }

    //generiramo token da user ostane loginan
    const token = generateLoginToken(userData.id);
    if (rememberLogin) {
        res.cookie('token', token, cookieOptionsRemember);
    }
    else {
        res.cookie('token', token, cookieOptionsNoRemember);
    }

    return res.status(200).json({
        message: 'uspjesan login',
        user: {
            email: userData.email,
            name: userData.name,
            surname: userData.surname,
            is_professor: userData.is_professor,
            is_admin: userData.is_admin,
            profile_picture: userData.profile_picture
        }
    });

});

//logout
router.post('/logout',  (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    return res.json({ message: 'Uspjesan logout' });
});

//me
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, email, name, surname, is_professor, is_admin, is_suspended, profile_picture FROM users WHERE id = $1', [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ message: 'Korisnik nije pronađen' });
        
        // Check if user is suspended
        if (user.rows[0].is_suspended) {
            res.clearCookie('token');
            return res.status(403).json({ message: 'Vaš račun je suspendiran.' });
        }
        
        res.json({ user: user.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Greška na serveru' });
    }
});

//slanje maila za forgot password korisniku na email
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;

    //provjera ispravnosti emaila
    if (!email || !isEmail(email)) {
        return res.status(400).json({ message: 'Unesite ispravnu email adresu.' });
    }

    //provjera postoji li korisnik
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        return res.status(200).json({message: 'Ako postoji korisnik, poslan je email'});
    }

    //podaci o useru
    const userData = user.rows[0];

    //generiramo token i link
    const resetPassToken = generateResetPassToken(userData.id, email);
    const resetLink = `${process.env.FRONTEND_URL}/api/auth/verify-reset-token?token=${resetPassToken}`;

    //ucitava html template
    const resetTemplatePath = path.join(__dirname, '..', 'templates', 'reset_password.html');
    let resetHtml = fs.readFileSync(resetTemplatePath, 'utf8');
    resetHtml = resetHtml.replace(/{{resetLink}}/g, resetLink);

    //slanje emaila
    const sent = await sendEmail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Resetiranje lozinke | Fertutor.xyz",
        html: resetHtml
    });

    //provjera greške pri slanju
    if (!sent) {
        return res.status(500).json({ message: "Greška pri slanju emaila." });
    }

    return res.status(200).json({
        message: "Ako postoji korisnik, poslan je email"
    });
})

//verifikacija tokena za reset password email
router.get('/verify-reset-token', async (req, res) => {
    const { token } = req.query;

    if (!token) return res.status(400).json({ message: "Token nije pronađen." });

    //ako je token ispravan onda redirecta na /reset-password
    try {
        const decoded = jwt.verify(token, process.env.RESET_SECRET);
        return res.redirect(`${process.env.FRONTEND_URL}/reset-password?token=${token}`);
    } catch (err) {
        return res.status(400).json({ valid: false, message: "Token istekao ili neispravan." });
    }
});

//resetiranje passworda
router.post('/reset-password', async (req, res) => {
    const { token, password, passwordCheck } = req.body;

    //provjera jeli token dobar
    if (!token) return res.status(400).json({ message: "Token nedostaje." });
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.RESET_SECRET);
    } catch (err) {
        return res.status(400).json({ message: "Token istekao ili neispravan." });
    }

    //provjera ispravnosti unesenih lozinka
    if(!password || !isPassword(password)) {
        return res.status(400).json({message: "Lozinka mora imati 8-32 znakova, veliko i malo slovo, broj i specijalni znak."});
    }
    if (!passwordCheck || password !== passwordCheck) {
        return res.status(400).json({ message: 'Lozinke se ne podudaraju.' });
    }

    //mijenjamo novi password u bazi
    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        [hashed, decoded.id]
    );

    return res.status(200).json({ message: "Lozinka uspješno promijenjena." });
});

//GOOGLE LOGIN
router.post('/google-login', async (req, res) => {
    const { credential } = req.body;

    //provjera postoji li credential
    if(!credential) return res.status(400).json({message: "credential nedostaje"});


    try {
        //verifikacija tokena credential
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        /*const name = payload.given_name || 'Google Name';         zadas se ne koristi
        const surname = payload.family_name || 'Google Surname';
        const profilePic = payload.picture;*/

        //provjera postoji li korisnik
        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        //ako korisnik ne postoji, registriraj ga
        if (user.rows.length === 0) {
            //random password
            const tempPassword = crypto.randomBytes(16).toString('hex');
            const password_hash = await bcrypt.hash(tempPassword, 12);

            //token za spremanje emaila i passworda privremeno
            const token = generateVerifyToken(email, password_hash);

            //flag za frontend da preusmjeri na finish register
            return res.status(200).json({
                needsFinishRegistration: true,
                token
            });
        }

        //dohvacamo podatke o useru
        const userData = user.rows[0];

        // Check if user is suspended
        if (userData.is_suspended) {
            return res.status(403).json({message: 'Vaš račun je suspendiran. Kontaktirajte administratora.'});
        }

        //generiramo token za login
        const token = generateLoginToken(userData.id);
        res.cookie('token', token, cookieOptionsNoRemember);

        return res.status(200).json({
            message: 'Uspješan login putem Googlea',
            user: {
                email: userData.email,
                name: userData.name,
                surname: userData.surname,
                is_professor: userData.is_professor,
                is_admin: userData.is_admin
            }
        });

    } catch (err) {
        return res.status(400).json({message: "Neispravan Google ID token"});
    }
})

module.exports = router;
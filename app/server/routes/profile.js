const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/verifyToken');
const { upload, deleteOldImage } = require('../middleware/upload');

router.get('/', verifyToken, async (req, res) => {
    try{
        const result = await pool.query('SELECT id, name, surname, email, is_professor, profile_picture FROM users WHERE id = $1', [req.user.id]);

        if(result.rows.length === 0){
            return res.status(404).json({message: 'Korisnik ne postoji'});
        }

        const user = result.rows[0];
        let profile = {};

        if(user.is_professor){
            const resP = await pool.query(
                'SELECT sex, city, teaching, date_of_birth, biography, video_url, reference, teaching_type, is_published FROM professors WHERE user_id = $1',
                [req.user.id]
            );
            profile = resP.rows[0] ?? {};
        }
        else{
            const resS = await pool.query(
                'SELECT sex, city, education, date_of_birth FROM students WHERE user_id = $1',
                [req.user.id]
            );
            profile = resS.rows[0] ?? {};
        }

        return res.json({
            ...user,
            profile
        });

    }catch(err){
        console.error('error while fetching profile', err);
        res.status(500).json({message: 'server je u kurcu'});
    }
});

router.post('/update', verifyToken, async (req, res) => {
    try{
        const userId = req.user.id;
        const {name, surname, email, sex, city, education, teaching, is_professor, date_of_birth} = req.body;

        if(!name || !surname || !email || is_professor === null){
            return res.status(400).json({message: 'sva obavezna polja nisu ispunjena'});
        }

        await pool.query(
            'UPDATE users SET name = $1, surname = $2, email = $3, is_professor = $4 WHERE id = $5',
            [name, surname, email, is_professor, userId]
        );

        if(is_professor){
            await pool.query(
                'UPDATE professors SET sex = $1, city = $2, teaching = $3, date_of_birth = $4 WHERE user_id=$5',
                [sex, city, teaching, date_of_birth, userId]
            );
        }else {
            await pool.query(
                'UPDATE students SET sex = $1, city = $2, education = $3, date_of_birth = $4 WHERE user_id=$5',
                [sex, city, education, date_of_birth, userId]
            );
        }

        res.json({message: 'sve stima'});

    }catch(err){
        console.error('error while updating user', err);
        res.status(500).json({message: 'server je zeznut'});
    }
});

router.post('/upload-image', verifyToken, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Niste odabrali sliku' });
        }

        const userId = req.user.id;
        const newFilename = req.file.filename;

        const oldImageResult = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [userId]);
        const oldImage = oldImageResult.rows[0]?.profile_picture;

        await pool.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [newFilename, userId]);

        if (oldImage) {
            deleteOldImage(oldImage);
        }

        res.json({ message: 'Slika uspješno uploadana', filename: newFilename });
    } catch (err) {
        console.error('Error uploading image:', err);
        res.status(500).json({ message: 'Greška pri uploadu slike' });
    }
});

router.delete('/delete-image', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [userId]);
        const filename = result.rows[0]?.profile_picture;

        if (!filename) {
            return res.status(404).json({ message: 'Nema slike za brisanje' });
        }

        await pool.query('UPDATE users SET profile_picture = NULL WHERE id = $1', [userId]);
        deleteOldImage(filename);

        res.json({ message: 'Slika uspješno obrisana' });
    } catch (err) {
        console.error('Error deleting image:', err);
        res.status(500).json({ message: 'Greška pri brisanju slike' });
    }
});

// GET current user interests
router.get("/interests", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.name
            FROM user_interests ui
            JOIN interests i ON i.id = ui.interest_id
            WHERE ui.user_id = $1
        `, [req.user.id]);

        res.json(result.rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ message: "Greška kod dohvaćanja interesa" });
    }
});

//update interests
router.post("/interests", verifyToken, async (req, res) => {
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
        return res.status(400).json({ message: "Neispravan format interesa" });
    }

    try {
        await pool.query(
            "DELETE FROM user_interests WHERE user_id = $1",
            [req.user.id]
        );

        if (interests.length > 0) {
            const dbInterests = await pool.query(
                `SELECT id FROM interests WHERE name = ANY($1::text[])`,
                [interests]
            );

            // Fixed SQL injection - use parameterized queries
            if (dbInterests.rows.length > 0) {
                const insertPromises = dbInterests.rows.map(i => 
                    pool.query(
                        `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2)`,
                        [req.user.id, i.id]
                    )
                );
                await Promise.all(insertPromises);
            }
        }

        res.json({ message: "Interesi spremljeni" });
    } catch (err) {
        res.status(500).json({ message: "Greška kod spremanja interesa" });
    }
});

//mjenjanje podataka za javni profil profesora
router.post("/public", verifyToken, async (req, res) => {
    try {
        // Verify user is actually a professor
        const userCheck = await pool.query(
            'SELECT is_professor FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (!userCheck.rows[0]?.is_professor) {
            return res.status(403).json({ message: "Samo profesori mogu ažurirati javni profil" });
        }

        const {
            biography,
            video_url,
            reference,
            teaching_type
        } = req.body;

        await pool.query(`
            UPDATE professors
            SET biography = $1,
                video_url = $2,
                reference = $3,
                teaching_type = $4
            WHERE user_id = $5
        `, [
            biography,
            video_url,
            reference,
            teaching_type,
            req.user.id
        ]);

        res.json({ message: "Javni profil ažuriran" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod spremanja javnog profila" });
    }
});

// Toggle public profile
router.post("/public/publish", verifyToken, async (req, res) => {
    try {
        const { publish } = req.body; // očekuje true/false
        if (typeof publish !== "boolean") {
            return res.status(400).json({ message: "Neispravan format" });
        }

        await pool.query(
            "UPDATE professors SET is_published = $1 WHERE user_id = $2",
            [publish, req.user.id]
        );

        res.json({ message: publish ? "Profil je objavljen" : "Profil je skriven", is_published: publish });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod ažuriranja publikacije profila" });
    }
});

module.exports = router;
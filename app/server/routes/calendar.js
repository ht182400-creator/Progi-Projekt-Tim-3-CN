const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyTokenOptional = require("../middleware/verifyTokenOptional");

// Generate unique Jitsi meeting URL and password
const generateMeetingCredentials = (slotId) => {
    const roomId = crypto.randomBytes(8).toString('hex');
    const password = crypto.randomBytes(3).toString('hex'); // 6 char password
    const meetingUrl = `https://meet.jit.si/fertutor-${slotId}-${roomId}`;
    return { meetingUrl, password };
};

const requireProfessor = async (userId) => {
    const result = await pool.query(
        "SELECT is_professor FROM users WHERE id = $1",
        [userId]
    );
    return result.rows[0]?.is_professor === true;
};

const requireStudent = async (userId) => {
    const result = await pool.query(
        "SELECT is_professor FROM users WHERE id = $1",
        [userId]
    );
    return result.rows[0]?.is_professor === false;
};

// Create availability slot (professor)
router.post("/slots", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            start_time,
            end_time,
            capacity,
            teaching_type,
            price,
            location,
            lesson_type,
            interest_id
        } = req.body;

        if (!lesson_type || !['1na1', 'Grupno'].includes(lesson_type)) {
            return res.status(400).json({ message: "Neispravan tip predavanja." });
        }

        let finalCapacity = 1;

        if (lesson_type === "1na1") {
            finalCapacity = 1;
        } else {
            if (!interest_id) {
                return res.status(400).json({ message: "Predmet je obavezan za grupnu nastavu." });
            }

            finalCapacity = Number(capacity);
            if (!Number.isInteger(finalCapacity) || finalCapacity < 2) {
                return res.status(400).json({
                    message: "Kapacitet za grupnu nastavu mora biti ≥ 2."
                });
            }

            // Provjera da instruktor ima taj predmet
            const interestCheck = await pool.query(
                `SELECT 1
         FROM user_interests
         WHERE user_id = $1 AND interest_id = $2`,
                [userId, interest_id]
            );

            if (interestCheck.rows.length === 0) {
                return res.status(403).json({
                    message: "Nemate pravo predavati odabrani predmet."
                });
            }
        }

        // Dohvati teaching_type instruktora iz profila
        const profResult = await pool.query(
            "SELECT teaching_type FROM professors WHERE user_id = $1",
            [userId]
        );

        const profileTeachingType = profResult.rows[0]?.teaching_type;

        if (!profileTeachingType) {
            return res.status(400).json({ message: "Instruktor nema definiran tip predavanja u profilu." });
        }

        // Provjera da li je odabrani termin dopušten
        if (
            (profileTeachingType === "Uživo" && teaching_type !== "Uživo") ||
            (profileTeachingType === "Online" && teaching_type !== "Online")
        ) {
            return res.status(403).json({
                message: `Ne možete kreirati termin tipa ${teaching_type}. Vaš profil dopušta samo ${profileTeachingType}.`
            });
        }

        if (!start_time || !end_time || !teaching_type || price == null) {
            return res.status(400).json({ message: "Nedostaju obavezni podaci termina." });
        }

        if (teaching_type === "Uživo" && !location) {
            return res.status(400).json({ message: "Lokacija je obavezna za uživo nastavu." });
        }

        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu kreirati termine." });
        }

        const overlap = await pool.query(
            `SELECT 1
             FROM professor_slots
             WHERE professor_id = $1
               AND start_time < $3
               AND end_time > $2
             LIMIT 1`,
            [userId, start_time, end_time]
        );

        if (overlap.rows.length > 0) {
            return res.status(409).json({ message: "Termin se preklapa s postojećim." });
        }

        const result = await pool.query(
            `INSERT INTO professor_slots
             (professor_id, start_time, end_time, capacity, teaching_type, price, location, lesson_type, interest_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 RETURNING *`,
            [
                userId,
                start_time,
                end_time,
                finalCapacity,
                teaching_type,
                price,
                teaching_type === "Uživo" ? location : null,
                lesson_type,
                lesson_type === "Grupno" ? interest_id : null
            ]
        );

        res.status(201).json({ slot: result.rows[0] });
    } catch (err) {
        console.error("Error creating slot:", err);
        res.status(500).json({ message: "Greška pri kreiranju termina." });
    }
});

// List public slots for a professor (available only)
router.get("/slots/:professorId", verifyTokenOptional, async (req, res) => {
    try {
        const { professorId } = req.params;
        const includeBooked = req.query.includeBooked === "true";

        const userId = req.user?.id || null;

        const result = await pool.query(
            `
            SELECT
                s.id,
                s.start_time,
                s.end_time,
                s.capacity,
                s.teaching_type,
                s.lesson_type,
                s.price,
                s.location,
                i.name AS interest_name,
                COUNT(b.id) AS booked_count,
                (b_me.id IS NOT NULL) AS is_booked_by_me
            FROM professor_slots s
            LEFT JOIN professor_slot_bookings b ON b.slot_id = s.id
            LEFT JOIN professor_slot_bookings b_me
                ON b_me.slot_id = s.id
               AND b_me.student_id = $2
            LEFT JOIN interests i ON i.id = s.interest_id
            WHERE s.professor_id = $1
              AND s.start_time >= NOW()
            GROUP BY s.id, i.name, b_me.id
            ${includeBooked ? "" : "HAVING COUNT(b.id) < s.capacity"}
            ORDER BY s.start_time
            `,
            [professorId, userId]
        );

        res.json({ slots: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška pri dohvaćanju termina." });
    }
});

// List slots for current professor (includes booked info)
router.get("/my-slots", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu vidjeti termine." });
        }

        const result = await pool.query(
            `SELECT
                 s.id,
                 s.start_time,
                 s.end_time,
                 s.capacity,
                 s.teaching_type,
                 s.lesson_type,
                 s.price,
                 s.location,
                 s.meeting_url,
                 s.meeting_password,
                 i.name AS interest_name,
                 COUNT(b.id) AS booked_count
             FROM professor_slots s
                      LEFT JOIN professor_slot_bookings b ON b.slot_id = s.id
                      LEFT JOIN interests i ON i.id = s.interest_id
             WHERE s.professor_id = $1
               AND s.end_time > NOW()
             GROUP BY s.id, i.name
             ORDER BY s.start_time`,
            [userId]
        );

        res.json({ slots: result.rows });
    } catch (err) {
        console.error("Error fetching my slots:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju termina." });
    }
});

// Get slot details with students & notes (professor)
router.get("/slots/:slotId/details", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;

        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori imaju pristup." });
        }

        // Provjera da termin pripada profesoru
        const slotResult = await pool.query(
            `SELECT
                 s.id,
                 s.start_time,
                 s.end_time,
                 s.capacity,
                 s.teaching_type,
                 s.lesson_type,
                 s.price,
                 s.location,
                 i.name AS interest_name
             FROM professor_slots s
             LEFT JOIN interests i ON i.id = s.interest_id
             WHERE s.id = $1 AND s.professor_id = $2`,
            [slotId, userId]
        );

        if (slotResult.rows.length === 0) {
            return res.status(404).json({ message: "Termin nije pronađen." });
        }

        // Studenti + note
        const studentsResult = await pool.query(
            `SELECT
                 u.id,
                 u.name,
                 u.surname,
                 b.note,
                 b.booked_at
             FROM professor_slot_bookings b
             JOIN users u ON u.id = b.student_id
             WHERE b.slot_id = $1
             ORDER BY b.booked_at`,
            [slotId]
        );

        res.json({
            slot: slotResult.rows[0],
            students: studentsResult.rows
        });
    } catch (err) {
        console.error("Error fetching slot details:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju detalja termina." });
    }
});

// Delete available slot (professor)
router.delete("/slots/:slotId", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;

        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu brisati termine." });
        }

        const result = await pool.query(
            `DELETE FROM professor_slots
             WHERE id = $1
               AND professor_id = $2
               AND id NOT IN (
                 SELECT slot_id FROM professor_slot_bookings
               )`,
            [slotId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ message: "Termin nije moguće obrisati." });
        }

        res.json({ message: "Termin obrisan." });
    } catch (err) {
        console.error("Error deleting slot:", err);
        res.status(500).json({ message: "Greška pri brisanju termina." });
    }
});

// Book slot (student)
router.post("/book/:slotId", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;
        const { note, interest_id } = req.body;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo studenti mogu rezervirati termine." });
        }

        const slotResult = await pool.query(
            `SELECT s.capacity, COUNT(b.id) AS booked_count, s.lesson_type, s.interest_id AS slot_interest_id,
                    s.teaching_type, s.meeting_url
             FROM professor_slots s
             LEFT JOIN professor_slot_bookings b ON b.slot_id = s.id
             WHERE s.id = $1
             GROUP BY s.id`,
            [slotId]
        );

        if (slotResult.rows.length === 0) {
            return res.status(404).json({ message: "Termin nije pronađen." });
        }

        const { capacity, booked_count, lesson_type, slot_interest_id, teaching_type, meeting_url } = slotResult.rows[0];
        if (Number(booked_count) >= Number(capacity)) {
            return res.status(409).json({ message: "Termin je popunjen." });
        }

        // Za grupne termine student ne bira predmet
        const finalInterestId = lesson_type === "Grupno" ? slot_interest_id : interest_id;

        if (!finalInterestId) {
            return res.status(400).json({ message: "Predmet je obavezan." });
        }

        // Generate Jitsi meeting URL for Online sessions (only on first booking)
        let finalMeetingUrl = meeting_url;
        let finalMeetingPassword = null;
        if (teaching_type === "Online" && !meeting_url) {
            const credentials = generateMeetingCredentials(slotId);
            finalMeetingUrl = credentials.meetingUrl;
            finalMeetingPassword = credentials.password;

            await pool.query(
                `UPDATE professor_slots SET meeting_url = $1, meeting_password = $2 WHERE id = $3`,
                [finalMeetingUrl, finalMeetingPassword, slotId]
            );
        }

        await pool.query(
            `INSERT INTO professor_slot_bookings (slot_id, student_id, note, interest_id)
             VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING`,
            [slotId, userId, note || null, finalInterestId]
        );

        res.json({
            message: "Termin rezerviran.",
            meeting_url: finalMeetingUrl,
            meeting_password: finalMeetingPassword
        });
    } catch (err) {
        console.error("Error booking slot:", err);
        res.status(500).json({ message: "Greška pri rezervaciji termina." });
    }
});

// Cancel booking (student)
router.delete("/book/:slotId", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo studenti mogu otkazati termine." });
        }

        const result = await pool.query(
            `DELETE FROM professor_slot_bookings
             WHERE slot_id = $1 AND student_id = $2
             RETURNING id`,
            [slotId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Termin nije moguće otkazati." });
        }

        res.json({ message: "Termin otkazan." });
    } catch (err) {
        console.error("Error cancelling booking:", err);
        res.status(500).json({ message: "Greška pri otkazivanju termina." });
    }
});

// List bookings for current student
router.get("/my-bookings", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo studenti mogu vidjeti rezervacije." });
        }

        const result = await pool.query(
            `SELECT
                 b.id,
                 s.id AS slot_id,
                 s.start_time,
                 s.end_time,
                 s.teaching_type,
                 s.lesson_type,
                 s.price,
                 s.location,
                 s.meeting_url,
                 s.meeting_password,
                 s.professor_id,
                 u.name AS professor_name,
                 u.surname AS professor_surname,
                 i.id AS interest_id,
                 i.name AS interest_name
             FROM professor_slot_bookings b
                      JOIN professor_slots s ON s.id = b.slot_id
                      JOIN users u ON u.id = s.professor_id
                      JOIN interests i ON i.id = b.interest_id
             WHERE b.student_id = $1
             ORDER BY s.start_time`,
            [userId]
        );


        res.json({ bookings: result.rows });
    } catch (err) {
        console.error("Error fetching bookings:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju rezervacija." });
    }
});

// Get booking details (student)
router.get("/bookings/:bookingId/details", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo studenti imaju pristup." });
        }

        const result = await pool.query(
            `SELECT
                 b.id,
                 b.note,
                 b.booked_at,
                 s.start_time,
                 s.end_time,
                 s.teaching_type,
                 s.lesson_type,
                 s.price,
                 s.location,
                 i.name AS interest_name,
                 u.name AS professor_name,
                 u.surname AS professor_surname
             FROM professor_slot_bookings b
             JOIN professor_slots s ON s.id = b.slot_id
             JOIN users u ON u.id = s.professor_id
             JOIN interests i ON i.id = b.interest_id
             WHERE b.id = $1 AND b.student_id = $2`,
            [bookingId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Rezervacija nije pronađena." });
        }

        res.json({ booking: result.rows[0] });
    } catch (err) {
        console.error("Error fetching booking details:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju detalja rezervacije." });
    }
});

// Get interests for current user (professor or student)
router.get("/my-interests", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT i.id, i.name
             FROM user_interests ui
             JOIN interests i ON i.id = ui.interest_id
             WHERE ui.user_id = $1
             ORDER BY i.name`,
            [userId]
        );

        res.json({ interests: result.rows });
    } catch (err) {
        console.error("Error fetching user interests:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju predmeta." });
    }
});

// Update booking note (student)
router.patch("/bookings/:bookingId/note", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const { note } = req.body;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo studenti mogu uređivati napomenu." });
        }

        if (note && note.length > 500) {
            return res.status(400).json({ message: "Napomena je predugačka." });
        }

        const result = await pool.query(
            `UPDATE professor_slot_bookings
             SET note = $1
             WHERE id = $2 AND student_id = $3
             RETURNING note`,
            [note || null, bookingId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Rezervacija nije pronađena." });
        }

        res.json({ note: result.rows[0].note });
    } catch (err) {
        console.error("Error updating note:", err);
        res.status(500).json({ message: "Greška pri spremanju napomene." });
    }
});

module.exports = router;

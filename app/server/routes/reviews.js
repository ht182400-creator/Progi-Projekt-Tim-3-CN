const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyTokenOptional = require("../middleware/verifyTokenOptional");

// Get all reviews for an instructor (public)
router.get("/instructor/:instructorId", verifyTokenOptional, async (req, res) => {
    try {
        const { instructorId } = req.params;

        const query = `
            SELECT 
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                u.name AS student_name,
                u.surname AS student_surname,
                u.profile_picture AS student_picture
            FROM reviews r
            JOIN users u ON u.id = r.student_id
            WHERE r.professor_id = $1
            ORDER BY r.created_at DESC
        `;

        const result = await pool.query(query, [instructorId]);

        // Calculate average rating
        const avgQuery = `
            SELECT 
                COALESCE(AVG(rating), 0) AS average_rating,
                COUNT(*) AS total_reviews
            FROM reviews 
            WHERE professor_id = $1
        `;
        const avgResult = await pool.query(avgQuery, [instructorId]);

        res.json({
            reviews: result.rows,
            average_rating: parseFloat(avgResult.rows[0].average_rating).toFixed(1),
            total_reviews: parseInt(avgResult.rows[0].total_reviews)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod dohvaćanja recenzija" });
    }
});

// Check if current user can review an instructor (has completed lesson, hasn't reviewed yet)
router.get("/can-review/:instructorId", verifyToken, async (req, res) => {
    try {
        const { instructorId } = req.params;
        const studentId = req.user.id;

        // Check if student already reviewed this instructor
        const existingReview = await pool.query(
            "SELECT id FROM reviews WHERE professor_id = $1 AND student_id = $2",
            [instructorId, studentId]
        );

        if (existingReview.rows.length > 0) {
            return res.json({
                can_review: false,
                already_reviewed: true
            });
        }

        // Check if student has at least one completed lesson with this instructor
        const completedLesson = await pool.query(`
            SELECT 1
            FROM professor_slot_bookings psb
            JOIN professor_slots ps ON ps.id = psb.slot_id
            WHERE psb.student_id = $1
              AND ps.professor_id = $2
              AND ps.end_time < NOW()
            LIMIT 1
        `, [studentId, instructorId]);

        res.json({
            can_review: completedLesson.rows.length > 0,
            already_reviewed: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod provjere mogućnosti recenzije" });
    }
});

// Submit a review (1 review per student per instructor)
router.post("/", verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const { professor_id, rating, comment } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Ocjena mora biti između 1 i 5" });
        }

        if (!professor_id) {
            return res.status(400).json({ message: "ID instruktora je obavezan" });
        }

        // Check if student already reviewed this instructor
        const existingReview = await pool.query(
            "SELECT id FROM reviews WHERE professor_id = $1 AND student_id = $2",
            [professor_id, studentId]
        );

        if (existingReview.rows.length > 0) {
            return res.status(400).json({ message: "Već ste ostavili recenziju za ovog instruktora" });
        }

        // Verify student has at least one completed lesson with this instructor
        const completedLesson = await pool.query(`
            SELECT psb.id
            FROM professor_slot_bookings psb
            JOIN professor_slots ps ON ps.id = psb.slot_id
            WHERE psb.student_id = $1
              AND ps.professor_id = $2
              AND ps.end_time < NOW()
            LIMIT 1
        `, [studentId, professor_id]);

        if (completedLesson.rows.length === 0) {
            return res.status(403).json({ message: "Možete ostaviti recenziju samo nakon završenog termina s ovim instruktorom" });
        }

        // Insert the review (without booking_id - 1 review per student per instructor)
        const insertQuery = `
            INSERT INTO reviews (professor_id, student_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;

        await pool.query(insertQuery, [
            professor_id,
            studentId,
            rating,
            comment || null
        ]);

        res.status(201).json({ message: "Recenzija uspješno dodana!" });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: "Već ste ostavili recenziju za ovog instruktora" });
        }
        res.status(500).json({ message: "Greška kod dodavanja recenzije" });
    }
});

// Get my reviews (for instructors to see in their profile)
router.get("/my-reviews", verifyToken, async (req, res) => {
    try {
        const instructorId = req.user.id;

        const query = `
            SELECT 
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                u.name AS student_name,
                u.surname AS student_surname,
                u.profile_picture AS student_picture
            FROM reviews r
            JOIN users u ON u.id = r.student_id
            WHERE r.professor_id = $1
            ORDER BY r.created_at DESC
        `;

        const result = await pool.query(query, [instructorId]);

        // Calculate average rating
        const avgQuery = `
            SELECT 
                COALESCE(AVG(rating), 0) AS average_rating,
                COUNT(*) AS total_reviews
            FROM reviews 
            WHERE professor_id = $1
        `;
        const avgResult = await pool.query(avgQuery, [instructorId]);

        res.json({
            reviews: result.rows,
            average_rating: parseFloat(avgResult.rows[0].average_rating).toFixed(1),
            total_reviews: parseInt(avgResult.rows[0].total_reviews)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod dohvaćanja recenzija" });
    }
});

// Delete own review
router.delete("/:reviewId", verifyToken, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const studentId = req.user.id;

        const result = await pool.query(
            "DELETE FROM reviews WHERE id = $1 AND student_id = $2 RETURNING id",
            [reviewId, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Recenzija nije pronađena ili nemate pravo za brisanje" });
        }

        res.json({ message: "Recenzija uspješno obrisana" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod brisanja recenzije" });
    }
});

module.exports = router;

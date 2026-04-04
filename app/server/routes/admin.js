const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

// Middleware to check if user is admin
const verifyAdmin = async (req, res, next) => {
    try {
        const result = await pool.query(
            "SELECT is_admin FROM users WHERE id = $1",
            [req.user.id]
        );
        
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            return res.status(403).json({ message: "Pristup odbijen. Potrebne su administratorske ovlasti." });
        }
        
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška servera" });
    }
};

// ==================== USERS MANAGEMENT ====================

// Get all users with their details
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { search, role, status } = req.query;
        
        let query = `
            SELECT 
                u.id,
                u.email,
                u.name,
                u.surname,
                u.is_professor,
                u.is_admin,
                u.is_suspended,
                u.created_at,
                u.profile_picture,
                CASE WHEN u.is_professor THEN p.is_verified ELSE NULL END as is_verified,
                CASE WHEN u.is_professor THEN p.is_published ELSE NULL END as is_published,
                CASE WHEN u.is_professor THEN p.city ELSE s.city END as city
            FROM users u
            LEFT JOIN professors p ON u.id = p.user_id AND u.is_professor = true
            LEFT JOIN students s ON u.id = s.user_id AND u.is_professor = false
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (u.name ILIKE $${paramIndex} OR u.surname ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (role === "professor") {
            query += ` AND u.is_professor = true`;
        } else if (role === "student") {
            query += ` AND u.is_professor = false`;
        } else if (role === "admin") {
            query += ` AND u.is_admin = true`;
        }
        
        if (status === "suspended") {
            query += ` AND u.is_suspended = true`;
        } else if (status === "active") {
            query += ` AND u.is_suspended = false`;
        } else if (status === "unverified") {
            query += ` AND u.is_professor = true AND (p.is_verified = false OR p.is_verified IS NULL)`;
        } else if (status === "verified") {
            query += ` AND u.is_professor = true AND p.is_verified = true`;
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod dohvaćanja korisnika" });
    }
});

// Suspend/Unsuspend user
router.patch("/users/:id/suspend", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { suspended } = req.body;
        
        // Can't suspend yourself
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: "Ne možete suspendirati vlastiti račun" });
        }
        
        const result = await pool.query(
            "UPDATE users SET is_suspended = $1 WHERE id = $2 RETURNING id, is_suspended",
            [suspended, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Korisnik nije pronađen" });
        }
        
        res.json({ 
            message: suspended ? "Korisnik je suspendiran" : "Suspenzija je uklonjena",
            user: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod suspenzije korisnika" });
    }
});

// Verify/Unverify instructor
router.patch("/users/:id/verify", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { verified } = req.body;
        
        // Check if user is a professor
        const userCheck = await pool.query(
            "SELECT is_professor FROM users WHERE id = $1",
            [id]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "Korisnik nije pronađen" });
        }
        
        if (!userCheck.rows[0].is_professor) {
            return res.status(400).json({ message: "Korisnik nije instruktor" });
        }
        
        const result = await pool.query(
            "UPDATE professors SET is_verified = $1 WHERE user_id = $2 RETURNING user_id, is_verified",
            [verified, id]
        );
        
        res.json({ 
            message: verified ? "Instruktor je verificiran" : "Verifikacija je uklonjena",
            professor: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod verifikacije instruktora" });
    }
});

// Make/Remove admin
router.patch("/users/:id/admin", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isAdmin } = req.body;
        
        // Can't remove your own admin status
        if (parseInt(id) === req.user.id && !isAdmin) {
            return res.status(400).json({ message: "Ne možete ukloniti vlastite administratorske ovlasti" });
        }
        
        const result = await pool.query(
            "UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, is_admin",
            [isAdmin, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Korisnik nije pronađen" });
        }
        
        res.json({ 
            message: isAdmin ? "Korisnik je sada administrator" : "Administratorske ovlasti su uklonjene",
            user: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod promjene admin statusa" });
    }
});

// Delete user
router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Can't delete yourself
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: "Ne možete obrisati vlastiti račun" });
        }
        
        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 RETURNING id",
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Korisnik nije pronađen" });
        }
        
        res.json({ message: "Korisnik je uspješno obrisan" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod brisanja korisnika" });
    }
});

// ==================== INTERESTS/SUBJECTS MANAGEMENT ====================

// Get all interests
router.get("/interests", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                i.id,
                i.name,
                (SELECT COUNT(*) FROM user_interests WHERE interest_id = i.id) as user_count,
                (SELECT COUNT(*) FROM quizzes WHERE interest_id = i.id) as quiz_count
            FROM interests i
            ORDER BY i.name
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod dohvaćanja predmeta" });
    }
});

// Add new interest
router.post("/interests", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Naziv predmeta je obavezan" });
        }
        
        const result = await pool.query(
            "INSERT INTO interests (name) VALUES ($1) RETURNING *",
            [name.trim()]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: "Predmet s tim nazivom već postoji" });
        }
        console.error(err);
        res.status(500).json({ message: "Greška kod dodavanja predmeta" });
    }
});

// Update interest
router.put("/interests/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Naziv predmeta je obavezan" });
        }
        
        const result = await pool.query(
            "UPDATE interests SET name = $1 WHERE id = $2 RETURNING *",
            [name.trim(), id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Predmet nije pronađen" });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: "Predmet s tim nazivom već postoji" });
        }
        console.error(err);
        res.status(500).json({ message: "Greška kod ažuriranja predmeta" });
    }
});

// Delete interest
router.delete("/interests/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            "DELETE FROM interests WHERE id = $1 RETURNING *",
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Predmet nije pronađen" });
        }
        
        res.json({ message: "Predmet je uspješno obrisan" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod brisanja predmeta" });
    }
});

// ==================== ANALYTICS ====================

router.get("/analytics", verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Total users
        const usersCount = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE is_professor = false) as students,
                COUNT(*) FILTER (WHERE is_professor = true) as instructors,
                COUNT(*) FILTER (WHERE is_admin = true) as admins,
                COUNT(*) FILTER (WHERE is_suspended = true) as suspended,
                COUNT(*) as total
            FROM users
        `);
        
        // Instructor verification stats
        const verificationStats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE is_verified = true) as verified,
                COUNT(*) FILTER (WHERE is_verified = false OR is_verified IS NULL) as unverified,
                COUNT(*) FILTER (WHERE is_published = true) as published
            FROM professors
        `);
        
        // Total bookings and cancellation calculation
        const bookingStats = await pool.query(`
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(*) FILTER (WHERE ps.end_time < NOW()) as completed_lessons,
                COUNT(*) FILTER (WHERE ps.end_time >= NOW()) as upcoming_lessons
            FROM professor_slot_bookings psb
            JOIN professor_slots ps ON ps.id = psb.slot_id
        `);
        
        // Reviews/satisfaction stats
        const reviewStats = await pool.query(`
            SELECT 
                COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as average_rating,
                COUNT(*) FILTER (WHERE rating >= 4) as positive_reviews,
                COUNT(*) FILTER (WHERE rating <= 2) as negative_reviews
            FROM reviews
        `);
        
        // Monthly bookings (last 6 months)
        const monthlyBookings = await pool.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', booked_at), 'YYYY-MM') as month,
                COUNT(*) as bookings
            FROM professor_slot_bookings
            WHERE booked_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', booked_at)
            ORDER BY month
        `);
        
        // Top subjects by bookings
        const topSubjects = await pool.query(`
            SELECT 
                i.name,
                COUNT(psb.id) as booking_count
            FROM interests i
            LEFT JOIN professor_slot_bookings psb ON psb.interest_id = i.id
            GROUP BY i.id, i.name
            ORDER BY booking_count DESC
            LIMIT 5
        `);
        
        // Recent registrations (last 30 days)
        const recentRegistrations = await pool.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as day,
                COUNT(*) as registrations
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY day
        `);
        
        // Quiz stats
        const quizStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT q.id) as total_quizzes,
                COUNT(DISTINCT qa.id) as total_attempts,
                COALESCE(AVG(qa.score::float / NULLIF(qa.total_points, 0) * 100), 0) as avg_score_percent
            FROM quizzes q
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
        `);
        
        res.json({
            users: usersCount.rows[0],
            instructors: verificationStats.rows[0],
            bookings: bookingStats.rows[0],
            reviews: {
                ...reviewStats.rows[0],
                average_rating: parseFloat(reviewStats.rows[0].average_rating).toFixed(2)
            },
            monthlyBookings: monthlyBookings.rows,
            topSubjects: topSubjects.rows,
            recentRegistrations: recentRegistrations.rows,
            quizzes: quizStats.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška kod dohvaćanja analitike" });
    }
});

// Check if current user is admin
router.get("/check", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT is_admin FROM users WHERE id = $1",
            [req.user.id]
        );
        
        res.json({ isAdmin: result.rows[0]?.is_admin || false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Greška servera" });
    }
});

module.exports = router;

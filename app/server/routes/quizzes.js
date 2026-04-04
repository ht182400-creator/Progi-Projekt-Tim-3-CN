const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

// Helper: check if user is professor
const requireProfessor = async (userId) => {
    const result = await pool.query(
        "SELECT is_professor FROM users WHERE id = $1",
        [userId]
    );
    return result.rows[0]?.is_professor === true;
};

// Helper: check if user is student
const requireStudent = async (userId) => {
    const result = await pool.query(
        "SELECT is_professor FROM users WHERE id = $1",
        [userId]
    );
    return result.rows[0]?.is_professor === false;
};

// Get all published quizzes (for students) with optional filters
router.get("/", async (req, res) => {
    try {
        const { interest_id, search } = req.query;
        let values = [];
        let where = ["q.is_published = true"];

        if (interest_id) {
            values.push(interest_id);
            where.push(`q.interest_id = $${values.length}`);
        }

        if (search) {
            values.push(`%${search}%`);
            where.push(`(q.title ILIKE $${values.length} OR q.description ILIKE $${values.length})`);
        }

        const result = await pool.query(`
            SELECT 
                q.id,
                q.title,
                q.description,
                q.time_limit,
                q.created_at,
                i.name AS interest_name,
                u.name AS professor_name,
                u.surname AS professor_surname,
                COUNT(DISTINCT qq.id) AS question_count
            FROM quizzes q
            JOIN interests i ON i.id = q.interest_id
            JOIN users u ON u.id = q.professor_id
            LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
            WHERE ${where.join(" AND ")}
            GROUP BY q.id, i.name, u.name, u.surname
            ORDER BY q.created_at DESC
        `, values);

        res.json({ quizzes: result.rows });
    } catch (err) {
        console.error("Error fetching quizzes:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju kvizova." });
    }
});

// Get quizzes created by current professor
router.get("/my-quizzes", verifyToken, async (req, res) => {
    try {
        const isProfessor = await requireProfessor(req.user.id);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu vidjeti svoje kvizove." });
        }

        const result = await pool.query(`
            SELECT 
                q.id,
                q.title,
                q.description,
                q.time_limit,
                q.is_published,
                q.created_at,
                i.name AS interest_name,
                COUNT(DISTINCT qq.id) AS question_count,
                COUNT(DISTINCT qa.id) AS attempt_count
            FROM quizzes q
            JOIN interests i ON i.id = q.interest_id
            LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            WHERE q.professor_id = $1
            GROUP BY q.id, i.name
            ORDER BY q.created_at DESC
        `, [req.user.id]);

        res.json({ quizzes: result.rows });
    } catch (err) {
        console.error("Error fetching professor quizzes:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju kvizova." });
    }
});

// Create a new quiz (professor only)
router.post("/", verifyToken, async (req, res) => {
    try {
        const isProfessor = await requireProfessor(req.user.id);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu kreirati kvizove." });
        }

        const { title, description, interest_id, time_limit, questions } = req.body;

        if (!title || !interest_id) {
            return res.status(400).json({ message: "Naslov i predmet su obavezni." });
        }

        if (!questions || questions.length === 0) {
            return res.status(400).json({ message: "Kviz mora imati barem jedno pitanje." });
        }

        // Validate questions have at least one correct answer
        for (const q of questions) {
            if (!q.question_text) {
                return res.status(400).json({ message: "Sva pitanja moraju imati tekst." });
            }
            if (!q.answers || q.answers.length < 2) {
                return res.status(400).json({ message: "Svako pitanje mora imati barem 2 odgovora." });
            }
            const hasCorrect = q.answers.some(a => a.is_correct);
            if (!hasCorrect) {
                return res.status(400).json({ message: "Svako pitanje mora imati barem jedan točan odgovor." });
            }
        }

        // Create quiz
        const quizResult = await pool.query(`
            INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
            VALUES ($1, $2, $3, $4, $5, false)
            RETURNING id
        `, [title, description || null, interest_id, req.user.id, time_limit || 30]);

        const quizId = quizResult.rows[0].id;

        // Add questions and answers
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            
            const questionResult = await pool.query(`
                INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [quizId, q.question_text, i + 1, q.points || 100]);

            const questionId = questionResult.rows[0].id;

            // Add answers
            for (let j = 0; j < q.answers.length; j++) {
                const a = q.answers[j];
                await pool.query(`
                    INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
                    VALUES ($1, $2, $3, $4)
                `, [questionId, a.answer_text, a.is_correct || false, j + 1]);
            }
        }

        res.status(201).json({ message: "Kviz kreiran.", quiz_id: quizId });
    } catch (err) {
        console.error("Error creating quiz:", err);
        res.status(500).json({ message: "Greška pri kreiranju kviza." });
    }
});

// Publish/unpublish quiz (professor only)
router.patch("/:id/publish", verifyToken, async (req, res) => {
    try {
        const isProfessor = await requireProfessor(req.user.id);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu objavljivati kvizove." });
        }

        const { id } = req.params;
        const { is_published } = req.body;

        const result = await pool.query(`
            UPDATE quizzes 
            SET is_published = $1 
            WHERE id = $2 AND professor_id = $3
            RETURNING id, is_published
        `, [is_published, id, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Kviz nije pronađen." });
        }

        res.json({ message: is_published ? "Kviz objavljen." : "Kviz sakriven.", quiz: result.rows[0] });
    } catch (err) {
        console.error("Error publishing quiz:", err);
        res.status(500).json({ message: "Greška pri objavljivanju kviza." });
    }
});

// Get quiz details (for taking the quiz - no correct answers)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const quizResult = await pool.query(`
            SELECT 
                q.id,
                q.title,
                q.description,
                q.time_limit,
                q.is_published,
                i.name AS interest_name,
                u.name AS professor_name,
                u.surname AS professor_surname
            FROM quizzes q
            JOIN interests i ON i.id = q.interest_id
            JOIN users u ON u.id = q.professor_id
            WHERE q.id = $1 AND q.is_published = true
        `, [id]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: "Kviz nije pronađen." });
        }

        const questionsResult = await pool.query(`
            SELECT 
                qq.id,
                qq.question_text,
                qq.question_order,
                qq.points,
                json_agg(
                    json_build_object(
                        'id', qa.id,
                        'answer_text', qa.answer_text,
                        'answer_order', qa.answer_order
                    ) ORDER BY qa.answer_order
                ) AS answers
            FROM quiz_questions qq
            JOIN quiz_answers qa ON qa.question_id = qq.id
            WHERE qq.quiz_id = $1
            GROUP BY qq.id
            ORDER BY qq.question_order
        `, [id]);

        res.json({
            quiz: quizResult.rows[0],
            questions: questionsResult.rows
        });
    } catch (err) {
        console.error("Error fetching quiz:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju kviza." });
    }
});

// Get quiz for editing (professor only - includes correct answers)
router.get("/:id/edit", verifyToken, async (req, res) => {
    try {
        const isProfessor = await requireProfessor(req.user.id);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu uređivati kvizove." });
        }

        const { id } = req.params;

        const quizResult = await pool.query(`
            SELECT q.*, i.name AS interest_name
            FROM quizzes q
            JOIN interests i ON i.id = q.interest_id
            WHERE q.id = $1 AND q.professor_id = $2
        `, [id, req.user.id]);

        if (quizResult.rows.length === 0) {
            return res.status(404).json({ message: "Kviz nije pronađen." });
        }

        const questionsResult = await pool.query(`
            SELECT 
                qq.id,
                qq.question_text,
                qq.question_order,
                qq.points,
                json_agg(
                    json_build_object(
                        'id', qa.id,
                        'answer_text', qa.answer_text,
                        'is_correct', qa.is_correct,
                        'answer_order', qa.answer_order
                    ) ORDER BY qa.answer_order
                ) AS answers
            FROM quiz_questions qq
            JOIN quiz_answers qa ON qa.question_id = qq.id
            WHERE qq.quiz_id = $1
            GROUP BY qq.id
            ORDER BY qq.question_order
        `, [id]);

        res.json({
            quiz: quizResult.rows[0],
            questions: questionsResult.rows
        });
    } catch (err) {
        console.error("Error fetching quiz for edit:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju kviza." });
    }
});

// Delete quiz (professor only)
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const isProfessor = await requireProfessor(req.user.id);
        if (!isProfessor) {
            return res.status(403).json({ message: "Samo profesori mogu brisati kvizove." });
        }

        const { id } = req.params;

        const result = await pool.query(`
            DELETE FROM quizzes WHERE id = $1 AND professor_id = $2 RETURNING id
        `, [id, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Kviz nije pronađen." });
        }

        res.json({ message: "Kviz obrisan." });
    } catch (err) {
        console.error("Error deleting quiz:", err);
        res.status(500).json({ message: "Greška pri brisanju kviza." });
    }
});

// Start quiz attempt (student)
router.post("/:id/start", verifyToken, async (req, res) => {
    try {
        const isStudent = await requireStudent(req.user.id);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo učenici mogu rješavati kvizove." });
        }

        const { id } = req.params;

        // Check quiz exists and is published
        const quizCheck = await pool.query(`
            SELECT id, time_limit FROM quizzes WHERE id = $1 AND is_published = true
        `, [id]);

        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ message: "Kviz nije pronađen." });
        }

        // Calculate total points
        const pointsResult = await pool.query(`
            SELECT COALESCE(SUM(points), 0) AS total_points FROM quiz_questions WHERE quiz_id = $1
        `, [id]);

        const totalPoints = pointsResult.rows[0].total_points;

        // Create attempt
        const attemptResult = await pool.query(`
            INSERT INTO quiz_attempts (quiz_id, student_id, total_points)
            VALUES ($1, $2, $3)
            RETURNING id, started_at
        `, [id, req.user.id, totalPoints]);

        res.json({
            attempt_id: attemptResult.rows[0].id,
            started_at: attemptResult.rows[0].started_at,
            time_limit: quizCheck.rows[0].time_limit
        });
    } catch (err) {
        console.error("Error starting quiz:", err);
        res.status(500).json({ message: "Greška pri pokretanju kviza." });
    }
});

// Submit answer for a question (student)
router.post("/attempt/:attemptId/answer", verifyToken, async (req, res) => {
    try {
        const isStudent = await requireStudent(req.user.id);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo učenici mogu odgovarati." });
        }

        const { attemptId } = req.params;
        const { question_id, answer_id, time_taken } = req.body;

        // Verify attempt belongs to user
        const attemptCheck = await pool.query(`
            SELECT id FROM quiz_attempts WHERE id = $1 AND student_id = $2 AND completed_at IS NULL
        `, [attemptId, req.user.id]);

        if (attemptCheck.rows.length === 0) {
            return res.status(404).json({ message: "Pokušaj nije pronađen ili je završen." });
        }

        // Check if answer is correct and get points
        const answerCheck = await pool.query(`
            SELECT qa.is_correct, qq.points
            FROM quiz_answers qa
            JOIN quiz_questions qq ON qq.id = qa.question_id
            WHERE qa.id = $1 AND qa.question_id = $2
        `, [answer_id, question_id]);

        let isCorrect = false;
        let pointsEarned = 0;

        if (answerCheck.rows.length > 0) {
            isCorrect = answerCheck.rows[0].is_correct;
            // Award points based on time taken (faster = more points, like Kahoot)
            if (isCorrect) {
                const maxPoints = answerCheck.rows[0].points;
                // If answered in less than 5 seconds, full points. Decreases linearly to 50% at 30 seconds
                const timeBonus = Math.max(0.5, 1 - (time_taken / 60000));
                pointsEarned = Math.round(maxPoints * timeBonus);
            }
        }

        // Record answer
        await pool.query(`
            INSERT INTO quiz_attempt_answers (attempt_id, question_id, selected_answer_id, is_correct, time_taken, points_earned)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (attempt_id, question_id) DO UPDATE SET
                selected_answer_id = $3,
                is_correct = $4,
                time_taken = $5,
                points_earned = $6
        `, [attemptId, question_id, answer_id, isCorrect, time_taken, pointsEarned]);

        // Get correct answer for feedback
        const correctAnswer = await pool.query(`
            SELECT id, answer_text FROM quiz_answers WHERE question_id = $1 AND is_correct = true
        `, [question_id]);

        res.json({
            is_correct: isCorrect,
            points_earned: pointsEarned,
            correct_answer: correctAnswer.rows[0]
        });
    } catch (err) {
        console.error("Error submitting answer:", err);
        res.status(500).json({ message: "Greška pri slanju odgovora." });
    }
});

// Complete quiz attempt (student)
router.post("/attempt/:attemptId/complete", verifyToken, async (req, res) => {
    try {
        const isStudent = await requireStudent(req.user.id);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo učenici mogu završiti kviz." });
        }

        const { attemptId } = req.params;

        // Calculate total score
        const scoreResult = await pool.query(`
            SELECT COALESCE(SUM(points_earned), 0) AS score
            FROM quiz_attempt_answers
            WHERE attempt_id = $1
        `, [attemptId]);

        const score = scoreResult.rows[0].score;

        // Update attempt
        const result = await pool.query(`
            UPDATE quiz_attempts 
            SET completed_at = NOW(), score = $1
            WHERE id = $2 AND student_id = $3 AND completed_at IS NULL
            RETURNING *
        `, [score, attemptId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Pokušaj nije pronađen ili je već završen." });
        }

        res.json({
            message: "Kviz završen!",
            score: score,
            total_points: result.rows[0].total_points,
            percentage: Math.round((score / result.rows[0].total_points) * 100)
        });
    } catch (err) {
        console.error("Error completing quiz:", err);
        res.status(500).json({ message: "Greška pri završavanju kviza." });
    }
});

// Get quiz results/history for student
router.get("/my-results", verifyToken, async (req, res) => {
    try {
        const isStudent = await requireStudent(req.user.id);
        if (!isStudent) {
            return res.status(403).json({ message: "Samo učenici mogu vidjeti rezultate." });
        }

        const result = await pool.query(`
            SELECT 
                qa.id,
                qa.score,
                qa.total_points,
                qa.started_at,
                qa.completed_at,
                q.title AS quiz_title,
                i.name AS interest_name,
                u.name AS professor_name,
                u.surname AS professor_surname,
                ROUND((qa.score::numeric / NULLIF(qa.total_points, 0)) * 100) AS percentage
            FROM quiz_attempts qa
            JOIN quizzes q ON q.id = qa.quiz_id
            JOIN interests i ON i.id = q.interest_id
            JOIN users u ON u.id = q.professor_id
            WHERE qa.student_id = $1 AND qa.completed_at IS NOT NULL
            ORDER BY qa.completed_at DESC
        `, [req.user.id]);

        res.json({ results: result.rows });
    } catch (err) {
        console.error("Error fetching results:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju rezultata." });
    }
});

// Get leaderboard for a quiz
router.get("/:id/leaderboard", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                u.name,
                u.surname,
                u.profile_picture,
                MAX(qa.score) AS best_score,
                MAX(qa.total_points) AS total_points,
                ROUND((MAX(qa.score)::numeric / NULLIF(MAX(qa.total_points), 0)) * 100) AS percentage
            FROM quiz_attempts qa
            JOIN users u ON u.id = qa.student_id
            WHERE qa.quiz_id = $1 AND qa.completed_at IS NOT NULL
            GROUP BY u.id
            ORDER BY best_score DESC, percentage DESC
            LIMIT 10
        `, [id]);

        res.json({ leaderboard: result.rows });
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        res.status(500).json({ message: "Greška pri dohvaćanju ljestvice." });
    }
});

module.exports = router;

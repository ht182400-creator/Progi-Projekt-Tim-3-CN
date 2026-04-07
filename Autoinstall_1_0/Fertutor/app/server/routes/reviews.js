const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyTokenOptional = require("../middleware/verifyTokenOptional");

// 获取某位教师的所有评论（公开）
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

        // 计算平均评分
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
        res.status(500).json({ message: "获取评论时出错" });
    }
});

// 检查当前用户是否可以对教师进行评价（已完成课程且未评价）
router.get("/can-review/:instructorId", verifyToken, async (req, res) => {
    try {
        const { instructorId } = req.params;
        const studentId = req.user.id;

        // 检查学生是否已评价过该教师
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

        // 检查学生与该教师是否有至少一节已完成的课程
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
        res.status(500).json({ message: "检查评论权限时出错" });
    }
});

// 提交评论（每位学生对每位教师只能评论一次）
router.post("/", verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const { professor_id, rating, comment } = req.body;

        // 验证评分
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "评分必须在 1 到 5 之间" });
        }

        if (!professor_id) {
            return res.status(400).json({ message: "教师 ID 为必填项" });
        }

        // 检查学生是否已评价过该教师
        const existingReview = await pool.query(
            "SELECT id FROM reviews WHERE professor_id = $1 AND student_id = $2",
            [professor_id, studentId]
        );

        if (existingReview.rows.length > 0) {
            return res.status(400).json({ message: "您已为这位教师留下过评论" });
        }

        // 验证学生与该教师有至少一节已完成的课程
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
            return res.status(403).json({ message: "只有在与该教师完成课程后才能发表评论" });
        }

        // 插入评论（不绑定 booking_id - 每位学生对每位教师只能评论一次）
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

        res.status(201).json({ message: "评论添加成功！" });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // 违反唯一约束
            return res.status(400).json({ message: "您已为这位教师留下过评论" });
        }
        res.status(500).json({ message: "添加评论时出错" });
    }
});

// 获取我的评论（教师在自己的资料中查看）
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

        // 计算平均评分
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
        res.status(500).json({ message: "获取评论时出错" });
    }
});

// 删除自己的评论
router.delete("/:reviewId", verifyToken, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const studentId = req.user.id;

        const result = await pool.query(
            "DELETE FROM reviews WHERE id = $1 AND student_id = $2 RETURNING id",
            [reviewId, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "未找到评论或您无权删除" });
        }

        res.json({ message: "评论删除成功" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "删除评论时出错" });
    }
});

module.exports = router;
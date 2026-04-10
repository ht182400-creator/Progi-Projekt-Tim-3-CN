const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyTokenOptional = require("../middleware/verifyTokenOptional");

// 生成唯一的 Jitsi 会议 URL 和密码
const generateMeetingCredentials = (slotId) => {
    const roomId = crypto.randomBytes(8).toString('hex');
    const password = crypto.randomBytes(3).toString('hex'); // 6 位密码
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

// 创建可用时间段（教授）
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

        if (!lesson_type || !['一对一', '集体课'].includes(lesson_type)) {
            return res.status(400).json({ message: "无效的课程类型。" });
        }

        let finalCapacity = 1;

        if (lesson_type === "一对一") {
            finalCapacity = 1;
        } else {
            if (!interest_id) {
                return res.status(400).json({ message: "集体课必须选择科目。" });
            }

            finalCapacity = Number(capacity);
            if (!Number.isInteger(finalCapacity) || finalCapacity < 2) {
                return res.status(400).json({
                    message: "集体课容量必须 ≥ 2。"
                });
            }

            // 检查教师是否拥有该科目
            const interestCheck = await pool.query(
                `SELECT 1
         FROM user_interests
         WHERE user_id = $1 AND interest_id = $2`,
                [userId, interest_id]
            );

            if (interestCheck.rows.length === 0) {
                return res.status(403).json({
                    message: "您无权教授所选科目。"
                });
            }
        }

        // 获取教师档案中的授课类型
        const profResult = await pool.query(
            "SELECT teaching_type FROM professors WHERE user_id = $1",
            [userId]
        );

        const profileTeachingType = profResult.rows[0]?.teaching_type;

        if (!profileTeachingType) {
            return res.status(400).json({ message: "教师档案未定义授课类型。" });
        }

        // 检查所选时间段是否允许
        if (
            (profileTeachingType === "线下" && teaching_type !== "线下") ||
            (profileTeachingType === "线上" && teaching_type !== "线上")
        ) {
            return res.status(403).json({
                message: `无法创建 ${teaching_type} 类型的时间段。您的档案只允许 ${profileTeachingType}。`
            });
        }

        if (!start_time || !end_time || !teaching_type || price == null) {
            return res.status(400).json({ message: "缺少必要的时间段数据。" });
        }

        if (teaching_type === "线下" && !location) {
            return res.status(400).json({ message: "线下课程必须提供地点。" });
        }

        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "只有教授可以创建时间段。" });
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
            return res.status(409).json({ message: "时间段与已有时间段重叠。" });
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
                teaching_type === "线下" ? location : null,
                lesson_type,
                lesson_type === "集体课" ? interest_id : null
            ]
        );

        res.status(201).json({ slot: result.rows[0] });
    } catch (err) {
        console.error("创建时间段错误:", err);
        res.status(500).json({ message: "创建时间段时出错。" });
    }
});

// 获取教授的公开时间段（仅可用）
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
        res.status(500).json({ message: "获取时间段时出错。" });
    }
});

// 获取当前教授的时间段（包含预订信息）
router.get("/my-slots", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "只有教授可以查看时间段。" });
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
        console.error("获取我的时间段错误:", err);
        res.status(500).json({ message: "获取时间段时出错。" });
    }
});

// 获取时间段详情及学生和备注（教授）
router.get("/slots/:slotId/details", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;

        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "只有教授可以访问。" });
        }

        // 检查时间段是否属于该教授
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
            return res.status(404).json({ message: "未找到该时间段。" });
        }

        // 学生 + 备注
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
        console.error("获取时间段详情错误:", err);
        res.status(500).json({ message: "获取时间段详情时出错。" });
    }
});

// 删除可用时间段（教授）
router.delete("/slots/:slotId", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;

        const isProfessor = await requireProfessor(userId);
        if (!isProfessor) {
            return res.status(403).json({ message: "只有教授可以删除时间段。" });
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
            return res.status(400).json({ message: "无法删除该时间段。" });
        }

        res.json({ message: "时间段已删除。" });
    } catch (err) {
        console.error("删除时间段错误:", err);
        res.status(500).json({ message: "删除时间段时出错。" });
    }
});

// 预订时间段（学生）
router.post("/book/:slotId", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;
        const { note, interest_id } = req.body;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "只有学生可以预订时间段。" });
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
            return res.status(404).json({ message: "未找到该时间段。" });
        }

        const { capacity, booked_count, lesson_type, slot_interest_id, teaching_type, meeting_url } = slotResult.rows[0];
        if (Number(booked_count) >= Number(capacity)) {
            return res.status(409).json({ message: "时间段已满。" });
        }

        // 对于集体课，学生不选择科目
        const finalInterestId = lesson_type === "集体课" ? slot_interest_id : interest_id;

        if (!finalInterestId) {
            return res.status(400).json({ message: "科目为必填项。" });
        }

        // 为在线课程生成 Jitsi 会议 URL（仅在首次预订时）
        let finalMeetingUrl = meeting_url;
        let finalMeetingPassword = null;
        if (teaching_type === "线上" && !meeting_url) {
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
            message: "时间段已预订。",
            meeting_url: finalMeetingUrl,
            meeting_password: finalMeetingPassword
        });
    } catch (err) {
        console.error("预订时间段错误:", err);
        res.status(500).json({ message: "预订时间段时出错。" });
    }
});

// 取消预订（学生）
router.delete("/book/:slotId", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { slotId } = req.params;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "只有学生可以取消时间段。" });
        }

        const result = await pool.query(
            `DELETE FROM professor_slot_bookings
             WHERE slot_id = $1 AND student_id = $2
             RETURNING id`,
            [slotId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "无法取消该时间段。" });
        }

        res.json({ message: "时间段已取消。" });
    } catch (err) {
        console.error("取消预订错误:", err);
        res.status(500).json({ message: "取消时间段时出错。" });
    }
});

// 获取当前学生的所有预订
router.get("/my-bookings", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "只有学生可以查看预订。" });
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
        console.error("获取预订错误:", err);
        res.status(500).json({ message: "获取预订时出错。" });
    }
});

// 获取预订详情（学生）
router.get("/bookings/:bookingId/details", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "只有学生可以访问。" });
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
            return res.status(404).json({ message: "未找到该预订。" });
        }

        res.json({ booking: result.rows[0] });
    } catch (err) {
        console.error("获取预订详情错误:", err);
        res.status(500).json({ message: "获取预订详情时出错。" });
    }
});

// 获取当前用户（教授或学生）的科目列表
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
        console.error("获取用户科目错误:", err);
        res.status(500).json({ message: "获取科目时出错。" });
    }
});

// 更新预订备注（学生）
router.patch("/bookings/:bookingId/note", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const { note } = req.body;

        const isStudent = await requireStudent(userId);
        if (!isStudent) {
            return res.status(403).json({ message: "只有学生可以编辑备注。" });
        }

        if (note && note.length > 500) {
            return res.status(400).json({ message: "备注过长。" });
        }

        const result = await pool.query(
            `UPDATE professor_slot_bookings
             SET note = $1
             WHERE id = $2 AND student_id = $3
             RETURNING note`,
            [note || null, bookingId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "未找到该预订。" });
        }

        res.json({ note: result.rows[0].note });
    } catch (err) {
        console.error("更新备注错误:", err);
        res.status(500).json({ message: "保存备注时出错。" });
    }
});

module.exports = router;
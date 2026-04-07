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

// 根据项目结构调整路径
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'verification.html');
let verificationTemplate;
try {
    verificationTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch (e) {
    console.error('致命错误：无法加载邮件模板：', TEMPLATE_PATH);
}

// 用户登录时选择“记住我”的 Cookie 选项
const cookieOptionsRemember = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
}

// 用户不选择“记住我”的 Cookie 选项
const cookieOptionsNoRemember = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
}

// 生成登录用的 JWT token
const generateLoginToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    })
}

// 生成临时存储 email 和 password_hash 的验证 token
const generateVerifyToken = (email, password_hash) => {
    return jwt.sign(
        { email, password_hash },
        process.env.VERIFY_SECRET,
        { expiresIn: '10m' }
    );
};

// 生成重置密码的 token
const generateResetPassToken = (id, email) => {
    return jwt.sign(
        { id, email },
        process.env.RESET_SECRET,
        { expiresIn: '10m' }
    );
};

// 验证邮箱格式
function isEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// 验证密码强度
function isPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,32}$/;
    return passwordRegex.test(password);
}


// 路由1：输入邮箱和密码，发送验证邮件
router.post('/register', async (req, res) => {
    const { email, password, passwordCheck, termsAndConditions } = req.body;

    if (!email || !isEmail(email)) {
        return res.status(400).json({ message: '请输入有效的邮箱地址。' });
    }

    if (!password || !isPassword(password)) {
        return res.status(400).json({ message: "密码必须包含8-32个字符，至少一个大写字母、一个小写字母、一个数字和一个特殊字符。" });
    }

    if (!passwordCheck || password !== passwordCheck) {
        return res.status(400).json({ message: '两次输入的密码不一致。' });
    }

    if (!termsAndConditions) {
        return res.status(400).json({ message: "您必须接受条款和条件" });
    }

    // 检查邮箱是否已存在
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userExists.rows.length > 0) {
        return res.status(400).json({ message: '该邮箱已被注册。' });
    }

    // 哈希密码
    const password_hash = await bcrypt.hash(password, 12);

    // 生成用于验证邮箱的 token，临时存储邮箱和密码
    const token = generateVerifyToken(email, password_hash);

    // 验证链接
    const verificationLink = `${process.env.FRONTEND_URL}/api/auth/verify-token?token=${token}`;
    const emailHtml = verificationTemplate.replace(/{{verificationLink}}/g, verificationLink);

    // 发送邮件
    const sent = await sendEmail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '注册验证 | Fertutor.xyz',
        html: emailHtml
    });

    // 检查邮件发送是否成功
    if (!sent) {
        return res.status(500).json({ message: "邮件发送失败" });
    }

    return res.status(202).json({ message: '验证链接已发送至您的邮箱，请查收。' });
});


// 路由2：验证 token 并确认邮箱
router.get('/verify-token', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: '未找到 token。' });
    }

    // 验证 token，如果有效则重定向到完成注册页面
    try {
        jwt.verify(token, process.env.VERIFY_SECRET);
        return res.redirect(`${process.env.FRONTEND_URL}/finish-register?token=${token}`);
    } catch (err) {
        return res.status(400).json({ message: '无效或已过期的 token。' });
    }
});


// 路由3：完成注册（设置个人信息）
router.post('/finish-register', upload.single('profileImage'), async (req, res) => {
    const { token, name, surname, date_of_birth, sex, is_professor, city, education } = req.body;

    // 转换为布尔值
    const isProfessor =
        req.body.is_professor === true ||
        req.body.is_professor === 'true';

    // 基本校验
    if (!token) return res.status(400).json({ message: "token 已过期" });
    if (!name || !surname || !date_of_birth || !sex || typeof is_professor === "undefined" || !city || !education) {
        return res.status(400).json({ message: '请填写所有字段。' });
    }

    // 验证出生日期有效性
    const dob = new Date(date_of_birth);
    const today = new Date();

    dob.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(dob.getTime()) || dob > today) {
        return res.status(400).json({ message: '请输入有效的出生日期。' });
    }

    // 解析 token 获取邮箱和密码哈希
    let parsed;
    try {
        parsed = jwt.verify(token, process.env.VERIFY_SECRET);
    } catch (err) {
        return res.status(400).json({ message: '无效或已过期的 token。' });
    }

    // 处理头像图片
    const profilePicture = req.file ? req.file.filename : null;

    // 如果存在头像，进行压缩
    if (profilePicture) {
        const filePath = path.join(__dirname, '../uploads/profiles', profilePicture);
        await compressImage(filePath);
    }

    // 写入 users 表
    await pool.query('INSERT INTO  users (email, password_hash, is_professor, name, surname, profile_picture) VALUES ($1, $2, $3, $4, $5, $6)',
        [parsed.email, parsed.password_hash, isProfessor, name, surname, profilePicture]);

    // 获取新用户的 id
    const id = await pool.query('SELECT id FROM users WHERE email = $1', [parsed.email]);
    const user_id = id.rows[0].id;

    // 根据用户类型插入 professors 或 students 表
    if (isProfessor) {
        await pool.query('INSERT INTO  professors (user_id, sex, city, teaching, date_of_birth) VALUES ($1, $2, $3, $4, $5)',
            [user_id, sex, city, education, date_of_birth]);
    } else if (!isProfessor) {
        await pool.query('INSERT INTO  students (user_id, sex, city, education, date_of_birth) VALUES ($1, $2, $3, $4, $5)',
            [user_id, sex, city, education, date_of_birth]);
    }

    // 生成登录 token 使用户保持登录状态
    const loginToken = generateLoginToken(user_id);
    res.cookie('token', loginToken, cookieOptionsNoRemember);

    return res.status(200).json({ message: "资料填写完成！" });
});

// 可选：在注册时添加兴趣
router.post('/register-interests', verifyToken, async (req, res) => {
    const { interests } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(interests)) {
        return res.status(400).json({ message: "兴趣格式无效。" });
    }

    if (interests.length === 0) {
        return res.status(200).json({ message: "已跳过兴趣选择。" });
    }

    try {
        const dbInterests = await pool.query(
            `SELECT id FROM interests WHERE name = ANY($1::text[])`,
            [interests]
        );

        // 使用参数化查询防止 SQL 注入
        if (dbInterests.rows.length > 0) {
            const insertPromises = dbInterests.rows.map(i =>
                pool.query(
                    `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [userId, i.id]
                )
            );
            await Promise.all(insertPromises);
        }

        return res.status(200).json({ message: "兴趣已保存。" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "保存兴趣时出错。" });
    }
});

// 登录
router.post('/login', async (req, res) => {
    const { email, password, rememberLogin } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '请填写所有字段' });
    }

    // 检查用户是否存在
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        return res.status(400).json({ message: '该邮箱未注册' });
    }

    // 用户数据
    const userData = user.rows[0];

    // 验证密码
    const isMatch = await bcrypt.compare(password, userData.password_hash);
    if (!isMatch) {
        return res.status(400).json({ message: '登录信息错误' });
    }

    // 检查用户是否被禁用
    if (userData.is_suspended) {
        return res.status(403).json({ message: '您的账户已被禁用，请联系管理员。' });
    }

    // 生成登录 token
    const token = generateLoginToken(userData.id);
    if (rememberLogin) {
        res.cookie('token', token, cookieOptionsRemember);
    } else {
        res.cookie('token', token, cookieOptionsNoRemember);
    }

    return res.status(200).json({
        message: '登录成功',
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

// 登出
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    return res.json({ message: '登出成功' });
});

// 获取当前用户信息
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, email, name, surname, is_professor, is_admin, is_suspended, profile_picture FROM users WHERE id = $1', [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ message: '用户未找到' });

        // 检查用户是否被禁用
        if (user.rows[0].is_suspended) {
            res.clearCookie('token');
            return res.status(403).json({ message: '您的账户已被禁用。' });
        }

        res.json({ user: user.rows[0] });
    } catch (err) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 发送忘记密码邮件
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;

    // 验证邮箱格式
    if (!email || !isEmail(email)) {
        return res.status(400).json({ message: '请输入有效的邮箱地址。' });
    }

    // 检查用户是否存在
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
        return res.status(200).json({ message: '如果用户存在，已发送邮件' });
    }

    const userData = user.rows[0];

    // 生成重置密码 token 和链接
    const resetPassToken = generateResetPassToken(userData.id, email);
    const resetLink = `${process.env.FRONTEND_URL}/api/auth/verify-reset-token?token=${resetPassToken}`;

    // 加载 HTML 模板
    const resetTemplatePath = path.join(__dirname, '..', 'templates', 'reset_password.html');
    let resetHtml = fs.readFileSync(resetTemplatePath, 'utf8');
    resetHtml = resetHtml.replace(/{{resetLink}}/g, resetLink);

    // 发送邮件
    const sent = await sendEmail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "重置密码 | Fertutor.xyz",
        html: resetHtml
    });

    // 检查发送错误
    if (!sent) {
        return res.status(500).json({ message: "邮件发送失败。" });
    }

    return res.status(200).json({
        message: "如果用户存在，已发送邮件"
    });
})

// 验证重置密码 token
router.get('/verify-reset-token', async (req, res) => {
    const { token } = req.query;

    if (!token) return res.status(400).json({ message: "未找到 token。" });

    // 如果 token 有效，重定向到重置密码页面
    try {
        const decoded = jwt.verify(token, process.env.RESET_SECRET);
        return res.redirect(`${process.env.FRONTEND_URL}/reset-password?token=${token}`);
    } catch (err) {
        return res.status(400).json({ valid: false, message: "token 已过期或无效。" });
    }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
    const { token, password, passwordCheck } = req.body;

    // 验证 token
    if (!token) return res.status(400).json({ message: "缺少 token。" });
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.RESET_SECRET);
    } catch (err) {
        return res.status(400).json({ message: "token 已过期或无效。" });
    }

    // 验证密码强度
    if (!password || !isPassword(password)) {
        return res.status(400).json({ message: "密码必须包含8-32个字符，至少一个大写字母、一个小写字母、一个数字和一个特殊字符。" });
    }
    if (!passwordCheck || password !== passwordCheck) {
        return res.status(400).json({ message: '两次输入的密码不一致。' });
    }

    // 更新数据库中的密码
    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        [hashed, decoded.id]
    );

    return res.status(200).json({ message: "密码已成功修改。" });
});

// Google 登录
router.post('/google-login', async (req, res) => {
    const { credential } = req.body;

    if (!credential) return res.status(400).json({ message: "缺少 credential" });

    try {
        // 验证 Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        /* 备用字段（暂未使用）
        const name = payload.given_name || 'Google Name';
        const surname = payload.family_name || 'Google Surname';
        const profilePic = payload.picture;
        */

        // 检查用户是否存在
        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        // 如果用户不存在，需要完成注册
        if (user.rows.length === 0) {
            // 生成随机临时密码
            const tempPassword = crypto.randomBytes(16).toString('hex');
            const password_hash = await bcrypt.hash(tempPassword, 12);

            // 生成临时 token
            const token = generateVerifyToken(email, password_hash);

            // 返回标志，通知前端需要完成注册
            return res.status(200).json({
                needsFinishRegistration: true,
                token
            });
        }

        const userData = user.rows[0];

        // 检查用户是否被禁用
        if (userData.is_suspended) {
            return res.status(403).json({ message: '您的账户已被禁用，请联系管理员。' });
        }

        // 生成登录 token
        const token = generateLoginToken(userData.id);
        res.cookie('token', token, cookieOptionsNoRemember);

        return res.status(200).json({
            message: 'Google 登录成功',
            user: {
                email: userData.email,
                name: userData.name,
                surname: userData.surname,
                is_professor: userData.is_professor,
                is_admin: userData.is_admin
            }
        });

    } catch (err) {
        return res.status(400).json({ message: "无效的 Google ID token" });
    }
})

module.exports = router;
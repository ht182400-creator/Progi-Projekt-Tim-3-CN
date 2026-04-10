const jwt = require("jsonwebtoken");

function verifyTokenOptional(req, res, next) {
    const token = req.cookies?.token;

    // 如果没有 token → 直接继续
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        // 如果 token 无效 → 忽略它
        req.user = null;
    }

    next();
}

module.exports = verifyTokenOptional;
const jwt = require("jsonwebtoken");

function verifyTokenOptional(req, res, next) {
    const token = req.cookies?.token;

    // Ako nema tokena → samo nastavi dalje
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        // Ako je token nevažeći → ignoriraj ga
        req.user = null;
    }

    next();
}

module.exports = verifyTokenOptional;
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const profRoutes = require('./routes/profile');
app.use('/api/profile', profRoutes);

app.use('/api/instructors', require('./routes/instructors'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res, next) => {
    const p = req.originalUrl.split('?')[0];
    if (!p.startsWith('/api')) {
        return next();
    }
    if (res.headersSent) {
        return next();
    }
    return res.status(404).json({ message: 'Not found' });
});

const clientDist = path.join(__dirname, '../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
const serveSpa = fs.existsSync(clientIndex);

if (serveSpa) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }
        const p = req.originalUrl.split('?')[0];
        if (p.startsWith('/api')) {
            return next();
        }
        if (p.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(clientIndex);
    });
} else {
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    });
    app.get('/finish-register', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/finish-register.html'));
    });
}

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server started on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

module.exports = app;

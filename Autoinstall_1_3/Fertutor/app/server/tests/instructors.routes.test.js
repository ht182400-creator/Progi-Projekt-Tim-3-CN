// server/tests/instructors.routes.test.js
const request = require('supertest');
const express = require('express');

// Mock DB i middleware prije require rute
jest.mock('../config/db');
jest.mock('../middleware/verifyTokenOptional', () => (req, res, next) => { req.user = null; next(); });

const pool = require('../config/db');
const instructorsRouter = require('../routes/instructors');

let app;
beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/instructors', instructorsRouter);
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('GET /api/instructors', () => {
    it('returns list of instructors', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id : 1,
                email : 'ivan.horvat@test.hr',
                is_professor : true,
                name : 'Ivan',
                surname : 'Horvat'
            }, {
                id : 2,
                email : 'ana.kovac@test.hr',
                is_professor : true,
                name : 'Ana',
                surname : 'Kovač'
            }, {
                id : 3,
                email : 'marko.babic@test.hr',
                is_professor : true,
                name : 'Marko',
                surname : 'Babić'
            }]
        });

        const res = await request(app).get('/api/instructors');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toHaveProperty('id', 1);
        expect(pool.query).toHaveBeenCalled();
    });

    it('handles DB error gracefully', async () => {
        pool.query.mockRejectedValueOnce(new Error('DB fail'));
        const res = await request(app).get('/api/instructors');
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('message');
    });
});

describe('GET /api/instructors/:id', () => {
    it('returns instructor when found', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id : 1,
                email : 'ivan.horvat@test.com',
                is_professor : true,
                name : 'Ivan',
                surname : 'Horvat'
            }]
        });

        const res = await request(app).get('/api/instructors/1');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('id', 1);
    });

    it('returns 404 when not found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app).get('/api/instructors/0');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('message', 'Instruktor nije pronađen');
    });
});

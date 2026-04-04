const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
    //ssl: { rejectUnauthorized: false }
})

pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'Europe/Zagreb'").catch(err => console.error('Error setting time zone', err));
    console.log('Connected to the database');
})

pool.on('error', (err) => {
    console.error('Database error', err);
})

module.exports = pool;
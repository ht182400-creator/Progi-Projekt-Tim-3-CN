// Email Reminder Script for FerTutor Sessions
//
// This script sends reminder emails to students and professors before their sessions.
//
// Setup: Run with cron every 15 minutes
//   crontab -e
//   Add: 0,15,30,45 * * * * cd /path/to/app/server && node scripts/send-reminders.js
//
// Reminder types:
// - 1 hour before session

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../config/db');
const sendEmail = require('../config/email');
const fs = require('fs');
const path = require('path');

const REMINDER_WINDOW_MINUTES = 60; // Send reminder 1 hour before

// Helper to read template
async function getTemplate(templateName) {
    const templatePath = path.join(__dirname, '..', 'templates', templateName);
    return fs.promises.readFile(templatePath, 'utf8');
}

async function sendSessionReminders() {
    console.log(`[${new Date().toISOString()}] Running session reminder check...`);

    try {
        // Find sessions starting in the next hour that haven't had a reminder sent
        const upcomingSessions = await pool.query(`
            SELECT 
                b.id AS booking_id,
                b.student_id,
                s.professor_id,
                s.start_time,
                s.end_time,
                s.teaching_type,
                s.meeting_url,
                s.meeting_password,
                s.location,
                u_student.name AS student_name,
                u_student.email AS student_email,
                u_prof.name AS professor_name,
                u_prof.surname AS professor_surname,
                u_prof.email AS professor_email,
                i.name AS subject_name
            FROM professor_slot_bookings b
            JOIN professor_slots s ON s.id = b.slot_id
            JOIN users u_student ON u_student.id = b.student_id
            JOIN users u_prof ON u_prof.id = s.professor_id
            JOIN interests i ON i.id = b.interest_id
            LEFT JOIN email_reminders_sent ers 
                ON ers.booking_id = b.id AND ers.reminder_type = '1hour'
            WHERE s.start_time BETWEEN NOW() AND NOW() + INTERVAL '${REMINDER_WINDOW_MINUTES} minutes'
              AND ers.id IS NULL
        `);

        console.log(`Found ${upcomingSessions.rows.length} sessions needing reminders`);

        for (const session of upcomingSessions.rows) {
            try {
                await sendReminderEmail(session, 'student');
                await sendReminderEmail(session, 'professor');

                await pool.query(
                    `INSERT INTO email_reminders_sent (booking_id, reminder_type) 
                     VALUES ($1, '1hour') ON CONFLICT DO NOTHING`,
                    [session.booking_id]
                );

                console.log(`Sent reminders for booking ${session.booking_id}`);
            } catch (err) {
                console.error(`Failed to send reminder for booking ${session.booking_id}:`, err);
            }
        }

        console.log('Reminder check complete.');
    } catch (err) {
        console.error('Error running reminder check:', err);
    } finally {
        await pool.end();
    }
}

async function sendReminderEmail(session, recipientType) {
    const isStudent = recipientType === 'student';
    const recipientEmail = isStudent ? session.student_email : session.professor_email;
    const recipientName = isStudent ? session.student_name : `${session.professor_name} ${session.professor_surname}`;
    const otherPersonName = isStudent ? `${session.professor_name} ${session.professor_surname}` : session.student_name;
    const roleLabel = isStudent ? 'Instruktor' : 'U─ìenik';

    const startTime = new Date(session.start_time);
    const formattedDate = startTime.toLocaleDateString('hr-HR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const formattedTime = startTime.toLocaleTimeString('hr-HR', {
        hour: '2-digit', minute: '2-digit'
    });

    const isOnline = session.teaching_type === 'Online';
    const meetingUrlWithPassword = isOnline
        ? `${session.meeting_url}#config.password="${session.meeting_password}"`
        : '';

    // Load template
    let html = await getTemplate('session_reminder.html');

    // Replace placeholders
    html = html.replace('{{recipientName}}', recipientName)
        .replace('{{subjectName}}', session.subject_name)
        .replace('{{date}}', formattedDate)
        .replace('{{time}}', formattedTime)
        .replace('{{teachingType}}', session.teaching_type)
        .replace('{{roleLabel}}', roleLabel)
        .replace('{{otherPersonName}}', otherPersonName)
        .replace('{{year}}', new Date().getFullYear());

    // Handle conditionals (manual replacement)
    // Determine if we should show the meeting button/password
    // Only show if it IS online AND recipient is NOT a student (so purely for professor)
    // OR if we change requirements later. For now: Students don't get button.
    const showJoinButton = isOnline && !isStudent;

    // Handle conditionals (manual replacement)
    // The template has two {{#if isOnline}} blocks.

    // 1. Location Block (First occurrence) - Show "Online" for everyone if session is online
    if (isOnline) {
        html = html.replace('{{#if isOnline}}', '')
            .replace('{{else}}', '<!--')
            .replace('{{/if}}', '-->');
    } else {
        html = html.replace('{{#if isOnline}}', '<!--')
            .replace('{{else}}', '-->')
            .replace('{{/if}}', '')
            .replace('{{location}}', session.location);
    }

    // 2. Button/Password Block (Second occurrence) - Show only if showJoinButton is true
    if (showJoinButton) {
        html = html.replace('{{#if isOnline}}', '')
            .replace('{{/if}}', '')
            .replace('{{meetingUrl}}', meetingUrlWithPassword)
            .replace('{{meetingPassword}}', session.meeting_password);
    } else {
        // Hide the button block
        html = html.replace('{{#if isOnline}}', '<!--')
            .replace('{{/if}}', '-->');
    }

    const subject = `Podsjetnik: Sesija počinje za 1 sat - ${session.subject_name}`;

    await sendEmail({
        from: 'FerTutor <mail@fertutor.xyz>',
        to: recipientEmail,
        subject: subject,
        html: html
    });
}

sendSessionReminders();

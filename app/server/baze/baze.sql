CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_professor BOOLEAN NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        is_suspended BOOLEAN DEFAULT FALSE,
        name VARCHAR(100) NOT NULL,
        surname VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (email ~* '^[A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$'),
        profile_picture VARCHAR(255) DEFAULT NULL
);

CREATE TABLE students (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        sex CHAR(1),
        city VARCHAR(100),
        education VARCHAR(255),
        date_of_birth DATE,
        CHECK (sex IN ('M', 'F', 'X')),
        CHECK (date_of_birth <= CURRENT_DATE)
);

CREATE TYPE teaching_type_enum AS ENUM (
    'Uživo',
    'Online',
    'Uživo i Online'
);

CREATE TABLE professors (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        sex CHAR(1),
        city VARCHAR(100),
        teaching VARCHAR(255),
        date_of_birth DATE,
        biography VARCHAR(500),
        video_url VARCHAR(255),
        reference VARCHAR(500),
        teaching_type teaching_type_enum,
        is_published BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        CHECK (sex IN ('M', 'F', 'X')),
        CHECK (date_of_birth <= CURRENT_DATE)
);

CREATE TYPE lesson_type_enum AS ENUM (
    '1na1',
    'Grupno'
);

CREATE TABLE interests (
                           id SERIAL PRIMARY KEY,
                           name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO interests (name) VALUES
                                 ('Matematika Osnovna Škola'),
                                 ('Fizika Osnovna Škola'),
                                 ('Informatika Osnovna Škola'),
                                 ('Matematika Srednja Škola'),
                                 ('Fizika Srednja Škola'),
                                 ('Informatika Srednja Škola');

CREATE TABLE user_interests (
                                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                interest_id INT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
                                PRIMARY KEY (user_id, interest_id)
);

-- Calendar: professor availability slots and student bookings
CREATE TABLE professor_slots (
        id SERIAL PRIMARY KEY,
        professor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        capacity INT NOT NULL DEFAULT 1,
        teaching_type teaching_type_enum NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        location VARCHAR(150),
        lesson_type lesson_type_enum NOT NULL DEFAULT '1na1',
        interest_id INT REFERENCES interests(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        meeting_url VARCHAR(255),
        meeting_password VARCHAR(20),
        CHECK (end_time > start_time),
        CHECK (
        teaching_type <> 'Uživo'
        OR location IS NOT NULL
        ),
        CHECK (
            (lesson_type = '1na1' AND capacity = 1)
                OR
            (lesson_type = 'Grupno' AND capacity >= 2)
        ),
        CHECK (
            (lesson_type = '1na1' AND interest_id IS NULL)
                OR
            (lesson_type = 'Grupno' AND interest_id IS NOT NULL)
        )
);

CREATE INDEX idx_professor_slots_professor ON professor_slots(professor_id);
CREATE INDEX idx_professor_slots_start ON professor_slots(start_time);
CREATE INDEX idx_professor_slots_meeting_url ON professor_slots(meeting_url) WHERE meeting_url IS NOT NULL;

CREATE TABLE professor_slot_bookings (
        id SERIAL PRIMARY KEY,
        slot_id INT NOT NULL REFERENCES professor_slots(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note VARCHAR(500),
        interest_id INT REFERENCES interests(id) NOT NULL,
        booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (slot_id, student_id)
);

CREATE INDEX idx_slot_bookings_slot ON professor_slot_bookings(slot_id);
CREATE INDEX idx_slot_bookings_student ON professor_slot_bookings(student_id);

-- Quizzes (Kahoot-like knowledge tests)
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    interest_id INT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    professor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_limit INT DEFAULT 30, -- seconds per question
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quizzes_professor ON quizzes(professor_id);
CREATE INDEX idx_quizzes_interest ON quizzes(interest_id);

CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text VARCHAR(500) NOT NULL,
    question_order INT NOT NULL DEFAULT 1,
    points INT DEFAULT 100
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE quiz_answers (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_text VARCHAR(300) NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    answer_order INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);

-- Student quiz attempts and results
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT DEFAULT 0,
    total_points INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(quiz_id, student_id, started_at)
);

CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

CREATE TABLE quiz_attempt_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer_id INT REFERENCES quiz_answers(id) ON DELETE SET NULL,
    is_correct BOOLEAN DEFAULT false,
    time_taken INT, -- milliseconds to answer
    points_earned INT DEFAULT 0,
    UNIQUE(attempt_id, question_id)
);

-- Reviews: students can rate instructors after attending a lesson (1 review per student per professor)
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    professor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(professor_id, student_id) -- One review per student per professor
);

CREATE INDEX idx_reviews_professor ON reviews(professor_id);
CREATE INDEX idx_reviews_student ON reviews(student_id);

-- Session records: notes, summary, homework after sessions
CREATE TABLE session_records (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES professor_slot_bookings(id) ON DELETE CASCADE,
    student_notes TEXT,
    instructor_summary TEXT,
    homework TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id)
);

CREATE INDEX idx_session_records_booking ON session_records(booking_id);

-- Track email reminders sent
CREATE TABLE email_reminders_sent (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES professor_slot_bookings(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL, -- '1hour' or '24hour'
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, reminder_type)
);
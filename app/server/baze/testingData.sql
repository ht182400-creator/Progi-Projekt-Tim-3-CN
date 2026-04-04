INSERT INTO users (email, password_hash, is_professor, name, surname, profile_picture)
VALUES
    ('ivan.horvat@test.hr', '$2b$10$testhash', true, 'Ivan', 'Horvat', 'profile-1768047062760-891580450.gif'),
    ('ana.kovac@test.hr', '$2b$10$testhash', true, 'Ana', 'Kovač', 'profile-1768047062760-891580450.gif'),
    ('marko.babic@test.hr', '$2b$10$testhash', true, 'Marko', 'Babić', 'profile-1768047062760-891580450.gif'),
    ('petra.maric@test.hr', '$2b$10$testhash', true, 'Petra', 'Marić', 'profile-1768047062760-891580450.gif'),
    ('luka.peric@test.hr', '$2b$10$testhash', true, 'Luka', 'Perić', 'profile-1768047062760-891580450.gif'),
    ('ivana.novak@test.hr', '$2b$10$testhash', true, 'Ivana', 'Novak', 'profile-1768047062760-891580450.gif'),
    ('domagoj.kralj@test.hr', '$2b$10$testhash', true, 'Domagoj', 'Kralj', 'profile-1768047062760-891580450.gif'),
    ('maja.juric@test.hr', '$2b$10$testhash', true, 'Maja', 'Jurić', 'profile-1768047062760-891580450.gif'),
    ('nikola.tomic@test.hr', '$2b$10$testhash', true, 'Nikola', 'Tomić', 'profile-1768047062760-891580450.gif'),
    ('tea.pavic@test.hr', '$2b$10$testhash', true, 'Tea', 'Pavić', 'profile-1768047062760-891580450.gif');

INSERT INTO professors (
    user_id, sex, city, teaching, date_of_birth,
    biography, video_url, reference,
    teaching_type, is_published
)
SELECT
    u.id,
    data.sex,
    data.city,
    data.teaching,
    data.date_of_birth::DATE,
    data.biography,
    data.video_url,
    data.reference,
    data.teaching_type::teaching_type_enum,
    true
FROM users u
         JOIN (
    VALUES
        ('ivan.horvat@test.hr','M','Zagreb','Matematika','1988-04-12','Profesor matematike s 10 godina iskustva.',NULL,'Rad u gimnaziji','Uživo i Online'),
        ('ana.kovac@test.hr','F','Split','Fizika','1990-06-18','Instruktorica fizike za osnovnu i srednju školu.',NULL,'Individualni rad','Online'),
        ('marko.babic@test.hr','M','Rijeka','Informatika','1985-09-03','Programer i instruktor informatike.',NULL,'IT sektor','Uživo'),
        ('petra.maric@test.hr','F','Osijek','Matematika','1993-01-22','Strpljiva i jasna instruktorica matematike.',NULL,'Rad s djecom','Uživo i Online'),
        ('luka.peric@test.hr','M','Zadar','Fizika','1987-11-11','Fizika bez stresa.',NULL,'Pripreme za maturu','Online'),
        ('ivana.novak@test.hr','F','Zagreb','Informatika','1991-05-30','Instrukcije iz informatike i programiranja.',NULL,'Rad u školi','Uživo i Online'),
        ('domagoj.kralj@test.hr','M','Varaždin','Matematika','1984-03-07','Iskusan profesor matematike.',NULL,'Dugogodišnje iskustvo','Uživo'),
        ('maja.juric@test.hr','F','Karlovac','Fizika','1995-08-14','Mladi pristup učenju fizike.',NULL,'Rad sa srednjoškolcima','Online'),
        ('nikola.tomic@test.hr','M','Zagreb','Informatika','1989-12-02','Backend i frontend instrukcije.',NULL,'Rad u IT firmi','Uživo i Online'),
        ('tea.pavic@test.hr','F','Pula','Matematika','1992-07-19','Matematika prilagođena svakom učeniku.',NULL,'Individualni pristup','Uživo')
) AS data(
          email, sex, city, teaching, date_of_birth,
          biography, video_url, reference,
          teaching_type
    )
              ON u.email = data.email;

-- Add sample professor_slots with prices for each professor
-- Past slots (for testing reviews) and future slots (for booking)
INSERT INTO professor_slots (professor_id, start_time, end_time, capacity, teaching_type, price, location, lesson_type)
SELECT 
    u.id,
    NOW() - INTERVAL '7 days' + (s.slot_num * INTERVAL '2 hours'),
    NOW() - INTERVAL '7 days' + (s.slot_num * INTERVAL '2 hours') + INTERVAL '1 hour',
    1,
    p.teaching_type,
    CASE 
        WHEN u.email = 'ivan.horvat@test.hr' THEN 20
        WHEN u.email = 'ana.kovac@test.hr' THEN 18
        WHEN u.email = 'marko.babic@test.hr' THEN 25
        WHEN u.email = 'petra.maric@test.hr' THEN 17
        WHEN u.email = 'luka.peric@test.hr' THEN 19
        WHEN u.email = 'ivana.novak@test.hr' THEN 22
        WHEN u.email = 'domagoj.kralj@test.hr' THEN 21
        WHEN u.email = 'maja.juric@test.hr' THEN 16
        WHEN u.email = 'nikola.tomic@test.hr' THEN 30
        WHEN u.email = 'tea.pavic@test.hr' THEN 18
    END,
    CASE WHEN p.teaching_type IN ('Uživo', 'Uživo i Online') THEN p.city ELSE NULL END,
    '1na1'
FROM users u
JOIN professors p ON p.user_id = u.id
CROSS JOIN generate_series(0, 2) AS s(slot_num)
WHERE u.is_professor = true;

-- Future slots for booking
INSERT INTO professor_slots (professor_id, start_time, end_time, capacity, teaching_type, price, location, lesson_type)
SELECT 
    u.id,
    NOW() + INTERVAL '1 day' + (s.slot_num * INTERVAL '3 hours'),
    NOW() + INTERVAL '1 day' + (s.slot_num * INTERVAL '3 hours') + INTERVAL '1 hour',
    1,
    p.teaching_type,
    CASE 
        WHEN u.email = 'ivan.horvat@test.hr' THEN 20
        WHEN u.email = 'ana.kovac@test.hr' THEN 18
        WHEN u.email = 'marko.babic@test.hr' THEN 25
        WHEN u.email = 'petra.maric@test.hr' THEN 17
        WHEN u.email = 'luka.peric@test.hr' THEN 19
        WHEN u.email = 'ivana.novak@test.hr' THEN 22
        WHEN u.email = 'domagoj.kralj@test.hr' THEN 21
        WHEN u.email = 'maja.juric@test.hr' THEN 16
        WHEN u.email = 'nikola.tomic@test.hr' THEN 30
        WHEN u.email = 'tea.pavic@test.hr' THEN 18
    END,
    CASE WHEN p.teaching_type IN ('Uživo', 'Uživo i Online') THEN p.city ELSE NULL END,
    '1na1'
FROM users u
JOIN professors p ON p.user_id = u.id
CROSS JOIN generate_series(0, 4) AS s(slot_num)
WHERE u.is_professor = true;


INSERT INTO user_interests (user_id, interest_id)
SELECT u.id, i.id
FROM users u
         JOIN interests i ON
    (u.email = 'ivan.horvat@test.hr' AND i.name IN ('Matematika Osnovna Škola','Matematika Srednja Škola'))
        OR (u.email = 'ana.kovac@test.hr' AND i.name IN ('Fizika Osnovna Škola','Fizika Srednja Škola'))
        OR (u.email = 'marko.babic@test.hr' AND i.name IN ('Informatika Srednja Škola'))
        OR (u.email = 'petra.maric@test.hr' AND i.name IN ('Matematika Osnovna Škola'))
        OR (u.email = 'luka.peric@test.hr' AND i.name IN ('Fizika Srednja Škola'))
        OR (u.email = 'ivana.novak@test.hr' AND i.name IN ('Informatika Osnovna Škola','Informatika Srednja Škola'))
        OR (u.email = 'domagoj.kralj@test.hr' AND i.name IN ('Matematika Srednja Škola'))
        OR (u.email = 'maja.juric@test.hr' AND i.name IN ('Fizika Osnovna Škola'))
        OR (u.email = 'nikola.tomic@test.hr' AND i.name IN ('Informatika Srednja Škola'))
        OR (u.email = 'tea.pavic@test.hr' AND i.name IN ('Matematika Osnovna Škola'));

-- =====================================================
-- SAMPLE QUIZZES FOR TESTING
-- =====================================================

-- Quiz 1: Matematika Osnovna Škola
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT 'Osnove matematike - Razlomci', 'Testiraj svoje znanje o razlomcima!', i.id, u.id, 30, true
FROM interests i, users u WHERE i.name = 'Matematika Osnovna Škola' AND u.email = 'ivan.horvat@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koliko je 1/2 + 1/4?', 1, 100 FROM quizzes q WHERE q.title = 'Osnove matematike - Razlomci';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '3/4', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/6', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/6', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/4', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koji razlomak je jednak 0.5?', 2, 100 FROM quizzes q WHERE q.title = 'Osnove matematike - Razlomci';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/2', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/3', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/4', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/3', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koliko je 3/4 - 1/4?', 3, 100 FROM quizzes q WHERE q.title = 'Osnove matematike - Razlomci';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/4 ili 1/2', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '4/4', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/8', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '3/8', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove matematike - Razlomci' AND qq.question_order = 3;

-- Quiz 2: Fizika Osnovna Škola
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT 'Osnove fizike - Sile i gibanje', 'Provjeri svoje znanje o silama!', i.id, u.id, 30, true
FROM interests i, users u WHERE i.name = 'Fizika Osnovna Škola' AND u.email = 'ana.kovac@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koja je mjerna jedinica za silu?', 1, 100 FROM quizzes q WHERE q.title = 'Osnove fizike - Sile i gibanje';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Newton (N)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Kilogram (kg)', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Metar (m)', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Sekunda (s)', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je gravitacija?', 2, 100 FROM quizzes q WHERE q.title = 'Osnove fizike - Sile i gibanje';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Sila privlačenja između masa', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Vrsta energije', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Magnetska sila', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Električna sila', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koliko iznosi gravitacijsko ubrzanje na Zemlji?', 3, 100 FROM quizzes q WHERE q.title = 'Osnove fizike - Sile i gibanje';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '9.81 m/s²', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '10 km/h', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '5 m/s', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '100 N', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove fizike - Sile i gibanje' AND qq.question_order = 3;

-- Quiz 3: Informatika Osnovna Škola
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT 'Osnove informatike', 'Testiraj osnovno znanje o računalima!', i.id, u.id, 25, true
FROM interests i, users u WHERE i.name = 'Informatika Osnovna Škola' AND u.email = 'ivana.novak@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je CPU?', 1, 100 FROM quizzes q WHERE q.title = 'Osnove informatike';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Procesor - mozak računala', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Memorija računala', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Tipkovnica', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Monitor', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koja je kratica za RAM?', 2, 100 FROM quizzes q WHERE q.title = 'Osnove informatike';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Random Access Memory', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Read Always Memory', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Run All Memory', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Really Awesome Machine', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je internet preglednik?', 3, 100 FROM quizzes q WHERE q.title = 'Osnove informatike';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Program za pregledavanje web stranica', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Vrsta računala', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Operativni sustav', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Antivirusni program', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove informatike' AND qq.question_order = 3;

-- Quiz 4: Matematika Srednja Škola
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT 'Kvadratne jednadžbe', 'Testiraj znanje o kvadratnim jednadžbama!', i.id, u.id, 45, true
FROM interests i, users u WHERE i.name = 'Matematika Srednja Škola' AND u.email = 'ivan.horvat@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koja je formula za rješavanje kvadratne jednadžbe ax² + bx + c = 0?', 1, 150 FROM quizzes q WHERE q.title = 'Kvadratne jednadžbe';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = (-b ± √(b²-4ac)) / 2a', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = -b / 2a', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = b² - 4ac', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = a + b + c', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je diskriminanta?', 2, 100 FROM quizzes q WHERE q.title = 'Kvadratne jednadžbe';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = b² - 4ac', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = a + b + c', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = 2a', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = √(a² + b²)', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Ako je D < 0, koliko realnih rješenja ima jednadžba?', 3, 100 FROM quizzes q WHERE q.title = 'Kvadratne jednadžbe';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Nema realnih rješenja', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Jedno rješenje', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Dva rješenja', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Beskonačno rješenja', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 3;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Riješi: x² - 5x + 6 = 0', 4, 150 FROM quizzes q WHERE q.title = 'Kvadratne jednadžbe';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 2 i x = 3', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 1 i x = 6', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = -2 i x = -3', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 5', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kvadratne jednadžbe' AND qq.question_order = 4;

-- Quiz 5: Fizika Srednja Škola
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT 'Kinematika i dinamika', 'Provjeri svoje znanje iz mehanike!', i.id, u.id, 40, true
FROM interests i, users u WHERE i.name = 'Fizika Srednja Škola' AND u.email = 'luka.peric@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koja je formula za brzinu u jednolikog gibanja?', 1, 100 FROM quizzes q WHERE q.title = 'Kinematika i dinamika';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = s / t', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = a × t', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = m × a', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = F / m', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Newtonov drugi zakon glasi:', 2, 150 FROM quizzes q WHERE q.title = 'Kinematika i dinamika';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'F = m × a', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'E = m × c²', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'p = m × v', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'W = F × s', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je impuls sile?', 3, 100 FROM quizzes q WHERE q.title = 'Kinematika i dinamika';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Umnožak sile i vremena djelovanja (F × t)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Umnožak mase i brzine', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Kinetička energija', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Potencijalna energija', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Kinematika i dinamika' AND qq.question_order = 3;

-- Quiz 6: Informatika Srednja Škola
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT 'Osnove programiranja', 'Testiraj znanje o programiranju!', i.id, u.id, 35, true
FROM interests i, users u WHERE i.name = 'Informatika Srednja Škola' AND u.email = 'marko.babic@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je varijabla u programiranju?', 1, 100 FROM quizzes q WHERE q.title = 'Osnove programiranja';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Imenovano mjesto u memoriji za pohranu podataka', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Vrsta petlje', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Programski jezik', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Tip funkcije', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Koja petlja se koristi kada znamo točan broj ponavljanja?', 2, 100 FROM quizzes q WHERE q.title = 'Osnove programiranja';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'for petlja', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'while petlja', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'do-while petlja', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'if naredba', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što ispisuje: console.log(5 + "3")?', 3, 150 FROM quizzes q WHERE q.title = 'Osnove programiranja';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '"53" (string)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '8 (number)', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Error', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'undefined', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 3;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'Što je funkcija u programiranju?', 4, 100 FROM quizzes q WHERE q.title = 'Osnove programiranja';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Blok koda koji obavlja određeni zadatak', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Vrsta varijable', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Tip podatka', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Matematički operator', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = 'Osnove programiranja' AND qq.question_order = 4;

-- Also add a test student user so you can test quizzes
INSERT INTO users (email, password_hash, is_professor, name, surname)
VALUES ('student.test@test.hr', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNe.v9P7F5W/EW', false, 'Test', 'Student');

INSERT INTO students (user_id, sex, city, education, date_of_birth)
SELECT id, 'M', 'Zagreb', 'Srednja škola', '2005-05-15'
FROM users WHERE email = 'student.test@test.hr';

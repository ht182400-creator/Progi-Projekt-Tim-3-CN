INSERT INTO users (email, password_hash, is_professor, name, surname, profile_picture)
VALUES
    ('ivan.horvat@test.hr', '$2b$10$testhash', true, '伊万', '霍尔瓦特', 'profile-1768047062760-891580450.gif'),
    ('ana.kovac@test.hr', '$2b$10$testhash', true, '安娜', '科瓦奇', 'profile-1768047062760-891580450.gif'),
    ('marko.babic@test.hr', '$2b$10$testhash', true, '马尔科', '巴比奇', 'profile-1768047062760-891580450.gif'),
    ('petra.maric@test.hr', '$2b$10$testhash', true, '佩特拉', '马里奇', 'profile-1768047062760-891580450.gif'),
    ('luka.peric@test.hr', '$2b$10$testhash', true, '卢卡', '佩里奇', 'profile-1768047062760-891580450.gif'),
    ('ivana.novak@test.hr', '$2b$10$testhash', true, '伊万娜', '诺瓦克', 'profile-1768047062760-891580450.gif'),
    ('domagoj.kralj@test.hr', '$2b$10$testhash', true, '多马戈伊', '克拉利', 'profile-1768047062760-891580450.gif'),
    ('maja.juric@test.hr', '$2b$10$testhash', true, '玛雅', '尤里奇', 'profile-1768047062760-891580450.gif'),
    ('nikola.tomic@test.hr', '$2b$10$testhash', true, '尼古拉', '托米奇', 'profile-1768047062760-891580450.gif'),
    ('tea.pavic@test.hr', '$2b$10$testhash', true, '特雅', '帕维奇', 'profile-1768047062760-891580450.gif');

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
        ('ivan.horvat@test.hr','M','北京','数学','1988-04-12','拥有10年教学经验的数学教师。',NULL,'在高中任教','线下和线上'),
        ('ana.kovac@test.hr','F','上海','物理','1990-06-18','小学和中学物理辅导教师。',NULL,'个人辅导','线上'),
        ('marko.babic@test.hr','M','广州','信息技术','1985-09-03','程序员兼信息技术辅导教师。',NULL,'IT行业','线下'),
        ('petra.maric@test.hr','F','深圳','数学','1993-01-22','耐心细致的数学辅导教师。',NULL,'儿童教育','线下和线上'),
        ('luka.peric@test.hr','M','成都','物理','1987-11-11','轻松学物理。',NULL,'高考备考','线上'),
        ('ivana.novak@test.hr','F','北京','信息技术','1991-05-30','信息技术与编程辅导。',NULL,'在校任教','线下和线上'),
        ('domagoj.kralj@test.hr','M','武汉','数学','1984-03-07','经验丰富的数学教师。',NULL,'多年教学经验','线下'),
        ('maja.juric@test.hr','F','杭州','物理','1995-08-14','用新颖方式教授物理。',NULL,'中学生辅导','线上'),
        ('nikola.tomic@test.hr','M','北京','信息技术','1989-12-02','前后端开发辅导。',NULL,'IT公司工作','线下和线上'),
        ('tea.pavic@test.hr','F','南京','数学','1992-07-19','因材施教的数学辅导。',NULL,'个性化教学','线下')
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
    CASE WHEN p.teaching_type IN ('线下', '线下和线上') THEN p.city ELSE NULL END,
    '一对一'
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
    CASE WHEN p.teaching_type IN ('线下', '线下和线上') THEN p.city ELSE NULL END,
    '一对一'
FROM users u
JOIN professors p ON p.user_id = u.id
CROSS JOIN generate_series(0, 4) AS s(slot_num)
WHERE u.is_professor = true;


INSERT INTO user_interests (user_id, interest_id)
SELECT u.id, i.id
FROM users u
         JOIN interests i ON
    (u.email = 'ivan.horvat@test.hr' AND i.name IN ('小学数学','中学数学'))
        OR (u.email = 'ana.kovac@test.hr' AND i.name IN ('小学物理','中学物理'))
        OR (u.email = 'marko.babic@test.hr' AND i.name IN ('中学信息学'))
        OR (u.email = 'petra.maric@test.hr' AND i.name IN ('小学数学'))
        OR (u.email = 'luka.peric@test.hr' AND i.name IN ('中学物理'))
        OR (u.email = 'ivana.novak@test.hr' AND i.name IN ('小学信息学','中学信息学'))
        OR (u.email = 'domagoj.kralj@test.hr' AND i.name IN ('中学数学'))
        OR (u.email = 'maja.juric@test.hr' AND i.name IN ('小学物理'))
        OR (u.email = 'nikola.tomic@test.hr' AND i.name IN ('中学信息学'))
        OR (u.email = 'tea.pavic@test.hr' AND i.name IN ('小学数学'));

-- =====================================================
-- SAMPLE QUIZZES FOR TESTING
-- =====================================================

-- 测验1：小学数学
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '数学基础 - 分数', '测试你对分数的掌握程度！', i.id, u.id, 30, true
FROM interests i, users u WHERE i.name = '小学数学' AND u.email = 'ivan.horvat@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '1/2 + 1/4 等于多少？', 1, 100 FROM quizzes q WHERE q.title = '数学基础 - 分数';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '3/4', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/6', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/6', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/4', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '哪个分数等于 0.5？', 2, 100 FROM quizzes q WHERE q.title = '数学基础 - 分数';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/2', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/3', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '1/4', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/3', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '3/4 - 1/4 等于多少？', 3, 100 FROM quizzes q WHERE q.title = '数学基础 - 分数';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/4 即 1/2', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '4/4', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/8', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '3/8', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;

-- 测验2：小学物理
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '物理基础 - 力与运动', '检验你对力学的掌握程度！', i.id, u.id, 30, true
FROM interests i, users u WHERE i.name = '小学物理' AND u.email = 'ana.kovac@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '力的单位是什么？', 1, 100 FROM quizzes q WHERE q.title = '物理基础 - 力与运动';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '牛顿 (N)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '千克 (kg)', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '米 (m)', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '秒 (s)', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是重力？', 2, 100 FROM quizzes q WHERE q.title = '物理基础 - 力与运动';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '质量之间的引力', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一种能量', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '磁力', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '电力', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '地球表面的重力加速度是多少？', 3, 100 FROM quizzes q WHERE q.title = '物理基础 - 力与运动';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '9.81 m/s²', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '10 km/h', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '5 m/s', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '100 N', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;

-- 测验3：小学信息学
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '信息技术基础', '测试你对计算机的基础知识！', i.id, u.id, 25, true
FROM interests i, users u WHERE i.name = '小学信息学' AND u.email = 'ivana.novak@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是 CPU？', 1, 100 FROM quizzes q WHERE q.title = '信息技术基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '处理器 - 计算机的大脑', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '计算机内存', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '键盘', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '显示器', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'RAM 的全称是什么？', 2, 100 FROM quizzes q WHERE q.title = '信息技术基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Random Access Memory（随机存取存储器）', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Read Always Memory', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Run All Memory', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Really Awesome Machine', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是网页浏览器？', 3, 100 FROM quizzes q WHERE q.title = '信息技术基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '用于浏览网页的程序', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一种计算机', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '操作系统', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '杀毒软件', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息技术基础' AND qq.question_order = 3;

-- 测验4：中学数学
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '一元二次方程', '测试你对一元二次方程的掌握程度！', i.id, u.id, 45, true
FROM interests i, users u WHERE i.name = '中学数学' AND u.email = 'ivan.horvat@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '求解一元二次方程 ax² + bx + c = 0 的公式是什么？', 1, 150 FROM quizzes q WHERE q.title = '一元二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = (-b ± √(b²-4ac)) / 2a', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = -b / 2a', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = b² - 4ac', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = a + b + c', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是判别式？', 2, 100 FROM quizzes q WHERE q.title = '一元二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Δ = b² - 4ac', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Δ = a + b + c', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Δ = 2a', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'Δ = √(a² + b²)', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '当 Δ < 0 时，方程有几个实数解？', 3, 100 FROM quizzes q WHERE q.title = '一元二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '没有实数解', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一个解', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '两个解', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '无穷多个解', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 3;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '求解：x² - 5x + 6 = 0', 4, 150 FROM quizzes q WHERE q.title = '一元二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 2 和 x = 3', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 1 和 x = 6', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = -2 和 x = -3', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 5', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '一元二次方程' AND qq.question_order = 4;

-- 测验5：中学物理
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '运动学与动力学', '检验你对力学的掌握程度！', i.id, u.id, 40, true
FROM interests i, users u WHERE i.name = '中学物理' AND u.email = 'luka.peric@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '匀速直线运动的速度公式是什么？', 1, 100 FROM quizzes q WHERE q.title = '运动学与动力学';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = s / t', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = a × t', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = m × a', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'v = F / m', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '牛顿第二定律的表达式是：', 2, 150 FROM quizzes q WHERE q.title = '运动学与动力学';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'F = m × a', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'E = m × c²', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'p = m × v', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'W = F × s', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是冲量？', 3, 100 FROM quizzes q WHERE q.title = '运动学与动力学';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '力与作用时间的乘积 (F × t)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '质量与速度的乘积', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '动能', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '势能', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;

-- 测验6：中学信息学
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '编程基础', '测试你对编程的掌握程度！', i.id, u.id, 35, true
FROM interests i, users u WHERE i.name = '中学信息学' AND u.email = 'marko.babic@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '编程中什么是变量？', 1, 100 FROM quizzes q WHERE q.title = '编程基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '内存中用于存储数据的命名空间', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一种循环', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '编程语言', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '函数类型', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '当我们知道确切循环次数时，应使用哪种循环？', 2, 100 FROM quizzes q WHERE q.title = '编程基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'for 循环', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'while 循环', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'do-while 循环', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'if 语句', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'console.log(5 + "3") 输出什么？', 3, 150 FROM quizzes q WHERE q.title = '编程基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '"53"（字符串）', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '8（数字）', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '报错', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'undefined', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '编程中什么是函数？', 4, 100 FROM quizzes q WHERE q.title = '编程基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '执行特定任务的代码块', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一种变量', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '数据类型', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '数学运算符', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;

-- 添加测试学生账号，用于测试测验功能
INSERT INTO users (email, password_hash, is_professor, name, surname)
VALUES ('student.test@test.hr', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNe.v9P7F5W/EW', false, '测试', '学生');

INSERT INTO users (email, password_hash, is_professor, name, surname)
VALUES ('demo@test', '$2a$12$Ocwij1pNxlWA6YWeHnHJAegdHbtQbqNOa2Mbqgmo0ncyu8oZXUNnm', true, '演示', '教师');

INSERT INTO students (user_id, sex, city, education, date_of_birth)
SELECT id, 'M', '北京', '高中', '2005-05-15'
FROM users WHERE email = 'student.test@test.hr';

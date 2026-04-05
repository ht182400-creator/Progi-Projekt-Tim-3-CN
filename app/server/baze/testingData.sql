INSERT INTO users (email, password_hash, is_professor, name, surname, profile_picture)
VALUES
    ('ivan.horvat@test.hr', '$2b$10$testhash', true, '伊万', '霍瓦特', 'profile-1768047062760-891580450.gif'),
    ('ana.kovac@test.hr', '$2b$10$testhash', true, '安娜', '科瓦奇', 'profile-1768047062760-891580450.gif'),
    ('marko.babic@test.hr', '$2b$10$testhash', true, '马尔科', '巴比奇', 'profile-1768047062760-891580450.gif'),
    ('petra.maric@test.hr', '$2b$10$testhash', true, '佩特拉', '马里奇', 'profile-1768047062760-891580450.gif'),
    ('luka.peric@test.hr', '$2b$10$testhash', true, '卢卡', '佩里奇', 'profile-1768047062760-891580450.gif'),
    ('ivana.novak@test.hr', '$2b$10$testhash', true, '伊万娜', '诺瓦克', 'profile-1768047062760-891580450.gif'),
    ('domagoj.kralj@test.hr', '$2b$10$testhash', true, '多马戈伊', '克拉利', 'profile-1768047062760-891580450.gif'),
    ('maja.juric@test.hr', '$2b$10$testhash', true, '马娅', '尤里奇', 'profile-1768047062760-891580450.gif'),
    ('nikola.tomic@test.hr', '$2b$10$testhash', true, '尼古拉', '托米奇', 'profile-1768047062760-891580450.gif'),
    ('tea.pavic@test.hr', '$2b$10$testhash', true, '特娅', '帕维奇', 'profile-1768047062760-891580450.gif');

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
        ('ivan.horvat@test.hr','M','萨格勒布','数学','1988-04-12','拥有10年经验的数学老师',NULL,'高中教学经历','线下和线上'),
        ('ana.kovac@test.hr','F','斯普利特','物理','1990-06-18','小学和中学物理辅导老师（女）',NULL,'一对一教学','线上'),
        ('marko.babic@test.hr','M','里耶卡','信息学','1985-09-03','程序员与计算机科学导师',NULL,'IT行业经验','线下'),
        ('petra.maric@test.hr','F','奥西耶克','数学','1993-01-22','耐心又条理分明的数学辅导老师（女）',NULL,'儿童教学经验','线下和线上'),
        ('luka.peric@test.hr','M','扎达尔','物理','1987-11-11','轻松学物理',NULL,'毕业考试准备','线上'),
        ('ivana.novak@test.hr','F','萨格勒布','信息学','1991-05-30','信息学与编程指导',NULL,'学校教学经验','线下和线上'),
        ('domagoj.kralj@test.hr','M','瓦拉日丁','数学','1984-03-07','经验丰富的数学老师',NULL,'多年经验','线下'),
        ('maja.juric@test.hr','F','卡尔洛瓦茨','物理','1995-08-14','面向年轻人的物理学习方法',NULL,'高中生教学经验','线上'),
        ('nikola.tomic@test.hr','M','萨格勒布','信息学','1989-12-02','后端和前端教学指导',NULL,'IT行业经验','线下和线上'),
        ('tea.pavic@test.hr','F','普拉','数学','1992-07-19','为每个学生量身定制的数学',NULL,'个性化指导','线下')
) AS data(
          email, sex, city, teaching, date_of_birth,
          biography, video_url, reference,
          teaching_type
    )
              ON u.email = data.email;

-- 为每位教授添加示例时间段（含价格）
-- 过去的时间段（用于测试评价）和未来的时间段（用于预约）
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

-- 未来的时间段（用于预约）
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
        OR (u.email = 'marko.babic@test.hr' AND i.name IN ('中学物理'))
        OR (u.email = 'petra.maric@test.hr' AND i.name IN ('小学数学'))
        OR (u.email = 'luka.peric@test.hr' AND i.name IN ('中学物理'))
        OR (u.email = 'ivana.novak@test.hr' AND i.name IN ('小学物理','中学物理'))
        OR (u.email = 'domagoj.kralj@test.hr' AND i.name IN ('中学数学'))
        OR (u.email = 'maja.juric@test.hr' AND i.name IN ('小学物理'))
        OR (u.email = 'nikola.tomic@test.hr' AND i.name IN ('中学物理'))
        OR (u.email = 'tea.pavic@test.hr' AND i.name IN ('小学数学'));

-- =====================================================
-- 示例测验数据
-- =====================================================

-- 测验1：小学数学
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '数学基础 - 分数', '来挑战一下分数的知识吧！', i.id, u.id, 30, true
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
SELECT q.id, '哪个分数等于0.5？', 2, 100 FROM quizzes q WHERE q.title = '数学基础 - 分数';
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
SELECT qq.id, '2/4 或者 1/2', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '4/4', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '2/8', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '3/8', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '数学基础 - 分数' AND qq.question_order = 3;

-- 测验2：小学物理
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '物理基础 - 力与运动', '检验一下你的力学知识吧！', i.id, u.id, 30, true
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
SELECT q.id, '重力是什么？', 2, 100 FROM quizzes q WHERE q.title = '物理基础 - 力与运动';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '质量之间的引力', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '能量类型', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '磁力', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '电力', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '地球上的重力加速度是多少？', 3, 100 FROM quizzes q WHERE q.title = '物理基础 - 力与运动';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '9.81 m/s²', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '10 km/h', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '5 m/s', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '100 N', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '物理基础 - 力与运动' AND qq.question_order = 3;

-- 测验3：信息学基础
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '信息学基础', '测试你的计算机基础知识！', i.id, u.id, 25, true
FROM interests i, users u WHERE i.name = '小学信息学' AND u.email = 'ivana.novak@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是 CPU？', 1, 100 FROM quizzes q WHERE q.title = '信息学基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '处理器 - 计算机的大脑', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '计算机内存', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '键盘', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '显示器', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, 'RAM 的缩写是什么？', 2, 100 FROM quizzes q WHERE q.title = '信息学基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '随机存取存储器', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '只读存储器', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '运行内存', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '真正了不起的机器', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是互联网浏览器？', 3, 100 FROM quizzes q WHERE q.title = '信息学基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '网页浏览器', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '计算机类型', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '操作系统', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '杀毒软件', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '信息学基础' AND qq.question_order = 3;

-- 测验4：中学数学
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '二次方程', '测试你对二次方程的知识！', i.id, u.id, 45, true
FROM interests i, users u WHERE i.name = '中学数学' AND u.email = 'ivan.horvat@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '解二次方程 ax² + bx + c = 0 的公式是什么？', 1, 150 FROM quizzes q WHERE q.title = '二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = (-b ± √(b²-4ac)) / 2a', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = -b / 2a', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = b² - 4ac', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = a + b + c', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是判别式？', 2, 100 FROM quizzes q WHERE q.title = '二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = b² - 4ac', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = a + b + c', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = 2a', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 2;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'D = √(a² + b²)', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 2;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '如果 D < 0，方程有多少个实数解？', 3, 100 FROM quizzes q WHERE q.title = '二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '没有实数解', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一个解', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '两个解', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '无穷多解', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 3;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '解方程：x² - 5x + 6 = 0', 4, 150 FROM quizzes q WHERE q.title = '二次方程';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 2 和 x = 3', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 1 和 x = 6', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = -2 和 x = -3', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'x = 5', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '二次方程' AND qq.question_order = 4;

-- 测验5：中学物理
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '运动学与动力学', '测试你的力学知识！', i.id, u.id, 40, true
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
SELECT q.id, '牛顿第二定律的内容是：', 2, 150 FROM quizzes q WHERE q.title = '运动学与动力学';
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
SELECT qq.id, '力和作用时间的乘积 (F × t)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '质量和速度的乘积', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '动能', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '势能', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '运动学与动力学' AND qq.question_order = 3;

-- 测验6：编程基础
INSERT INTO quizzes (title, description, interest_id, professor_id, time_limit, is_published)
SELECT '编程基础', '测试你的编程知识！', i.id, u.id, 35, true
FROM interests i, users u WHERE i.name = '中学信息学' AND u.email = 'marko.babic@test.hr';

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '编程中的变量是什么？', 1, 100 FROM quizzes q WHERE q.title = '编程基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '内存中用于存储数据的命名位置', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '一种循环类型', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '编程语言', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '函数类型', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 1;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '当知道确切重复次数时，应该使用哪种循环？', 2, 100 FROM quizzes q WHERE q.title = '编程基础';
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
SELECT qq.id, '"53" (字符串)', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '8 (数字)', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '错误', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, 'undefined', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 3;

INSERT INTO quiz_questions (quiz_id, question_text, question_order, points)
SELECT q.id, '什么是编程中的函数？', 4, 100 FROM quizzes q WHERE q.title = '编程基础';
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '执行特定任务的代码块', true, 1 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '变量类型', false, 2 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '数据类型', false, 3 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;
INSERT INTO quiz_answers (question_id, answer_text, is_correct, answer_order)
SELECT qq.id, '数学运算符', false, 4 FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.title = '编程基础' AND qq.question_order = 4;

-- 添加一个测试学生用户，以便测试测验
INSERT INTO users (email, password_hash, is_professor, name, surname)
VALUES ('student.test@test.hr', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNe.v9P7F5W/EW', false, '测试', '学生');

INSERT INTO students (user_id, sex, city, education, date_of_birth)
SELECT id, 'M', '萨格勒布', '中学', '2005-05-15'
FROM users WHERE email = 'student.test@test.hr';
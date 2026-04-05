import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import styles from "./CreateQuiz.module.css";

export default function CreateQuiz() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [quiz, setQuiz] = useState({
        title: "",
        description: "",
        interest_id: "",
        time_limit: 30,
        questions: [
            {
                question_text: "",
                points: 100,
                answers: [
                    { answer_text: "", is_correct: true },
                    { answer_text: "", is_correct: false },
                    { answer_text: "", is_correct: false },
                    { answer_text: "", is_correct: false }
                ]
            }
        ]
    });

    const interestsList = [
        { id: 1, name: "小学数学" },
        { id: 2, name: "小学物理" },
        { id: 3, name: "小学信息学" },
        { id: 4, name: "中学数学" },
        { id: 5, name: "中学物理" },
        { id: 6, name: "中学信息学" }
    ];

    const answerColors = ["red", "blue", "yellow", "green"];

    if (!user?.is_professor) {
        return (
            <div className={styles.page}>
                <h1>访问被拒绝</h1>
                <p>只有教师可以创建测验.</p>
            </div>
        );
    }

    const addQuestion = () => {
        setQuiz(q => ({
            ...q,
            questions: [...q.questions, {
                question_text: "",
                points: 100,
                answers: [
                    { answer_text: "", is_correct: true },
                    { answer_text: "", is_correct: false },
                    { answer_text: "", is_correct: false },
                    { answer_text: "", is_correct: false }
                ]
            }]
        }));
    };

    const removeQuestion = (index) => {
        if (quiz.questions.length <= 1) return;
        setQuiz(q => ({
            ...q,
            questions: q.questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, field, value) => {
        setQuiz(q => ({
            ...q,
            questions: q.questions.map((question, i) => 
                i === index ? { ...question, [field]: value } : question
            )
        }));
    };

    const updateAnswer = (qIndex, aIndex, field, value) => {
        setQuiz(q => ({
            ...q,
            questions: q.questions.map((question, qi) => {
                if (qi !== qIndex) return question;
                return {
                    ...question,
                    answers: question.answers.map((answer, ai) => {
                        if (field === "is_correct" && value === true) {
                            // Only one correct answer
                            return ai === aIndex 
                                ? { ...answer, is_correct: true }
                                : { ...answer, is_correct: false };
                        }
                        return ai === aIndex ? { ...answer, [field]: value } : answer;
                    })
                };
            })
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Validation
            if (!quiz.title.trim()) {
                throw new Error("Naslov je obavezan.");
            }
            if (!quiz.interest_id) {
                throw new Error("选择te predmet.");
            }

            for (let i = 0; i < quiz.questions.length; i++) {
                const q = quiz.questions[i];
                if (!q.question_text.trim()) {
                    throw new Error(`Pitanje ${i + 1} nema tekst.`);
                }
                const filledAnswers = q.answers.filter(a => a.answer_text.trim());
                if (filledAnswers.length < 2) {
                    throw new Error(`Pitanje ${i + 1} mora imati barem 2 odgovora.`);
                }
                if (!filledAnswers.some(a => a.is_correct)) {
                    throw new Error(`Pitanje ${i + 1} mora imati označen točan odgovor.`);
                }
            }

            // Filter out empty answers
            const cleanedQuiz = {
                ...quiz,
                questions: quiz.questions.map(q => ({
                    ...q,
                    answers: q.answers.filter(a => a.answer_text.trim())
                }))
            };

            await api.post("/quizzes", cleanedQuiz);
            navigate("/quizzes");
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
            <div className={styles.header}>
                <h1>创建新测验</h1>
                <button className={styles.backBtn} onClick={() => navigate("/quizzes")}>
                    ← 返回
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.section}>
                    <h2>基本信息</h2>
                    <div className={styles.formGroup}>
                        <label>测验标题 *</label>
                        <input
                            type="text"
                            value={quiz.title}
                            onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))}
                            placeholder="例如. 数学 - 二次方程"
                            maxLength={200}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>描述 (可选)</label>
                        <textarea
                            value={quiz.description}
                            onChange={e => setQuiz(q => ({ ...q, description: e.target.value }))}
                            placeholder="测验简短描述..."
                            maxLength={500}
                            rows={3}
                        />
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>科目 *</label>
                            <select
                                value={quiz.interest_id}
                                onChange={e => setQuiz(q => ({ ...q, interest_id: e.target.value }))}
                            >
                                <option value="">选择 predmet</option>
                                {interestsList.map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>每题时间 (秒)</label>
                            <input
                                type="number"
                                value={quiz.time_limit}
                                onChange={e => setQuiz(q => ({ ...q, time_limit: parseInt(e.target.value) || 30 }))}
                                min={10}
                                max={120}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.questionsSection}>
                    <h2>问题</h2>
                    
                    {quiz.questions.map((question, qIndex) => (
                        <div key={qIndex} className={styles.questionCard}>
                            <div className={styles.questionHeader}>
                                <span className={styles.questionNumber}>Pitanje {qIndex + 1}</span>
                                {quiz.questions.length > 1 && (
                                    <button 
                                        type="button" 
                                        className={styles.removeBtn}
                                        onClick={() => removeQuestion(qIndex)}
                                    >
                                        ✕ Ukloni
                                    </button>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <input
                                    type="text"
                                    value={question.question_text}
                                    onChange={e => updateQuestion(qIndex, "question_text", e.target.value)}
                                    placeholder="输入问题..."
                                    className={styles.questionInput}
                                    maxLength={500}
                                />
                            </div>

                            <div className={styles.answersGrid}>
                                {question.answers.map((answer, aIndex) => (
                                    <div 
                                        key={aIndex} 
                                        className={`${styles.answerCard} ${styles[answerColors[aIndex]]}`}
                                    >
                                        <input
                                            type="text"
                                            value={answer.answer_text}
                                            onChange={e => updateAnswer(qIndex, aIndex, "answer_text", e.target.value)}
                                            placeholder={`Odgovor ${aIndex + 1}`}
                                            maxLength={300}
                                        />
                                        <label className={styles.correctLabel}>
                                            <input
                                                type="radio"
                                                name={`correct-${qIndex}`}
                                                checked={answer.is_correct}
                                                onChange={() => updateAnswer(qIndex, aIndex, "is_correct", true)}
                                            />
                                            Točan
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.pointsRow}>
                                <label>分数 za ovo pitanje:</label>
                                <input
                                    type="number"
                                    value={question.points}
                                    onChange={e => updateQuestion(qIndex, "points", parseInt(e.target.value) || 100)}
                                    min={10}
                                    max={1000}
                                    className={styles.pointsInput}
                                />
                            </div>
                        </div>
                    ))}

                    <button 
                        type="button" 
                        className={styles.addQuestionBtn}
                        onClick={addQuestion}
                    >
                        + Dodaj pitanje
                    </button>
                </div>

                <div className={styles.submitSection}>
                    <button 
                        type="submit" 
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? "Spremanje..." : "Spremi kviz"}
                    </button>
                    <p className={styles.hint}>
                        Kviz će biti spremljen kao skica. Možete ga objaviti kasnije.
                    </p>
                </div>
            </form>
        </div>
        </div>
    );
}

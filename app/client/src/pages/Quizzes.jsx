import { useEffect, useState, useContext } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import styles from "./Quizzes.module.css";

export default function Quizzes() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [quizzes, setQuizzes] = useState([]);
    const [myQuizzes, setMyQuizzes] = useState([]);
    const [myResults, setMyResults] = useState([]);
    const [filters, setFilters] = useState({ search: "", interest_id: "" });
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);

    const interestsList = [
        { id: 1, name: "小学数学" },
        { id: 2, name: "小学物理" },
        { id: 3, name: "小学信息学" },
        { id: 4, name: "中学数学" },
        { id: 5, name: "中学物理" },
        { id: 6, name: "中学信息学" }
    ];

    useEffect(() => {
        fetchQuizzes();
        if (user?.is_professor) {
            fetchMyQuizzes();
        } else if (user && !user.is_professor) {
            fetchMyResults();
        }
    }, [filters, user]);

    const fetchQuizzes = async () => {
        try {
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.interest_id) params.interest_id = filters.interest_id;
            
            const res = await api.get("/quizzes", { params });
            setQuizzes(res.data.quizzes);
        } catch (err) {
            console.error("Error fetching quizzes:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyQuizzes = async () => {
        try {
            const res = await api.get("/quizzes/my-quizzes");
            setMyQuizzes(res.data.quizzes);
        } catch (err) {
            console.error("Error fetching my quizzes:", err);
        }
    };

    const fetchMyResults = async () => {
        try {
            const res = await api.get("/quizzes/my-results");
            setMyResults(res.data.results);
        } catch (err) {
            console.error("Error fetching results:", err);
        }
    };

    const togglePublish = async (quizId, isPublished) => {
        try {
            await api.patch(`/quizzes/${quizId}/publish`, { is_published: !isPublished });
            fetchMyQuizzes();
        } catch (err) {
            console.error("Error toggling publish:", err);
        }
    };

    const deleteQuiz = async (quizId) => {
        if (!window.confirm("Jeste li sigurni da želite obrisati ovaj kviz?")) return;
        try {
            await api.delete(`/quizzes/${quizId}`);
            fetchMyQuizzes();
        } catch (err) {
            console.error("Error deleting quiz:", err);
        }
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 80) return styles.scoreExcellent;
        if (percentage >= 60) return styles.scoreGood;
        if (percentage >= 40) return styles.scoreFair;
        return styles.scorePoor;
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>测验</h1>
                <p>通过有趣的测验测试你的知识！</p>
            </div>

            {user && (
                <div className={styles.tabs}>
                    <button 
                        className={activeTab === "all" ? styles.activeTab : ""} 
                        onClick={() => setActiveTab("all")}
                    >
                        所有测验
                    </button>
                    {user.is_professor ? (
                        <>
                            <button 
                                className={activeTab === "my" ? styles.activeTab : ""} 
                                onClick={() => setActiveTab("my")}
                            >
                                我的测验
                            </button>
                            <button 
                                className={styles.createBtn}
                                onClick={() => navigate("/quizzes/create")}
                            >
                                + 创建测验
                            </button>
                        </>
                    ) : (
                        <button 
                            className={activeTab === "results" ? styles.activeTab : ""} 
                            onClick={() => setActiveTab("results")}
                        >
                            我的成绩
                        </button>
                    )}
                </div>
            )}

            {activeTab === "all" && (
                <>
                    <div className={styles.filters}>
                        <input
                            placeholder="搜索测验..."
                            value={filters.search}
                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                        />
                        <select
                            value={filters.interest_id}
                            onChange={e => setFilters(f => ({ ...f, interest_id: e.target.value }))}
                        >
                            <option value="">所有科目</option>
                            {interestsList.map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.grid}>
                        {loading ? (
                            <p className={styles.loading}>Učitavanje...</p>
                        ) : quizzes.length === 0 ? (
                            <p className={styles.empty}>没有可用的测验.</p>
                        ) : (
                            quizzes.map(q => (
                                <div key={q.id} className={styles.card} onClick={() => navigate(`/quizzes/${q.id}`)}>
                                    <div className={styles.cardIcon}>🎯</div>
                                    <h3>{q.title}</h3>
                                    <span className={styles.subject}>{q.interest_name}</span>
                                    {q.description && <p>{q.description}</p>}
                                    <div className={styles.cardMeta}>
                                        <span>⏱️ {q.time_limit}s 每题</span>
                                        <span>❓ {q.question_count} 问题</span>
                                    </div>
                                    <div className={styles.author}>
                                        Autor: {q.professor_name} {q.professor_surname}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === "my" && user?.is_professor && (
                <div className={styles.grid}>
                    {myQuizzes.length === 0 ? (
                        <p className={styles.empty}>您没有创建的测验.</p>
                    ) : (
                        myQuizzes.map(q => (
                            <div key={q.id} className={styles.card}>
                                <div className={styles.cardIcon}>{q.is_published ? "✅" : "📝"}</div>
                                <h3>{q.title}</h3>
                                <span className={styles.subject}>{q.interest_name}</span>
                                <div className={styles.cardMeta}>
                                    <span>❓ {q.question_count} 问题</span>
                                    <span>👥 {q.attempt_count} pokušaja</span>
                                </div>
                                <div className={styles.cardActions}>
                                    <button 
                                        className={q.is_published ? styles.unpublishBtn : styles.publishBtn}
                                        onClick={() => togglePublish(q.id, q.is_published)}
                                    >
                                        {q.is_published ? "Sakrij" : "Objavi"}
                                    </button>
                                    <button 
                                        className={styles.deleteBtn}
                                        onClick={() => deleteQuiz(q.id)}
                                    >
                                        Obriši
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "results" && !user?.is_professor && (
                <div className={styles.resultsList}>
                    {myResults.length === 0 ? (
                        <p className={styles.empty}>您尚未解决任何测验.</p>
                    ) : (
                        myResults.map(r => (
                            <div key={r.id} className={styles.resultCard}>
                                <div className={styles.resultInfo}>
                                    <h3>{r.quiz_title}</h3>
                                    <span className={styles.subject}>{r.interest_name}</span>
                                    <p>Autor: {r.professor_name} {r.professor_surname}</p>
                                    <small>{new Date(r.completed_at).toLocaleDateString('hr-HR')}</small>
                                </div>
                                <div className={`${styles.resultScore} ${getScoreColor(r.percentage)}`}>
                                    <span className={styles.percentage}>{r.percentage}%</span>
                                    <span className={styles.points}>{r.score}/{r.total_points} bodova</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

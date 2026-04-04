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
        { id: 1, name: "Matematika Osnovna Škola" },
        { id: 2, name: "Fizika Osnovna Škola" },
        { id: 3, name: "Informatika Osnovna Škola" },
        { id: 4, name: "Matematika Srednja Škola" },
        { id: 5, name: "Fizika Srednja Škola" },
        { id: 6, name: "Informatika Srednja Škola" }
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
                <h1>Kvizovi</h1>
                <p>Testiraj svoje znanje uz zabavne kvizove!</p>
            </div>

            {user && (
                <div className={styles.tabs}>
                    <button 
                        className={activeTab === "all" ? styles.activeTab : ""} 
                        onClick={() => setActiveTab("all")}
                    >
                        Svi kvizovi
                    </button>
                    {user.is_professor ? (
                        <>
                            <button 
                                className={activeTab === "my" ? styles.activeTab : ""} 
                                onClick={() => setActiveTab("my")}
                            >
                                Moji kvizovi
                            </button>
                            <button 
                                className={styles.createBtn}
                                onClick={() => navigate("/quizzes/create")}
                            >
                                + Kreiraj kviz
                            </button>
                        </>
                    ) : (
                        <button 
                            className={activeTab === "results" ? styles.activeTab : ""} 
                            onClick={() => setActiveTab("results")}
                        >
                            Moji rezultati
                        </button>
                    )}
                </div>
            )}

            {activeTab === "all" && (
                <>
                    <div className={styles.filters}>
                        <input
                            placeholder="Pretraži kvizove..."
                            value={filters.search}
                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                        />
                        <select
                            value={filters.interest_id}
                            onChange={e => setFilters(f => ({ ...f, interest_id: e.target.value }))}
                        >
                            <option value="">Svi predmeti</option>
                            {interestsList.map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.grid}>
                        {loading ? (
                            <p className={styles.loading}>Učitavanje...</p>
                        ) : quizzes.length === 0 ? (
                            <p className={styles.empty}>Nema dostupnih kvizova.</p>
                        ) : (
                            quizzes.map(q => (
                                <div key={q.id} className={styles.card} onClick={() => navigate(`/quizzes/${q.id}`)}>
                                    <div className={styles.cardIcon}>🎯</div>
                                    <h3>{q.title}</h3>
                                    <span className={styles.subject}>{q.interest_name}</span>
                                    {q.description && <p>{q.description}</p>}
                                    <div className={styles.cardMeta}>
                                        <span>⏱️ {q.time_limit}s po pitanju</span>
                                        <span>❓ {q.question_count} pitanja</span>
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
                        <p className={styles.empty}>Nemate kreiranih kvizova.</p>
                    ) : (
                        myQuizzes.map(q => (
                            <div key={q.id} className={styles.card}>
                                <div className={styles.cardIcon}>{q.is_published ? "✅" : "📝"}</div>
                                <h3>{q.title}</h3>
                                <span className={styles.subject}>{q.interest_name}</span>
                                <div className={styles.cardMeta}>
                                    <span>❓ {q.question_count} pitanja</span>
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
                        <p className={styles.empty}>Još niste riješili nijedan kviz.</p>
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

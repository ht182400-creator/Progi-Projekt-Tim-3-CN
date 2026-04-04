import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import styles from "./TakeQuiz.module.css";

export default function TakeQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Game state
    const [gameState, setGameState] = useState("intro"); // intro, playing, feedback, finished
    const [attemptId, setAttemptId] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [score, setScore] = useState(0);
    const [finalResults, setFinalResults] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    
    const questionStartTime = useRef(null);
    const timerRef = useRef(null);

    const answerColors = ["red", "blue", "yellow", "green"];
    const answerShapes = ["▲", "◆", "●", "■"];

    useEffect(() => {
        fetchQuiz();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id]);

    const fetchQuiz = async () => {
        try {
            const res = await api.get(`/quizzes/${id}`);
            setQuiz(res.data.quiz);
            setQuestions(res.data.questions);
        } catch (err) {
            setError(err.response?.data?.message || "Kviz nije pronađen.");
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get(`/quizzes/${id}/leaderboard`);
            setLeaderboard(res.data.leaderboard);
        } catch (err) {
            console.error("Error fetching leaderboard:", err);
        }
    };

    const startQuiz = async () => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (user.is_professor) {
            setError("Samo učenici mogu rješavati kvizove.");
            return;
        }

        try {
            const res = await api.post(`/quizzes/${id}/start`);
            setAttemptId(res.data.attempt_id);
            setGameState("playing");
            setCurrentQuestion(0);
            setScore(0);
            startTimer();
        } catch (err) {
            setError(err.response?.data?.message || "Greška pri pokretanju kviza.");
        }
    };

    const startTimer = useCallback(() => {
        if (!quiz) return;
        
        setTimeLeft(quiz.time_limit);
        questionStartTime.current = Date.now();
        
        if (timerRef.current) clearInterval(timerRef.current);
        
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [quiz]);

    const handleTimeout = () => {
        if (selectedAnswer === null) {
            // No answer selected, submit with no answer
            submitAnswer(null);
        }
    };

    const selectAnswer = async (answerId) => {
        if (selectedAnswer !== null || gameState !== "playing") return;
        
        setSelectedAnswer(answerId);
        clearInterval(timerRef.current);
        
        await submitAnswer(answerId);
    };

    const submitAnswer = async (answerId) => {
        const timeTaken = Date.now() - questionStartTime.current;
        const question = questions[currentQuestion];
        
        try {
            const res = await api.post(`/quizzes/attempt/${attemptId}/answer`, {
                question_id: question.id,
                answer_id: answerId,
                time_taken: timeTaken
            });
            
            setFeedback({
                isCorrect: res.data.is_correct,
                pointsEarned: res.data.points_earned,
                correctAnswer: res.data.correct_answer
            });
            
            if (res.data.is_correct) {
                setScore(prev => prev + res.data.points_earned);
            }
            
            setGameState("feedback");
        } catch (err) {
            console.error("Error submitting answer:", err);
        }
    };

    const nextQuestion = () => {
        setSelectedAnswer(null);
        setFeedback(null);
        
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            setGameState("playing");
            startTimer();
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = async () => {
        try {
            const res = await api.post(`/quizzes/attempt/${attemptId}/complete`);
            setFinalResults(res.data);
            setGameState("finished");
            fetchLeaderboard();
        } catch (err) {
            console.error("Error finishing quiz:", err);
        }
    };

    const getTimerColor = () => {
        if (timeLeft > quiz?.time_limit * 0.5) return styles.timerGreen;
        if (timeLeft > quiz?.time_limit * 0.25) return styles.timerYellow;
        return styles.timerRed;
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner}></div>
                <p>Učitavanje kviza...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorScreen}>
                <h2>Greška</h2>
                <p>{error}</p>
                <button onClick={() => navigate("/quizzes")}>Natrag na kvizove</button>
            </div>
        );
    }

    // INTRO SCREEN
    if (gameState === "intro") {
        return (
            <div className={styles.introScreen}>
                <div className={styles.introCard}>
                    <div className={styles.introIcon}>🎯</div>
                    <h1>{quiz.title}</h1>
                    <span className={styles.subject}>{quiz.interest_name}</span>
                    {quiz.description && <p className={styles.description}>{quiz.description}</p>}
                    
                    <div className={styles.introStats}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{questions.length}</span>
                            <span className={styles.statLabel}>Pitanja</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{quiz.time_limit}s</span>
                            <span className={styles.statLabel}>Po pitanju</span>
                        </div>
                    </div>
                    
                    <div className={styles.author}>
                        Autor: {quiz.professor_name} {quiz.professor_surname}
                    </div>
                    
                    <button className={styles.startBtn} onClick={startQuiz}>
                        Započni kviz!
                    </button>
                    
                    <button className={styles.backBtn} onClick={() => navigate("/quizzes")}>
                        ← Natrag
                    </button>
                </div>
            </div>
        );
    }

    // PLAYING / FEEDBACK SCREEN
    if (gameState === "playing" || gameState === "feedback") {
        const question = questions[currentQuestion];
        
        return (
            <div className={styles.gameScreen}>
                {/* Header */}
                <div className={styles.gameHeader}>
                    <div className={styles.questionCounter}>
                        {currentQuestion + 1} / {questions.length}
                    </div>
                    <div className={styles.scoreDisplay}>
                        <span className={styles.scoreLabel}>Bodovi</span>
                        <span className={styles.scoreValue}>{score}</span>
                    </div>
                </div>

                {/* Timer Bar */}
                <div className={styles.timerBar}>
                    <div 
                        className={`${styles.timerProgress} ${getTimerColor()}`}
                        style={{ width: `${(timeLeft / quiz.time_limit) * 100}%` }}
                    ></div>
                </div>

                {/* Timer Circle */}
                <div className={`${styles.timerCircle} ${getTimerColor()}`}>
                    {timeLeft}
                </div>

                {/* Question */}
                <div className={styles.questionBox}>
                    <h2>{question.question_text}</h2>
                    <span className={styles.points}>{question.points} bodova</span>
                </div>

                {/* Answers */}
                <div className={styles.answersContainer}>
                    {question.answers.map((answer, index) => {
                        let answerClass = styles[answerColors[index]];
                        
                        if (gameState === "feedback") {
                            if (feedback?.correctAnswer?.id === answer.id) {
                                answerClass = `${answerClass} ${styles.correctAnswer}`;
                            } else if (selectedAnswer === answer.id && !feedback?.isCorrect) {
                                answerClass = `${answerClass} ${styles.wrongAnswer}`;
                            } else {
                                answerClass = `${answerClass} ${styles.dimmed}`;
                            }
                        }
                        
                        if (selectedAnswer === answer.id && gameState === "playing") {
                            answerClass = `${answerClass} ${styles.selected}`;
                        }

                        return (
                            <button
                                key={answer.id}
                                className={`${styles.answerBtn} ${answerClass}`}
                                onClick={() => selectAnswer(answer.id)}
                                disabled={gameState === "feedback" || selectedAnswer !== null}
                            >
                                <span className={styles.answerShape}>{answerShapes[index]}</span>
                                <span className={styles.answerText}>{answer.answer_text}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Feedback Overlay */}
                {gameState === "feedback" && (
                    <div className={styles.feedbackOverlay}>
                        <div className={`${styles.feedbackCard} ${feedback?.isCorrect ? styles.correct : styles.wrong}`}>
                            <div className={styles.feedbackIcon}>
                                {feedback?.isCorrect ? "✓" : "✕"}
                            </div>
                            <h3>{feedback?.isCorrect ? "Točno!" : "Netočno!"}</h3>
                            {feedback?.isCorrect && (
                                <p className={styles.pointsEarned}>+{feedback.pointsEarned} bodova</p>
                            )}
                            {!feedback?.isCorrect && (
                                <p className={styles.correctAnswerText}>
                                    Točan odgovor: {feedback?.correctAnswer?.answer_text}
                                </p>
                            )}
                            <button className={styles.nextBtn} onClick={nextQuestion}>
                                {currentQuestion < questions.length - 1 ? "Sljedeće pitanje" : "Završi kviz"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // FINISHED SCREEN
    if (gameState === "finished") {
        return (
            <div className={styles.finishedScreen}>
                <div className={styles.resultsCard}>
                    <div className={styles.trophy}>🏆</div>
                    <h1>Kviz završen!</h1>
                    
                    <div className={styles.finalScore}>
                        <span className={styles.scoreNumber}>{finalResults?.score}</span>
                        <span className={styles.scoreDivider}>/</span>
                        <span className={styles.totalPoints}>{finalResults?.total_points}</span>
                    </div>
                    
                    <div className={styles.percentage}>
                        {finalResults?.percentage}%
                    </div>
                    
                    <div className={styles.ratingText}>
                        {finalResults?.percentage >= 80 && "Odlično! 🎉"}
                        {finalResults?.percentage >= 60 && finalResults?.percentage < 80 && "Vrlo dobro! 👏"}
                        {finalResults?.percentage >= 40 && finalResults?.percentage < 60 && "Dobro! 👍"}
                        {finalResults?.percentage < 40 && "Nastavi vježbati! 💪"}
                    </div>

                    {leaderboard.length > 0 && (
                        <div className={styles.leaderboard}>
                            <h3>🏅 Ljestvica</h3>
                            {leaderboard.slice(0, 5).map((entry, index) => (
                                <div key={index} className={styles.leaderboardEntry}>
                                    <span className={styles.rank}>#{index + 1}</span>
                                    <span className={styles.name}>{entry.name} {entry.surname}</span>
                                    <span className={styles.lbScore}>{entry.best_score}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.finishedActions}>
                        <button className={styles.retryBtn} onClick={() => {
                            setGameState("intro");
                            setAttemptId(null);
                            setScore(0);
                            setCurrentQuestion(0);
                        }}>
                            Pokušaj ponovo
                        </button>
                        <button className={styles.backBtn} onClick={() => navigate("/quizzes")}>
                            Svi kvizovi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

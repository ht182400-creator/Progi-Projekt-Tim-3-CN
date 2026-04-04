import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api";
import { getImageUrl } from "../api";
import { AuthContext } from "../context/AuthContext";
import styles from "./Admin.module.css";

export default function Admin() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState("analytics");
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Users state
    const [users, setUsers] = useState([]);
    const [userFilters, setUserFilters] = useState({ search: "", role: "", status: "" });
    const [usersLoading, setUsersLoading] = useState(false);
    
    // Interests state
    const [interests, setInterests] = useState([]);
    const [newInterest, setNewInterest] = useState("");
    const [editingInterest, setEditingInterest] = useState(null);
    
    // Analytics state
    const [analytics, setAnalytics] = useState(null);
    
    // Messages
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        checkAdmin();
    }, []);

    useEffect(() => {
        if (isAdmin && activeTab === "users") {
            fetchUsers();
        } else if (isAdmin && activeTab === "interests") {
            fetchInterests();
        } else if (isAdmin && activeTab === "analytics") {
            fetchAnalytics();
        }
    }, [isAdmin, activeTab, userFilters]);

    const checkAdmin = async () => {
        try {
            const res = await axios.get("/admin/check");
            if (!res.data.isAdmin) {
                navigate("/");
                return;
            }
            setIsAdmin(true);
        } catch (err) {
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await axios.get("/admin/users", { params: userFilters });
            setUsers(res.data);
        } catch (err) {
            showError("Greška kod dohvaćanja korisnika");
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchInterests = async () => {
        try {
            const res = await axios.get("/admin/interests");
            setInterests(res.data);
        } catch (err) {
            showError("Greška kod dohvaćanja predmeta");
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get("/admin/analytics");
            setAnalytics(res.data);
        } catch (err) {
            showError("Greška kod dohvaćanja analitike");
        }
    };

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const showError = (msg) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(""), 4000);
    };

    // User actions
    const handleSuspend = async (userId, suspend) => {
        try {
            await axios.patch(`/admin/users/${userId}/suspend`, { suspended: suspend });
            showSuccess(suspend ? "Korisnik suspendiran" : "Suspenzija uklonjena");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    const handleVerify = async (userId, verify) => {
        try {
            await axios.patch(`/admin/users/${userId}/verify`, { verified: verify });
            showSuccess(verify ? "Instruktor verificiran" : "Verifikacija uklonjena");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    const handleToggleAdmin = async (userId, makeAdmin) => {
        try {
            await axios.patch(`/admin/users/${userId}/admin`, { isAdmin: makeAdmin });
            showSuccess(makeAdmin ? "Korisnik je sada admin" : "Admin status uklonjen");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("Jeste li sigurni da želite obrisati ovog korisnika?")) return;
        try {
            await axios.delete(`/admin/users/${userId}`);
            showSuccess("Korisnik obrisan");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    // Interest actions
    const handleAddInterest = async () => {
        if (!newInterest.trim()) return;
        try {
            await axios.post("/admin/interests", { name: newInterest.trim() });
            setNewInterest("");
            showSuccess("Predmet dodan");
            fetchInterests();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    const handleUpdateInterest = async (id) => {
        if (!editingInterest?.name?.trim()) return;
        try {
            await axios.put(`/admin/interests/${id}`, { name: editingInterest.name.trim() });
            setEditingInterest(null);
            showSuccess("Predmet ažuriran");
            fetchInterests();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    const handleDeleteInterest = async (id) => {
        if (!confirm("Jeste li sigurni? Ovo će obrisati sve povezane podatke.")) return;
        try {
            await axios.delete(`/admin/interests/${id}`);
            showSuccess("Predmet obrisan");
            fetchInterests();
        } catch (err) {
            showError(err.response?.data?.message || "Greška");
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.spinner}></div>
                <p>Učitavanje...</p>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className={styles.page}>
            {successMsg && <div className={styles.successBanner}>{successMsg}</div>}
            {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

            <div className={styles.container}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>🛡️ Admin Panel</h2>
                    </div>
                    
                    <nav className={styles.tabNav}>
                        {[
                            { id: "analytics", icon: "📊", label: "Analitika" },
                            { id: "users", icon: "👥", label: "Korisnici" },
                            { id: "interests", icon: "📚", label: "Predmeti" },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className={styles.tabIcon}>{tab.icon}</span>
                                <span className={styles.tabLabel}>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Analytics Tab */}
                    {activeTab === "analytics" && analytics && (
                        <div className={styles.section}>
                            <h1>📊 Analitika platforme</h1>
                            
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>👥</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.total}</span>
                                        <span className={styles.statLabel}>Ukupno korisnika</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🎓</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.students}</span>
                                        <span className={styles.statLabel}>Studenata</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>👨‍🏫</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.instructors}</span>
                                        <span className={styles.statLabel}>Instruktora</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>✅</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.instructors.verified}</span>
                                        <span className={styles.statLabel}>Verificiranih</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>📅</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.bookings.total_bookings}</span>
                                        <span className={styles.statLabel}>Ukupno rezervacija</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>✔️</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.bookings.completed_lessons}</span>
                                        <span className={styles.statLabel}>Završenih lekcija</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>⭐</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.reviews.average_rating}</span>
                                        <span className={styles.statLabel}>Prosječna ocjena</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>📝</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.reviews.total_reviews}</span>
                                        <span className={styles.statLabel}>Recenzija</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🧩</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.quizzes.total_quizzes}</span>
                                        <span className={styles.statLabel}>Kvizova</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🎯</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.quizzes.total_attempts}</span>
                                        <span className={styles.statLabel}>Pokušaja kvizova</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🚫</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.suspended}</span>
                                        <span className={styles.statLabel}>Suspendiranih</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🛡️</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.admins}</span>
                                        <span className={styles.statLabel}>Administratora</span>
                                    </div>
                                </div>
                            </div>

                            {analytics.topSubjects.length > 0 && (
                                <div className={styles.tableSection}>
                                    <h3>📚 Najpopularniji predmeti</h3>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Predmet</th>
                                                <th>Broj rezervacija</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.topSubjects.map((s, i) => (
                                                <tr key={i}>
                                                    <td>{s.name}</td>
                                                    <td>{s.booking_count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === "users" && (
                        <div className={styles.section}>
                            <h1>👥 Upravljanje korisnicima</h1>
                            
                            <div className={styles.filters}>
                                <input
                                    type="text"
                                    placeholder="Pretraži po imenu ili emailu..."
                                    value={userFilters.search}
                                    onChange={e => setUserFilters(f => ({ ...f, search: e.target.value }))}
                                />
                                <select
                                    value={userFilters.role}
                                    onChange={e => setUserFilters(f => ({ ...f, role: e.target.value }))}
                                >
                                    <option value="">Sve uloge</option>
                                    <option value="student">Studenti</option>
                                    <option value="professor">Instruktori</option>
                                    <option value="admin">Administratori</option>
                                </select>
                                <select
                                    value={userFilters.status}
                                    onChange={e => setUserFilters(f => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="">Svi statusi</option>
                                    <option value="active">Aktivni</option>
                                    <option value="suspended">Suspendirani</option>
                                    <option value="verified">Verificirani instruktori</option>
                                    <option value="unverified">Neverificirani instruktori</option>
                                </select>
                            </div>

                            {usersLoading ? (
                                <div className={styles.loadingState}>
                                    <div className={styles.spinner}></div>
                                </div>
                            ) : (
                                <div className={styles.usersList}>
                                    {users.map(u => (
                                        <div key={u.id} className={`${styles.userCard} ${u.is_suspended ? styles.suspended : ""}`}>
                                            <div className={styles.userInfo}>
                                                <img
                                                    src={u.profile_picture ? getImageUrl(u.profile_picture) : "/avatar.png"}
                                                    alt={u.name}
                                                    className={styles.userAvatar}
                                                />
                                                <div className={styles.userDetails}>
                                                    <span className={styles.userName}>
                                                        {u.name} {u.surname}
                                                        {u.is_admin && <span className={styles.adminBadge}>Admin</span>}
                                                        {u.is_suspended && <span className={styles.suspendedBadge}>Suspendiran</span>}
                                                    </span>
                                                    <span className={styles.userEmail}>{u.email}</span>
                                                    <span className={styles.userMeta}>
                                                        {u.is_professor ? "👨‍🏫 Instruktor" : "🎓 Student"}
                                                        {u.is_professor && (u.is_verified ? " ✅ Verificiran" : " ⏳ Čeka verifikaciju")}
                                                        {u.city && ` · 📍 ${u.city}`}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className={styles.userActions}>
                                                {u.is_professor && (
                                                    <button
                                                        className={u.is_verified ? styles.unverifyBtn : styles.verifyBtn}
                                                        onClick={() => handleVerify(u.id, !u.is_verified)}
                                                    >
                                                        {u.is_verified ? "Ukloni verifikaciju" : "✅ Verificiraj"}
                                                    </button>
                                                )}
                                                
                                                <button
                                                    className={u.is_suspended ? styles.unsuspendBtn : styles.suspendBtn}
                                                    onClick={() => handleSuspend(u.id, !u.is_suspended)}
                                                >
                                                    {u.is_suspended ? "Ukloni suspenziju" : "🚫 Suspendiraj"}
                                                </button>
                                                
                                                {u.id !== user?.id && (
                                                    <>
                                                        <button
                                                            className={styles.adminBtn}
                                                            onClick={() => handleToggleAdmin(u.id, !u.is_admin)}
                                                        >
                                                            {u.is_admin ? "Ukloni admin" : "🛡️ Admin"}
                                                        </button>
                                                        
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={() => handleDeleteUser(u.id)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {users.length === 0 && (
                                        <div className={styles.emptyState}>
                                            <p>Nema korisnika koji odgovaraju filterima.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interests Tab */}
                    {activeTab === "interests" && (
                        <div className={styles.section}>
                            <h1>📚 Upravljanje predmetima</h1>
                            
                            <div className={styles.addInterestForm}>
                                <input
                                    type="text"
                                    placeholder="Naziv novog predmeta..."
                                    value={newInterest}
                                    onChange={e => setNewInterest(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleAddInterest()}
                                />
                                <button onClick={handleAddInterest}>+ Dodaj predmet</button>
                            </div>

                            <div className={styles.interestsList}>
                                {interests.map(i => (
                                    <div key={i.id} className={styles.interestCard}>
                                        {editingInterest?.id === i.id ? (
                                            <div className={styles.editForm}>
                                                <input
                                                    type="text"
                                                    value={editingInterest.name}
                                                    onChange={e => setEditingInterest({ ...editingInterest, name: e.target.value })}
                                                    onKeyDown={e => e.key === "Enter" && handleUpdateInterest(i.id)}
                                                />
                                                <button onClick={() => handleUpdateInterest(i.id)}>💾</button>
                                                <button onClick={() => setEditingInterest(null)}>❌</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={styles.interestInfo}>
                                                    <span className={styles.interestName}>{i.name}</span>
                                                    <span className={styles.interestStats}>
                                                        👥 {i.user_count} korisnika · 🧩 {i.quiz_count} kvizova
                                                    </span>
                                                </div>
                                                <div className={styles.interestActions}>
                                                    <button onClick={() => setEditingInterest({ id: i.id, name: i.name })}>✏️</button>
                                                    <button onClick={() => handleDeleteInterest(i.id)}>🗑️</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

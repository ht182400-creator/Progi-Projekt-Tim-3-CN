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
        checkAdmin ();
    }, []);

    useEffect(() => {
        if (isAdmin  && activeTab === "users") {
            fetchUsers();
        } else if (isAdmin  && activeTab === "interests") {
            fetchInterests();
        } else if (isAdmin  && activeTab === "analytics") {
            fetchAnalytics();
        }
    }, [isAdmin , activeTab, userFilters]);

    const checkAdmin  = async () => {
        try {
            const res = await axios.get("/admin/check");
            if (!res.data.isAdmin ) {
                navigate("/");
                return;
            }
            setIsAdmin (true);
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
            showError("错误 kod dohvaćanja korisnika");
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchInterests = async () => {
        try {
            const res = await axios.get("/admin/interests");
            setInterests(res.data);
        } catch (err) {
            showError("错误 kod dohvaćanja predmeta");
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get("/admin/analytics");
            setAnalytics(res.data);
        } catch (err) {
            showError("错误 kod dohvaćanja analitike");
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
            showError(err.response?.data?.message || "错误");
        }
    };

    const handleVerify = async (userId, verify) => {
        try {
            await axios.patch(`/admin/users/${userId}/verify`, { verified: verify });
            showSuccess(verify ? "已验证导师" : "已取消验证");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "错误");
        }
    };

    const handleToggleAdmin  = async (userId, makeAdmin ) => {
        try {
            await axios.patch(`/admin/users/${userId}/admin`, { isAdmin : makeAdmin  });
            showSuccess(makeAdmin  ? "用户现在是管理员" : "管理员身份已撤销n");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "错误");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("您确定要删除此用户吗？")) return;
        try {
            await axios.delete(`/admin/users/${userId}`);
            showSuccess("用户已删除");
            fetchUsers();
        } catch (err) {
            showError(err.response?.data?.message || "错误");
        }
    };

    // Interest actions
    const handleAddInterest = async () => {
        if (!newInterest.trim()) return;
        try {
            await axios.post("/admin/interests", { name: newInterest.trim() });
            setNewInterest("");
            showSuccess("科目 已添加");
            fetchInterests();
        } catch (err) {
            showError(err.response?.data?.message || "错误");
        }
    };

    const handleUpdateInterest = async (id) => {
        if (!editingInterest?.name?.trim()) return;
        try {
            await axios.put(`/admin/interests/${id}`, { name: editingInterest.name.trim() });
            setEditingInterest(null);
            showSuccess("科目 已更新");
            fetchInterests();
        } catch (err) {
            showError(err.response?.data?.message || "错误");
        }
    };

    const handleDeleteInterest = async (id) => {
        if (!confirm("您确定吗？这将删除所有相关数据。")) return;
        try {
            await axios.delete(`/admin/interests/${id}`);
            showSuccess("科目 已删除");
            fetchInterests();
        } catch (err) {
            showError(err.response?.data?.message || "错误");
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

    if (!isAdmin ) return null;

    return (
        <div className={styles.page}>
            {successMsg && <div className={styles.successBanner}>{successMsg}</div>}
            {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

            <div className={styles.container}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>🛡️ 管理面板</h2>
                    </div>
                    
                    <nav className={styles.tabNav}>
                        {[
                            { id: "analytics", icon: "📊", label: "分析" },
                            { id: "users", icon: "👥", label: "用户" },
                            { id: "interests", icon: "📚", label: "科目" },
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
                            <h1>📊 平台分析</h1>
                            
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>👥</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.total}</span>
                                        <span className={styles.statLabel}>总用户数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🎓</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.students}</span>
                                        <span className={styles.statLabel}>学生数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>👨‍🏫</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.instructors}</span>
                                        <span className={styles.statLabel}>导师数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>✅</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.instructors.verified}</span>
                                        <span className={styles.statLabel}>已验证数</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>📅</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.bookings.total_bookings}</span>
                                        <span className={styles.statLabel}>总预约数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>✔️</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.bookings.completed_lessons}</span>
                                        <span className={styles.statLabel}>已完成课程数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>⭐</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.reviews.average_rating}</span>
                                        <span className={styles.statLabel}>平均评分</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>📝</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.reviews.total_reviews}</span>
                                        <span className={styles.statLabel}>评价</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🧩</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.quizzes.total_quizzes}</span>
                                        <span className={styles.statLabel}>测验数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🎯</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.quizzes.total_attempts}</span>
                                        <span className={styles.statLabel}>测验尝试次数</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🚫</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.suspended}</span>
                                        <span className={styles.statLabel}>已封禁ih</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>🛡️</div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{analytics.users.admins}</span>
                                        <span className={styles.statLabel}>管理员</span>
                                    </div>
                                </div>
                            </div>

                            {analytics.topSubjects.length > 0 && (
                                <div className={styles.tableSection}>
                                    <h3>📚 最受欢迎的科目</h3>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>科目</th>
                                                <th>预约数量</th>
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
                            <h1>👥 用户管理</h1>
                            
                            <div className={styles.filters}>
                                <input
                                    type="text"
                                    placeholder="按姓名或邮箱搜索..."
                                    value={userFilters.search}
                                    onChange={e => setUserFilters(f => ({ ...f, search: e.target.value }))}
                                />
                                <select
                                    value={userFilters.role}
                                    onChange={e => setUserFilters(f => ({ ...f, role: e.target.value }))}
                                >
                                    <option value="">全部 角色</option>
                                    <option value="student">学生</option>
                                    <option value="professor">导师</option>
                                    <option value="admin">管理员</option>
                                </select>
                                <select
                                    value={userFilters.status}
                                    onChange={e => setUserFilters(f => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="">所有状态</option>
                                    <option value="active">活跃</option>
                                    <option value="suspended">已封禁</option>
                                    <option value="verified">已验证导师i</option>
                                    <option value="unverified">未验证导师</option>
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
                                                        {u.is_admin && <span className={styles.adminBadge}>管理员 </span>}
                                                        {u.is_suspended && <span className={styles.suspendedBadge}>已封禁</span>}
                                                    </span>
                                                    <span className={styles.userEmail}>{u.email}</span>
                                                    <span className={styles.userMeta}>
                                                        {u.is_professor ? "👨‍🏫 导师" : "🎓 学生"}
                                                        {u.is_professor && (u.is_verified ? " ✅ 已验证" : " ⏳ 等待验证")}
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
                                                        {u.is_verified ? "取消验证" : "✅ 验证"}
                                                    </button>
                                                )}
                                                
                                                <button
                                                    className={u.is_suspended ? styles.unsuspendBtn : styles.suspendBtn}
                                                    onClick={() => handleSuspend(u.id, !u.is_suspended)}
                                                >
                                                    {u.is_suspended ? "恢复" : "🚫 停用"}
                                                </button>
                                                
                                                {u.id !== user?.id && (
                                                    <>
                                                        <button
                                                            className={styles.adminBtn}
                                                            onClick={() => handleToggleAdmin (u.id, !u.is_admin)}
                                                        >
                                                            {u.is_admin ? "移除管理员" : "🛡️ Admin "}
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
                                            <p>没有符合筛选条件的用户.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interests Tab */}
                    {activeTab === "interests" && (
                        <div className={styles.section}>
                            <h1>📚 科目管理</h1>
                            
                            <div className={styles.addInterestForm}>
                                <input
                                    type="text"
                                    placeholder="新科目名称..."
                                    value={newInterest}
                                    onChange={e => setNewInterest(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleAddInterest()}
                                />
                                <button onClick={handleAddInterest}>+ 添加科目</button>
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
                                                        👥 {i.user_count} 用户 · 🧩 {i.quiz_count} 测验
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

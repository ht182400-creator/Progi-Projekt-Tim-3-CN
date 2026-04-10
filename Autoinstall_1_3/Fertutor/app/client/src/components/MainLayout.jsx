// src/components/MainLayout.jsx
import React, { useContext, useMemo } from "react";
import { Link, Outlet } from "react-router-dom";
import styles from "./MainLayout.module.css";
import logo from "../assets/images/logo.png";
import { getImageUrl } from "../api";
import { AuthContext } from "../context/AuthContext";
import Footer from "./Footer";

function MainLayout() {
    const { user, logout } = useContext(AuthContext);

    const initials = useMemo(() => {
        if (!user) return "U";
        const first = (user.name || "").trim().charAt(0);
        const last = (user.surname || "").trim().charAt(0);
        const res = `${first}${last}`.toUpperCase();
        return res || "U";
    }, [user]);

    return (
        <div className={styles.layout}>
            <header className={styles.navbar}>
                <Link to="/" className={styles.logoWrapper}>
                    <img src={logo} alt="标志" className={styles.logo} />
                </Link>

                <nav className={styles.navLinks}>
                    <Link to="/">首页</Link>

                    {(user && !user.is_professor) || !user ? (
                        <Link to="/instructors">导师</Link>
                    ) : null}

                    <Link to="/quizzes">测验</Link>

                    {user && (
                        <Link to="/calendar">
                            {user.is_professor ? "我的日历" : "我的预约"}
                        </Link>
                    )}

                    {user && <Link to="/profile">个人资料</Link>}
                    
                    {user && user.is_admin && (
                        <Link to="/admin" className={styles.adminLink}>🛡️ 管理员</Link>
                    )}
                </nav>

                <div className={styles.rightSide}>
                    {!user ? (
                        <>
                            <Link to="/register" className={styles.registerBtn}>注册</Link>
                            <Link to="/login" className={styles.loginBtn}>登录</Link>
                        </>
                    ) : (
                        <>
                            <span className={styles.userName}>{user.name}</span>
                            <span className={styles.separator}>|</span>

                            <div className={styles.userInfo}>
                                <div className={styles.avatarWrapper}>
                                    {user.profile_picture ? (
                                        <img
                                            src={getImageUrl(user.profile_picture)}
                                            alt="个人资料"
                                            className={styles.avatar}
                                        />
                                    ) : (
                                        <i className="fa-solid fa-user"></i>
                                    )}
                                </div>
                            </div>

                            <button onClick={logout} className={styles.loginBtn}>
                            退出
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className={styles.pageContent}>
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}

export default MainLayout;

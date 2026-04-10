import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api";
import { getImageUrl } from "../api";
import styles from "./Home.module.css";
import Footer from "../components/Footer";


export default function Home() {
    const navigate = useNavigate();
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecommended();
    }, []);

    const fetchRecommended = async () => {
        try {
            setLoading(true);

            // Ako imaš poseban endpoint za preporuke, promijeni "/instructors"
            const res = await axios.get("/instructors", { params: { limit: 6 } });

            const data = Array.isArray(res.data) ? res.data : [];
            setRecommended(data.slice(0, 6));
        } catch {
            setRecommended([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* HERO */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <p className={styles.kicker}>欢迎</p>
                    <h1 className={styles.title}>
                    欢迎来到 <span>FerTutor</span>
                    </h1>
                    <p className={styles.subtitle}>
                    通过经过验证的导师——在线或线下——轻松获得更好成绩。
                    </p>

                    <div className={styles.heroActions}>
                        <button className={styles.primaryBtn} onClick={() => navigate("/instructors")}>
                            寻找导师
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => navigate("/quizzes")}>
                            做测验
                        </button>
                    </div>
                </div>
            </section>

            {/* 流程S */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>流程</p>
                    <h2 className={styles.sectionTitle}>FerTutor 如何运作？</h2>
                    <p className={styles.sectionSubtitle}>
                    只需三步即可轻松获得更好成绩.

                    </p>
                </div>

                <div className={styles.stepsGrid}>
                    <div className={styles.stepCard}>
                        <div className={styles.iconBox}>
                            {/* search icon */}
                            <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
                                <path
                                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Zm9.2 4.6-4.2-4.2"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        <h3>寻找导师</h3>
                        <p>按科目、价格或评分搜索验证过的导师.</p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.iconBox}>
                            {/* calendar icon */}
                            <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
                                <path
                                    d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path d="M9 13h2v2H9zm4 0h2v2h-2z" fill="currentColor" />
                            </svg>
                        </div>
                        <h3>预约时间</h3>
                        <p>    选择适合你的时间，直接通过平台预约。
                        </p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.iconBox}>
                            {/* graduation cap */}
                            <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
                                <path
                                    d="M12 3 2 8l10 5 10-5-10-5Z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M6 10v6c0 2 12 2 12 0v-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        <h3>开始学习</h3>
                        <p>在线或线下与专家一起学习并掌握知识.</p>
                    </div>
                </div>
            </section>

            {/* RECOMMENDED */}
            <section className={styles.sectionAlt}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>推荐导师</h2>
                    <p className={styles.sectionSubtitle}>
                    找到适合你学习风格的专家。
                    </p>
                </div>

                {loading ? (
                    <div className={styles.loading}>加载推荐...</div>
                ) : (
                    <div className={styles.cardsGrid}>
                        {recommended.map((i) => (
                            <div
                                key={i.id}
                                className={styles.instructorCard}
                                onClick={() => navigate(`/instructors/${i.id}`)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={styles.cardTop}>
                                    <img
                                        className={styles.avatar}
                                        src={i.profile_picture ? getImageUrl(i.profile_picture) : "/avatar.png"}
                                        alt=""
                                    />

                                    <div className={styles.cardTitleBlock}>
                                        <div className={styles.nameRow}>
                                            <h3 className={styles.name}>
                                                {i.name} {i.surname}
                                            </h3>
                                            <span className={styles.verifiedDot} title="已验证导师" />
                                        </div>

                                        <p className={styles.subject}>{i.primary_subject || i.subject || "Instrukcije"}</p>

                                        <p className={styles.meta}>
                                            <span className={styles.star}>★</span> {i.rating ?? "4.8"}{" "}
                                            <span className={styles.muted}>({i.reviews_count ?? 0})</span>
                                        </p>
                                    </div>

                                    <div className={styles.priceBlock}>
                                        <div className={styles.price}>€{i.min_price ?? i.price ?? "--"}</div>
                                        <div className={styles.priceSub}>每小时</div>
                                    </div>
                                </div>

                                <p className={styles.desc}>
                                    {i.bio || "耐心的讲解和清晰的解释。预约时间，开始学习。"}
                                </p>

                                <div className={styles.tagsRow}>
                                    {(i.tags || i.interests || []).slice(0, 3).map((t, idx) => (
                                        <span key={idx} className={styles.tag}>
                      {t}
                    </span>
                                    ))}
                                </div>

                                <div className={styles.cardBottom}>
                                    <div className={styles.quickReply}>
                                        <span className={styles.clock}>⏱</span> Brz odgovor
                                    </div>

                                    <button
                                        className={styles.reserveBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/instructors/${i.id}`);
                                        }}
                                    >
                                        预约
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.loadMoreWrap}>
                    <button className={styles.loadMoreBtn} onClick={() => navigate("/instructors")}>
                        加载更多导师
                    </button>
                </div>
            </section>
            {/* TESTIMONIALS */}
            <section className={styles.testimonialsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>用户评价</h2>
                </div>

                <div className={styles.testimonialsGrid}>
                    <div className={styles.testimonialCard}>
                        <div className={styles.quoteMark}>”</div>
                        <p className={styles.testimonialText}>
                          感谢 FerTutor,我在一天之内就找到了一位数学导师，终于掌握了高考的课程内容。一切都很清晰、快速且没有压力。
                        </p>

                        <div className={styles.testimonialFooter}>
                            <div className={styles.initialAvatar}>IP</div>
                            <div>
                                <div className={styles.testimonialName}>Ivan P.</div>
                                <div className={styles.testimonialRole}>高中毕业生</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.testimonialCard}>
                        <div className={styles.quoteMark}>”</div>
                        <p className={styles.testimonialText}>
                            这个平台真的很容易使用。我预约了一个在线课程，解决了我拖了好几周的程序设计问题。
                        </p>

                        <div className={styles.testimonialFooter}>
                            <div className={styles.initialAvatar}>MK</div>
                            <div>
                                <div className={styles.testimonialName}>Maja K.</div>
                                <div className={styles.testimonialRole}>FER 学生</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.testimonialCard}>
                        <div className={styles.quoteMark}>”</div>
                        <p className={styles.testimonialText}>
                            导师选择很棒，一切都很透明。孩子们终于有了规律，而我也安心了，因为我知道他们和经过验证的人一起学习。
                        </p>

                        <div className={styles.testimonialFooter}>
                            <div className={styles.initialAvatar}>TR</div>
                            <div>
                                <div className={styles.testimonialName}>Tomislav R.</div>
                                <div className={styles.testimonialRole}>家长</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

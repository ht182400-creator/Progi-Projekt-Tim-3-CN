import { useEffect, useState } from "react";
import axios from "../api";
import ProfileImageModal from "../components/ProfileImageModal";
import { getImageUrl } from "../api";
import styles from "./Profile.module.css";

export function Profile() {
    const [activeTab, setActiveTab] = useState("osobni");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [interests, setInterests] = useState([]);
    const [instructorRating, setInstructorRating] = useState({ average: "0.0", count: 0 });
    const [myReviews, setMyReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const interestMap = {
        mat_os: "小学数学",
        fiz_os: "小学物理",
        inf_os: "小学信息学",
        mat_ss: "中学数学",
        fiz_ss: "中学物理",
        inf_ss: "中学信息学"
    };

    const reverseInterestMap = Object.fromEntries(
        Object.entries(interestMap).map(([k, v]) => [v, k])
    );

    useEffect(() => {
        if (activeTab === "interesi") {
            axios.get("/profile/interests")
                .then(res => {
                    setInterests(res.data.map(i => reverseInterestMap[i]));
                })
                .catch(() => setInterests([]));
        }
    }, [activeTab]);

    const toggleInterest = (value) => {
        setInterests(prev =>
            prev.includes(value)
                ? prev.filter(i => i !== value)
                : [...prev, value]
        );
    };

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 4000);
    };

    const saveInterests = async () => {
        setError("");
        setSaving(true);

        try {
            await axios.post("/profile/interests", {
                interests: interests.map(i => interestMap[i])
            });
            showMessage("兴趣已成功保存！ ✓");
        } catch {
            setError("保存兴趣时出错");
        } finally {
            setSaving(false);
        }
    };

    const [form, setForm] = useState({
        name: "",
        surname: "",
        email: "",
        date_of_birth: "",
        sex: "",
        city: "",
        education: "",
        teaching: "",
        is_professor: false,
        profile_picture: null
    });

    const [publicProfile, setPublicProfile] = useState({
        biography: "",
        video_url: "",
        reference: "",
        teaching_type: ""
    });

    useEffect(() => {
        loadProfile();
    }, []);

    // Fetch reviews when recenzije tab is active (for professors)
    useEffect(() => {
        if (activeTab === "recenzije" && form.is_professor) {
            setReviewsLoading(true);
            axios.get("/reviews/my-reviews")
                .then(res => {
                    setMyReviews(res.data.reviews || []);
                    setInstructorRating({
                        average: res.data.average_rating,
                        count: res.data.total_reviews
                    });
                })
                .catch(() => setMyReviews([]))
                .finally(() => setReviewsLoading(false));
        }
    }, [activeTab, form.is_professor]);

    // Fetch instructor rating when profile loads (for professors)
    useEffect(() => {
        const fetchRating = async () => {
            try {
                const res = await axios.get("/profile");
                if (res.data.is_professor) {
                    const ratingRes = await axios.get(`/reviews/instructor/${res.data.id}`);
                    setInstructorRating({
                        average: ratingRes.data.average_rating,
                        count: ratingRes.data.total_reviews
                    });
                }
            } catch (err) {
                console.error("获取评分时出错:", err);
            }
        };
        fetchRating();
    }, []);

    function formatDateForInput(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async function loadProfile() {
        try {
            const res = await axios.get("/profile");
            const { name, surname, email, is_professor, profile_picture, profile } = res.data;
            setForm({
                name,
                surname,
                email,
                is_professor,
                profile_picture,
                date_of_birth: formatDateForInput(profile.date_of_birth),
                sex: profile.sex || "",
                city: profile.city || "",
                education: profile.education || "",
                teaching: profile.teaching || ""
            });
            if (res.data.is_professor) {
                setPublicProfile({
                    biography: profile.biography || "",
                    video_url: profile.video_url || "",
                    reference: profile.reference || "",
                    teaching_type: profile.teaching_type || "",
                    is_published: profile.is_published || false
                });
            }

        } catch (err) {
            setError(err.response?.data?.message || "获取数据时出错");
        } finally {
            setLoading(false);
        }
    }

    function updateField(key, val) {
        setForm(prev => ({...prev, [key]: val}));
    }

    async function saveChanges(e) {
        e.preventDefault();
        setError("");
        setSaving(true);

        if (!form.name || !form.surname || !form.date_of_birth) {
            setError("请填写姓名和出生日期。");
            setSaving(false);
            return;
        }

        try {
            await axios.post("/profile/update", {
                name: form.name,
                surname: form.surname,
                email: form.email,
                is_professor: form.is_professor,
                date_of_birth: form.date_of_birth,
                sex: form.sex,
                city: form.city,
                education: form.education,
                teaching: form.teaching
            });
            showMessage("更改已成功保存！ ✓");
        } catch (err) {
            setError(err.response?.data?.message || "保存时出错");
        } finally {
            setSaving(false);
        }
    }

    const savePublicProfile = async () => {
        setError("");
        setSaving(true);

        try {
            await axios.post("/profile/public", publicProfile);
            showMessage("公开资料已保存！ ✓");
        } catch {
            setError("保存公开资料时出错");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpdated = (newFilename) => {
        setForm(prev => ({ ...prev, profile_picture: newFilename }));
        showMessage("头像已更新！ ✓");
    };

    const tabs = [
        { id: "osobni", icon: "👤", label: "个人信息", desc: "基本信息" },
        { id: "interesi", icon: "⭐", label: "兴趣", desc: "学习领域" },
        ...(form.is_professor ? [
            { id: "javni", icon: "🌍", label: "公开资料", desc: "对他人的可见信息" },
            { id: "recenzije", icon: "📝", label: "评论", desc: "学生评分" }
        ] : [])
    ];

    if (loading) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.spinner}></div>
                <p>加载个人资料...</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Success Banner */}
            {message && (
                <div className={styles.successBanner}>
                    {message}
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className={styles.errorBanner}>
                    ⚠️ {error}
                    <button onClick={() => setError("")} className={styles.dismissBtn}>×</button>
                </div>
            )}

            <div className={styles.container}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <div className={styles.avatarLarge} onClick={() => setIsImageModalOpen(true)}>
                            {form.profile_picture ? (
                                <img src={getImageUrl(form.profile_picture)} alt="个人资料" />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    <span>{form.name?.[0]}{form.surname?.[0]}</span>
                                </div>
                            )}
                            <div className={styles.avatarOverlay}>
                                <span>📷</span>
                            </div>
                        </div>
                        <h2>{form.name} {form.surname}</h2>
                        <span className={styles.roleBadge}>
                            {form.is_professor ? "👨‍🏫 导师" : "🎓 学生"}
                        </span>
                        {form.is_professor && (
                            <div className={styles.ratingBadge}>
                                {instructorRating.count > 0 
                                    ? `⭐ ${instructorRating.average} (${instructorRating.count} 条评论)`
                                    : "⭐ 暂无评论"
                                }
                            </div>
                        )}
                    </div>

                    <nav className={styles.tabNav}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className={styles.tabIcon}>{tab.icon}</span>
                                <div className={styles.tabText}>
                                    <span className={styles.tabLabel}>{tab.label}</span>
                                    <span className={styles.tabDesc}>{tab.desc}</span>
                                </div>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <main className={styles.content}>
                    {/* 个人信息 */}
                    {activeTab === "osobni" && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h1>👤 个人信息</h1>
                                <p>管理您的基本信息</p>
                            </div>

                            <form className={styles.form} onSubmit={saveChanges}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label>名字</label>
                                        <input 
                                            value={form.name} 
                                            onChange={e => updateField("name", e.target.value)}
                                            placeholder="您的名字"
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label>姓氏</label>
                                        <input 
                                            value={form.surname} 
                                            onChange={e => updateField("surname", e.target.value)}
                                            placeholder="您的姓氏"
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label>📅 出生日期</label>
                                        <input 
                                            type="date" 
                                            value={form.date_of_birth}
                                            onChange={e => updateField("date_of_birth", e.target.value)}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label>⚧ 性别</label>
                                        <select
                                            value={form.sex}
                                            onChange={e => updateField("sex", e.target.value)}
                                        >
                                            <option value="">选择</option>
                                            <option value="M">男</option>
                                            <option value="F">女</option>
                                            <option value="X">其他 / 不愿透露</option>
                                        </select>
                                    </div>

                                    <div className={styles.field}>
                                        <label>📍 地点 / 城市</label>
                                        <input 
                                            value={form.city} 
                                            onChange={e => updateField("city", e.target.value)}
                                            placeholder="例如 萨格勒布"
                                        />
                                    </div>

                                    {!form.is_professor && (
                                        <div className={styles.field}>
                                            <label>🏫 学校 / 学院</label>
                                            <input 
                                                value={form.education}
                                                onChange={e => updateField("education", e.target.value)}
                                                placeholder="教育机构名称"
                                            />
                                        </div>
                                    )}

                                    {form.is_professor && (
                                        <div className={styles.field}>
                                            <label>🎓 教育 / 专业资格</label>
                                            <input 
                                                value={form.teaching}
                                                onChange={e => updateField("teaching", e.target.value)}
                                                placeholder="例如 数学硕士"
                                            />
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className={styles.saveBtn} disabled={saving}>
                                    {saving ? (
                                        <><span className={styles.btnSpinner}></span> 保存中...</>
                                    ) : (
                                        "💾 保存更改"
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 兴趣 */}
                    {activeTab === "interesi" && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h1>⭐ 个人兴趣</h1>
                                <p>选择您感兴趣的科目</p>
                            </div>

                            <div className={styles.interestsGrid}>
                                {Object.entries(interestMap).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`${styles.interestCard} ${interests.includes(key) ? styles.interestActive : ""}`}
                                        onClick={() => toggleInterest(key)}
                                    >
                                        <span className={styles.interestCheck}>
                                            {interests.includes(key) ? "✓" : ""}
                                        </span>
                                        <span className={styles.interestLabel}>{label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className={styles.interestsFooter}>
                                <span className={styles.selectedCount}>
                                    {interests.length} 已选择
                                </span>
                                <button
                                    className={styles.saveBtn}
                                    onClick={saveInterests}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <><span className={styles.btnSpinner}></span> 保存中...</>
                                    ) : (
                                        "💾 保存兴趣"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 公开资料 */}
                    {activeTab === "javni" && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h1>🌍 公开资料</h1>
                                <p>信息对寻找导师的学生可见</p>
                            </div>

                            <div className={styles.publicForm}>
                                <div className={styles.field}>
                                    <label>📝 个人简介</label>
                                    <textarea
                                        value={publicProfile.biography}
                                        onChange={e => setPublicProfile(p => ({ ...p, biography: e.target.value }))}
                                        placeholder="描述您的经验、教学方式以及为什么您是学生的最佳选择..."
                                        rows={4}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>🎬 视频介绍 (YouTube 链接)</label>
                                    <input
                                        value={publicProfile.video_url}
                                        onChange={e => setPublicProfile(p => ({ ...p, video_url: e.target.value }))}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>🏆 资质与荣誉</label>
                                    <textarea
                                        value={publicProfile.reference}
                                        onChange={e => setPublicProfile(p => ({ ...p, reference: e.target.value }))}
                                        placeholder="列出您的资格证书、证书、学生的成功案例..."
                                        rows={3}
                                    />
                                </div>

                                <div className={styles.formRow}>
                                    {/* 授课方式 */}
                                    <div className={styles.field}>
                                        <label>💻 授课方式</label>
                                        <select
                                            value={publicProfile.teaching_type}
                                            onChange={e =>
                                                setPublicProfile(p => ({ ...p, teaching_type: e.target.value }))
                                            }
                                        >
                                            <option value="">选择</option>
                                            <option value="线下">🏫 线下</option>
                                            <option value="在线">💻 在线</option>
                                            <option value="线下和线上">🏫💻 线下和线上</option>
                                        </select>
                                    </div>

                                    {/* 发布资料 */}
                                    <div className={styles.fieldPublish}>
                                        <label>&nbsp;</label> {/* 用于对齐的空标签 */}
                                        <button
                                            type="button"
                                            className={`${styles.publishBtn} ${publicProfile.is_published ? styles.published : ""}`}
                                            onClick={async () => {
                                                const newState = !publicProfile.is_published;
                                                try {
                                                    await axios.post("/profile/public/publish", { publish: newState });
                                                    setPublicProfile(p => ({ ...p, is_published: newState }));
                                                    showMessage(newState ? "资料已发布！" : "资料已隐藏！");
                                                } catch {
                                                    showMessage("更改发布状态时出错");
                                                }
                                            }}
                                        >
                                            {publicProfile.is_published ? "✅ 已发布" : "❌ 已隐藏"}
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    className={styles.saveBtn} 
                                    onClick={savePublicProfile}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <><span className={styles.btnSpinner}></span> 保存中...</>
                                    ) : (
                                        "💾 保存公开资料"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 评论（仅导师） */}
                    {activeTab === "recenzije" && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h1>📝 我的评论</h1>
                                <p>来自学生的评分和评论</p>
                            </div>

                            {reviewsLoading ? (
                                <div className={styles.loadingPage}>
                                    <div className={styles.spinner}></div>
                                    <p>加载评论中...</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.reviewsOverview}>
                                        <div className={styles.ratingBig}>
                                            <span className={styles.ratingNumber}>{instructorRating.average}</span>
                                            <span className={styles.ratingStar}>⭐</span>
                                        </div>
                                        <div className={styles.reviewCount}>
                                            {instructorRating.count} 条评论
                                        </div>
                                    </div>

                                    {myReviews.length === 0 ? (
                                        <div className={styles.comingSoon}>
                                            <div className={styles.comingSoonIcon}>📭</div>
                                            <h3>暂无评价</h3>
                                            <p>当学生对您的服务进行评分时，评论将显示在这里。</p>
                                        </div>
                                    ) : (
                                        <div className={styles.reviewsList}>
                                            {myReviews.map(review => (
                                                <div key={review.id} className={styles.reviewCard}>
                                                    <div className={styles.reviewHeader}>
                                                        <div className={styles.reviewStudent}>
                                                            {review.student_picture ? (
                                                                <img 
                                                                    src={getImageUrl(review.student_picture)} 
                                                                    alt="" 
                                                                    className={styles.reviewAvatar}
                                                                />
                                                            ) : (
                                                                <div className={styles.reviewAvatarPlaceholder}>
                                                                    {review.student_name?.[0]}{review.student_surname?.[0]}
                                                                </div>
                                                            )}
                                                            <span className={styles.reviewName}>
                                                                {review.student_name} {review.student_surname}
                                                            </span>
                                                        </div>
                                                        <div className={styles.reviewRating}>
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <span 
                                                                    key={star} 
                                                                    className={star <= review.rating ? styles.starFilled : styles.starEmpty}
                                                                >
                                                                    ★
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {review.comment && (
                                                        <p className={styles.reviewComment}>{review.comment}</p>
                                                    )}
                                                    <div className={styles.reviewDate}>
                                                        {new Date(review.created_at).toLocaleDateString("zh-CN", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric"
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </main>
            </div>

            <ProfileImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                currentImage={form.profile_picture ? getImageUrl(form.profile_picture) : null}
                onImageUpdated={handleImageUpdated}
            />
        </div>
    );
}
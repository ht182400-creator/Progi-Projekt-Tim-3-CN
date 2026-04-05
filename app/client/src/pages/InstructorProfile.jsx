import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api";
import { getImageUrl } from "../api";
import { AuthContext } from "../context/AuthContext";
import styles from "./InstructorProfile.module.css";

export default function InstructorProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [instructor, setInstructor] = useState(null);
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [bookingMessage, setBookingMessage] = useState("");
    const [bookingError, setBookingError] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [hoveredDay, setHoveredDay] = useState(null);
    const [bookingInProgress, setBookingInProgress] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [note, setNote] = useState("");
    const [selectedInterest, setSelectedInterest] = useState("");

    // Reviews state
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ average_rating: "0.0", total_reviews: 0 });
    const [canReview, setCanReview] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewError, setReviewError] = useState("");

    // Payment
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvc, setCardCvc] = useState("");


    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const monthNames = [
        "一月", "二月", "三月", "四月", "五月", "六月",
        "七月", "八月", "九月", "十月", "十一月", "十二月"
    ];

    const dayNames = ["一", "二", "三", "四", "五", "六", "日"];

    useEffect(() => {
        axios.get(`/instructors/${id}`).then(res => {
            setInstructor(res.data);
        });
        fetchReviews();
    }, [id]);

    useEffect(() => {
        fetchSlots();
    }, [id]);

    useEffect(() => {
        if (user && !user.is_professor) {
            checkCanReview();
        }
    }, [id, user]);

    const formatCardNumber = (value) => {
        return value
            .replace(/\D/g, "")
            .slice(0, 16)
            .replace(/(.{4})/g, "$1 ")
            .trim();
    };

    const formatExpiry = (value) => {
        const cleaned = value.replace(/\D/g, "").slice(0, 4);
        if (cleaned.length < 3) return cleaned;
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    };

    const isExpiryValid = (value) => {
        if (!/^\d{2}\/\d{2}$/.test(value)) return false;

        const [mm, yy] = value.split("/").map(Number);
        if (mm < 1 || mm > 12) return false;

        const now = new Date();
        const expiry = new Date(2000 + yy, mm);
        return expiry > now;
    };

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`/reviews/instructor/${id}`);
            setReviews(res.data.reviews || []);
            setReviewStats({
                average_rating: res.data.average_rating,
                total_reviews: res.data.total_reviews
            });
        } catch (err) {
            console.error("获取评价时出错:", err);
        }
    };

    const checkCanReview = async () => {
        try {
            const res = await axios.get(`/reviews/can-review/${id}`);
            setCanReview(res.data.can_review && !res.data.already_reviewed);
        } catch (err) {
            setCanReview(false);
        }
    };

    const handleSubmitReview = async () => {
        setReviewSubmitting(true);
        setReviewError("");

        try {
            await axios.post("/reviews", {
                professor_id: parseInt(id),
                rating: reviewRating,
                comment: reviewComment
            });

            setReviewMessage("评价已成功添加！ ✓");
            setShowReviewModal(false);
            setReviewRating(5);
            setReviewComment("");
            setCanReview(false);
            fetchReviews();
            setTimeout(() => setReviewMessage(""), 4000);
        } catch (err) {
            setReviewError(err.response?.data?.message || "添加评价时出错");
        } finally {
            setReviewSubmitting(false);
        }
    };

    const formatReviewDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("zh-CN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    const renderStars = (rating, interactive = false, onSelect = null) => {
        return (
            <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                    <span
                        key={star}
                        className={`${styles.star} ${star <= rating ? styles.starFilled : styles.starEmpty} ${interactive ? styles.starInteractive : ""}`}
                        onClick={() => interactive && onSelect && onSelect(star)}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    const fetchSlots = async () => {
        try {
            const res = await axios.get(`/calendar/slots/${id}`, {
                params: { includeBooked: true }
            });
            setSlots(res.data.slots || []);
        } catch (err) {
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    // 导师所有可用时段中的最低价格
    const minSlotPrice = slots
        .filter(s => Number(s.booked_count || 0) < Number(s.capacity)) // 仅可用时段
        .map(s => s.price)
        .filter(p => p != null)
        .reduce((min, price) => (min === null || price < min ? price : min), null);

    const handleBook = async (slotId, note, interest_id) => {
        setBookingError("");
        setBookingMessage("");

        if (!user) {
            navigate("/login");
            return;
        }

        setBookingInProgress(slotId);

        try {
            await axios.post(`/calendar/book/${slotId}`, {
                note,
                interest_id
            });
            setBookingMessage("时段预约成功！ ✓");
            fetchSlots();
            setTimeout(() => setBookingMessage(""), 4000);
        } catch (err) {
            setBookingError(err.response?.data?.message || "预约时段时出错。");
        } finally {
            setBookingInProgress(null);
        }
    };

    const formatTime = (value) => {
        const date = new Date(value);
        return date.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatFullDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("zh-CN", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
    };

    const formatShortDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("zh-CN", {
            day: "numeric",
            month: "short"
        });
    };

    const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    const startWeekday = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const buildCalendar = () => {
        const totalDays = daysInMonth(currentMonth);
        const offset = startWeekday(currentMonth);
        const days = [];

        for (let i = 0; i < offset; i += 1) days.push(null);
        for (let d = 1; d <= totalDays; d += 1) days.push(d);
        return days;
    };

    const dateKey = (date) => {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const isToday = (day) => {
        if (!day) return false;
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getFullYear() === currentMonth.getFullYear()
        );
    };

    const isPast = (day) => {
        if (!day) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return checkDate < today;
    };

    const slotMap = slots.reduce((acc, slot) => {
        const key = dateKey(slot.start_time);
        acc[key] = acc[key] || [];
        acc[key].push(slot);
        return acc;
    }, {});

    const availableSlots = slots.filter(s => {
        const hasFreeSpace = Number(s.booked_count || 0) < Number(s.capacity);

        // 如果学生已经预约了 → 仅对他自己隐藏
        if (s.is_booked_by_me) return false;

        return hasFreeSpace;
    });

    const filteredSlots = selectedDate
        ? availableSlots.filter(s => dateKey(s.start_time) === selectedDate)
        : availableSlots;

    const handleDaySelect = (day) => {
        if (!day) return;
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
        const date = String(day).padStart(2, "0");
        const newDate = `${year}-${month}-${date}`;
        
        if (selectedDate === newDate) {
            setSelectedDate("");
        } else {
            setSelectedDate(newDate);
        }
    };

    const isSelectedDay = (day) => {
        if (!day || !selectedDate) return false;
        const [y, m, d] = selectedDate.split("-");
        return (
            Number(y) === currentMonth.getFullYear() &&
            Number(m) === currentMonth.getMonth() + 1 &&
            Number(d) === day
        );
    };

    const getHoveredDayKey = () => {
        if (!hoveredDay) return null;
        return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(hoveredDay).padStart(2, "0")}`;
    };

    if (!instructor) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.spinner}></div>
                <p>加载个人资料...</p>
            </div>
        );
    }

    const youtubeId = instructor.video_url
        ? instructor.video_url.split("v=")[1]?.split("&")[0]
        : null;

    const hoveredKey = getHoveredDayKey();
    const hoveredSlots = hoveredKey ? slotMap[hoveredKey] : null;

    return (
        <div className={styles.page}>
            {/* Review Modal */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>⭐ 评价导师</h3>

                        <div className={styles.modalInfo}>
                            <p>👨‍🏫 {instructor?.name} {instructor?.surname}</p>
                        </div>

                        <label>评分</label>
                        <div className={styles.ratingSelector}>
                            {renderStars(reviewRating, true, setReviewRating)}
                            <span className={styles.ratingText}>{reviewRating}/5</span>
                        </div>

                        <label>评论 (可选)</label>
                        <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="描述您与导师的经历..."
                            maxLength={500}
                        />
                        <div className={styles.charCount}>{reviewComment.length}/500</div>

                        {reviewError && (
                            <div className={styles.modalError}>{reviewError}</div>
                        )}

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => {
                                    setShowReviewModal(false);
                                    setReviewError("");
                                }}
                            >
                                取消
                            </button>

                            <button
                                className={styles.confirmBtn}
                                onClick={handleSubmitReview}
                                disabled={reviewSubmitting || reviewRating === 0}
                            >
                                {reviewSubmitting ? (
                                    <span className={styles.btnSpinner}></span>
                                ) : (
                                    "发表评价"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBookingModal && selectedSlot && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>确认预约</h3>

                        <div className={styles.modalInfo}>
                            <p>📅 {formatFullDate(selectedSlot.start_time)}</p>
                            <p>🕐 {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}</p>

                            {selectedSlot.lesson_type === "一对一" ? (
                                <p>👤 {selectedSlot.lesson_type}</p>
                            ):(
                                <p>👥 {selectedSlot.lesson_type}</p>
                            )}
                            {selectedSlot.lesson_type === "小组课" && selectedSlot.interest_name && (
                                <p>📘 {selectedSlot.interest_name}</p>
                            )}
                            <p>🎓 {selectedSlot.teaching_type}</p>
                            {selectedSlot.teaching_type === "线下" && selectedSlot.location && (
                                <p>📍 {selectedSlot.location}</p>
                            )}

                            <p>💰 {selectedSlot.price}€</p>
                        </div>

                        {selectedSlot.lesson_type === "一对一" && (
                            <>
                                <label>科目</label>
                                <select
                                    value={selectedInterest}
                                    onChange={(e) => setSelectedInterest(e.target.value)}
                                >
                                    <option value="">-- 选择科目 --</option>
                                    {instructor.interests.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        <label>给导师的备注</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="例如，我需要帮助..."
                        />

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowBookingModal(false)}
                            >
                                取消
                            </button>

                            <button
                                className={styles.confirmBtn}
                                onClick={() => {
                                    setShowBookingModal(false);
                                    setShowPaymentModal(true);
                                }}
                                disabled={!selectedInterest && selectedSlot.lesson_type === "一对一"}
                            >
                                支付并预约
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPaymentModal && selectedSlot && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} ${styles.paymentModal}`}>
                        <h1 className={styles.paymentName}>
                            Kex<div>支付</div>
                        </h1>
                        <h3 className={styles.paymentTitle}>
                            需支付 <span>{selectedSlot.price}€</span>
                        </h3>

                        <div className={styles.paymentField}>
                            <label>卡号</label>
                            <input
                                type="text"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                placeholder="1234 5678 9012 3456"
                            />
                            {cardNumber.replace(/\s/g, "").length > 0 &&
                                cardNumber.replace(/\s/g, "").length !== 16 && (
                                    <span className={styles.errorText}>
                                        卡号必须为16位数字。
                                    </span>
                                )}
                        </div>

                        <div className={styles.paymentField}>
                            <label>持卡人姓名</label>
                            <input
                                type="text"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                placeholder="姓名"
                            />
                        </div>

                        <div className={styles.paymentRow}>
                            <div className={styles.paymentField}>
                                <label>有效期</label>
                                <input
                                    type="text"
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                    placeholder="MM/YY"
                                />
                                {cardExpiry.length === 5 && !isExpiryValid(cardExpiry) && (
                                    <span className={styles.errorText}>
                                        有效期无效
                                    </span>
                                )}
                            </div>

                            <div className={styles.paymentField}>
                                <label>CVC</label>
                                <input
                                    type="text"
                                    value={cardCvc}
                                    onChange={(e) =>
                                        setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 3))
                                    }
                                    placeholder="123"
                                />
                                {cardCvc.length > 0 && cardCvc.length !== 3 && (
                                    <span className={styles.errorText}>
                                        CVC 必须为 3 位数字
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowPaymentModal(false)}
                            >
                                取消
                            </button>

                            <button
                                className={styles.confirmBtn}
                                disabled={
                                    cardNumber.replace(/\s/g, "").length !== 16 ||
                                    cardCvc.length !== 3 ||
                                    !isExpiryValid(cardExpiry) ||
                                    !cardName
                                }
                                onClick={() => {
                                    handleBook(selectedSlot.id, note, selectedInterest);

                                    setShowPaymentModal(false);
                                    setCardNumber("");
                                    setCardName("");
                                    setCardExpiry("");
                                    setCardCvc("");
                                    setNote("");
                                    setSelectedInterest("");
                                }}
                            >
                                支付
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Banner */}
            {(bookingMessage || reviewMessage) && (
                <div className={styles.successBanner}>
                    {bookingMessage || reviewMessage}
                </div>
            )}

            {/* Error Banner */}
            {bookingError && (
                <div className={styles.errorBanner}>
                    ⚠️ {bookingError}
                    <button onClick={() => setBookingError("")} className={styles.dismissBtn}>×</button>
                </div>
            )}

            <div className={styles.profileGrid}>
                {/* Left Column - Instructor Info */}
                <div className={styles.profileCard}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatarWrapper}>
                            <img
                                src={instructor.profile_picture
                                    ? getImageUrl(instructor.profile_picture)
                                    : "/avatar.png"}
                                alt={`${instructor.name} ${instructor.surname}`}
                            />
                        </div>
                        
                        <h1>
                            {instructor.name} {instructor.surname}
                            {instructor.is_verified && (
                                <span className={styles.verifiedBadge} title="已验证导师">✓</span>
                            )}
                        </h1>
                        
                        {instructor.city && (
                            <p className={styles.location}>
                                📍 {instructor.city}
                            </p>
                        )}
                    </div>

                    <div className={styles.statsRow}>
                        {reviewStats.total_reviews > 0 && (
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>
                                    ⭐ {reviewStats.average_rating}
                                </span>
                                <span className={styles.statLabel}>{reviewStats.total_reviews} 条评价</span>
                            </div>
                        )}
                        {minSlotPrice != null && (
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>从 {minSlotPrice}€ 起</span>
                                <span className={styles.statLabel}>每小时</span>
                            </div>
                        )}
                        {instructor.teaching_type && (
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>
                                    {instructor.teaching_type === "线上" ? "💻" : instructor.teaching_type === "线下" ? "🏫" : "💻🏫"}
                                </span>
                                <span className={styles.statLabel}>{instructor.teaching_type}</span>
                            </div>
                        )}
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{availableSlots.length}</span>
                            <span className={styles.statLabel}>空闲时段</span>
                        </div>
                    </div>

                    {instructor.interests?.length > 0 && (
                        <div className={styles.section}>
                            <h3>🎓 授课领域</h3>
                            <div className={styles.tags}>
                                {instructor.interests.map(i => (
                                    <span key={i.id} className={styles.tag}>
                                        {i.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {instructor.biography && (
                        <div className={styles.section}>
                            <h3>📝 关于我</h3>
                            <p className={styles.bioText}>{instructor.biography}</p>
                        </div>
                    )}

                    {instructor.reference && (
                        <div className={styles.section}>
                            <h3>🏆 资质证明</h3>
                            <p className={styles.bioText}>{instructor.reference}</p>
                        </div>
                    )}

                    {youtubeId && (
                        <div className={styles.section}>
                            <h3>🎬 视频介绍</h3>
                            <div className={styles.video}>
                                <iframe
                                    src={`https://www.youtube.com/embed/${youtubeId}`}
                                    title="YouTube 视频"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    )}

                    {/* Reviews Section */}
                    <div className={styles.section}>
                        <div className={styles.reviewsHeader}>
                            <h3>⭐ 评价</h3>
                            {canReview && (
                                <button
                                    className={styles.addReviewBtn}
                                    onClick={() => setShowReviewModal(true)}
                                >
                                    + 发表评价
                                </button>
                            )}
                        </div>

                        {reviewStats.total_reviews > 0 && (
                            <div className={styles.ratingOverview}>
                                <div className={styles.ratingBig}>
                                    {reviewStats.average_rating}
                                </div>
                                <div className={styles.ratingDetails}>
                                    {renderStars(Math.round(parseFloat(reviewStats.average_rating)))}
                                    <span className={styles.reviewCount}>
                                        {reviewStats.total_reviews} 条评价
                                    </span>
                                </div>
                            </div>
                        )}

                        {reviews.length === 0 ? (
                            <div className={styles.noReviews}>
                                <p>此导师暂无评价。</p>
                                {canReview && (
                                    <p>成为第一个留下评论的人！</p>
                                )}
                            </div>
                        ) : (
                            <div className={styles.reviewsList}>
                                {reviews.map(review => (
                                    <div key={review.id} className={styles.reviewCard}>
                                        <div className={styles.reviewHeader}>
                                            <img
                                                src={review.student_picture
                                                    ? getImageUrl(review.student_picture)
                                                    : "/avatar.png"}
                                                alt={`${review.student_name} ${review.student_surname}`}
                                                className={styles.reviewAvatar}
                                            />
                                            <div className={styles.reviewMeta}>
                                                <span className={styles.reviewAuthor}>
                                                    {review.student_name} {review.student_surname}
                                                </span>
                                                <span className={styles.reviewSubject}>
                                                    {review.interest_name}
                                                </span>
                                            </div>
                                            <div className={styles.reviewRating}>
                                                {renderStars(review.rating)}
                                            </div>
                                        </div>
                                        {review.comment && (
                                            <p className={styles.reviewComment}>
                                                "{review.comment}"
                                            </p>
                                        )}
                                        <span className={styles.reviewDate}>
                                            {formatReviewDate(review.created_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Calendar & Booking */}
                <div className={styles.bookingCard}>
                    <div className={styles.bookingHeader}>
                        <h2>📅 预约时间</h2>
                        <p>选择日历中的日期或查看下方所有时段</p>
                    </div>

                    {slotsLoading ? (
                        <div className={styles.loadingSlots}>
                            <div className={styles.spinnerSmall}></div>
                            <p>加载时段中...</p>
                        </div>
                    ) : (
                        <>
                            {/* Calendar */}
                            <div className={styles.calendarSection}>
                                <div className={styles.calendarHeader}>
                                    <button
                                        className={styles.navBtn}
                                        onClick={() =>
                                            setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                                        }
                                    >
                                        ←
                                    </button>
                                    <div className={styles.monthLabel}>
                                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                    </div>
                                    <button
                                        className={styles.navBtn}
                                        onClick={() =>
                                            setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                                        }
                                    >
                                        →
                                    </button>
                                </div>

                                <div className={styles.weekdays}>
                                    {dayNames.map(day => (
                                        <span key={day}>{day}</span>
                                    ))}
                                </div>

                                <div className={styles.calendarGrid}>
                                    {buildCalendar().map((day, idx) => {
                                        const key = day
                                            ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                                            : null;
                                        const daySlots = key ? slotMap[key] || [] : [];
                                        const availableCount = daySlots.filter(s => Number(s.booked_count || 0) < Number(s.capacity)).length;
                                        const dayIsPast = isPast(day);
                                        const dayIsToday = isToday(day);

                                        let dayClass = styles.day;
                                        if (isSelectedDay(day)) dayClass += ` ${styles.selectedDay}`;
                                        if (dayIsToday) dayClass += ` ${styles.today}`;
                                        if (dayIsPast) dayClass += ` ${styles.pastDay}`;
                                        if (availableCount > 0) dayClass += ` ${styles.hasSlots}`;

                                        return (
                                            <button
                                                key={`${day || "empty"}-${idx}`}
                                                className={dayClass}
                                                disabled={!day}
                                                onClick={() => handleDaySelect(day)}
                                                onMouseEnter={() => setHoveredDay(day)}
                                                onMouseLeave={() => setHoveredDay(null)}
                                            >
                                                <span className={styles.dayNumber}>{day || ""}</span>
                                                {availableCount > 0 && (
                                                    <span className={styles.badge}>{availableCount}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Tooltip */}
                                {hoveredDay && hoveredSlots && hoveredSlots.length > 0 && (
                                    <div className={styles.tooltip}>
                                        <div className={styles.tooltipDate}>
                                            {hoveredDay}. {monthNames[currentMonth.getMonth()]}
                                        </div>
                                        <div className={styles.tooltipContent}>
                                            {hoveredSlots.map((slot, i) => {
                                                const isAvailable = Number(slot.booked_count || 0) < Number(slot.capacity);
                                                return (
                                                    <div key={i} className={`${styles.tooltipItem} ${!isAvailable ? styles.tooltipItemFull : ""}`}>
                                                        🕐 {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                        <span className={styles.tooltipBadge}>
                                                            {isAvailable ? "空闲" : "已满"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.legend}>
                                    <div className={styles.legendItem}>
                                        <span className={`${styles.legendDot} ${styles.legendToday}`}></span>
                                        今天
                                    </div>
                                    <div className={styles.legendItem}>
                                        <span className={`${styles.legendDot} ${styles.legendAvailable}`}></span>
                                        有空闲时段
                                    </div>
                                </div>
                            </div>

                            {/* Slot List */}
                            <div className={styles.slotSection}>
                                <div className={styles.slotHeader}>
                                    <h3>
                                        {selectedDate 
                                            ? `${formatFullDate(selectedDate)} 的时段`
                                            : "所有可用时段"
                                        }
                                    </h3>
                                    {selectedDate && (
                                        <button 
                                            className={styles.clearFilter}
                                            onClick={() => setSelectedDate("")}
                                        >
                                            显示全部 ×
                                        </button>
                                    )}
                                </div>

                                {filteredSlots.length === 0 ? (
                                    <div className={styles.emptySlots}>
                                        <div className={styles.emptyIcon}>📭</div>
                                        <p>{selectedDate ? "所选日期没有时段" : "当前没有可用时段"}</p>
                                        <span>尝试选择其他日期或稍后再来</span>
                                    </div>
                                ) : (
                                    <div className={styles.slotList}>
                                        {filteredSlots.map(slot => (
                                            <div key={slot.id} className={styles.slotCard}>
                                                <div className={styles.slotInfo}>
                                                    <div className={styles.slotDate}>
                                                        📅 {formatShortDate(slot.start_time)}
                                                    </div>
                                                    <div className={styles.slotTime}>
                                                        🕐 {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                    </div>
                                                    <div className={styles.slotMeta}>
                                                        <span className={styles.slotType}>
                                                            {slot.teaching_type === "在线" && "💻 在线"}
                                                            {slot.teaching_type === "线下" && "🏫 线下"}
                                                        </span>

                                                            {slot.price != null && (
                                                                <span className={styles.slotPrice}>
                                                                💰 {slot.price}€
                                                                </span>
                                                            )}
                                                    </div>
                                                    <div className={styles.slotMeta}>
                                                        <span className={styles.slotLessonType}>
                                                            🎓 {slot.lesson_type === "一对一" ? "一对一" : "小组课"}
                                                        </span>

                                                        {slot.lesson_type === "小组课" && slot.interest_name && (
                                                            <span className={styles.slotInterest}>
                                                                📘 {slot.interest_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={styles.slotCapacity}>
                                                        👥 {Number(slot.capacity) - Number(slot.booked_count || 0)} 个剩余名额
                                                    </div>
                                                </div>
                                                <button
                                                    className={styles.bookBtn}
                                                    onClick={() => {
                                                        setSelectedSlot(slot);
                                                        setShowBookingModal(true);
                                                    }}
                                                    disabled={bookingInProgress === slot.id}
                                                >
                                                    {bookingInProgress === slot.id ? (
                                                        <span className={styles.btnSpinner}></span>
                                                    ) : (
                                                        "预约"
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!user && (
                                <div className={styles.loginPrompt}>
                                    <p>🔐 预约时段需要登录</p>
                                    <button onClick={() => navigate("/login")} className={styles.loginBtn}>
                                        登录
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
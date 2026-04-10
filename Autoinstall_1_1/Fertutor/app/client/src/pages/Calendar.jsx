import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Autocomplete, useLoadScript } from "@react-google-maps/api";
import { AuthContext } from "../context/AuthContext";
import styles from "./Calendar.module.css";

export default function Calendar() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [interests, setInterests] = useState([]);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [slotDetails, setSlotDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
    const [bookingDetails, setBookingDetails] = useState(null);
    const [bookingDetailsLoading, setBookingDetailsLoading] = useState(false);
    const [noteDraft, setNoteDraft] = useState("");
    const [noteSaving, setNoteSaving] = useState(false);

    // 创建课程模态框状态
    const [createLessonModalOpen, setCreateLessonModalOpen] = useState(false);

    const [form, setForm] = useState({
        date: "",
        start: "",
        end: "",
        capacity: 2,
        teaching_type: "线上",
        lesson_type: "一对一",
        interest_id: "",
        price: "",
        location: ""
    });

    const libraries = ["places"];

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries
    });

    const [autocomplete, setAutocomplete] = useState(null);

    const onLoadAutocomplete = (auto) => {
        setAutocomplete(auto);
    };

    const onPlaceChanged = () => {
        if (!autocomplete) return;
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
            setForm(prev => ({
                ...prev,
                location: place.formatted_address
            }));
        }
    };

    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [hoveredDay, setHoveredDay] = useState(null);

    const monthNames = [
        "一月", "二月", "三月", "四月", "五月", "六月",
        "七月", "八月", "九月", "十月", "十一月", "十二月"
    ];

    const dayNames = ["一", "二", "三", "四", "五", "六", "日"];

    useEffect(() => {
        if (!user) return;

        const loadInterests = async () => {
            try {
                const res = await api.get("/calendar/my-interests");
                setInterests(res.data.interests || []);
            } catch (err) {
                console.error("获取科目时出错:", err);
            }
        };

        loadInterests();

        if (user.is_professor) {
            loadSlots();
        } else {
            loadBookings();
        }
    }, [user]);

    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(""), 3000);
    };

    const loadSlots = async () => {
        try {
            const res = await api.get("/calendar/my-slots");
            setSlots(res.data.slots || []);
        } catch (err) {
            setError(err.response?.data?.message || "获取时间段时出错。");
        } finally {
            setLoading(false);
        }
    };

    const loadBookings = async () => {
        try {
            const res = await api.get("/calendar/my-bookings");
            setBookings(res.data.bookings || []);
        } catch (err) {
            setError(err.response?.data?.message || "获取预订时出错。");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError("");

        if (
            !form.date ||
            !form.start ||
            !form.end ||
            !form.teaching_type ||
            form.price === ""
        ) {
            setError("请填写所有必填字段。");
            return;
        }

        if (form.teaching_type === "线下" && !form.location) {
            setError("线下课程必须提供地点。");
            return;
        }

        if (form.lesson_type === "集体课" && !form.interest_id) {
            setError("集体课必须选择科目。");
            return;
        }

        const start_time = `${form.date}T${form.start}`;
        const end_time = `${form.date}T${form.end}`;

        try {
            await api.post("/calendar/slots", {
                start_time,
                end_time,
                teaching_type: form.teaching_type,
                lesson_type: form.lesson_type,
                capacity: form.lesson_type === "一对一" ? 1 : Number(form.capacity),
                interest_id: form.lesson_type === "集体课" ? Number(form.interest_id) : null,
                price: Number(form.price),
                location: form.teaching_type === "线下" ? form.location : null
            });

            // 重置表单
            setForm({
                date: "",
                start: "",
                end: "",
                capacity: 2,
                teaching_type: "线上",
                lesson_type: "一对一",
                interest_id: "",
                price: "",
                location: ""
            });

            showSuccess("时间段添加成功！✓");
            setCreateLessonModalOpen(false);
            loadSlots();
        } catch (err) {
            setError(err.response?.data?.message || "保存时间段时出错。");
        }
    };

    const handleDelete = async (slotId) => {
        try {
            await api.delete(`/calendar/slots/${slotId}`);
            showSuccess("时间段已删除。");
            loadSlots();
        } catch (err) {
            setError(err.response?.data?.message || "删除时间段时出错。");
        }
    };

    const handleCancel = async (slotId) => {
        try {
            await api.delete(`/calendar/book/${slotId}`);
            showSuccess("时间段已成功取消。");
            await loadBookings();
        } catch (err) {
            setError(err.response?.data?.message || "取消时间段时出错。");
        }
    };

    const openDetails = async (slotId) => {
        setDetailsLoading(true);
        setDetailsOpen(true);

        try {
            const res = await api.get(`/calendar/slots/${slotId}/details`);
            setSlotDetails(res.data);
        } catch (err) {
            setError("获取时间段详情时出错。");
            setDetailsOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    const openBookingDetails = async (bookingId) => {
        setBookingDetailsLoading(true);
        setBookingDetailsOpen(true);

        try {
            const res = await api.get(`/calendar/bookings/${bookingId}/details`);
            setBookingDetails(res.data.booking);
            setNoteDraft(res.data.booking.note || "");
        } catch (err) {
            setError("获取预订详情时出错。");
            setBookingDetailsOpen(false);
        } finally {
            setBookingDetailsLoading(false);
        }
    };

    const saveNote = async () => {
        if (!bookingDetails) return;

        setNoteSaving(true);
        try {
            const res = await api.patch(
                `/calendar/bookings/${bookingDetails.id}/note`,
                { note: noteDraft }
            );

            setBookingDetails(prev => ({
                ...prev,
                note: res.data.note
            }));

            showSuccess("备注已保存 ✓");
        } catch (err) {
            setError("保存备注时出错。");
        } finally {
            setNoteSaving(false);
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
            month: "long",
            year: "numeric"
        });
    };

    const formatShortDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("zh-CN", {
            day: "numeric",
            month: "short"
        });
    };

    const daysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const startWeekday = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const buildCalendar = () => {
        const totalDays = daysInMonth(currentMonth);
        const offset = startWeekday(currentMonth);
        const days = [];

        for (let i = 0; i < offset; i += 1) {
            days.push(null);
        }

        for (let d = 1; d <= totalDays; d += 1) {
            days.push(d);
        }

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

    const slotCountByDay = slots.reduce((acc, slot) => {
        const key = dateKey(slot.start_time);
        acc[key] = acc[key] || { total: 0, booked: 0, slots: [] };
        acc[key].total += 1;
        acc[key].booked += Number(slot.booked_count || 0);
        acc[key].slots.push(slot);
        return acc;
    }, {});

    const bookingCountByDay = bookings.reduce((acc, booking) => {
        const key = dateKey(booking.start_time);
        acc[key] = acc[key] || [];
        acc[key].push(booking);
        return acc;
    }, {});

    const selectedDayBookings = form.date
        ? (bookingCountByDay[form.date] || [])
        : bookings;

    const selectedDaySlots = form.date
        ? slots.filter(s => dateKey(s.start_time) === form.date)
        : slots;

    const handleDaySelect = (day) => {
        if (!day) return;
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
        const date = String(day).padStart(2, "0");
        const newDate = `${year}-${month}-${date}`;

        if (form.date === newDate) {
            setForm(prev => ({ ...prev, date: "" }));
        } else {
            setForm(prev => ({ ...prev, date: newDate }));
        }
    };

    const isSelectedDay = (day) => {
        if (!day || !form.date) return false;
        const [y, m, d] = form.date.split("-");
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

    const hasBookingsOnDay = (key) => bookingCountByDay[key] && bookingCountByDay[key].length > 0;
    const hasSlotsOnDay = (key) => slotCountByDay[key] && slotCountByDay[key].total > 0;

    if (!user) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔐</div>
                <h2>需要登录</h2>
                <p>请登录以查看和管理课程时间。</p>
            </div>
        );
    }

    const hoveredKey = getHoveredDayKey();
    const hoveredData = user?.is_professor
        ? (hoveredKey && slotCountByDay[hoveredKey])
        : (hoveredKey && bookingCountByDay[hoveredKey]);

    const isOngoing = (start, end) => {
        const now = new Date();
        const startTime = new Date(start);
        const endTime = new Date(end);
        const tenMinutesBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
        return now >= tenMinutesBefore && now <= endTime;
    };

    const isPastLesson = (end) => {
        const now = new Date();
        return now > new Date(end);
    };

    return (
        <div className={styles.page}>
            <header className={styles.pageHeaderCompact}>
                <div className={styles.headerContent}>
                    <h1>
                        {user?.is_professor ? "📅 我的日历" : "📋 我的课程"}
                    </h1>
                </div>
            </header>

            {success && (
                <div className={styles.successBanner}>
                    {success}
                </div>
            )}

            {error && (
                <div className={styles.errorBanner}>
                    ⚠️ {error}
                    <button onClick={() => setError("")} className={styles.dismissBtn}>×</button>
                </div>
            )}

            <div className={user?.is_professor ? styles.mainContentProfessor : styles.mainContent}>
                <div className={styles.calendarCard}>
                    <div className={styles.calendarHeader}>
                        <button
                            className={styles.navBtn}
                            onClick={() =>
                                setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                            }
                            aria-label="上个月"
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
                            aria-label="下个月"
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

                            const hasSlots = key && hasSlotsOnDay(key);
                            const hasBooking = key && hasBookingsOnDay(key);
                            const dayIsPast = isPast(day);
                            const dayIsToday = isToday(day);

                            const dayData = user?.is_professor
                                ? (key && slotCountByDay[key])
                                : (key && bookingCountByDay[key]);
                            const showTooltip = hoveredDay === day && dayData;

                            let dayClass = styles.day;
                            if (isSelectedDay(day)) dayClass += ` ${styles.selectedDay}`;
                            if (dayIsToday) dayClass += ` ${styles.today}`;
                            if (dayIsPast) dayClass += ` ${styles.pastDay}`;
                            if (user?.is_professor && hasSlots) dayClass += ` ${styles.hasSlots}`;
                            if (!user?.is_professor && hasBooking) dayClass += ` ${styles.hasBooking}`;

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
                                    {day && user?.is_professor && slotCountByDay[key] && (
                                        <span className={styles.badge}>
                                            {slotCountByDay[key].booked}/{slotCountByDay[key].total}
                                        </span>
                                    )}
                                    {day && !user?.is_professor && bookingCountByDay[key] && (
                                        <span className={styles.badgeStudent}>
                                            {bookingCountByDay[key].length}
                                        </span>
                                    )}
                                    
                                    {showTooltip && (
                                        <div className={styles.tooltip}>
                                            <div className={styles.tooltipDate}>
                                                {day}月{monthNames[currentMonth.getMonth()]}
                                            </div>
                                            {user?.is_professor ? (
                                                <div className={styles.tooltipContent}>
                                                    {dayData.slots.map((slot, i) => (
                                                        <div key={i} className={styles.tooltipItem}>
                                                            🕐 {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                            <span className={styles.tooltipBadge}>
                                                                {slot.booked_count || 0}/{slot.capacity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={styles.tooltipContent}>
                                                    {dayData.map((b, i) => (
                                                        <div key={i} className={styles.tooltipItem}>
                                                            🕐 {formatTime(b.start_time)} - {b.professor_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.legend}>
                        <div className={styles.legendItem}>
                            <span className={`${styles.legendDot} ${styles.legendToday}`}></span>
                            今天
                        </div>
                        {user?.is_professor ? (
                            <div className={styles.legendItem}>
                                <span className={`${styles.legendDot} ${styles.legendSlot}`}></span>
                                已设课程
                            </div>
                        ) : (
                            <div className={styles.legendItem}>
                                <span className={`${styles.legendDot} ${styles.legendBooking}`}></span>
                                已预订课程
                            </div>
                        )}
                    </div>

                    {user?.is_professor && (
                        <button
                            className={styles.createLessonBtn}
                            onClick={() => setCreateLessonModalOpen(true)}
                        >
                            ➕ 创建新课程
                        </button>
                    )}
                </div>

                <div className={styles.sidePanel}>
                    <div className={styles.listCard}>
                        <div className={styles.listHeader}>
                            <h3>
                                {user?.is_professor ? "📋 您的课程" : "📋 您的预订"}
                            </h3>
                            {form.date && (
                                <button
                                    className={styles.clearFilter}
                                    onClick={() => setForm(prev => ({ ...prev, date: "" }))}
                                >
                                    显示全部 ×
                                </button>
                            )}
                        </div>

                        {form.date && (
                            <div className={styles.filterInfo}>
                                已筛选: {formatFullDate(form.date)}
                            </div>
                        )}

                        {loading ? (
                            <div className={styles.loadingState}>
                                <div className={styles.spinner}></div>
                                <p>加载中...</p>
                            </div>
                        ) : user?.is_professor ? (
                            <div className={styles.list}>
                                {selectedDaySlots.length === 0 ? (
                                    <div className={styles.emptyList}>
                                        <div className={styles.emptyListIcon}>📭</div>
                                        <p>{form.date ? "所选日期无课程" : "您还没有设置课程"}</p>
                                        <span>使用上方表单添加您的第一个课程</span>
                                    </div>
                                ) : (
                                    selectedDaySlots.map(slot => (
                                        <div
                                            key={slot.id}
                                            className={`${styles.slotCard} ${isOngoing(slot.start_time, slot.end_time) ? styles.ongoing : ""
                                                }`}
                                        >
                                            <div className={styles.slotMain}>
                                                <div className={styles.slotDate}>
                                                    {formatShortDate(slot.start_time)}
                                                </div>
                                                <div className={styles.slotTime}>
                                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                </div>
                                                <div className={styles.slotMetaInfo}>
                                                    🎓 {slot.teaching_type} · 💰 {slot.price} €
                                                    {slot.location && <div>📍 {slot.location}</div>}
                                                </div>
                                                <div className={styles.slotMetaInfo}>
                                                    👥 {slot.lesson_type}
                                                    {slot.interest_name && <div>📘 {slot.interest_name}</div>}
                                                </div>
                                            </div>
                                            {!isOngoing(slot.start_time, slot.end_time) && (
                                                <>
                                                    <div className={styles.slotMeta}>
                                                        <div className={`${styles.capacityBadge} ${Number(slot.booked_count) >= Number(slot.capacity) ? styles.full : ""}`}>
                                                            👥 {slot.booked_count || 0} / {slot.capacity}
                                                        </div>
                                                        {Number(slot.booked_count || 0) === 0 ? (
                                                            <button
                                                                className={styles.deleteBtn}
                                                                onClick={() => handleDelete(slot.id)}
                                                            >
                                                                🗑️ 删除
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={styles.detailsBtn}
                                                                onClick={() => openDetails(slot.id)}
                                                            >
                                                                📋 详情
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                            {isOngoing(slot.start_time, slot.end_time) &&
                                                slot.teaching_type === "线上" && (
                                                    <button
                                                        className={styles.joinBtn}
                                                        onClick={() => {
                                                            if (slot.meeting_url) {
                                                                window.open(slot.meeting_url, '_blank');
                                                            } else {
                                                                alert("会议链接尚未生成。");
                                                            }
                                                        }}
                                                    >
                                                        🎥 加入会议
                                                    </button>
                                                )}
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className={styles.list}>
                                {selectedDayBookings.length === 0 ? (
                                    <div className={styles.emptyList}>
                                        <div className={styles.emptyListIcon}>📭</div>
                                        <p>{form.date ? "所选日期无预订" : "您还没有预订课程"}</p>
                                        <span>搜索教师并预订课程</span>
                                    </div>
                                ) : (
                                    selectedDayBookings.map(booking => (
                                        <div
                                            key={booking.id}
                                            className={`${styles.slotCard} ${isOngoing(booking.start_time, booking.end_time)
                                                ? styles.ongoing
                                                : ""
                                                }`}
                                        >
                                            <div className={styles.slotMain}>
                                                <div className={styles.slotDate}>
                                                    {formatShortDate(booking.start_time)}
                                                </div>
                                                <div className={styles.slotTime}>
                                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                </div>
                                                <div className={styles.professorName}>
                                                    👨‍🏫 {booking.professor_name} {booking.professor_surname}
                                                </div>
                                                <div className={styles.slotMetaInfo}>
                                                    🎓 {booking.teaching_type} · 💰 {booking.price} €
                                                    {booking.interest_name && (
                                                        <div>📘 {booking.interest_name}</div>
                                                    )}
                                                    👥 {booking.lesson_type}
                                                </div>
                                            </div>
                                            {!isOngoing(booking.start_time, booking.end_time) && (
                                                <div className={styles.slotMeta}>
                                                    <button
                                                        className={styles.cancelBtn}
                                                        onClick={() => handleCancel(booking.slot_id)}
                                                    >
                                                        {isPastLesson(booking.end_time) ? "🗑️ 删除" : "❌ 取消"}
                                                    </button>
                                                    <button
                                                        className={styles.detailsBtn}
                                                        onClick={() => openBookingDetails(booking.id)}
                                                    >
                                                        📋 详情
                                                    </button>
                                                </div>
                                            )}
                                            {isOngoing(booking.start_time, booking.end_time) &&
                                                booking.teaching_type === "线上" && (
                                                    <button
                                                        className={styles.joinBtn}
                                                        onClick={() => {
                                                            if (booking.meeting_url) {
                                                                window.open(booking.meeting_url, '_blank');
                                                            } else {
                                                                alert("会议链接尚未生成。");
                                                            }
                                                        }}
                                                    >
                                                        🎥 加入会议
                                                    </button>
                                                )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 时间段详情模态框（教授） */}
            {detailsOpen && (
                <div className={styles.modalOverlay} onClick={() => setDetailsOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        {detailsLoading ? (
                            <p>加载中...</p>
                        ) : slotDetails && (
                            <>
                                <h2>📋 课程详情</h2>

                                <div className={styles.modalSection}>
                                    <p><strong>📅 日期:</strong> {formatFullDate(slotDetails.slot.start_time)}</p>
                                    <p><strong>🕐 时间:</strong> {formatTime(slotDetails.slot.start_time)} – {formatTime(slotDetails.slot.end_time)}</p>
                                    <p><strong>🎓 类型:</strong> {slotDetails.slot.lesson_type}</p>
                                    <p><strong>💻 方式:</strong> {slotDetails.slot.teaching_type}</p>
                                    <p><strong>💰 价格:</strong> {slotDetails.slot.price} €</p>
                                    {slotDetails.slot.location && (
                                        <p><strong>📍 地点:</strong> {slotDetails.slot.location}</p>
                                    )}
                                    {slotDetails.slot.interest_name && (
                                        <p><strong>📘 科目:</strong> {slotDetails.slot.interest_name}</p>
                                    )}
                                </div>

                                <div className={styles.modalSection}>
                                    <h3>👥 学生 ({slotDetails.students.length}):</h3>
                                    {slotDetails.students.length === 0 ? (
                                        <p>暂无预订。</p>
                                    ) : (
                                        slotDetails.students.map(s => (
                                            <div key={s.id} className={styles.studentItem}>
                                                <strong>{s.name} {s.surname}</strong>
                                                {s.note && (
                                                    <div className={styles.note}>
                                                        💬 {s.note}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setDetailsOpen(false)}
                                >
                                    关闭
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 预订详情模态框（学生） */}
            {bookingDetailsOpen && (
                <div className={styles.modalOverlay} onClick={() => setBookingDetailsOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        {bookingDetailsLoading ? (
                            <p>加载中...</p>
                        ) : bookingDetails && (
                            <>
                                <h2>📋 预订详情</h2>

                                <div className={styles.modalSection}>
                                    <p>
                                        <strong>📅 日期:</strong>{" "}
                                        {formatFullDate(bookingDetails.start_time)}
                                    </p>
                                    <p>
                                        <strong>🕐 时间:</strong>{" "}
                                        {formatTime(bookingDetails.start_time)} –{" "}
                                        {formatTime(bookingDetails.end_time)}
                                    </p>
                                    <p>
                                        <strong>👨‍🏫 教师:</strong>{" "}
                                        {bookingDetails.professor_name}{" "}
                                        {bookingDetails.professor_surname}
                                    </p>
                                    <p>
                                        <strong>🎓 类型:</strong>{" "}
                                        {bookingDetails.lesson_type}
                                    </p>
                                    <p>
                                        <strong>💻 方式:</strong>{" "}
                                        {bookingDetails.teaching_type}
                                    </p>
                                    <p>
                                        <strong>💰 价格:</strong>{" "}
                                        {bookingDetails.price} €
                                    </p>

                                    {bookingDetails.location && (
                                        <p>
                                            <strong>📍 地点:</strong>{" "}
                                            {bookingDetails.location}
                                        </p>
                                    )}

                                    {bookingDetails.interest_name && (
                                        <p>
                                            <strong>📘 科目:</strong>{" "}
                                            {bookingDetails.interest_name}
                                        </p>
                                    )}
                                </div>

                                <div className={styles.modalSection}>
                                    <h3>💬 您的备注</h3>
                                    <textarea
                                        className={styles.noteTextarea}
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                        placeholder="为教师留下备注..."
                                        maxLength={500}
                                    />
                                    <button
                                        className={styles.saveBtn}
                                        onClick={saveNote}
                                        disabled={noteSaving}
                                    >
                                        {noteSaving ? "保存中..." : "💾 保存备注"}
                                    </button>
                                </div>

                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setBookingDetailsOpen(false)}
                                >
                                    关闭
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 创建课程模态框（教授） */}
            {createLessonModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setCreateLessonModalOpen(false)}>
                    <div className={styles.createLessonModal} onClick={e => e.stopPropagation()}>
                        <h2>➕ 创建新课程</h2>
                        <p className={styles.formHint}>填写课程详细信息</p>

                        <form onSubmit={handleCreate}>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>📅 日期</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.fieldRow}>
                                    <div className={styles.field}>
                                        <label>🕐 开始时间</label>
                                        <input
                                            type="time"
                                            value={form.start}
                                            onChange={(e) => setForm(prev => ({ ...prev, start: e.target.value }))}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label>🕐 结束时间</label>
                                        <input
                                            type="time"
                                            value={form.end}
                                            onChange={(e) => setForm(prev => ({ ...prev, end: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label>💰 价格 (€)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.price}
                                        onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>👥 课程类型</label>
                                    <select
                                        value={form.lesson_type}
                                        onChange={(e) =>
                                            setForm(prev => ({
                                                ...prev,
                                                lesson_type: e.target.value,
                                                capacity: e.target.value === "一对一" ? 1 : 2,
                                                interest_id: ""
                                            }))
                                        }
                                    >
                                        <option value="一对一">一对一</option>
                                        <option value="集体课">集体课</option>
                                    </select>
                                </div>

                                {form.lesson_type === "集体课" && (
                                    <div className={styles.field}>
                                        <label>👥 容量</label>
                                        <input
                                            type="number"
                                            min="2"
                                            value={form.capacity}
                                            onChange={(e) => setForm(prev => ({ ...prev, capacity: e.target.value }))}
                                        />
                                    </div>
                                )}

                                {form.lesson_type === "集体课" && (
                                    <div className={styles.field}>
                                        <label>📘 科目</label>
                                        {interests.length === 0 ? (
                                            <div className={styles.formHint}>您还没有添加科目</div>
                                        ) : (
                                            <select
                                                value={form.interest_id}
                                                onChange={(e) => setForm(prev => ({ ...prev, interest_id: e.target.value }))}
                                            >
                                                <option value="">选择科目</option>
                                                {interests.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div className={styles.field}>
                                    <label>🎓 授课方式</label>
                                    <select
                                        value={form.teaching_type}
                                        onChange={(e) => setForm(prev => ({ ...prev, teaching_type: e.target.value }))}
                                    >
                                        <option value="线上">线上</option>
                                        <option value="线下">线下</option>
                                    </select>
                                </div>

                                {form.teaching_type === "线下" && (
                                    <div className={styles.field}>
                                        <label>📍 地点</label>
                                        {!isLoaded ? (
                                            <input disabled placeholder="地图加载中..." className={styles.inputField} />
                                        ) : (
                                            <Autocomplete
                                                options={{ types: ["address"], componentRestrictions: { country: "hr" } }}
                                                onLoad={onLoadAutocomplete}
                                                onPlaceChanged={onPlaceChanged}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="输入地址"
                                                    value={form.location}
                                                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                                                    className={styles.inputField}
                                                />
                                            </Autocomplete>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelReviewBtn}
                                    onClick={() => setCreateLessonModalOpen(false)}
                                >
                                    取消
                                </button>
                                <button type="submit" className={styles.createLessonSubmitBtn}>
                                    ✓ 创建课程
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
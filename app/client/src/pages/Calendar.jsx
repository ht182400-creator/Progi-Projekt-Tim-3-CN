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

    // Create lesson modal state
    const [createLessonModalOpen, setCreateLessonModalOpen] = useState(false);

    const [form, setForm] = useState({
        date: "",
        start: "",
        end: "",
        capacity: 2,
        teaching_type: "Online",
        lesson_type: "1na1",
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
        "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
        "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac"
    ];

    const dayNames = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

    useEffect(() => {
        if (!user) return;

        const loadInterests = async () => {
            try {
                const res = await api.get("/calendar/my-interests");
                setInterests(res.data.interests || []);
            } catch (err) {
                console.error("Greška pri dohvaćanju predmeta:", err);
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
            setError(err.response?.data?.message || "Greška pri dohvaćanju termina.");
        } finally {
            setLoading(false);
        }
    };

    const loadBookings = async () => {
        try {
            const res = await api.get("/calendar/my-bookings");
            setBookings(res.data.bookings || []);
        } catch (err) {
            setError(err.response?.data?.message || "Greška pri dohvaćanju rezervacija.");
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
            setError("Molimo ispunite sva obavezna polja.");
            return;
        }

        if (form.teaching_type === "Uživo" && !form.location) {
            setError("Lokacija je obavezna za uživo nastavu.");
            return;
        }

        if (form.lesson_type === "Grupno" && !form.interest_id) {
            setError("Predmet je obavezan za grupnu nastavu.");
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
                capacity: form.lesson_type === "1na1" ? 1 : Number(form.capacity),
                interest_id: form.lesson_type === "Grupno" ? Number(form.interest_id) : null, // ✅ PROSLIJEDENO
                price: Number(form.price),
                location: form.teaching_type === "Uživo" ? form.location : null
            });

            // 🔥 KLJUČNO: reset cijelog statea (uključujući interest_id)
            setForm({
                date: "",
                start: "",
                end: "",
                capacity: 2,
                teaching_type: "Online",
                lesson_type: "1na1",
                interest_id: "",
                price: "",
                location: ""
            });

            showSuccess("Termin uspješno dodan! ✓");
            setCreateLessonModalOpen(false);
            loadSlots();
        } catch (err) {
            setError(err.response?.data?.message || "Greška pri spremanju termina.");
        }
    };

    const handleDelete = async (slotId) => {
        try {
            await api.delete(`/calendar/slots/${slotId}`);
            showSuccess("Termin obrisan.");
            loadSlots();
        } catch (err) {
            setError(err.response?.data?.message || "Greška pri brisanju termina.");
        }
    };

    const handleCancel = async (slotId) => {
        try {
            await api.delete(`/calendar/book/${slotId}`);
            showSuccess("Termin uspješno otkazan.");
            await loadBookings();
        } catch (err) {
            setError(err.response?.data?.message || "Greška pri otkazivanju termina.");
        }
    };

    const openDetails = async (slotId) => {
        setDetailsLoading(true);
        setDetailsOpen(true);

        try {
            const res = await api.get(`/calendar/slots/${slotId}/details`);
            setSlotDetails(res.data);
        } catch (err) {
            setError("Greška pri dohvaćanju detalja termina.");
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
            setError("Greška pri dohvaćanju detalja rezervacije.");
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

            // update lokalnog statea
            setBookingDetails(prev => ({
                ...prev,
                note: res.data.note
            }));

            showSuccess("Napomena spremljena ✓");
        } catch (err) {
            setError("Greška pri spremanju napomene.");
        } finally {
            setNoteSaving(false);
        }
    };

    const formatTime = (value) => {
        const date = new Date(value);
        return date.toLocaleTimeString("hr-HR", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatFullDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("hr-HR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    const formatShortDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("hr-HR", {
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
                <h2>Prijava potrebna</h2>
                <p>Prijavite se za pregled i upravljanje terminima.</p>
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

        // Izračunaj točku kad se otvara Join (10 min prije)
        const tenMinutesBefore = new Date(startTime.getTime() - 10 * 60 * 1000);

        // LOGIKA: Sadašnje vrijeme mora biti IZMEĐU (10 min prije) i (kraja termina)
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
                        {user?.is_professor ? "📅 Moj Kalendar" : "📋 Moji Termini"}
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
                            aria-label="Prethodni mjesec"
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
                            aria-label="Sljedeći mjesec"
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

                            // Get tooltip data for this specific day
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
                                    
                                    {/* Tooltip - positioned relative to this day */}
                                    {showTooltip && (
                                        <div className={styles.tooltip}>
                                            <div className={styles.tooltipDate}>
                                                {day}. {monthNames[currentMonth.getMonth()]}
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
                            Danas
                        </div>
                        {user?.is_professor ? (
                            <div className={styles.legendItem}>
                                <span className={`${styles.legendDot} ${styles.legendSlot}`}></span>
                                Postavljeni termini
                            </div>
                        ) : (
                            <div className={styles.legendItem}>
                                <span className={`${styles.legendDot} ${styles.legendBooking}`}></span>
                                Rezervirani termini
                            </div>
                        )}
                    </div>

                    {user?.is_professor && (
                        <button
                            className={styles.createLessonBtn}
                            onClick={() => setCreateLessonModalOpen(true)}
                        >
                            ➕ Kreiraj novi termin
                        </button>
                    )}
                </div>

                <div className={styles.sidePanel}>
                    <div className={styles.listCard}>
                        <div className={styles.listHeader}>
                            <h3>
                                {user?.is_professor ? "📋 Vaši termini" : "📋 Vaše rezervacije"}
                            </h3>
                            {form.date && (
                                <button
                                    className={styles.clearFilter}
                                    onClick={() => setForm(prev => ({ ...prev, date: "" }))}
                                >
                                    Prikaži sve ×
                                </button>
                            )}
                        </div>

                        {form.date && (
                            <div className={styles.filterInfo}>
                                Filtrirano: {formatFullDate(form.date)}
                            </div>
                        )}

                        {loading ? (
                            <div className={styles.loadingState}>
                                <div className={styles.spinner}></div>
                                <p>Učitavanje...</p>
                            </div>
                        ) : user?.is_professor ? (
                            <div className={styles.list}>
                                {selectedDaySlots.length === 0 ? (
                                    <div className={styles.emptyList}>
                                        <div className={styles.emptyListIcon}>📭</div>
                                        <p>{form.date ? "Nema termina za odabrani dan" : "Nemate postavljenih termina"}</p>
                                        <span>Dodajte svoj prvi termin koristeći formu iznad</span>
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
                                                                🗑️ Obriši
                                                            </button>

                                                        ) : (
                                                            <button
                                                                className={styles.detailsBtn}
                                                                onClick={() => openDetails(slot.id)}
                                                            >
                                                                📋 Detalji
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {isOngoing(slot.start_time, slot.end_time) &&
                                                slot.teaching_type === "Online" && (
                                                    <button
                                                        className={styles.joinBtn}
                                                        onClick={() => {
                                                            if (slot.meeting_url) {
                                                                window.open(slot.meeting_url, '_blank');
                                                            } else {
                                                                alert("Link za sastanak još nije generiran.");
                                                            }
                                                        }}
                                                    >
                                                        🎥 Pridruži se
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
                                        <p>{form.date ? "Nema rezervacija za odabrani dan" : "Nemate rezerviranih termina"}</p>
                                        <span>Potražite instruktore i rezervirajte termin</span>
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
                                                        {isPastLesson(booking.end_time) ? "🗑️ Obriši" : "❌ Otkaži"}
                                                    </button>
                                                    <button
                                                        className={styles.detailsBtn}
                                                        onClick={() => openBookingDetails(booking.id)}
                                                    >
                                                        📋 Detalji
                                                    </button>
                                                </div>
                                            )}
                                            {isOngoing(booking.start_time, booking.end_time) &&
                                                booking.teaching_type === "Online" && (
                                                    <button
                                                        className={styles.joinBtn}
                                                        onClick={() => {
                                                            if (booking.meeting_url) {
                                                                window.open(booking.meeting_url, '_blank');
                                                            } else {
                                                                alert("Link za sastanak još nije generiran.");
                                                            }
                                                        }}
                                                    >
                                                        🎥 Pridruži se
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
            {detailsOpen && (
                <div className={styles.modalOverlay} onClick={() => setDetailsOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        {detailsLoading ? (
                            <p>Učitavanje...</p>
                        ) : slotDetails && (
                            <>
                                <h2>📋 Detalji termina</h2>

                                <div className={styles.modalSection}>
                                    <p><strong>📅 Datum:</strong> {formatFullDate(slotDetails.slot.start_time)}</p>
                                    <p><strong>🕐 Vrijeme:</strong> {formatTime(slotDetails.slot.start_time)} – {formatTime(slotDetails.slot.end_time)}</p>
                                    <p><strong>🎓 Tip:</strong> {slotDetails.slot.lesson_type}</p>
                                    <p><strong>💻 Način:</strong> {slotDetails.slot.teaching_type}</p>
                                    <p><strong>💰 Cijena:</strong> {slotDetails.slot.price} €</p>
                                    {slotDetails.slot.location && (
                                        <p><strong>📍 Lokacija:</strong> {slotDetails.slot.location}</p>
                                    )}
                                    {slotDetails.slot.interest_name && (
                                        <p><strong>📘 Predmet:</strong> {slotDetails.slot.interest_name}</p>
                                    )}
                                </div>

                                <div className={styles.modalSection}>
                                    <h3>👥 Studenti ({slotDetails.students.length}):</h3>

                                    {slotDetails.students.length === 0 ? (
                                        <p>Nema rezervacija.</p>
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
                                    Zatvori
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            {bookingDetailsOpen && (
                <div className={styles.modalOverlay} onClick={() => setBookingDetailsOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        {bookingDetailsLoading ? (
                            <p>Učitavanje...</p>
                        ) : bookingDetails && (
                            <>
                                <h2>📋 Detalji rezervacije</h2>

                                <div className={styles.modalSection}>
                                    <p>
                                        <strong>📅 Datum:</strong>{" "}
                                        {formatFullDate(bookingDetails.start_time)}
                                    </p>
                                    <p>
                                        <strong>🕐 Vrijeme:</strong>{" "}
                                        {formatTime(bookingDetails.start_time)} –{" "}
                                        {formatTime(bookingDetails.end_time)}
                                    </p>
                                    <p>
                                        <strong>👨‍🏫 Profesor:</strong>{" "}
                                        {bookingDetails.professor_name}{" "}
                                        {bookingDetails.professor_surname}
                                    </p>
                                    <p>
                                        <strong>🎓 Tip:</strong>{" "}
                                        {bookingDetails.lesson_type}
                                    </p>
                                    <p>
                                        <strong>💻 Način:</strong>{" "}
                                        {bookingDetails.teaching_type}
                                    </p>
                                    <p>
                                        <strong>💰 Cijena:</strong>{" "}
                                        {bookingDetails.price} €
                                    </p>

                                    {bookingDetails.location && (
                                        <p>
                                            <strong>📍 Lokacija:</strong>{" "}
                                            {bookingDetails.location}
                                        </p>
                                    )}

                                    {bookingDetails.interest_name && (
                                        <p>
                                            <strong>📘 Predmet:</strong>{" "}
                                            {bookingDetails.interest_name}
                                        </p>
                                    )}
                                </div>

                                <div className={styles.modalSection}>
                                    <h3>💬 Vaša napomena</h3>

                                    <textarea
                                        className={styles.noteTextarea}
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                        placeholder="Unesite napomenu za instruktora..."
                                        maxLength={500}
                                    />

                                    <button
                                        className={styles.saveBtn}
                                        onClick={saveNote}
                                        disabled={noteSaving}
                                    >
                                        {noteSaving ? "Spremanje..." : "💾 Spremi napomenu"}
                                    </button>
                                </div>

                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setBookingDetailsOpen(false)}
                                >
                                    Zatvori
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Create Lesson Modal */}
            {createLessonModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setCreateLessonModalOpen(false)}>
                    <div className={styles.createLessonModal} onClick={e => e.stopPropagation()}>
                        <h2>➕ Kreiraj novi termin</h2>
                        <p className={styles.formHint}>Ispunite detalje za novi termin</p>

                        <form onSubmit={handleCreate}>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>📅 Datum</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.fieldRow}>
                                    <div className={styles.field}>
                                        <label>🕐 Od</label>
                                        <input
                                            type="time"
                                            value={form.start}
                                            onChange={(e) => setForm(prev => ({ ...prev, start: e.target.value }))}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label>🕐 Do</label>
                                        <input
                                            type="time"
                                            value={form.end}
                                            onChange={(e) => setForm(prev => ({ ...prev, end: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label>💰 Cijena (€)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.price}
                                        onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>👥 Tip predavanja</label>
                                    <select
                                        value={form.lesson_type}
                                        onChange={(e) =>
                                            setForm(prev => ({
                                                ...prev,
                                                lesson_type: e.target.value,
                                                capacity: e.target.value === "1na1" ? 1 : 2,
                                                interest_id: ""
                                            }))
                                        }
                                    >
                                        <option value="1na1">1 na 1</option>
                                        <option value="Grupno">Grupno</option>
                                    </select>
                                </div>

                                {form.lesson_type === "Grupno" && (
                                    <div className={styles.field}>
                                        <label>👥 Kapacitet</label>
                                        <input
                                            type="number"
                                            min="2"
                                            value={form.capacity}
                                            onChange={(e) => setForm(prev => ({ ...prev, capacity: e.target.value }))}
                                        />
                                    </div>
                                )}

                                {form.lesson_type === "Grupno" && (
                                    <div className={styles.field}>
                                        <label>📘 Predmet</label>
                                        {interests.length === 0 ? (
                                            <div className={styles.formHint}>Nemate dodanih predmeta</div>
                                        ) : (
                                            <select
                                                value={form.interest_id}
                                                onChange={(e) => setForm(prev => ({ ...prev, interest_id: e.target.value }))}
                                            >
                                                <option value="">Odaberite predmet</option>
                                                {interests.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div className={styles.field}>
                                    <label>🎓 Način predavanja</label>
                                    <select
                                        value={form.teaching_type}
                                        onChange={(e) => setForm(prev => ({ ...prev, teaching_type: e.target.value }))}
                                    >
                                        <option value="Online">Online</option>
                                        <option value="Uživo">Uživo</option>
                                    </select>
                                </div>

                                {form.teaching_type === "Uživo" && (
                                    <div className={styles.field}>
                                        <label>📍 Lokacija</label>
                                        {!isLoaded ? (
                                            <input disabled placeholder="Učitavanje mape..." className={styles.inputField} />
                                        ) : (
                                            <Autocomplete
                                                options={{ types: ["address"], componentRestrictions: { country: "hr" } }}
                                                onLoad={onLoadAutocomplete}
                                                onPlaceChanged={onPlaceChanged}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Unesite adresu"
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
                                    Odustani
                                </button>
                                <button type="submit" className={styles.createLessonSubmitBtn}>
                                    ✓ Kreiraj termin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

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
                    <p className={styles.kicker}>DOBRO DOŠLI</p>
                    <h1 className={styles.title}>
                        Dobro došli na <span>FerTutor</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Jednostavan put do boljih ocjena uz provjerene instruktore – online ili uživo.
                    </p>

                    <div className={styles.heroActions}>
                        <button className={styles.primaryBtn} onClick={() => navigate("/instructors")}>
                            Pronađi instruktora
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => navigate("/quizzes")}>
                            Riješi kvizove
                        </button>
                    </div>
                </div>
            </section>

            {/* PROCESS */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>PROCES</p>
                    <h2 className={styles.sectionTitle}>Kako FerTutor funkcionira?</h2>
                    <p className={styles.sectionSubtitle}>
                        Jednostavan put do boljih ocjena u samo tri koraka.
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
                        <h3>Pronađi instruktora</h3>
                        <p>Pretraži bazu provjerenih instruktora prema predmetu, cijeni ili ocjenama.</p>
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
                        <h3>Rezerviraj termin</h3>
                        <p>Odaberi vrijeme koje ti odgovara i rezerviraj termin direktno putem platforme.</p>
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
                        <h3>Počni učiti</h3>
                        <p>Spoji se online ili uživo i savladaj gradivo uz pomoć stručnjaka.</p>
                    </div>
                </div>
            </section>

            {/* RECOMMENDED */}
            <section className={styles.sectionAlt}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Preporučeni instruktori</h2>
                    <p className={styles.sectionSubtitle}>
                        Pronađi stručnjaka koji odgovara tvom stilu učenja.
                    </p>
                </div>

                {loading ? (
                    <div className={styles.loading}>Učitavam preporuke...</div>
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
                                            <span className={styles.verifiedDot} title="Provjeren instruktor" />
                                        </div>

                                        <p className={styles.subject}>{i.primary_subject || i.subject || "Instrukcije"}</p>

                                        <p className={styles.meta}>
                                            <span className={styles.star}>★</span> {i.rating ?? "4.8"}{" "}
                                            <span className={styles.muted}>({i.reviews_count ?? 0})</span>
                                        </p>
                                    </div>

                                    <div className={styles.priceBlock}>
                                        <div className={styles.price}>€{i.min_price ?? i.price ?? "--"}</div>
                                        <div className={styles.priceSub}>po satu</div>
                                    </div>
                                </div>

                                <p className={styles.desc}>
                                    {i.bio || "Strpljiv pristup i jasna objašnjenja. Rezerviraj termin i kreni učiti."}
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
                                        Rezerviraj
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.loadMoreWrap}>
                    <button className={styles.loadMoreBtn} onClick={() => navigate("/instructors")}>
                        Učitaj više instruktora
                    </button>
                </div>
            </section>
            {/* TESTIMONIALS */}
            <section className={styles.testimonialsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Što kažu naši korisnici</h2>
                </div>

                <div className={styles.testimonialsGrid}>
                    <div className={styles.testimonialCard}>
                        <div className={styles.quoteMark}>”</div>
                        <p className={styles.testimonialText}>
                            Zahvaljujući FerTutoru našao sam instruktora iz matematike u jednom danu i napokon
                            pohvatao gradivo za maturu. Sve je jasno, brzo i bez stresa.
                        </p>

                        <div className={styles.testimonialFooter}>
                            <div className={styles.initialAvatar}>IP</div>
                            <div>
                                <div className={styles.testimonialName}>Ivan P.</div>
                                <div className={styles.testimonialRole}>Maturant</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.testimonialCard}>
                        <div className={styles.quoteMark}>”</div>
                        <p className={styles.testimonialText}>
                            Platforma je stvarno jednostavna za korištenje. Rezervirala sam online termin i
                            riješila probleme iz programiranja koje sam vukla tjednima.
                        </p>

                        <div className={styles.testimonialFooter}>
                            <div className={styles.initialAvatar}>MK</div>
                            <div>
                                <div className={styles.testimonialName}>Maja K.</div>
                                <div className={styles.testimonialRole}>Studentica FER-a</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.testimonialCard}>
                        <div className={styles.quoteMark}>”</div>
                        <p className={styles.testimonialText}>
                            Odličan izbor instruktora i sve je transparentno. Djeca su napokon dobila rutinu, a
                            ja imam mir jer znam da rade s provjerenim ljudima.
                        </p>

                        <div className={styles.testimonialFooter}>
                            <div className={styles.initialAvatar}>TR</div>
                            <div>
                                <div className={styles.testimonialName}>Tomislav R.</div>
                                <div className={styles.testimonialRole}>Roditelj</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

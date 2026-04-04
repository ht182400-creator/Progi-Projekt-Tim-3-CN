import styles from "./Footer.module.css";

import facebookIcon from "../assets/images/facebook.svg";
import twitterIcon from "../assets/images/twitter.svg";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.grid}>
                    {/* Brand */}
                    <div className={styles.brandCol}>
                        <div className={styles.brandRow}>
                            <span className={styles.logo} aria-hidden="true">🎓</span>
                            <span className={styles.brandName}>FerTutor</span>
                        </div>

                        <p className={styles.brandText}>
                            Poznata platforma za instrukcije u Hrvatskoj. Povezujemo učenike i instruktore
                            za lakše, brže i sigurnije učenje.
                        </p>

                        <div className={styles.socials}>
                            <a className={styles.socialBtn} href="#" aria-label="Facebook">
                                <img src={facebookIcon} alt="" className={styles.socialIcon} />
                            </a>

                            <a className={styles.socialBtn} href="#" aria-label="Twitter">
                                <img src={twitterIcon} alt="" className={styles.socialIcon} />
                            </a>
                        </div>
                    </div>

                    {/* Platform */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>Platforma</h4>
                        <a className={styles.link} href="#">O nama</a>
                        <a className={styles.link} href="#">Postani instruktor</a>
                        <a className={styles.link} href="#">Cjenik</a>
                        <a className={styles.link} href="#">Sigurnost</a>
                    </div>

                    {/* Support */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>Podrška</h4>
                        <a className={styles.link} href="#">Centar za pomoć</a>
                        <a className={styles.link} href="#">Česta pitanja (FAQ)</a>
                        <a className={styles.link} href="#">Kontakt</a>
                        <a className={styles.link} href="#">Uvjeti korištenja</a>
                    </div>

                    {/* Contact */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>Kontakt</h4>

                        <div className={styles.contactRow}>
                            <span className={styles.icon} aria-hidden="true">✉</span>
                            <span className={styles.contactText}>info@fertutor.xyz</span>
                        </div>

                        <div className={styles.contactRow}>
                            <span className={styles.icon} aria-hidden="true">📍</span>
                            <span className={styles.contactText}>Zagreb, Hrvatska</span>
                        </div>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.bottom}>
                    © {new Date().getFullYear()} FerTutor. Sva prava pridržana.
                </div>
            </div>
        </footer>
    );
}

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
                        知名的辅导平台。我们连接学生与导师，让学习更轻松、更快捷、更安全
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
                        <h4 className={styles.colTitle}>平台</h4>
                        <a className={styles.link} href="#">关于我们</a>
                        <a className={styles.link} href="#">成为导师</a>
                        <a className={styles.link} href="#">价格表</a>
                        <a className={styles.link} href="#">安全</a>
                    </div>

                    {/* Support */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>支持</h4>
                        <a className={styles.link} href="#">帮助中心</a>
                        <a className={styles.link} href="#">常见问题 (FAQ)</a>
                        <a className={styles.link} href="#">联系方式</a>
                        <a className={styles.link} href="#">使用条款</a>
                    </div>

                    {/* Contact */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>联系方式</h4>

                        <div className={styles.contactRow}>
                            <span className={styles.icon} aria-hidden="true">✉</span>
                            <span className={styles.contactText}>info@fertutor.xyz</span>
                        </div>

                        <div className={styles.contactRow}>
                            <span className={styles.icon} aria-hidden="true">📍</span>
                            <span className={styles.contactText}>克罗地亚，萨格勒布</span>
                        </div>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.bottom}>
                    © {new Date().getFullYear()} FerTutor. 版权所有.
                </div>
            </div>
        </footer>
    );
}

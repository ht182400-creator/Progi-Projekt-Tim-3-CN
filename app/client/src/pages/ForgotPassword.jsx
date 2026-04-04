import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import { EmailIcon } from '../components/Icons';
import styles from './ForgotPassword.module.css';
import forgotPasswordImage from '../assets/images/forgotPassword.png';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await api.post('/auth/forgotpassword', { email });
            setMessage(res.data.message || 'Ako korisnik postoji, email je poslan.');
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri slanju zahtjeva.');
        } finally {
            setLoading(false);
        }
    };

    const infoText = "Svaka prepreka je samo privremeni znak da promijeniš pristup, ne razlog da odustaneš. Korak po korak, učiš, prilagođavaš se i ideš dalje";

    return (
        <AuthLayout infoText={infoText} infoImage={forgotPasswordImage}>
            <div className={styles.formContainer}>
                <h2>Zaboravili ste lozinku?</h2>
                <p className={styles.description}>
                    Unesite svoju e-mail adresu i poslati ćemo vam upute za ponovno postavljanje lozinke.
                </p>

                {message ? (
                    <div className={styles.successMessage}>
                        <h3>Zahtjev zaprimljen</h3>
                        <p>{message}</p>
                        <div className={styles.loginSection}>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                Povratak na prijavu
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit}>
                            <Input
                                icon={EmailIcon}
                                type="email"
                                placeholder="Email Adresa"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />

                            {error && <p className={styles.errorMessage}>{error}</p>}

                            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                                {loading ? 'Slanje...' : 'Pošalji upute'}
                            </button>
                        </form>

                        <div className={styles.divider}>
                            <span></span>
                        </div>

                        <div className={styles.supportSection}>
                            <p>Još uvijek nemate pristup?<br />Kontaktirajte podršku.</p>
                            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>
                                Podrška
                            </button>
                        </div>

                        <div className={styles.loginSection}>
                            <p>Vratite se na prijavu</p>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                Prijava
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}

export default ForgotPassword;

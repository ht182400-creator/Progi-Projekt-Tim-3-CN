import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import { LockIcon, EyeIcon, EyeOffIcon, ChevronDownIcon } from '../components/Icons';
import styles from './ResetPassword.module.css';
import forgotPasswordImage from '../assets/images/forgotPassword.png';

function ResetPassword() {
    const [password, setPassword] = useState('');
    const [passwordCheck, setPasswordCheck] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showRequirements, setShowRequirements] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (password !== passwordCheck) {
            setError("Lozinke se ne podudaraju.");
            return;
        }

        if (!token) {
            setError("Token nedostaje. Molimo ponovite postupak zaboravljene lozinke.");
            return;
        }

        try {
            const res = await api.post('/auth/reset-password', { token, password, passwordCheck });
            setMessage(res.data.message || 'Lozinka uspješno promijenjena.');
            // Optional: redirect after few seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri promjeni lozinke.');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const infoText = "Svaka prepreka je samo privremeni znak da promijeniš pristup, ne razlog da odustaneš. Korak po korak, učiš, prilagođavaš se i ideš dalje";

    return (
        <AuthLayout infoText={infoText} infoImage={forgotPasswordImage} blurLeft={true}>
            <div className={styles.formContainer}>
                <h2>Postavite novu lozinku</h2>
                <p className={styles.description}>
                    Unesite novu lozinku i potvrdite je.
                </p>

                {message ? (
                    <div className={styles.successMessage}>
                        <h3>Uspjeh!</h3>
                        <p>{message}</p>
                        <div className={styles.loginSection}>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                Prijava
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit}>
                            <Input
                                rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Nova lozinka"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onRightIconClick={togglePasswordVisibility}
                                required
                                autoComplete="new-password"
                            />
                            <Input
                                rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Potvrdite lozinku"
                                value={passwordCheck}
                                onChange={e => setPasswordCheck(e.target.value)}
                                onRightIconClick={togglePasswordVisibility}
                                required
                                autoComplete="new-password"
                            />

                            {/* Password Requirements Dropdown */}
                            <div className={styles.requirementsDropdown}>
                                <button
                                    type="button"
                                    className={styles.requirementsToggle}
                                    onClick={() => setShowRequirements(!showRequirements)}
                                >
                                    <span>Minimalni zahtjevi za lozinku:</span>
                                    <ChevronDownIcon size={16} className={showRequirements ? styles.rotated : ''} />
                                </button>
                                {showRequirements && (
                                    <ul className={styles.requirementsList}>
                                        <li>Najmanje 8 znakova</li>
                                        <li>Barem jedno veliko slovo</li>
                                        <li>Barem jedan broj</li>
                                        <li>Barem jedan specijalni znak</li>
                                    </ul>
                                )}
                            </div>

                            {error && <p className={styles.errorMessage}>{error}</p>}

                            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                                {loading ? 'Postavljanje...' : 'Postavi lozinku'}
                            </button>
                        </form>

                        <div className={styles.divider}>
                            <span></span>
                        </div>

                        <div className={styles.supportSection}>
                            <p>Imate poteškoća sa lozinkom?</p>
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

export default ResetPassword;

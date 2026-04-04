import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import styles from './RegisterEmail.module.css'; // Koristi kopirani CSS
import GoogleLoginButton from "../components/GoogleLoginButton";
import { EmailIcon, LockIcon, EyeIcon, EyeOffIcon, GoogleIcon, ChevronDownIcon } from '../components/Icons';
import slikaRegistracija from '../assets/images/slikaRegistracija.png';

function RegisterEmail() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordCheck, setPasswordCheck] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [termsAndConditions, setTermsAndConditions] = useState(false);
    const [showRequirements, setShowRequirements] = useState(false);
    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const infoText = "Registrirajte se kako biste pristupili rezervacijama, instruktorima i personaliziranom učenju.";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== passwordCheck) {
            setError("Lozinke se ne podudaraju.");
            return;
        }
        if (!termsAndConditions) {
            setError("Morate prihvatiti uvjete korištenja.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                email,
                password,
                passwordCheck,
                termsAndConditions
            });

            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri registraciji.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        console.log('Google login clicked - OAuth not implemented');
    };

    return (
        <AuthLayout infoText={infoText} infoImage={slikaRegistracija}>
            <div className={styles.formContainer}>
                <h2>Registracija</h2>

                {message ? (
                    <div className={styles.successMessage}>
                        <h3>Provjerite email!</h3>
                        <p>{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Input
                            icon={EmailIcon}
                            type="email"
                            placeholder="Email Adresa"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Lozinka"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onRightIconClick={() => setShowPassword(!showPassword)}
                            required
                            autoComplete="new-password"
                        />
                        <Input
                            rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Potvrdi Lozinku"
                            value={passwordCheck}
                            onChange={(e) => setPasswordCheck(e.target.value)}
                            onRightIconClick={() => setShowPassword(!showPassword)}
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

                        <div className={styles.termsCheckbox}>
                            <input
                                type="checkbox"
                                id="terms"
                                checked={termsAndConditions}
                                onChange={(e) => setTermsAndConditions(e.target.checked)}
                            />
                            <label htmlFor="terms">Prihvaćam uvjete korištenja.</label>
                        </div>

                        {error && <p className={styles.errorMessage}>{error}</p>}

                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            disabled={loading || !termsAndConditions}
                        >
                            {loading ? 'Slanje...' : 'Registracija'}
                        </button>

                        <div className={styles.divider}>
                            <span></span>
                        </div>

                        <div style={{ margin: "20px 0", textAlign: "center" }}>
                            <GoogleLoginButton />
                        </div>

                        <div className={styles.loginLink}>
                            <p>Već imate račun?</p>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                Prijava
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}

export default RegisterEmail;
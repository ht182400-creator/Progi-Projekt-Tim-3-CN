import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import { EmailIcon, LockIcon, EyeIcon, EyeOffIcon, GoogleIcon } from '../components/Icons';
import styles from './Login.module.css';
import slikaProfesora from '../assets/images/slikaProfesora.png';
import { AuthContext } from '../context/AuthContext';
import GoogleLoginButton from "../components/GoogleLoginButton";

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setUser } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', { email, password, rememberLogin: rememberMe });
            setUser(res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri prijavi.');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleGoogleLogin = () => {
        // Placeholder for Google OAuth - not implemented
        console.log('Google login clicked - OAuth not implemented');
    };

    const infoText = "Prijavite se i otključajte sljedeći korak u svom učenju personalizirano, fleksibilno i vođeno vašim tempom.";

    return (
        <AuthLayout infoText={infoText} infoImage={slikaProfesora}>
            <div className={styles.formContainer}>
                <h2>Prijava</h2>
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
                    <Input
                        rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Lozinka"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onRightIconClick={togglePasswordVisibility}
                        required
                        autoComplete="current-password"
                    />

                    <div className={styles.formOptions}>
                        <div className={styles.rememberMe}>
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="remember">Zapamti prijavu</label>
                        </div>
                        <Link to="/forgot-password" className={styles.forgotPassword}>
                            Zaboravili ste lozinku?
                        </Link>
                    </div>

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                        {loading ? 'Prijava...' : 'Prijava'}
                    </button>

                    <div className={styles.divider}>
                        <span></span>
                    </div>

                    <div style={{ margin: "20px 0", textAlign: "center" }}>
                        <GoogleLoginButton />
                    </div>

                </form>

                <div className={styles.signupLink}>
                    <p>Još nemate račun?</p>
                    <Link to="/register" className={`${styles.btn} ${styles.btnSecondary}`}>
                        Registracija
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}

export default Login;

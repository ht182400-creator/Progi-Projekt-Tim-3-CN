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

    const infoText = "注册以访问预约、导师和个性化学习。";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== passwordCheck) {
            setError("密码不匹配。");
            return;
        }
        if (!termsAndConditions) {
            setError("您必须接受使用条款。");
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
            setError(err.response?.data?.message || '注册错误。');
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
                <h2>注册</h2>

                {message ? (
                    <div className={styles.successMessage}>
                        <h3>检查您的邮箱！</h3>
                        <p>{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Input
                            icon={EmailIcon}
                            type="email"
                            placeholder="邮箱地址"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onRightIconClick={() => setShowPassword(!showPassword)}
                            required
                            autoComplete="new-password"
                        />
                        <Input
                            rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="确认密码"
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
                                <span>密码最低要求:</span>
                                <ChevronDownIcon size={16} className={showRequirements ? styles.rotated : ''} />
                            </button>
                            {showRequirements && (
                                <ul className={styles.requirementsList}>
                                    <li>至少8个字符</li>
                                    <li>至少一个大写字母</li>
                                    <li>至少一个数字</li>
                                    <li>至少一个特殊字符</li>
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
                            <label htmlFor="terms">接受使用条款.</label>
                        </div>

                        {error && <p className={styles.errorMessage}>{error}</p>}

                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            disabled={loading || !termsAndConditions}
                        >
                            {loading ? '发送...' : '注册'}
                        </button>

                        <div className={styles.divider}>
                            <span></span>
                        </div>

                        <div style={{ margin: "20px 0", textAlign: "center" }}>
                            <GoogleLoginButton />
                        </div>

                        <div className={styles.loginLink}>
                            <p>已有账户？</p>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                登录
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}

export default RegisterEmail;
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
            setError("密码不匹配。");
            return;
        }

        if (!token) {
            setError("Token nedostaje. Molimo ponovite postupak zaboravljene lozinke.");
            return;
        }

        try {
            const res = await api.post('/auth/reset-password', { token, password, passwordCheck });
            setMessage(res.data.message || '密码 uspješno promijenjena.');
            // Optional: redirect after few seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || '错误 pri promjeni lozinke.');
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
                <h2>设置新密码</h2>
                <p className={styles.description}>
                    Unesite novu lozinku i potvrdite je.
                </p>

                {message ? (
                    <div className={styles.successMessage}>
                        <h3>成功！</h3>
                        <p>{message}</p>
                        <div className={styles.loginSection}>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                登录
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit}>
                            <Input
                                rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="新密码"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onRightIconClick={togglePasswordVisibility}
                                required
                                autoComplete="new-password"
                            />
                            <Input
                                rightIcon={showPassword ? EyeIcon : EyeOffIcon}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="确认密码"
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

                            {error && <p className={styles.errorMessage}>{error}</p>}

                            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                                {loading ? 'Postavljanje...' : 'Postavi lozinku'}
                            </button>
                        </form>

                        <div className={styles.divider}>
                            <span></span>
                        </div>

                        <div className={styles.supportSection}>
                            <p>密码有问题？</p>
                            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>
                                支持
                            </button>
                        </div>

                        <div className={styles.loginSection}>
                            <p>返回登录</p>
                            <Link to="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
                                登录
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}

export default ResetPassword;

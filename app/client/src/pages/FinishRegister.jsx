import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import { UserIcon, CalendarIcon, ChevronDownIcon, ProfileAvatarIcon } from '../components/Icons';
import styles from './FinishRegister.module.css';
import slikaRegistracija from '../assets/images/slikaRegistracija.png';

const CityIcon = ({ size = 20, color = '#4a90a4', className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
    </svg>
);

const EducationIcon = ({ size = 20, color = '#4a90a4', className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
);

function FinishRegister() {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        date_of_birth: '',
        sex: '',
        is_professor: '',
        city: '',
        education: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "is_professor") {
            setFormData(prev => ({
                ...prev,
                is_professor: value,
                education: "" // reset when switching type
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Samo slike su dozvoljene (jpg, png, gif, webp)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Slika ne smije biti veća od 5MB');
            return;
        }

        setError('');
        setProfileImage(file);

        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError("Token za registraciju nije pronađen. Molimo krenite ispočetka.");
            return;
        }

        setLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('token', token);
            formDataToSend.append('name', formData.name);
            formDataToSend.append('surname', formData.surname);
            formDataToSend.append('date_of_birth', formData.date_of_birth);
            formDataToSend.append('sex', formData.sex);
            formDataToSend.append('is_professor', formData.is_professor);
            formDataToSend.append('city', formData.city);
            formDataToSend.append('education', formData.education);

            if (profileImage) {
                formDataToSend.append('profileImage', profileImage);
            }

            await api.post('/auth/finish-register', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            navigate('/interests-register');
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri završetku registracije.');
        } finally {
            setLoading(false);
        }
    };

    const infoText = "Registrirajte se kako biste pristupili rezervacijama, instruktorima i personaliziranom učenju.";

    return (
        <AuthLayout
            infoText={infoText}
            infoImage={slikaRegistracija}
            blurLeft={true}
        >
            <div className={styles.formContainer}>
                <h2>Osnovni osobni podaci</h2>

                {/* Profile Avatar */}
                <div className={styles.avatarSection}>
                    <div
                        className={styles.avatarWrapper}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className={styles.avatarImage} />
                        ) : (
                            <ProfileAvatarIcon size={100} />
                        )}
                        <div className={styles.avatarOverlay}>
                            <i className="fa-solid fa-camera"></i>
                        </div>
                    </div>
                    <span className={styles.avatarLabel}>
                        {imagePreview ? 'Promijenite sliku' : 'Dodajte profilnu sliku'}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                    />
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        icon={UserIcon}
                        name="name"
                        placeholder="Ime*"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        icon={UserIcon}
                        name="surname"
                        placeholder="Prezime*"
                        value={formData.surname}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        icon={CalendarIcon}
                        type="date"
                        name="date_of_birth"
                        placeholder="Datum rođenja"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        required
                    />

                    <div className={styles.selectGroup}>
                        <div className={styles.selectWrapper}>
                            <select
                                id="sex"
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Spol*</option>
                                <option value="M">Muški</option>
                                <option value="F">Ženski</option>
                                <option value="X">Ostalo / Ne želim reći</option>
                            </select>
                            <ChevronDownIcon size={18} className={styles.selectIcon} />
                        </div>
                    </div>

                    <div className={styles.selectGroup}>
                        <div className={styles.selectWrapper}>
                            <select
                                id="is_professor"
                                name="is_professor"
                                value={formData.is_professor}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Tip Korisnika*</option>
                                <option value="false">Student</option>
                                <option value="true">Profesor</option>
                            </select>
                            <ChevronDownIcon size={18} className={styles.selectIcon} />
                        </div>
                    </div>

                    <Input
                        icon={CityIcon}
                        name="city"
                        placeholder="Grad*"
                        value={formData.city}
                        onChange={handleChange}
                        required
                    />

                    {formData.is_professor === "false" && (
                        <Input
                            icon={EducationIcon}
                            name="education"
                            placeholder="Škola / Fakultet*"
                            value={formData.education}
                            onChange={handleChange}
                            required
                        />
                    )}

                    {formData.is_professor === "true" && (
                        <Input
                            icon={EducationIcon}
                            name="education"
                            placeholder="Edukacija / Stručna sprema*"
                            value={formData.education}
                            onChange={handleChange}
                            required
                        />
                    )}


                    <p className={styles.requiredNote}>Sa znakom * označena obavezna polja.</p>

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button
                        type="submit"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={loading}
                    >
                        {loading ? 'Spremanje...' : 'Završi registraciju'}
                    </button>
                </form>
            </div>
        </AuthLayout>
    );
}

export default FinishRegister;
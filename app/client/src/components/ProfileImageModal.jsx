import React, {useState, useRef, useContext} from 'react';
import { uploadProfileImage, deleteProfileImage } from '../api';
import styles from './ProfileImageModal.module.css';
import {AuthContext} from "../context/AuthContext.jsx";

const ProfileImageModal = ({ isOpen, onClose, currentImage, onImageUpdated }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const { refreshUser } = useContext(AuthContext);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Samo slike su dozvoljene (jpg, png, gif, webp)');
            return;
        }

        if (file.size > 1024 * 1024) {
            setError('Slika ne smije biti veća od 1MB');
            return;
        }

        setError('');
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!selectedImage) return;

        setLoading(true);
        setError('');
        try {
            const result = await uploadProfileImage(selectedImage);
            onImageUpdated(result.filename);
            refreshUser();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri uploadu slike');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!currentImage) return;

        setLoading(true);
        setError('');
        try {
            await deleteProfileImage();
            onImageUpdated(null);
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Greška pri brisanju slike');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedImage(null);
        setPreview(null);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    const displayImage = preview || currentImage;

    return (
        <div className={styles.backdrop} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={handleClose}>
                    ×
                </button>

                <h2 className={styles.title}>Profilna Slika</h2>

                <div className={styles.imagePreview}>
                    {displayImage ? (
                        <img src={displayImage} alt="Preview" className={styles.previewImage} />
                    ) : (
                        <div className={styles.placeholder}>
                            <i className="fa-solid fa-user"></i>
                        </div>
                    )}
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.actions}>
                    <button
                        className={styles.actionBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                    >
                        <i className="fa-solid fa-upload"></i>
                        {selectedImage ? 'Promijeni odabir' : 'Odaberi novu sliku'}
                    </button>

                    {currentImage && (
                        <button
                            className={styles.actionBtn}
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            <i className="fa-solid fa-trash"></i>
                            Obriši sliku
                        </button>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className={styles.fileInput}
                />

                <div className={styles.buttonGroup}>
                    <button
                        className={styles.cancelBtn}
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Odustani
                    </button>
                    <button
                        className={styles.saveBtn}
                        onClick={handleUpload}
                        disabled={!selectedImage || loading}
                    >
                        {loading ? 'Spremanje...' : 'Spremi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileImageModal;

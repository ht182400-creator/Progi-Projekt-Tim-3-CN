// src/components/AuthLayout.jsx

import React from 'react';
import styles from './AuthLayout.module.css';

function AuthLayout({ children, infoText, infoImage, blurLeft = false }) {
    return (
        <div className={styles.container}>

            {/* Left panel - info section with optional blur */}
            <div className={`${styles.infoPanel} ${blurLeft ? styles.blurred : ''}`}>
                <div className={styles.infoContent}>
                    <p>{infoText}</p>
                </div>
                <img
                    className={styles.infoImage}
                    src={infoImage}
                    alt="Ilustracija"
                />
            </div>

            {/* Right panel - form content */}
            <div className={styles.formPanel}>
                {children}
            </div>

        </div>
    );
}

export default AuthLayout;
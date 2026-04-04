// src/components/Input.jsx

import React from 'react';
import styles from './Input.module.css';

// Updated Input component that accepts React icon components and supports password toggle
function Input({
    icon: IconComponent,
    rightIcon: RightIconComponent,
    onRightIconClick,
    type,
    placeholder,
    value,
    onChange,
    ...rest
}) {
    const hasLeftIcon = !!IconComponent;
    const hasRightIcon = !!RightIconComponent;

    return (
        <div className={styles.inputGroup}>
            {/* Left icon */}
            {hasLeftIcon && (
                <span className={styles.inputIcon}>
                    {typeof IconComponent === 'function' ? <IconComponent size={18} /> : IconComponent}
                </span>
            )}

            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                {...rest}
                className={`${hasLeftIcon ? styles.withLeftIcon : ''} ${hasRightIcon ? styles.withRightIcon : ''}`}
            />

            {/* Right icon (for password toggle) */}
            {hasRightIcon && (
                <button
                    type="button"
                    className={styles.rightIconButton}
                    onClick={onRightIconClick}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                >
                    {typeof RightIconComponent === 'function' ? <RightIconComponent size={18} /> : RightIconComponent}
                </button>
            )}
        </div>
    );
}

export default Input;
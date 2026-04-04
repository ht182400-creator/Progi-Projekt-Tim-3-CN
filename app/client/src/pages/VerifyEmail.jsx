// src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function VerifyEmail() {
    const { token } = useParams(); // Dohvaća :token iz URL-a
    const navigate = useNavigate();
    const [status, setStatus] = useState('Provjeravam token...');

    useEffect(() => {
        const verifyToken = async () => {
            try {
                // Pozivamo backend rutu /api/auth/verify-token
                const response = await api.post('/auth/verify-token', { token });

                // Spremamo email (potreban za Korak 2)
                localStorage.setItem('registrationEmail', response.data.email);

                setStatus('Email uspješno potvrđen! Preusmjeravam...');

                // Preusmjeravamo na Korak 2
                setTimeout(() => {
                    navigate('/finish-register');
                }, 2000);

            } catch (err) {
                setStatus(err.response?.data?.message || 'Token je nevažeći ili je istekao.');
            }
        };

        verifyToken();
    }, [token, navigate]);

    return (
        <div>
            <h2>Potvrda Email Adrese</h2>
            <p>{status}</p>
        </div>
    );
}

export default VerifyEmail;
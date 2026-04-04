import React, { useState } from "react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from '../api';
import styles from "./Interests.module.css";
import finishRegisterImg from "../assets/images/FinishRegister.png";

function Interests() {
    const [selected, setSelected] = useState([]);
    const navigate = useNavigate();
    const { refreshUser } = useContext(AuthContext);

    const mapInterests = (selected) => {
        const map = {
            mat_os: "Matematika Osnovna Škola",
            fiz_os: "Fizika Osnovna Škola",
            inf_os: "Informatika Osnovna Škola",
            mat_ss: "Matematika Srednja Škola",
            fiz_ss: "Fizika Srednja Škola",
            inf_ss: "Informatika Srednja Škola",
        };

        return selected.map(i => map[i]);
    };

    const toggleInterest = (value) => {
        setSelected((prev) =>
            prev.includes(value)
                ? prev.filter((i) => i !== value)
                : [...prev, value]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await api.post("/auth/register-interests", {
                interests: mapInterests(selected)
            });
            await refreshUser();
            navigate("/");
        } catch (err) {
            console.error(err);
            await refreshUser();
            navigate("/");
        }
    };


    return (
        <div className={styles.container}>
            {/* Lijeva strana */}
            <div
                className={styles.leftSide}
                style={{ backgroundImage: `url(${finishRegisterImg})` }}
            />

            {/* Desna strana */}
            <div className={styles.rightSide}>
                <h1>Osobni Interesi</h1>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.grid}>
                        <Interest
                            label="Matematika | Osnovna Škola"
                            icon="fa-square-root-variable"
                            value="mat_os"
                            checked={selected.includes("mat_os")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="Matematika | Srednja Škola"
                            icon="fa-square-root-variable"
                            value="mat_ss"
                            checked={selected.includes("mat_ss")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="Fizika | Osnovna Škola"
                            icon="fa-atom"
                            value="fiz_os"
                            checked={selected.includes("fiz_os")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="Fizika | Srednja Škola"
                            icon="fa-atom"
                            value="fiz_ss"
                            checked={selected.includes("fiz_ss")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="Informatika | Osnovna Škola"
                            icon="fa-computer"
                            value="inf_os"
                            checked={selected.includes("inf_os")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="Informatika | Srednja Škola"
                            icon="fa-computer"
                            value="inf_ss"
                            checked={selected.includes("inf_ss")}
                            onToggle={toggleInterest}
                        />
                    </div>

                    <div className={styles.buttons}>
                        <button
                            type="button"
                            className={styles.skipBtn}
                            onClick={async () => {
                                await refreshUser();
                                navigate("/");
                            }}
                        >
                            Preskoči
                        </button>
                        <button type="submit" className={styles.submitBtn}>
                            Završi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Interest({ label, icon, value, checked, onToggle }) {
    return (
        <label className={styles.card}>
            <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(value)}
            />
            <span>
                {label} <i className={`fa-solid ${icon}`} />
            </span>
        </label>
    );
}

export default Interests;
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
            mat_os: "小学数学",
            fiz_os: "小学物理",
            inf_os: "小学信息学",
            mat_ss: "中学数学",
            fiz_ss: "中学物理",
            inf_ss: "中学信息学",
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
                <h1>个人兴趣</h1>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.grid}>
                        <Interest
                            label="数学 | 小学"
                            icon="fa-square-root-variable"
                            value="mat_os"
                            checked={selected.includes("mat_os")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="数学 | 中学"
                            icon="fa-square-root-variable"
                            value="mat_ss"
                            checked={selected.includes("mat_ss")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="物理 | 小学"
                            icon="fa-atom"
                            value="fiz_os"
                            checked={selected.includes("fiz_os")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="物理 | 中学"
                            icon="fa-atom"
                            value="fiz_ss"
                            checked={selected.includes("fiz_ss")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="信息学 | 小学"
                            icon="fa-computer"
                            value="inf_os"
                            checked={selected.includes("inf_os")}
                            onToggle={toggleInterest}
                        />
                        <Interest
                            label="信息学 | 中学"
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
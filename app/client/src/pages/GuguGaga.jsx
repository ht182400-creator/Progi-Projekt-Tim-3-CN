import { useEffect, useRef, useState } from "react";
import styles from "./GuguGaga.module.css";

const IMAGES = [
    { id: 1, size: "60vw", speed: "2.5s", orbit: "5s" },
    { id: 2, size: "40vw", speed: "3.5s", orbit: "7s" },
    { id: 3, size: "30vw", speed: "2s", orbit: "4s" },
    { id: 4, size: "20vw", speed: "1.5s", orbit: "3s" }
];

export default function Gugugaga() {
    const audioRef = useRef(null);
    const [running, setRunning] = useState(true);

    useEffect(() => {
        if (!audioRef.current) return;

        if (running) {
            audioRef.current.volume = 0.8;
            audioRef.current.play().catch(() => {
                console.log("Autoplay blocked");
            });
        } else {
            audioRef.current.pause();
        }
    }, [running]);

    return (
        <div
            className={`${styles.container} ${
                running ? styles.running : styles.paused
            }`}
            onClick={() => setRunning(r => !r)}
        >
            <audio ref={audioRef} src="/secret/gugugaga.mp3" loop />

            {IMAGES.map((img) => (
                <img
                    key={img.id}
                    src="/secret/gugugaga.jpg"
                    alt="spinning chaos"
                    className={styles.spinningImage}
                    draggable={false}
                    style={{
                        width: img.size,
                        animationDuration: `${img.speed}, ${img.orbit}`
                    }}
                />
            ))}
        </div>
    );
}

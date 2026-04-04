import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import styles from "./Meeting.module.css";

export default function Meeting() {
    const { meetingId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    
    const [meeting, setMeeting] = useState(null);
    const [role, setRole] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [waitingForPeer, setWaitingForPeer] = useState(true);
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const wsRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        
        loadMeetingInfo();
        
        return () => {
            cleanup();
        };
    }, [meetingId, user]);

    const loadMeetingInfo = async () => {
        try {
            const res = await api.get(`/calendar/meeting/${meetingId}`);
            setMeeting(res.data.meeting);
            setRole(res.data.role);
            setLoading(false);
            
            // Start video call after loading meeting info
            await initializeMedia();
            initializeWebSocket();
        } catch (err) {
            setError(err.response?.data?.message || "Meeting not found");
            setLoading(false);
        }
    };

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing media devices:", err);
            setError("Nije moguće pristupiti kameri ili mikrofonu. Provjerite dozvole.");
        }
    };

    const initializeWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:8080/ws`;
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
            console.log("WebSocket connected");
            // Send join message
            wsRef.current.send(JSON.stringify({
                type: "join",
                meetingId,
                userId: user.id,
                role
            }));
        };
        
        wsRef.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case "peer-joined":
                    setWaitingForPeer(false);
                    await createOffer();
                    break;
                    
                case "offer":
                    await handleOffer(data.offer);
                    break;
                    
                case "answer":
                    await handleAnswer(data.answer);
                    break;
                    
                case "ice-candidate":
                    await handleIceCandidate(data.candidate);
                    break;
                    
                case "peer-left":
                    handlePeerLeft();
                    break;
            }
        };
        
        wsRef.current.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
        
        wsRef.current.onclose = () => {
            console.log("WebSocket disconnected");
        };
    };

    const createPeerConnection = () => {
        const config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        };
        
        const pc = new RTCPeerConnection(config);
        
        // Add local tracks to peer connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }
        
        // Handle incoming tracks
        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setIsConnected(true);
        };
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: "ice-candidate",
                    candidate: event.candidate,
                    meetingId
                }));
            }
        };
        
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                setIsConnected(false);
                setWaitingForPeer(true);
            }
        };
        
        peerConnectionRef.current = pc;
        return pc;
    };

    const createOffer = async () => {
        const pc = createPeerConnection();
        
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            if (wsRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: "offer",
                    offer,
                    meetingId
                }));
            }
        } catch (err) {
            console.error("Error creating offer:", err);
        }
    };

    const handleOffer = async (offer) => {
        const pc = createPeerConnection();
        
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            if (wsRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: "answer",
                    answer,
                    meetingId
                }));
            }
        } catch (err) {
            console.error("Error handling offer:", err);
        }
    };

    const handleAnswer = async (answer) => {
        if (peerConnectionRef.current) {
            try {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error("Error handling answer:", err);
            }
        }
    };

    const handleIceCandidate = async (candidate) => {
        if (peerConnectionRef.current) {
            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("Error handling ICE candidate:", err);
            }
        }
    };

    const handlePeerLeft = () => {
        setRemoteStream(null);
        setIsConnected(false);
        setWaitingForPeer(true);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    const cleanup = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (wsRef.current) {
            wsRef.current.close();
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioOn(audioTrack.enabled);
            }
        }
    };

    const leaveMeeting = () => {
        cleanup();
        navigate("/calendar");
    };

    const formatTime = (value) => {
        const date = new Date(value);
        return date.toLocaleTimeString("hr-HR", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.spinner}></div>
                <p>Učitavanje meetinga...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorPage}>
                <h2>Greška</h2>
                <p>{error}</p>
                <button onClick={() => navigate("/calendar")} className={styles.backBtn}>
                    Povratak na kalendar
                </button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Meeting Header */}
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1>{meeting?.interest_name || "Online sat"}</h1>
                    <p>
                        {role === "professor" ? "Vi predajete" : `Instruktor: ${meeting?.professor_name} ${meeting?.professor_surname}`}
                        {" - "}
                        {meeting && `${formatTime(meeting.start_time)} - ${formatTime(meeting.end_time)}`}
                    </p>
                </div>
                <button onClick={leaveMeeting} className={styles.leaveBtn}>
                    Napusti poziv
                </button>
            </header>

            {/* Video Grid */}
            <div className={styles.videoGrid}>
                {/* Remote Video (Main) */}
                <div className={styles.mainVideo}>
                    {isConnected && remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className={styles.video}
                        />
                    ) : (
                        <div className={styles.waitingOverlay}>
                            <div className={styles.waitingContent}>
                                <div className={styles.spinnerSmall}></div>
                                <p>
                                    {waitingForPeer 
                                        ? (role === "professor" 
                                            ? "Čekanje studenta..." 
                                            : "Čekanje instruktora...")
                                        : "Povezivanje..."
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Local Video (Small) */}
                <div className={styles.localVideo}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={styles.video}
                    />
                    {!isVideoOn && (
                        <div className={styles.videoOffOverlay}>
                            <span>Kamera isključena</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <button
                    className={`${styles.controlBtn} ${!isAudioOn ? styles.controlBtnOff : ""}`}
                    onClick={toggleAudio}
                    title={isAudioOn ? "Isključi mikrofon" : "Uključi mikrofon"}
                >
                    {isAudioOn ? "🎤" : "🔇"}
                </button>

                <button
                    className={`${styles.controlBtn} ${!isVideoOn ? styles.controlBtnOff : ""}`}
                    onClick={toggleVideo}
                    title={isVideoOn ? "Isključi kameru" : "Uključi kameru"}
                >
                    {isVideoOn ? "📹" : "📷"}
                </button>

                <button
                    className={`${styles.controlBtn} ${styles.endCallBtn}`}
                    onClick={leaveMeeting}
                    title="Napusti poziv"
                >
                    📞
                </button>
            </div>
        </div>
    );
}

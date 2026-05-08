import { useState, useRef, useEffect } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

export const useVoiceRecorder = (onSendCallback) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    
    const isRecordingRef = useRef(false);
    const pressStartTime = useRef(0);
    const pressTimer = useRef(null);
    const recordingInterval = useRef(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    
    // NEW: Real-time Audio Analyser Context
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);

    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);

    const lockScale = useTransform(dragY, [0, -60], [1, 1.3]);
    const lockOpacity = useTransform(dragY, [0, -60], [0.5, 1]);
    const cancelOpacity = useTransform(dragX, [0, -100], [1, 0]);
    const trashScale = useTransform(dragX, [0, -100], [1, 1.3]);
    const trashColor = useTransform(dragX, [0, -100], ['var(--text-secondary)', '#ef4444']);

    useEffect(() => {
        return () => {
            clearInterval(recordingInterval.current);
            cleanupMic();
        };
    }, []);

    const cleanupMic = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // --- PREMIUM WEB AUDIO API PIPELINE ---
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Optimize for a clean, blocky waveform
            analyser.smoothingTimeConstant = 0.8;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
            // ---------------------------------------

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.start(100);

            triggerHaptic('light');
            setIsRecording(true);
            isRecordingRef.current = true;
            setIsLocked(false);
            setRecordingTime(0);
            
            if (recordingInterval.current) clearInterval(recordingInterval.current);
            recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } catch (err) {
            console.error("Microphone access denied", err);
            alert("Please allow microphone access in your browser to record voice notes.");
        }
    };

    const lockRecording = () => {
        triggerHaptic('success'); 
        setIsLocked(true);
        animate(dragX, 0, { type: "spring", stiffness: 500, damping: 30 });
        animate(dragY, 0, { type: "spring", stiffness: 500, damping: 30 });
    };

    const stopAndSend = () => {
        if (!isRecordingRef.current) return; 
        
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (onSendCallback) onSendCallback(audioBlob, recordingTime);
                cleanupMic();
            };
            mediaRecorderRef.current.stop();
        }

        triggerHaptic('success');
        hardReset();
    };

    const abortRecording = () => {
        if (!isRecordingRef.current) return;
        triggerHaptic('error');
        cleanupMic();
        hardReset();
    };

    const hardReset = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsLocked(false);
        if (recordingInterval.current) clearInterval(recordingInterval.current);
        animate(dragX, 0, { duration: 0.1 });
        animate(dragY, 0, { duration: 0.1 });
    };

    const handlePointerDown = (e) => {
        if (e.button === 2 || isLocked) return; 
        pressStartTime.current = Date.now();
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(startRecording, 300); 
    };

    const handlePointerUp = () => {
        if (isLocked) return stopAndSend();
        clearTimeout(pressTimer.current);
        const duration = Date.now() - pressStartTime.current;

        if (isRecordingRef.current && !isLocked) {
            if (Math.abs(dragX.get()) < 20 && Math.abs(dragY.get()) < 20) stopAndSend();
        } else if (duration < 300) {
            const initTapLock = async () => {
                await startRecording();
                if (isRecordingRef.current) {
                    lockRecording();
                }
            };
            initTapLock();
        }
    };

    const handlePointerCancel = () => clearTimeout(pressTimer.current);

    const handleDragEnd = (e, info) => {
        if (isLocked || !isRecordingRef.current) return;
        if (info.offset.x < -100) abortRecording();
        else if (info.offset.y < -60) lockRecording();
        else stopAndSend();
    };

    return {
        isRecording, isLocked, recordingTime,
        dragX, dragY, lockScale, lockOpacity, cancelOpacity, trashScale, trashColor,
        // Expose the analyser to the UI so it can draw the waveform
        analyser: analyserRef.current, 
        handlePointerDown, handlePointerUp, handlePointerCancel, handleDragEnd, abortRecording, stopAndSend
    };
};
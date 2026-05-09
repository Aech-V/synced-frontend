import { useState, useEffect, useRef } from 'react';

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:global.relay.metered.ca:80',
            username: import.meta.env.VITE_TURN_USERNAME, 
            credential: import.meta.env.VITE_TURN_CREDENTIAL
        }
    ]
};

export const useWebRTC = (socket, currentUserId) => {
    const [callState, setCallState] = useState('idle'); 
    const [callMetadata, setCallMetadata] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnection = useRef(null);
    const timerRef = useRef(null); 
    const durationTrackerRef = useRef(0);
    const pendingCandidates = useRef([]); // <--- THE MAGIC FIX: Prevents WebRTC Race Conditions
    
    const ringAudio = useRef(null);
    const dialAudio = useRef(null);

    // Refs to prevent Stale Closures inside Socket Listeners
    const metadataRef = useRef(null);
    useEffect(() => { metadataRef.current = callMetadata; }, [callMetadata]);
    
    const localStreamRef = useRef(null);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    // --- RINGTONE MANAGER ---
    useEffect(() => {
        ringAudio.current = new Audio('/ringtone.mp3');
        ringAudio.current.loop = true;
        dialAudio.current = new Audio('/dialing.mp3');
        dialAudio.current.loop = true;

        return () => {
            if (ringAudio.current) ringAudio.current.pause();
            if (dialAudio.current) dialAudio.current.pause();
        };
    }, []);

    useEffect(() => {
        const playSound = async (audio) => {
            if (!audio) return;
            try {
                audio.currentTime = 0;
                await audio.play();
            } catch (e) { console.warn('Audio auto-play prevented by browser'); }
        };

        const stopAllSounds = () => {
            if (ringAudio.current) { ringAudio.current.pause(); ringAudio.current.currentTime = 0; }
            if (dialAudio.current) { dialAudio.current.pause(); dialAudio.current.currentTime = 0; }
        };

        if (callState === 'receiving') playSound(ringAudio.current);
        else if (callState === 'calling' || callState === 'ringing') playSound(dialAudio.current);
        else stopAllSounds();
        
    }, [callState]);

    // --- SOCKET & SIGNALING HANDLERS ---
    useEffect(() => {
        if (!socket) return;

        socket.on('incoming_call', (payload) => {
            setCallMetadata(payload);
            setCallState('receiving');
        });

        socket.on('call_answered_elsewhere', () => cleanupCall());

        socket.on('call_answered', async ({ responderId }) => {
            setCallState('connected');
            startCallTimer();
            
            if (metadataRef.current) {
                metadataRef.current.responderId = responderId; // Sync the responder ID
            }

            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            
            const m = metadataRef.current;
            socket.emit('webrtc_signal', { targetUserId: responderId, signal: offer, callId: m?.callId });
        });

        socket.on('webrtc_signal', async ({ senderId, signal }) => {
            if (!peerConnection.current) return;
            const m = metadataRef.current;
            
            try {
                if (signal.type === 'offer') {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    socket.emit('webrtc_signal', { targetUserId: senderId, signal: answer, callId: m?.callId });
                    startCallTimer();

                    // Flush queued candidates
                    pendingCandidates.current.forEach(c => peerConnection.current.addIceCandidate(new RTCIceCandidate(c)));
                    pendingCandidates.current = [];
                } else if (signal.type === 'answer') {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                    
                    // Flush queued candidates
                    pendingCandidates.current.forEach(c => peerConnection.current.addIceCandidate(new RTCIceCandidate(c)));
                    pendingCandidates.current = [];
                } else if (signal.candidate) {
                    // Queue candidates if the remote description isn't ready yet!
                    if (peerConnection.current.remoteDescription) {
                        await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal));
                    } else {
                        pendingCandidates.current.push(signal);
                    }
                }
            } catch (err) {
                console.error("WebRTC Error handling signal:", err);
            }
        });

        const handleEnd = () => cleanupCall();
        socket.on('call_rejected', handleEnd);
        socket.on('call_cancelled', handleEnd);
        socket.on('call_ended', handleEnd);

        return () => {
            socket.off('incoming_call');
            socket.off('call_answered_elsewhere');
            socket.off('call_answered');
            socket.off('webrtc_signal');
            socket.off('call_rejected');
            socket.off('call_cancelled');
            socket.off('call_ended');
        };
    }, [socket]); 

    // --- CALL ACTIONS ---
    const setupMediaAndPeer = async (type) => {
        try {
            // Enhanced audio constraints for Echo Cancellation
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
                video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 } } : false 
            });
            setLocalStream(stream);

            peerConnection.current = new RTCPeerConnection(rtcConfig);
            stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

            peerConnection.current.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate && metadataRef.current) {
                    const m = metadataRef.current;
                    const targetId = m.callerId === currentUserId ? m.responderId : m.callerId;
                    socket.emit('webrtc_signal', { targetUserId: targetId, signal: event.candidate, callId: m.callId });
                }
            };
        } catch (error) {
            console.error("Camera/Mic access denied:", error);
            alert("Please allow Camera and Microphone permissions to make calls.");
            throw error;
        }
    };

    const initiateCall = async (roomId, targetUserId, type, isGroup = false) => {
        if (callState !== 'idle') await endCall();

        await setupMediaAndPeer(type);
        
        setCallMetadata({ callId: 'initiating...', callerId: currentUserId, roomId, type, responderId: targetUserId });
        setCallState('calling');
        
        socket.emit('start_call', { roomId, targetUserId, type, isGroup }, (response) => {
            if (response.success) {
                setCallMetadata({ callId: response.callId, callerId: currentUserId, roomId, type, responderId: targetUserId });
            } else {
                alert(response.error || "Call failed");
                cleanupCall();
            }
        });
    };

    const answerCall = async () => {
        try {
            await setupMediaAndPeer(callMetadata.type);
            setCallState('connected');
            socket.emit('accept_call', { callId: callMetadata.callId, callerId: callMetadata.callerId });
        } catch (error) {
            cleanupCall();
        }
    };

    const rejectCall = () => {
        socket.emit('reject_call', { callId: callMetadata.callId, callerId: callMetadata.callerId });
        cleanupCall();
    };

    const endCall = () => {
        if (!metadataRef.current) {
            cleanupCall();
            return;
        }
        const targetId = metadataRef.current.callerId === currentUserId ? metadataRef.current.responderId : metadataRef.current.callerId;
        const finalDuration = durationTrackerRef.current;
        
        socket.emit('end_call', { callId: metadataRef.current.callId, targetUserId: targetId, durationInSeconds: finalDuration });
        cleanupCall();
    };

    const toggleVideo = async () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
        } else {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                const newVideoTrack = newStream.getVideoTracks()[0];
                stream.addTrack(newVideoTrack);
                if (peerConnection.current) {
                    peerConnection.current.addTrack(newVideoTrack, stream);
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    const m = metadataRef.current;
                    const targetId = m.callerId === currentUserId ? m.responderId : m.callerId;
                    socket.emit('webrtc_signal', { targetUserId: targetId, signal: offer, callId: m.callId });
                }
            } catch (err) {
                console.error("Failed to upgrade to video", err);
            }
        }
    };

    const startCallTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        durationTrackerRef.current = 0;
        setCallDuration(0);
        
        timerRef.current = setInterval(() => {
            durationTrackerRef.current += 1;
            setCallDuration(durationTrackerRef.current);
        }, 1000);
    };

    const cleanupCall = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        
        pendingCandidates.current = [];
        setLocalStream(null);
        setRemoteStream(null);
        setCallState('idle');
        setCallMetadata(null);
        
        if (timerRef.current) clearInterval(timerRef.current);
        durationTrackerRef.current = 0;
        setCallDuration(0);
    };

    return { callState, callMetadata, localStream, remoteStream, callDuration, initiateCall, answerCall, rejectCall, endCall, toggleVideo };
};
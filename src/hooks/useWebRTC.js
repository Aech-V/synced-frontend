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
    
    // Use a ref to access the latest metadata inside socket listeners without destroying the listener
    const metadataRef = useRef(null);
    useEffect(() => { metadataRef.current = callMetadata; }, [callMetadata]);

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
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            
            const m = metadataRef.current;
            socket.emit('webrtc_signal', { targetUserId: responderId, signal: offer, callId: m?.callId });
        });

        socket.on('webrtc_signal', async ({ senderId, signal }) => {
            if (!peerConnection.current) return;
            const m = metadataRef.current;
            
            if (signal.type === 'offer') {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                socket.emit('webrtc_signal', { targetUserId: senderId, signal: answer, callId: m?.callId });
                startCallTimer();
            } else if (signal.type === 'answer') {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal));
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
    }, [socket]); // FIX: Removed callState and callMetadata from deps to prevent listener destruction

    const setupMediaAndPeer = async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: type === 'video' ? { facingMode: 'user' } : false 
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
            alert("Please allow Camera and Microphone permissions.");
            throw error;
        }
    };

    const initiateCall = async (roomId, targetUserId, type, isGroup = false) => {
        if (callState !== 'idle') await endCall();

        await setupMediaAndPeer(type);
        
        // FIX: Optimistically set metadata so the ActiveCallModal renders INSTANTLY
        setCallMetadata({ callId: 'initiating...', callerId: currentUserId, roomId, type, responderId: targetUserId });
        setCallState('calling');
        
        socket.emit('start_call', { roomId, targetUserId, type, isGroup }, (response) => {
            if (response.success) {
                // Update with the real server-generated Call ID
                setCallMetadata({ callId: response.callId, callerId: currentUserId, roomId, type, responderId: targetUserId });
            } else {
                alert(response.error || "Call failed");
                cleanupCall();
            }
        });
    };

    const answerCall = async () => {
        await setupMediaAndPeer(callMetadata.type);
        setCallState('connected');
        socket.emit('accept_call', { callId: callMetadata.callId, callerId: callMetadata.callerId });
    };

    const rejectCall = () => {
        socket.emit('reject_call', { callId: callMetadata.callId, callerId: callMetadata.callerId });
        cleanupCall();
    };

    const endCall = () => {
        if (!callMetadata) return;
        const targetId = callMetadata.callerId === currentUserId ? callMetadata.responderId : callMetadata.callerId;
        const finalDuration = durationTrackerRef.current;
        
        socket.emit('end_call', { callId: callMetadata.callId, targetUserId: targetId, durationInSeconds: finalDuration });
        cleanupCall();
    };

    const toggleVideo = async () => {
        if (!localStream) return;
        const videoTrack = localStream.getVideoTracks()[0];
        
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
        } else {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = newStream.getVideoTracks()[0];
                localStream.addTrack(newVideoTrack);
                peerConnection.current.addTrack(newVideoTrack, localStream);
                const offer = await peerConnection.current.createOffer();
                await peerConnection.current.setLocalDescription(offer);
                const targetId = callMetadata.callerId === currentUserId ? callMetadata.responderId : callMetadata.callerId;
                socket.emit('webrtc_signal', { targetUserId: targetId, signal: offer, callId: callMetadata.callId });
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
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        if (peerConnection.current) peerConnection.current.close();
        
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
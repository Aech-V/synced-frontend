import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, MicOff, Mic, Loader2, RefreshCcw } from 'lucide-react';

const ActiveCallModal = ({ rtc, availableRooms = [], currentUser = {} }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);

    // Attach media streams to HTML video tags
    useEffect(() => {
        if (localVideoRef.current && rtc.localStream) {
            localVideoRef.current.srcObject = rtc.localStream;
        }
        if (remoteVideoRef.current && rtc.remoteStream) {
            remoteVideoRef.current.srcObject = rtc.remoteStream;
            remoteVideoRef.current.play().catch(e => console.warn('Mobile auto-play wait:', e));
        }
    }, [rtc.localStream, rtc.remoteStream]);

    // Handle Local Mic Muting
    const toggleMute = () => {
        if (rtc.localStream) {
            const audioTrack = rtc.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    if (rtc.callState === 'idle') return null;

    const isReceiving = rtc.callState === 'receiving';
    const isRingingOut = rtc.callState === 'ringing' || rtc.callState === 'calling';
    const isConnected = rtc.callState === 'connected';
    const isVideoCall = rtc.callMetadata?.type === 'video';
    
    // --- IDENTITY RESOLUTION ---
    let callerName = "Unknown Caller";
    let avatarUrl = `https://ui-avatars.com/api/?name=U&background=random&size=512`;

    if (rtc.callMetadata) {
        const currentUserId = currentUser?.id || currentUser?._id;
        const room = availableRooms.find(r => r._id === rtc.callMetadata.roomId || r.name === rtc.callMetadata.roomId);
        
        if (room && room.participants) {
            const targetParticipant = room.participants.find(p => {
                const pid = p.userId?._id || p.userId;
                return pid !== currentUserId;
            });
            if (targetParticipant && targetParticipant.userId) {
                callerName = targetParticipant.userId.username || "Unknown";
                avatarUrl = targetParticipant.userId.avatar || `https://ui-avatars.com/api/?name=${callerName.charAt(0)}&background=random&size=512`;
            }
        }
    }

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.3 }}
                style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: '#09090b', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}
            >
                {/* DYNAMIC GLASSMORPHISM BACKGROUND */}
                <div style={{ position: 'absolute', inset: -50, backgroundImage: `url('${avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) brightness(0.4)', opacity: 0.8 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.85))' }} />

                <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* REMOTE VIDEO / AUDIO OUTPUT */}
                    <video 
                        ref={remoteVideoRef} autoPlay playsInline 
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: rtc.remoteStream ? 1 : 0, transition: 'opacity 0.8s ease-in-out', zIndex: 1 }} 
                    />

                    {/* CALL HEADER & AVATAR (Hides smoothly when connected) */}
                    <AnimatePresence>
                        {(!rtc.remoteStream || !isConnected) && (
                            <motion.div 
                                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
                                style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '15vh', flex: 1, textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
                            >
                                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
                                    
                                    {/* SONAR PULSE EFFECT (Only rings if ringing out/receiving) */}
                                    {(isRingingOut || isReceiving) && (
                                        <>
                                            <motion.div animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }} style={{ position: 'absolute', width: '140px', height: '140px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
                                            <motion.div animate={{ scale: [1, 2.4], opacity: [0.4, 0] }} transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: 'easeOut' }} style={{ position: 'absolute', width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} />
                                        </>
                                    )}

                                    {/* MAIN AVATAR */}
                                    <div style={{ position: 'relative', zIndex: 2, width: '140px', height: '140px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', border: '4px solid rgba(255,255,255,0.15)', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                                        <img src={avatarUrl} alt="Caller" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                </div>

                                <h2 style={{ color: '#fff', fontSize: '2.4rem', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.8px' }}>
                                    {callerName}
                                </h2>
                                <motion.p 
                                    animate={{ opacity: (isRingingOut || isReceiving) ? [0.5, 1, 0.5] : 1 }} 
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', margin: 0, fontWeight: '500', letterSpacing: '1px' }}
                                >
                                    {isReceiving ? (isVideoCall ? 'Incoming Video...' : 'Incoming Audio...') : 
                                    (isRingingOut ? 'Ringing...' : 
                                    (isConnected ? `${Math.floor(rtc.callDuration / 60)}:${(rtc.callDuration % 60).toString().padStart(2, '0')}` : 'Connecting...'))}
                                </motion.p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* PREMIUM PICTURE-IN-PICTURE (Draggable Local Video) */}
                    {isVideoCall && (
                        <motion.div 
                            drag dragConstraints={{ top: -500, bottom: -20, left: -250, right: 20 }} dragMomentum={false}
                            style={{ 
                                position: 'absolute', bottom: '150px', right: '24px', width: '120px', height: '170px', 
                                borderRadius: '20px', overflow: 'hidden', backgroundColor: '#1a1a1a', 
                                border: '1px solid rgba(255,255,255,0.1)', // Outer border
                                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 20px 40px rgba(0,0,0,0.6)', // Bright inner ring + deep drop shadow
                                zIndex: 20, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}
                            whileTap={{ cursor: 'grabbing', scale: 0.95 }}
                        >
                            {!rtc.localStream && (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ position: 'absolute', zIndex: 1 }}>
                                    <Loader2 size={24} color="rgba(255,255,255,0.5)" />
                                </motion.div>
                            )}
                            <video 
                                ref={localVideoRef} autoPlay playsInline muted 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', position: 'relative', zIndex: 2, opacity: rtc.localStream ? 1 : 0, transition: 'opacity 0.3s' }} 
                            />
                            {/* "You" Badge */}
                            <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 3, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '8px', color: '#fff', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                                You
                            </div>
                        </motion.div>
                    )}

                    {/* FLOATING CONTROL DOCK */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, padding: '0 24px 40px 24px', display: 'flex', justifyContent: 'center' }}>
                        
                        <div style={{ 
                            display: 'flex', alignItems: 'center', gap: '20px', 
                            background: 'rgba(20, 20, 20, 0.65)', backdropFilter: 'blur(25px)', 
                            padding: '16px 24px', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                        }}>
                            {isReceiving ? (
                                <>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={rtc.rejectCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' }}>
                                        <PhoneOff size={28} />
                                    </motion.button>
                                    <motion.button animate={{ boxShadow: ['0 0 0px rgba(16, 185, 129, 0.4)', '0 0 30px rgba(16, 185, 129, 0.8)', '0 0 0px rgba(16, 185, 129, 0.4)'] }} transition={{ duration: 1.5, repeat: Infinity }} onClick={rtc.answerCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Phone size={28} />
                                    </motion.button>
                                </>
                            ) : isRingingOut ? (
                                <>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.endCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)' }}>
                                        <PhoneOff size={28} />
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleMute} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: isMuted ? '#fff' : 'rgba(255,255,255,0.15)', color: isMuted ? '#000' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}>
                                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                                    </motion.button>
                                    
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.toggleVideo} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Video size={24} />
                                    </motion.button>

                                    {/* HOT-SWAP CAMERA FLIP (Mobile/Multi-cam support) */}
                                    {isVideoCall && (
                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.flipCamera} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RefreshCcw size={24} />
                                        </motion.button>
                                    )}

                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.endCall} style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)', marginLeft: '12px' }}>
                                        <PhoneOff size={30} />
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ActiveCallModal;
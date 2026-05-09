import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, MicOff, Mic, Loader2 } from 'lucide-react';

const ActiveCallModal = ({ rtc, availableRooms = [], currentUser = {} }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Attach media streams to HTML video tags
    useEffect(() => {
        if (localVideoRef.current && rtc.localStream) {
            localVideoRef.current.srcObject = rtc.localStream;
        }
        if (remoteVideoRef.current && rtc.remoteStream) {
            remoteVideoRef.current.srcObject = rtc.remoteStream;
            // MAGIC FIX: Force the stream to play to bypass strict mobile policies
            remoteVideoRef.current.play().catch(e => console.warn('Mobile auto-play wait:', e));
        }
    }, [rtc.localStream, rtc.remoteStream]);

    if (rtc.callState === 'idle') return null;

    const isReceiving = rtc.callState === 'receiving';
    const isRingingOut = rtc.callState === 'ringing' || rtc.callState === 'calling';
    const isConnected = rtc.callState === 'connected';
    
    const isVideoCall = rtc.callMetadata?.type === 'video';
    
    // --- REAL IDENTITY RESOLUTION ---
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
                style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: '#000', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}
            >
                {!rtc.remoteStream && (
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(60px) brightness(0.3)', transform: 'scale(1.2)' }} />
                )}

                <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
                    
                    {/* REMOTE VIDEO / AUDIO OUTPUT */}
                    <video 
                        ref={remoteVideoRef} autoPlay playsInline 
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: rtc.remoteStream ? 1 : 0, transition: 'opacity 0.5s', zIndex: 1 }} 
                    />

                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12vh', flex: 1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        {!rtc.remoteStream && (
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 20 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '130px', height: '130px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', border: '3px solid rgba(255,255,255,0.2)', marginBottom: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                                    <img src={avatarUrl} alt="Caller" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <h2 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                                    {callerName}
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', margin: 0, fontWeight: '500', letterSpacing: '1px' }}>
                                    {isReceiving ? (isVideoCall ? 'Incoming Video Call...' : 'Incoming Audio Call...') : 
                                    (isRingingOut ? 'Ringing...' : 
                                    (isConnected ? `${Math.floor(rtc.callDuration / 60)}:${(rtc.callDuration % 60).toString().padStart(2, '0')}` : 'Connecting...'))}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {isVideoCall && (
                        <motion.div 
                            drag dragConstraints={{ top: -500, bottom: 0, left: -300, right: 0 }} dragElastic={0.1}
                            style={{ position: 'absolute', bottom: '160px', right: '24px', width: '110px', height: '160px', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 15px 35px rgba(0,0,0,0.5)', zIndex: 20, cursor: 'grab', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                        </motion.div>
                    )}

                    <div style={{ position: 'relative', zIndex: 10, padding: '40px 24px', display: 'flex', justifyContent: 'center', gap: '32px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
                        {isReceiving ? (
                            <>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={rtc.rejectCall} style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)' }}>
                                    <PhoneOff size={30} />
                                </motion.button>
                                <motion.button animate={{ boxShadow: ['0 0 0px rgba(16, 185, 129, 0.4)', '0 0 30px rgba(16, 185, 129, 0.8)', '0 0 0px rgba(16, 185, 129, 0.4)'] }} transition={{ duration: 1.5, repeat: Infinity }} onClick={rtc.answerCall} style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={30} />
                                </motion.button>
                            </>
                        ) : isRingingOut ? (
                            <>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.endCall} style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)' }}>
                                    <PhoneOff size={32} />
                                </motion.button>
                            </>
                        ) : (
                            <>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mic size={26} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.endCall} style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)', margin: '0 -8px' }}>
                                    <PhoneOff size={32} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={rtc.toggleVideo} style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Video size={26} />
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ActiveCallModal;
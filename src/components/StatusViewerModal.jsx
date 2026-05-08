import React, { useState, useEffect } from 'react';
import { X, Send, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import { apiClient, resolveDirectMessage } from '../utils/api'; 
import { useIsMobile } from '../hooks/useMediaQuery';

const StatusViewerModal = ({ status, onClose }) => {
    const statusGroup = status; 
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const isMobile = useIsMobile();

    const items = statusGroup?.items || [];
    const currentStatus = items[currentIndex]; 
    const DURATION = currentStatus?.mediaType === 'video' ? 15000 : 5000; 

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        } else {
            setProgress(0);
        }
    };

    useEffect(() => {
        if (isPaused || items.length === 0) return; 

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + (100 / (DURATION / 16.66));
            });
        }, 16.66);

        return () => clearInterval(interval);
    }, [currentIndex, isPaused, items.length, DURATION]);

    const handleReply = async () => {
        if (!replyText.trim() || isSending) return;
        setIsSending(true);
        setIsPaused(true); 

        try {
            const res = await resolveDirectMessage(statusGroup.user._id);
            const roomId = res.room._id;

            await apiClient.post('/messages', {
                roomId: roomId,
                type: 'text',
                text: replyText,
            });

            triggerHaptic('success');
            onClose(); 
        } catch (error) {
            console.error("Failed to send reply", error);
            triggerHaptic('error');
            setIsSending(false);
            setIsPaused(false);
        }
    };

    if (items.length === 0) return null;

    return (
        <div 
            onClick={onClose} // Clicking the blurred background closes the modal on PC
            style={{ 
                position: 'fixed', inset: 0, zIndex: 999999, 
                backgroundColor: isMobile ? '#000' : 'rgba(10, 10, 10, 0.95)', 
                backdropFilter: isMobile ? 'none' : 'blur(10px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center' 
            }}
        >
            {/* DESKTOP LEFT ARROW */}
            {!isMobile && (
                <button 
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
                    style={{ position: 'absolute', left: '10%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '16px', color: '#fff', cursor: 'pointer', transition: 'background 0.2s', zIndex: 10 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <ChevronLeft size={32} />
                </button>
            )}

            {/* THE CONSTRAINED PHONE-SIZED CONTAINER */}
            <div 
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside the viewer from closing it
                style={{ 
                    position: 'relative', 
                    width: '100%', 
                    maxWidth: isMobile ? '100%' : '420px', // Constrains width on PC
                    height: isMobile ? '100%' : '90vh',    // Leaves breathing room on PC
                    borderRadius: isMobile ? '0' : '24px', // Rounded corners on PC
                    backgroundColor: '#000', 
                    display: 'flex', flexDirection: 'column', 
                    overflow: 'hidden', 
                    boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                }}
            >
                {/* PROGRESS BAR STACK */}
                <div style={{ display: 'flex', gap: '4px', padding: '16px 8px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
                    {items.map((_, idx) => (
                        <div key={idx} style={{ flex: 1, height: '2.5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', backgroundColor: '#fff', 
                                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                                transition: idx === currentIndex ? 'width 16ms linear' : 'none'
                            }} />
                        </div>
                    ))}
                </div>

                {/* HEADER */}
                <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><X size={26} /></button>
                        <img src={statusGroup.user.avatar || `https://ui-avatars.com/api/?name=${statusGroup.user.username}&background=random`} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{statusGroup.isOwn ? 'My Status' : statusGroup.user.username}</span>
                            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* MEDIA RENDERER */}
                <div 
                    onPointerDown={() => setIsPaused(true)} 
                    onPointerUp={() => setIsPaused(false)}
                    onPointerLeave={() => setIsPaused(false)}
                    style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {currentStatus.mediaType === 'video' ? (
                        <video src={currentStatus.mediaUrl} autoPlay playsInline style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                        <img src={currentStatus.mediaUrl} alt="Status" style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    )}

                    {/* Invisible Touch Navigation Zones (Crucial for Mobile) */}
                    <div onClick={(e) => { e.stopPropagation(); handlePrev(); }} style={{ position: 'absolute', top: '100px', bottom: '100px', left: 0, width: '30%', zIndex: 5, cursor: 'w-resize' }} />
                    <div onClick={(e) => { e.stopPropagation(); handleNext(); }} style={{ position: 'absolute', top: '100px', bottom: '100px', right: 0, width: '70%', zIndex: 5, cursor: 'e-resize' }} />
                </div>

                {/* FOOTER */}
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    {statusGroup.isOwn ? (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: '#fff', padding: '12px 0' }}>
                            <Eye size={22} />
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{currentStatus.viewers?.length || 0}</span>
                        </div>
                    ) : (
                        <>
                            <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '30px', padding: '14px 20px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <input 
                                    type="text" placeholder="Reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)}
                                    onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)} onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                                    disabled={isSending}
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '1rem' }}
                                />
                            </div>
                            <AnimatePresence>
                                {replyText.trim() && (
                                    <motion.button 
                                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                                        disabled={isSending} onClick={handleReply} 
                                        style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        {isSending ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={20} color="#000" /></motion.div> : <Send size={20} color="#000" style={{ marginLeft: '2px' }} />}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>

            {/* DESKTOP RIGHT ARROW */}
            {!isMobile && (
                <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }} 
                    style={{ position: 'absolute', right: '10%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '16px', color: '#fff', cursor: 'pointer', transition: 'background 0.2s', zIndex: 10 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <ChevronRight size={32} />
                </button>
            )}
        </div>
    );
};

export default StatusViewerModal;
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquarePlus, CircleDashed, PhoneCall, 
    Lock, Users, Hash, MessageSquare,
    Phone, Video, Mic, Monitor
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useIsMobile } from '../hooks/useMediaQuery';

const FloatingActionButton = ({ activeNav, onAction, onGlobalAction }) => {
    const [isFabOpen, setIsFabOpen] = useState(false);
    const isMobile = useIsMobile();

    const fabActions = {
        Chats: [
            { id: 'secret', label: 'New Secret Chat', icon: <Lock size={18} color="#ef4444" /> },
            { id: 'group', label: 'Create Private Group', icon: <Users size={18} color="#10b981" /> },
            { id: 'channel', label: 'Create Public Channel', icon: <Hash size={18} color="#3b82f6" /> },
            { id: 'direct', label: 'New Direct Message', icon: <MessageSquare size={18} color="var(--accent-primary)" /> }
        ],
        Calls: [
            { id: 'START_VOICE_CALL', label: 'Start Voice Call', icon: <Phone size={18} color="#10b981" /> },
            { id: 'START_VIDEO_CALL', label: 'Start Video Call', icon: <Video size={18} color="#3b82f6" /> },
            { id: 'START_VOICE_HUDDLE', label: 'Start Voice Huddle', icon: <Mic size={18} color="#f59e0b" /> },
            { id: 'INITIATE_VIDEO_MEETING', label: 'Initiate Video Meeting', icon: <Monitor size={18} color="#8b5cf6" /> }
        ]
    };

    const getIcon = () => {
        if (activeNav === 'Calls') return <PhoneCall size={24} />;
        return <MessageSquarePlus size={24} />;
    };

    return (
        <>
            {isFabOpen && <div onClick={() => setIsFabOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10, backgroundColor: 'transparent' }} />}
            
            {fabActions[activeNav] && (
                <div style={{ 
                    position: 'absolute',
                    bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 16px) + 160px)' : '90px', 
                    right: '24px', 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '20px', 
                    padding: '8px', 
                    boxShadow: '0 15px 40px rgba(0,0,0,0.25)', 
                    zIndex: 11, 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '4px', 
                    minWidth: '240px', 
                    opacity: isFabOpen ? 1 : 0, 
                    transform: isFabOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)', 
                    pointerEvents: isFabOpen ? 'auto' : 'none', 
                    transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)', 
                    transformOrigin: 'bottom right' 
                }}>
                    {fabActions[activeNav].map(action => (
                        <div
                            key={action.id}
                            onClick={() => { 
                                triggerHaptic('light'); 
                                if (activeNav === 'Chats' && onAction) onAction(action.id);
                                else if (activeNav === 'Calls' && onGlobalAction) onGlobalAction(action.id); 
                                else if (onAction) onAction(action.id);
                                setIsFabOpen(false); 
                            }}
                            style={{ padding: '12px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {action.icon}
                            </div>
                            <span>{action.label}</span>
                        </div>
                    ))}
                </div>
            )}
            
            <AnimatePresence mode="wait">
                {/* FIX: Only render the button if we are NOT on the Status tab */}
                {activeNav !== 'Status' && (
                    <motion.button
                        key={activeNav}
                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5, rotate: 45 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => { triggerHaptic('light'); if (fabActions[activeNav]) setIsFabOpen(!isFabOpen); }}
                        style={{ position: 'absolute', bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 16px) + 96px)' : '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isFabOpen ? '0 0 0 4px rgba(252, 203, 6, 0.2)' : '0 8px 24px rgba(252, 203, 6, 0.4)', cursor: 'pointer', zIndex: 11 }}
                    >
                        {getIcon()}
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
};

export default FloatingActionButton;
import React, { useState } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Search } from 'lucide-react';
import { useFloating, useClick, useDismiss, useInteractions, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import { useIsMobile } from '../hooks/useMediaQuery';
import { apiClient } from '../utils/api';

const ChatHeader = ({ currentRoom, roomObj, isOnline, onGlobalAction, isTyping, rtc, onCloseMobileChat, onOpenProfile, onOpenSearch }) => {
    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};

    let displayRoomName = currentRoom;
    let displayAvatar = `https://ui-avatars.com/api/?name=${currentRoom}&background=random`;
    let roomType = 'channel';
    let targetUserId = null;

    if (roomObj) {
        roomType = roomObj.type;
        if (roomType === 'direct' || roomType === 'secret') {
            const otherUser = roomObj.participants?.find(p => p.userId && p.userId._id !== currentUser.id && p.userId._id !== currentUser._id);
            if (otherUser && otherUser.userId) {
                targetUserId = otherUser.userId._id;
                displayRoomName = otherUser.userId.username;
                displayAvatar = otherUser.userId.avatar || `https://ui-avatars.com/api/?name=${displayRoomName}&background=random`;
            }
        } else {
            displayRoomName = roomObj.name;
        }
    }

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open: isMenuOpen, onOpenChange: setIsMenuOpen,
        middleware: [offset(8), flip(), shift({ padding: 16 })], placement: 'bottom-end',
    });
    const click = useClick(context);
    const dismiss = useDismiss(context);
    const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

    const isMobile = useIsMobile();

    const renderSubtitle = () => {
        if (!currentRoom) return null;
        if (['Global', 'Engineering'].includes(currentRoom)) return '12,402 members';
        if (isTyping) return <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Typing...</span>;
        return 'Online';
    };

    const isGroup = ['channel', 'group'].includes(roomType);

    const handleCallClick = (type) => {
        if (targetUserId || isGroup) rtc.initiateCall(roomObj._id, targetUserId, type, isGroup);
    };

    return (
        <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', height: '72px', flexShrink: 0 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                {isMobile && (
                    <button onClick={onCloseMobileChat} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0 4px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={24} />
                    </button>
                )}

                <div onClick={onOpenProfile} style={{ width: '44px', height: '44px', borderRadius: isGroup ? '14px' : '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}>
                    {isGroup ? <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>#</span> : <img src={displayAvatar} alt={displayRoomName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }} onClick={onOpenProfile}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {displayRoomName}
                    </h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginTop: '2px' }}>
                        {renderSubtitle()}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface-hover)', padding: '4px', borderRadius: '12px' }}>
                    <button onClick={() => handleCallClick('voice')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Phone size={18} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => handleCallClick('video')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Video size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <button onClick={onOpenSearch} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', marginLeft: '8px', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    <Search size={20} />
                </button>

                <div style={{ position: 'relative' }}>
                    <button ref={refs.setReference} {...getReferenceProps()} onClick={() => { triggerHaptic('light'); setIsMenuOpen(!isMenuOpen); }} style={{ background: 'none', border: 'none', color: isMenuOpen ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '8px', transition: 'color 0.2s' }}>
                        <MoreVertical size={20} />
                    </button>

                    <FloatingPortal>
                        <AnimatePresence>
                            {isMenuOpen && (
                                <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 9999 }} {...getFloatingProps()}>
                                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ duration: 0.15, ease: 'easeOut' }} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', width: '200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button onClick={() => { setIsMenuOpen(false); onOpenProfile(); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            {isGroup ? 'Group Info' : 'Contact Info'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setIsMenuOpen(false);
                                                const isConfirmed = window.confirm("Are you sure you want to clear your history for this chat? This action cannot be undone.");

                                                if (isConfirmed && roomObj?._id) {
                                                    try {
                                                        const response = await apiClient.put(`/rooms/${roomObj._id}/clearHistory`);
                                                        
                                                        if (response.data.success) {
                                                            triggerHaptic('success');
                                                            if (onGlobalAction) onGlobalAction('CLEAR_HISTORY');
                                                        }
                                                    } catch (error) {
                                                        console.error("Clear History Error:", error);
                                                        alert("Failed to clear history. Please try again.");
                                                    }
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', textAlign: 'left', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            Clear History
                                        </button>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </FloatingPortal>
                </div>
            </div>
        </div>
    );
};

export default ChatHeader;
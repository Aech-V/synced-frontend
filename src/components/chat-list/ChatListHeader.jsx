import React, { useState, useEffect } from 'react';
import { Edit, LogOut, MessageSquarePlus, Users } from 'lucide-react';
import { useFloating, useClick, useDismiss, useInteractions, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useMediaQuery';

const ChatListHeader = ({ isOnline, onGlobalAction, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isMobile = useIsMobile();

    // Floating UI Engine
    const { refs, floatingStyles, context } = useFloating({
        open: isMenuOpen,
        onOpenChange: setIsMenuOpen,
        middleware: [offset(8), flip(), shift({ padding: 16 })],
        placement: 'bottom-start',
    });
    const click = useClick(context);
    const dismiss = useDismiss(context);
    const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

    const handleWriteClick = () => {
        if (isMobile) {
            onGlobalAction('NEW_MESSAGE');
        } else {
            setIsMenuOpen(!isMenuOpen);
        }
    };

    return (
        <div style={{ padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/synced-logo.png" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '12px', opacity: isOnline ? 1 : 0.5, transition: 'opacity 0.3s' }} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px', color: isOnline ? 'var(--text-primary)' : '#ef4444', transition: 'color 0.3s ease' }}>
                        {isOnline ? 'SYNCED' : 'Connecting...'}
                    </h2>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                    <button
                        ref={refs.setReference}
                        {...getReferenceProps()}
                        onClick={handleWriteClick}
                        style={{ background: isMenuOpen ? 'var(--bg-surface-hover)' : 'none', border: 'none', color: isMenuOpen ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { if(!isMenuOpen) e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
                        onMouseLeave={(e) => { if(!isMenuOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        <Edit size={20} />
                    </button>

                    {/* PC Dropdown Menu */}
                    {!isMobile && (
                        <FloatingPortal>
                            <AnimatePresence>
                                {isMenuOpen && (
                                    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 9999 }} {...getFloatingProps()}>
                                        <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', width: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <button onClick={() => { setIsMenuOpen(false); onGlobalAction('NEW_MESSAGE'); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <MessageSquarePlus size={18} color="var(--accent-primary)" /> New Chat
                                            </button>
                                            <button onClick={() => { setIsMenuOpen(false); /* Trigger Group Flow */ }} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <Users size={18} color="#10b981" /> New Group
                                            </button>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </FloatingPortal>
                    )}
                </div>

                <button
                    onClick={onLogout}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );
};

export default ChatListHeader;
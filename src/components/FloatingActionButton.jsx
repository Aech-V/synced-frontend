import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, Hash, Lock, Plus, X, Camera } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useIsMobile } from '../hooks/useMediaQuery';

const FloatingActionButton = ({ activeNav, onAction, onGlobalAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const isMobile = useIsMobile();

    // Close the menu if the user clicks outside of it
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleMenu = () => {
        triggerHaptic('light');
        setIsOpen(!isOpen);
    };

    const handleItemClick = (action) => {
        triggerHaptic('success');
        onAction(action);
        setIsOpen(false);
    };

    if (!['Chats', 'Channels', 'Status'].includes(activeNav)) return null;

    const menuItems = activeNav === 'Status' ? [
        { id: 'text_status', label: 'Text Status', icon: <MessageSquare size={18} />, color: 'var(--text-primary)' },
        { id: 'camera_status', label: 'Camera', icon: <Camera size={18} />, color: '#10b981' }
    ] : [
        { id: 'secret', label: 'New Secret Chat', icon: <Lock size={18} />, color: '#ef4444' },
        { id: 'group', label: 'Create Private Group', icon: <Users size={18} />, color: '#10b981' },
        { id: 'channel', label: 'Create Public Channel', icon: <Hash size={18} />, color: '#3b82f6' },
        { id: 'direct', label: 'New Direct Message', icon: <MessageSquare size={18} />, color: 'var(--accent-primary)' }
    ];

    return (
        <div 
            ref={menuRef} 
            style={{ 
                position: 'absolute', 
                bottom: isMobile ? '88px' : '24px',
                right: '24px', 
                zIndex: 100, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end' 
            }}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        style={{
                            marginBottom: '16px',
                            backgroundColor: 'rgba(26, 27, 30, 0.85)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '24px',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '260px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
                        }}
                    >
                        {menuItems.map((item, i) => (
                            <motion.button
                                key={item.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }} 
                                onClick={() => handleItemClick(item.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px',
                                    backgroundColor: 'transparent', border: 'none', borderRadius: '16px',
                                    color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '600',
                                    cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {item.icon}
                                </div>
                                {item.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={toggleMenu}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)', border: 'none',
                    color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', 
                    boxShadow: isOpen ? '0 0 0 4px rgba(252, 203, 6, 0.2)' : '0 12px 28px rgba(252, 203, 6, 0.35)',
                    transition: 'box-shadow 0.3s'
                }}
            >
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <Plus size={28} strokeWidth={2.5} />
                </motion.div>
            </motion.button>
        </div>
    );
};

export default FloatingActionButton;
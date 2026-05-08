import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Radio, Phone } from 'lucide-react';
import FullScreenSettingsModal from './settings/FullScreenSettingsModal';
import { useTheme } from '../context/ThemeContext';
import { useIsMobile } from '../hooks/useMediaQuery';

export const NAV_ITEMS = [
    { id: 'Chats', label: 'Chats', icon: MessageSquare },
    { id: 'Status', label: 'Status', icon: Radio },
    { id: 'Calls', label: 'Calls', icon: Phone },
    { id: 'Profile', label: 'Settings', isAvatar: true }
];

const GlobalNav = ({ activeNav, setActiveNav, currentRoom }) => {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { appearance } = useTheme();
    const isMobile = useIsMobile();
    
    const currentUserObj = JSON.parse(localStorage.getItem('synced_user')) || {};
    const userName = currentUserObj.username || 'User';
    const displayAvatar = currentUserObj.avatar || `https://ui-avatars.com/api/?name=${userName}&background=random`;

    // Keyboard detection engine
    useEffect(() => {
        const handleFocusIn = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                setIsKeyboardOpen(true);
            }
        };
        const handleFocusOut = () => {
            setIsKeyboardOpen(false);
        };

        window.addEventListener('focusin', handleFocusIn);
        window.addEventListener('focusout', handleFocusOut);

        return () => {
            window.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('focusout', handleFocusOut);
        };
    }, []);

    // Evaluate visibility state without unmounting the modal portal
    const hideNavRail = isMobile && (isKeyboardOpen || currentRoom);

    return (
        <>
            {/* Render Navigation Rail conditionally to preserve modal portal */}
            {!hideNavRail && (
                <nav className="global-nav-rail" style={{ padding: isMobile ? '0' : '16px 0', display: 'flex', flexDirection: 'column' }}>
                    
                    {!isMobile && (
                        <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                            <img src="/synced-logo.png" alt="Synced" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? '0' : '20px', width: '100%', height: '100%', justifyContent: isMobile ? 'space-around' : 'flex-start', alignItems: 'center' }}>
                        {NAV_ITEMS.map((item) => {
                            const isActive = activeNav === item.id && !item.isAvatar;
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (item.isAvatar) {
                                            setIsSettingsOpen(true);
                                        } else {
                                            setActiveNav(item.id);
                                        }
                                    }}
                                    style={{
                                        position: 'relative',
                                        width: isMobile ? '56px' : '48px',
                                        height: isMobile ? '56px' : '48px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        marginTop: item.isAvatar && !isMobile ? 'auto' : '0', 
                                        marginBottom: item.isAvatar && !isMobile ? '16px' : '0'
                                    }}
                                >
                                    {item.isAvatar ? (
                                        <div style={{
                                            width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden',
                                            border: isSettingsOpen ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                            transition: 'border-color 0.2s', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <img src={displayAvatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        </div>
                                    ) : (
                                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    )}

                                    {isActive && !item.isAvatar && (
                                        <motion.div
                                            layoutId="activeNavDot"
                                            style={{
                                                position: 'absolute',
                                                bottom: isMobile ? '8px' : '4px',
                                                left: '50%',
                                                width: '4px',
                                                height: '4px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--accent-primary)',
                                                x: '-50%'
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </nav>
            )}

            {/* Immersive Modal Portal decoupled from nav rail destruction */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <FullScreenSettingsModal onClose={() => setIsSettingsOpen(false)} />
                )}
            </AnimatePresence>
        </>
    );
};

export default GlobalNav;
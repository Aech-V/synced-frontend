import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Shield, Database, Bell, Palette, HelpCircle,
    Key, ChevronLeft, User, ChevronRight
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import ProfileTab from './ProfileTab';
import PrivacyTab from './PrivacyTab';
import SecurityTab from './SecurityTab';
import StorageTab from './StorageTab';
import AppearanceSettings from './AppearanceSettings';
import NotificationsTab from './NotificationsTab';
import HelpTab from './HelpTab';
import { useIsMobile } from '../../hooks/useMediaQuery';

const FullScreenSettingsModal = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [mobileView, setMobileView] = useState('menu');

    const isMobile = useIsMobile();
    const handleTabSelect = (tabId) => {
        triggerHaptic('light');
        setActiveTab(tabId);
        if (isMobile) setMobileView('content');
    };

    const SettingRow = ({ id, icon: Icon, label }) => {
        const isActive = activeTab === id;
        return (
            <div
                onClick={() => handleTabSelect(id)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: isActive && !isMobile ? 'var(--bg-primary)' : 'transparent',
                    borderLeft: isActive && !isMobile ? '3px solid var(--accent-primary)' : '3px solid transparent',
                    cursor: 'pointer', borderRadius: isMobile ? '0' : '0 8px 8px 0',
                    borderBottom: isMobile ? '1px solid var(--border-subtle)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Icon size={20} color={isActive && !isMobile ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                    <span style={{ fontSize: '1rem', color: isActive && !isMobile ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive && !isMobile ? '600' : '500' }}>{label}</span>
                </div>
                {isMobile && <ChevronRight size={18} color="var(--text-secondary)" />}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            // 1. The backdrop handles the close event
            onClick={onClose} 
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <div 
                // 2. The inner container STOPS the click from bubbling up to the backdrop
                onClick={(e) => e.stopPropagation()} 
                style={{
                    display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '280px 1fr',
                    height: isMobile ? '100%' : '85vh', width: isMobile ? '100%' : '90vw', maxWidth: '1200px',
                    backgroundColor: 'var(--bg-surface)', borderRadius: isMobile ? 0 : 'var(--radius-lg)',
                    overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* LEFT PANE: Navigation Sidebar */}
                {(!isMobile || mobileView === 'menu') && (
                    <div style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Settings</h2>
                            {isMobile && <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}><X size={24} /></button>}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0' : '0 16px 24px 0' }}>
                            <SettingRow id="profile" icon={User} label="Profile" />
                            <SettingRow id="security" icon={Shield} label="Security & Passkeys" />
                            <SettingRow id="privacy" icon={Key} label="Privacy" />
                            <SettingRow id="storage" icon={Database} label="Storage Engine" />
                            <SettingRow id="notifications" icon={Bell} label="Notifications" />
                            <SettingRow id="appearance" icon={Palette} label="Appearance" />
                            <SettingRow id="help" icon={HelpCircle} label="Help Center" />
                        </div>
                    </div>
                )}

                {/* RIGHT PANE: Dynamic Content */}
                {(!isMobile || mobileView === 'content') && (
                    <div style={{ backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                        
                        {/* Right Pane Header */}
                        <div style={{ padding: '16px 32px', display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
                            {isMobile ? (
                                <button onClick={() => setMobileView('menu')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
                                    <ChevronLeft size={20} /> Back
                                </button>
                            ) : (
                                <button onClick={onClose} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'}} onMouseLeave={e => {e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-secondary)'}}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Content Injection */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', minHeight: 0 }}>
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {activeTab === 'profile' && <ProfileTab />}
                                    {activeTab === 'privacy' && <PrivacyTab />}
                                    {activeTab === 'security' && <SecurityTab />}
                                    {activeTab === 'storage' && <StorageTab />}
                                    {activeTab === 'appearance' && <AppearanceSettings />}
                                    {activeTab === 'notifications' && <NotificationsTab />}
                                    {activeTab === 'help' && <HelpTab />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default FullScreenSettingsModal;
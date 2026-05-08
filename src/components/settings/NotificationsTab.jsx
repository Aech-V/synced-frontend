import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Volume2, Mail, Moon, PhoneCall, Clock, ShieldAlert, Minus, Plus } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { triggerHaptic } from '../../utils/haptics';
import { useIsMobile } from '../../hooks/useMediaQuery';

const NotificationsTab = () => {
    const user = JSON.parse(localStorage.getItem('synced_user')) || {};

    const [settings, setSettings] = useState(user.notificationSettings || {
        push: true, email: false, messageSounds: true, callSounds: true,
        dnd: { isActive: false, until: null, scope: 'global' },
        quietHours: { enabled: false, start: '22:00', end: '07:00' }
    });

    const [dndInputHours, setDndInputHours] = useState(1);
    const [dndMode, setDndMode] = useState('off'); 
    const [browserPermission, setBrowserPermission] = useState('default');

    const isMobile = useIsMobile();

    useEffect(() => {
        if ('Notification' in window) {
            setBrowserPermission(Notification.permission);
        }
        if (settings.dnd.isActive) {
            setDndMode(settings.dnd.until ? 'timer' : 'indefinite');
        }
    }, [settings.dnd]);

    const requestPushPermission = async () => {
        if (!('Notification' in window)) return alert('Your browser does not support push notifications.');
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        if (permission === 'granted') toggleSetting('push', true);
    };

    const updateBackend = async (newSettings) => {
        try {
            await apiClient.put('/users/notifications', { notificationSettings: newSettings });

            triggerHaptic('light');
            const updatedUser = { ...user, notificationSettings: newSettings };
            localStorage.setItem('synced_user', JSON.stringify(updatedUser));
            setSettings(newSettings);
        } catch (error) {
            triggerHaptic('error');
            console.error("Failed to sync notifications:", error);
        }
    };

    const toggleSetting = (key, forcedValue = null) => {
        const newSettings = { ...settings, [key]: forcedValue !== null ? forcedValue : !settings[key] };
        updateBackend(newSettings);
    };

    const applyDND = (mode) => {
        let newDnd = { isActive: true, scope: settings.dnd.scope, until: null };

        if (mode === 'off') {
            newDnd.isActive = false;
        } else if (mode === 'timer') {
            newDnd.until = new Date(Date.now() + dndInputHours * 60 * 60 * 1000);
        }

        setDndMode(mode);
        updateBackend({ ...settings, dnd: newDnd });
    };

    const toggleQuietHours = () => {
        const newSettings = {
            ...settings,
            quietHours: { ...settings.quietHours, enabled: !settings.quietHours.enabled }
        };
        updateBackend(newSettings);
    };

    const incrementTimer = () => setDndInputHours(prev => Math.min(prev + 1, 72));
    const decrementTimer = () => setDndInputHours(prev => Math.max(prev - 1, 1));

    const ToggleRow = ({ icon: Icon, title, subtitle, isChecked, onToggle }) => (
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Icon color="var(--text-secondary)" size={22} />
                <div>
                    <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '2px' }}>{title}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{subtitle}</span>
                </div>
            </div>
            <button
                onClick={onToggle}
                style={{ width: '52px', height: '30px', borderRadius: '15px', backgroundColor: isChecked ? 'var(--accent-primary)' : 'var(--border-subtle)', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}
            >
                <motion.div animate={{ x: isChecked ? 24 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ width: '26px', height: '26px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
            </button>
        </div>
    );

    return (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Notifications & Sounds</h2>

            <div style={{ backgroundColor: 'var(--bg-surface-hover)', border: settings.dnd.isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', borderRadius: '16px', padding: isMobile ? '16px' : '24px', marginBottom: '24px', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ padding: '10px', backgroundColor: settings.dnd.isActive ? 'var(--accent-primary)' : 'var(--bg-primary)', borderRadius: '12px', transition: 'all 0.3s' }}>
                        <Moon color={settings.dnd.isActive ? 'var(--accent-text)' : 'var(--text-secondary)'} size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>Do Not Disturb</span>
                        <span style={{ fontSize: '0.9rem', color: settings.dnd.isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: settings.dnd.isActive ? '600' : 'normal' }}>
                            {settings.dnd.isActive && settings.dnd.until ? `Silenced until ${new Date(settings.dnd.until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Mute all incoming alerts and calls.'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                    <button
                        onClick={() => applyDND('off')}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: dndMode === 'off' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: dndMode === 'off' ? 'var(--accent-primary)' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '0.95rem' }}
                    >
                        Off
                    </button>

                    <button
                        onClick={() => applyDND('indefinite')}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: dndMode === 'indefinite' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: dndMode === 'indefinite' ? 'var(--accent-primary)' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '0.95rem' }}
                    >
                        Until I turn it off
                    </button>

                    <div style={{ flex: isMobile ? 'none' : 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px 6px 12px', borderRadius: '12px', border: dndMode === 'timer' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={decrementTimer} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}><Minus size={16} /></button>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem', width: '60px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                {dndInputHours}
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                    hr{dndInputHours !== 1 ? 's' : ''}
                                </span>
                            </span>
                            <button onClick={incrementTimer} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}><Plus size={16} /></button>
                        </div>
                        <button onClick={() => applyDND('timer')} style={{ padding: '10px 16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, var(--bg-primary))', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: 'opacity 0.2s' }}>Set</button>
                    </div>
                </div>

                <div style={{ marginTop: '20px', padding: '14px 16px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <ShieldAlert size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <span style={{ display: 'block', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>Emergency Bypass Enabled</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>A third consecutive call from the same user within 3 minutes will bypass Do Not Disturb and ring your device.</span>
                    </div>
                </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '20px 16px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <Clock color="var(--text-secondary)" size={22} />
                        <div>
                            <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '2px' }}>Schedule Quiet Hours</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automatically engage DND during these times.</span>
                        </div>
                    </div>
                    <button onClick={toggleQuietHours} style={{ width: '52px', height: '30px', borderRadius: '15px', backgroundColor: settings.quietHours.enabled ? 'var(--accent-primary)' : 'var(--border-subtle)', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}>
                        <motion.div animate={{ x: settings.quietHours.enabled ? 24 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ width: '26px', height: '26px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
                    </button>
                </div>

                <AnimatePresence>
                    {settings.quietHours.enabled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Start Time</label>
                                    <input type="time" value={settings.quietHours.start} onChange={(e) => updateBackend({ ...settings, quietHours: { ...settings.quietHours, start: e.target.value } })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', colorScheme: 'dark', fontSize: '1rem', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>End Time</label>
                                    <input type="time" value={settings.quietHours.end} onChange={(e) => updateBackend({ ...settings, quietHours: { ...settings.quietHours, end: e.target.value } })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', colorScheme: 'dark', fontSize: '1rem', outline: 'none' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                {browserPermission !== 'granted' && (
                    <div style={{ padding: '16px 20px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}>Browser push notifications are disabled.</span>
                        <button onClick={requestPushPermission} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Enable</button>
                    </div>
                )}

                <ToggleRow icon={Bell} title="Push Notifications" subtitle="Receive OS-level alerts when backgrounded." isChecked={settings.push} onToggle={() => toggleSetting('push')} />
                <ToggleRow icon={Volume2} title="Message Sounds" subtitle="Play a sound for new text messages." isChecked={settings.messageSounds} onToggle={() => toggleSetting('messageSounds')} />
                <ToggleRow icon={PhoneCall} title="Call Ringtones" subtitle="Play a ringtone for incoming calls." isChecked={settings.callSounds} onToggle={() => toggleSetting('callSounds')} />
                <ToggleRow icon={Mail} title="Email Summaries" subtitle="Get batched emails of missed messages when offline." isChecked={settings.email} onToggle={() => toggleSetting('email')} />
            </div>
        </div>
    );
};

export default NotificationsTab;
import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, Laptop, Smartphone, Trash2, ShieldCheck, Lock, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../../utils/haptics';
import { startRegistration } from '@simplewebauthn/browser';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

// Reusable 6-Box OTP Input Component
const OTPInput = ({ value, onChange }) => {
    const inputs = useRef([]);
    const [otp, setOtp] = useState(new Array(6).fill(''));

    const handleChange = (e, index) => {
        const val = e.target.value;
        if (isNaN(val)) return;

        const newOtp = [...otp];
        newOtp[index] = val;
        setOtp(newOtp);
        onChange(newOtp.join(''));

        if (val !== '' && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '20px 0' }}>
            {otp.map((data, index) => (
                <input
                    key={index}
                    type="text"
                    maxLength="1"
                    ref={(el) => (inputs.current[index] = el)}
                    value={data}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    style={{ width: '45px', height: '55px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '12px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }}
                />
            ))}
        </div>
    );
};

const SecurityTab = () => {
    const user = JSON.parse(localStorage.getItem('synced_user')) || {};
    const currentSessionId = localStorage.getItem('synced_session_id'); // Assume saved during login

    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [twoFAEnabled, setTwoFAEnabled] = useState(user.twoFactorEnabled || false);
    const [setup2FA, setSetup2FA] = useState({ active: false, qrUrl: '', code: '' });
    const [appLockEnabled, setAppLockEnabled] = useState(user.appLock?.enabled || false);
    const [hasPasskey, setHasPasskey] = useState(user.hasPasskey || false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('synced_token');
            const res = await axios.get('http://localhost:5000/api/users/sessions', { headers: { Authorization: `Bearer ${token}` } });
            setSessions(res.data);
        } catch (error) { 
            console.error("Failed to fetch sessions"); 
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleWebAuthnRegistration = async () => {
        try {
            triggerHaptic('light');
            const token = localStorage.getItem('synced_token');
            const targetUserId = user._id || user.id; 
            
            if (!targetUserId) return alert("User session is corrupted. Please log out and log back in.");

            const optionsResp = await axios.get(`http://localhost:5000/api/auth/webauthn/generate-registration?userId=${targetUserId}`, { headers: { Authorization: `Bearer ${token}` } });
            const attResp = await startRegistration({ optionsJSON: optionsResp.data });
            await axios.post('http://localhost:5000/api/auth/webauthn/verify-registration', { userId: targetUserId, registrationResponse: attResp }, { headers: { Authorization: `Bearer ${token}` } });
            
            // --- THE FIX: Update state and local storage on success ---
            triggerHaptic('success');
            setHasPasskey(true);
            const updatedUser = { ...user, hasPasskey: true };
            localStorage.setItem('synced_user', JSON.stringify(updatedUser));
            
            alert('Passkey successfully registered!');
        } catch (err) { 
            triggerHaptic('error'); 
            console.error("[PASSKEY ERROR]:", err);
            alert('Failed to create passkey.'); 
        }
    };

    const init2FASetup = async () => {
        try {
            const token = localStorage.getItem('synced_token');
            const res = await axios.get('http://localhost:5000/api/users/security/2fa/setup', { headers: { Authorization: `Bearer ${token}` } });
            setSetup2FA({ active: true, qrUrl: res.data.otpauthUrl, code: '' });
        } catch (error) { alert("Failed to initialize 2FA"); }
    };

    const confirm2FASetup = async () => {
        if (setup2FA.code.length !== 6) return;
        try {
            const token = localStorage.getItem('synced_token');
            await axios.post('http://localhost:5000/api/users/security/2fa/enable',
                { otp: setup2FA.code },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            triggerHaptic('success');
            const updatedUser = { ...user, twoFactorEnabled: true };
            localStorage.setItem('synced_user', JSON.stringify(updatedUser));

            setTwoFAEnabled(true);
            setSetup2FA({ active: false, qrUrl: '', code: '' });
        } catch (error) {
            triggerHaptic('error');
            alert("Invalid 2FA code.");
        }
    };

    const handleDisable2FA = async () => {
        const code = window.prompt("Enter a current 6-digit Authenticator code to disable 2FA:");
        if (!code || code.length !== 6) return;

        try {
            const token = localStorage.getItem('synced_token');
            await axios.post('http://localhost:5000/api/users/security/2fa/disable',
                { otp: code },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            triggerHaptic('success');
            const updatedUser = { ...user, twoFactorEnabled: false };
            localStorage.setItem('synced_user', JSON.stringify(updatedUser));
            setTwoFAEnabled(false);
        } catch (error) {
            triggerHaptic('error');
            alert("Invalid code. 2FA was not disabled.");
        }
    };

    const handleAppLockToggle = async () => {
        const newState = !appLockEnabled;

        if (newState && !user.appLock?.pin) {
            const pin = window.prompt("Set a 4-digit fallback PIN for App Lock:");
            if (!pin || pin.length !== 4) return alert("Invalid PIN. App Lock not enabled.");
            user.appLock = { ...user.appLock, pin };
        }

        try {
            const token = localStorage.getItem('synced_token');
            await axios.put('http://localhost:5000/api/users/security/app-lock',
                { enabled: newState, pin: user.appLock?.pin },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            triggerHaptic('light');
            setAppLockEnabled(newState);
            const updatedUser = { ...user, appLock: { ...user.appLock, enabled: newState } };
            localStorage.setItem('synced_user', JSON.stringify(updatedUser));
        } catch (error) {
            alert("Failed to update App Lock.");
        }
    };

    const handleRevokeSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to log out this device?")) return;
        try {
            const token = localStorage.getItem('synced_token');
            await axios.delete(`http://localhost:5000/api/users/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
            triggerHaptic('success');
            setSessions(sessions.filter(s => s.sessionId !== sessionId));
        } catch (error) { alert("Failed to revoke session"); }
    };

    const handleRevokeAllOther = async () => {
        if (!window.confirm("This will log you out of ALL other devices. Continue?")) return;
        try {
            setLoadingSessions(true);
            const token = localStorage.getItem('synced_token');
            await axios.post('http://localhost:5000/api/users/sessions/revoke-all', { currentSessionId }, { headers: { Authorization: `Bearer ${token}` } });
            triggerHaptic('success');
            fetchSessions();
        } catch (error) { 
            alert("Failed to revoke sessions"); 
            setLoadingSessions(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Security & Sessions</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' }}>Protect your account and manage your active devices.</p>

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '32px 0 12px 16px', fontWeight: 'bold' }}>Authentication</h3>

            {/* Passkeys Engine */}
            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasPasskey ? '#10b981' : 'var(--text-primary)', transition: 'color 0.3s', flexShrink: 0 }}>
                        <Fingerprint size={24} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <div style={{ minWidth: '120px' }}>
                            <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Passkeys</h3>
                            <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Passwordless biometric login.</p>
                        </div>
                        {!hasPasskey ? (
                            <button onClick={handleWebAuthnRegistration} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}>Create</button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</span>
                                <button onClick={handleWebAuthnRegistration} style={{ padding: '6px 12px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>Add Another</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2FA Engine */}
            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}> {/* Changed to flex-start */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: twoFAEnabled ? '#10b981' : 'var(--text-secondary)', transition: 'color 0.3s', flexShrink: 0 }}>
                        <ShieldCheck size={24} />
                    </div>
                    {/* ADDED flexWrap: 'wrap' and gap: '12px' HERE */}
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <div style={{ minWidth: '120px' }}> {/* Ensures text doesn't get crushed */}
                            <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Two-Factor Auth</h3>
                            <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Use an Authenticator app.</p>
                        </div>
                        {!twoFAEnabled ? (
                            <button onClick={init2FASetup} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Enable</button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secured</span>
                                <button onClick={handleDisable2FA} style={{ padding: '6px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>Disable</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2FA Setup Wizard */}
                <AnimatePresence>
                    {setup2FA.active && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-primary)', marginBottom: '16px', fontWeight: '500' }}>1. Scan this QR Code with your Authenticator App</p>
                                <div style={{ display: 'inline-block', padding: '16px', backgroundColor: '#fff', borderRadius: '16px', marginBottom: '16px' }}>
                                    <QRCodeSVG value={setup2FA.qrUrl} size={150} />
                                </div>
                                <p style={{ color: 'var(--text-primary)', fontWeight: '500' }}>2. Enter the 6-digit code</p>
                                <OTPInput value={setup2FA.code} onChange={(code) => setSetup2FA(prev => ({ ...prev, code }))} />
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button onClick={() => setSetup2FA({ active: false, qrUrl: '', code: '' })} style={{ padding: '10px 20px', backgroundColor: 'var(--bg-surface)', border: 'none', color: 'var(--text-secondary)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={confirm2FASetup} disabled={setup2FA.code.length !== 6} style={{ padding: '10px 20px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, #111827)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: setup2FA.code.length !== 6 ? 'not-allowed' : 'pointer', opacity: setup2FA.code.length !== 6 ? 0.5 : 1 }}>Verify & Save</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* App Lock Config */}
            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-subtle)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: appLockEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }}>
                    <Lock size={24} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>App Lock</h3>
                        <div
                            onClick={handleAppLockToggle}
                            style={{
                                width: '48px', height: '26px', borderRadius: '13px',
                                backgroundColor: appLockEnabled ? 'var(--accent-primary)' : 'var(--border-subtle)',
                                position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                            }}
                        >
                            <motion.div
                                animate={{ x: appLockEnabled ? 24 : 2 }}
                                style={{ width: '22px', height: '22px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                            />
                        </div>
                    </div>
                    <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Require FaceID/Fingerprint or PIN to open Synced.</p>
                </div>
            </div>

            {/* Active Sessions UI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 12px 16px' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', margin: 0 }}>Active Devices</h3>
                {sessions.length > 1 && (
                    <button onClick={handleRevokeAllOther} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '16px' }}>
                        <LogOut size={14} /> Revoke All Other
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loadingSessions ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}>
                            <Loader2 size={28} color="var(--text-secondary)" />
                        </motion.div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No active sessions found.</div>
                ) : (
                    sessions.map(session => {
                        const isCurrent = session.sessionId === currentSessionId;
                        return (
                            <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-surface-hover)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    {session.device.toLowerCase().includes('mac') || session.device.toLowerCase().includes('windows') ? <Laptop size={24} /> : <Smartphone size={24} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{session.os}</span>
                                        {isCurrent && <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current</span>}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                        {session.device} • {new Date(session.lastActive).toLocaleDateString()}
                                    </div>
                                </div>
                                {!isCurrent && (
                                    <button onClick={() => handleRevokeSession(session.sessionId)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }} onMouseEnter={e => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'} onMouseLeave={e => e.target.style.backgroundColor = 'var(--bg-surface)'} title="Revoke Access">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default SecurityTab;
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, ShieldAlert, Key, ChevronLeft, Loader2, EyeOff } from 'lucide-react';
import { apiClient } from '../utils/api';
import { triggerHaptic } from '../utils/haptics';

const VaultModal = ({ isOpen, onClose, onRoomUnlocked }) => {
    // Vault State
    const [view, setView] = useState('list');
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Initialization
    useEffect(() => {
        if (isOpen) {
            fetchVaultRooms();
            setView('list');
            setPassword('');
            setAuthError('');
        }
    }, [isOpen]);

    // Fetch Vault Rooms
    const fetchVaultRooms = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/rooms/vault');
            setRooms(res.data);
        } catch (error) {
            console.error("Failed to fetch vault", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Unlock Sequence
    const handleUnlock = async (e) => {
        if (e) e.preventDefault();
        if (!password.trim()) return;

        setIsUnlocking(true);
        setAuthError('');
        triggerHaptic('light');

        try {
            const res = await apiClient.post('/rooms/vault/unlock', {
                roomId: selectedRoom._id,
                password: password
            });

            if (res.data.success) {
                triggerHaptic('success');
                onRoomUnlocked(res.data.room); 
                onClose(); 
            }
        } catch (error) {
            triggerHaptic('error');
            setAuthError('Access Denied: Invalid cryptographic signature.');
        } finally {
            setIsUnlocking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', maxWidth: '400px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}
                >
                    <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {view === 'unlock' && (
                                <button onClick={() => { setView('list'); setPassword(''); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            <ShieldAlert size={20} color="#ef4444" />
                            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                Secure Vault
                            </h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ padding: '24px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                        {view === 'list' && (
                            <>
                                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>
                                    These chats are encrypted and hidden from your main feed.
                                </p>
                                
                                {isLoading ? (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={32} /></motion.div>
                                    </div>
                                ) : rooms.length === 0 ? (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                        <EyeOff size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                        <span>No secret chats found.</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                                        {rooms.map(room => {
                                            return (
                                                <div 
                                                    key={room._id} 
                                                    onClick={() => { setSelectedRoom(room); setView('unlock'); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '12px', cursor: 'pointer', border: '1px solid #333' }}
                                                >
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Lock size={20} color="#ef4444" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', color: '#eee' }}>Encrypted Chat</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>ID: {room._id.substring(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        )}

                        {view === 'unlock' && selectedRoom && (
                            <form onSubmit={handleUnlock} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '2px solid #ef4444' }}>
                                        <Key size={32} color="#ef4444" />
                                    </div>
                                    <h3 style={{ color: '#eee', margin: '0 0 8px 0' }}>Authentication Required</h3>
                                    <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Enter the specific password for this chat.</p>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <input 
                                        type="password" 
                                        placeholder="Enter Vault Password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)}
                                        autoFocus
                                        style={{ width: '100%', padding: '16px', backgroundColor: '#000', border: authError ? '1px solid #ef4444' : '1px solid #333', borderRadius: '12px', color: '#eee', outline: 'none', fontSize: '1rem', textAlign: 'center', letterSpacing: '4px' }} 
                                    />
                                    {authError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>{authError}</div>}
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isUnlocking || !password}
                                    style={{ marginTop: 'auto', width: '100%', padding: '16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: isUnlocking || !password ? 'not-allowed' : 'pointer', opacity: isUnlocking || !password ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                >
                                    {isUnlocking ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={20} /></motion.div> : 'Decrypt Payload'}
                                </button>
                            </form>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VaultModal;
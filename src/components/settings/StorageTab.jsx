import React, { useState, useEffect } from 'react';
import { HardDrive, Loader2, Trash2, RefreshCw, MessageSquare, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../utils/api';
import { triggerHaptic } from '../../utils/haptics';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const StorageTab = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clearingCache, setClearingCache] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [currentNetwork, setCurrentNetwork] = useState('Checking...');

    useEffect(() => {
        fetchStorageData();
        checkNetworkStatus();
    }, []);

    const fetchStorageData = async () => {
        try {
            const res = await apiClient.get('/users/storage');
            
            setStats(res.data);
            setLoading(false);
        } catch (error) { 
            console.error("Failed to fetch storage stats", error);
            setLoading(false);
        }
    };

    const checkNetworkStatus = () => {
        if (navigator.connection) {
            const type = navigator.connection.type || navigator.connection.effectiveType;
            setCurrentNetwork(type === 'wifi' ? 'Wi-Fi Connection' : 'Cellular / 4G');
            
            if (navigator.connection.saveData) {
                setCurrentNetwork('Low Data Mode Active');
            }
        } else {
            setCurrentNetwork('Network API Unavailable');
        }
    };

    const handleClearCache = async () => {
        setClearingCache(true);
        try {
            await apiClient.post('/users/storage/clear', {});
            
            triggerHaptic('success');
            setShowModal(false);
            fetchStorageData();
        } catch (error) {
            triggerHaptic('error');
            alert('Failed to clear cache.');
        } finally {
            setClearingCache(false);
        }
    };

    if (loading || !stats) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <Loader2 size={32} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    const { 
        used, 
        totalUsed, 
        quota, 
        topRooms, 
        networkStats = { bytesSent: 0, bytesReceived: 0 } 
    } = stats;

    const vPct = (used.video / quota) * 100;
    const pPct = (used.image / quota) * 100;
    const aPct = (used.audio / quota) * 100;
    const dPct = (used.document / quota) * 100;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Storage & Network</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' }}>Manage device space and data usage.</p>

            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <div>
                        <span style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{formatBytes(totalUsed)}</span>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: '500', fontSize: '0.95rem' }}>used of {formatBytes(quota)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', width: '100%', height: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden', gap: '2px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${vPct}%` }} transition={{ duration: 1, type: 'spring' }} style={{ backgroundColor: '#3b82f6' }} title="Videos" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pPct}%` }} transition={{ duration: 1, type: 'spring', delay: 0.1 }} style={{ backgroundColor: '#8b5cf6' }} title="Photos" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${aPct}%` }} transition={{ duration: 1, type: 'spring', delay: 0.2 }} style={{ backgroundColor: '#f59e0b' }} title="Audio" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${dPct}%` }} transition={{ duration: 1, type: 'spring', delay: 0.3 }} style={{ backgroundColor: '#10b981' }} title="Documents" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>Videos <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{formatBytes(used.video)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>Photos <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{formatBytes(used.image)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>Audio <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{formatBytes(used.audio)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>Docs <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{formatBytes(used.document)}</strong></span>
                    </div>
                </div>

                <button onClick={() => setShowModal(true)} style={{ marginTop: '32px', width: '100%', padding: '14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}>
                    <Trash2 size={18} /> Clear Media Cache
                </button>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '12px', margin: 0 }}>Frees up space. Media remains safely in the cloud.</p>
            </div>

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '32px 0 12px 16px', fontWeight: 'bold' }}>Top Chats</h3>
            
            {topRooms.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    No media stored yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
                    {topRooms.map((room, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                                    <MessageSquare size={18} color="var(--text-secondary)" />
                                </div>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.05rem' }}>{room.name}</span>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{formatBytes(room.bytes)}</span>
                        </div>
                    ))}
                </div>
            )}

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '32px 0 12px 16px', fontWeight: 'bold' }}>Network Usage</h3>
            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Current Network</span>
                    <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.95rem' }}>{currentNetwork}</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
                            <ArrowUpCircle size={18} color="#3b82f6" />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Data Sent</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{formatBytes(networkStats.bytesSent)}</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
                            <ArrowDownCircle size={18} color="#8b5cf6" />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Data Received</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{formatBytes(networkStats.bytesReceived)}</span>
                </div>
                <div onClick={() => { triggerHaptic('light'); alert("Stats Reset!"); }} style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600', gap: '8px', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-primary)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <RefreshCw size={16} /> Reset Statistics
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', width: '90%', maxWidth: '360px', textAlign: 'center', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'inline-flex', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', marginBottom: '20px' }}>
                                <HardDrive size={36} />
                            </div>
                            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Clear {formatBytes(totalUsed)}?</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: '1.5' }}>
                                This will remove media from your device to save space. They will remain securely in the cloud and can be re-downloaded later.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowModal(false)} disabled={clearingCache} style={{ flex: 1, padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleClearCache} disabled={clearingCache} style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', border: 'none', color: '#fff', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                    {clearingCache ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Clear Cache'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StorageTab;
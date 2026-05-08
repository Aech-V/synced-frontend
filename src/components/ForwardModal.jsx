import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Forward, Check, AlertCircle, Loader2 } from 'lucide-react';
import { searchGlobalUsers, resolveDirectMessage } from '../utils/api';

const ForwardModal = ({ isOpen, onClose, messageToForward, availableRooms, onForward, socket }) => {
    // State Management
    const [searchQuery, setSearchQuery] = useState('');
    const [globalUsers, setGlobalUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isForwarding, setIsForwarding] = useState(false);
    const [selectedTargets, setSelectedTargets] = useState([]); 

    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};

    // Modal Reset
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setGlobalUsers([]);
            setSelectedTargets([]);
        }
    }, [isOpen]);

    // Network Search
    useEffect(() => {
        const fetchGlobal = async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const users = await searchGlobalUsers(searchQuery);
                    setGlobalUsers(users || []);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setGlobalUsers([]);
            }
        };
        const timer = setTimeout(fetchGlobal, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Local Filtering
    const localResults = useMemo(() => {
        return availableRooms.filter(room => {
            if (room.type === 'secret') return false; 
            
            let displayName = room.name;
            if (room.type === 'direct') {
                const otherUser = room.participants?.find(p => p.userId?._id !== currentUser.id && p.userId?._id !== currentUser._id)?.userId;
                displayName = otherUser?.username || 'Unknown';
            }
            return displayName.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [availableRooms, searchQuery, currentUser]);

    // Target Selection
    const toggleTarget = (target) => {
        const exists = selectedTargets.find(t => t.id === target.id);
        if (exists) {
            setSelectedTargets(prev => prev.filter(t => t.id !== target.id));
        } else {
            if (selectedTargets.length >= 5) return; 
            setSelectedTargets(prev => [...prev, target]);
        }
    };

    // Matrix Dispatch Event
    const handleForwardDispatch = async () => {
        if (!socket || selectedTargets.length === 0) return;
        setIsForwarding(true);

        try {
            const targetRoomIds = await Promise.all(selectedTargets.map(async (target) => {
                if (target.type === 'user') {
                    const res = await resolveDirectMessage(target.id);
                    return res.room._id; 
                }
                return target.id;
            }));

            socket.emit('forward_message', {
                messageId: messageToForward._id,
                targetRoomIds
            }, (response) => {
                if (response.success) {
                    if (onForward) onForward();
                    onClose();
                } else {
                    console.error("Forwarding Error:", response.error);
                }
            });
        } catch (error) {
            console.error("Dispatch resolution failed:", error);
        } finally {
            setIsForwarding(false);
        }
    };

    if (!isOpen || !messageToForward) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-surface)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                >
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Forward size={24} color="var(--text-primary)" />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Forward Message</h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                    </div>

                    <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {selectedTargets.length === 5 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                <AlertCircle size={16} /> You can only forward to up to 5 chats at once.
                            </div>
                        )}

                        {selectedTargets.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                {selectedTargets.map(t => (
                                    <div key={t.id} onClick={() => toggleTarget(t)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', borderRadius: '16px', cursor: 'pointer' }}>
                                        <img src={t.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{t.name}</span>
                                        <X size={12} color="var(--text-secondary)" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                            <Search size={18} color="var(--text-secondary)" />
                            <input
                                placeholder="Search recent chats or global network..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', marginLeft: '12px', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {localResults.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recent Chats</span>
                                    {localResults.map(room => {
                                        const isChannel = room.type === 'channel';
                                        let displayName = room.name;
                                        let avatar = `https://ui-avatars.com/api/?name=${room.name}&background=random`;
                                        
                                        if (room.type === 'direct') {
                                            const otherUser = room.participants?.find(p => p.userId?._id !== currentUser.id && p.userId?._id !== currentUser._id)?.userId;
                                            displayName = otherUser?.username;
                                            avatar = otherUser?.avatar || `https://ui-avatars.com/api/?name=${displayName}&background=random`;
                                        }

                                        const isSelected = selectedTargets.some(t => t.id === room._id);
                                        const targetObj = { id: room._id, type: 'room', name: isChannel ? `# ${displayName}` : displayName, avatar };

                                        return (
                                            <div key={room._id} onClick={() => toggleTarget(targetObj)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: isChannel ? '25%' : '50%', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                                    {isChannel ? <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>#</div> : <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                </div>
                                                <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text-primary)' }}>{targetObj.name}</span>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent', borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)' }}>
                                                    {isSelected && <Check size={12} color="var(--accent-text)" />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {globalUsers.length > 0 && (
                                <div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Global Network</span>
                                    {globalUsers.map(user => {
                                        const isSelected = selectedTargets.some(t => t.id === user._id);
                                        const targetObj = { id: user._id, type: 'user', name: user.username, avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random` };

                                        return (
                                            <div key={user._id} onClick={() => toggleTarget(targetObj)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent' }}>
                                                <img src={targetObj.avatar} alt={user.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.username}</span>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent', borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)' }}>
                                                    {isSelected && <Check size={12} color="var(--accent-text)" />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            
                            {isSearching && <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Loader2 className="spinner" color="var(--text-secondary)" /></div>}
                        </div>

                        {selectedTargets.length > 0 && (
                            <button disabled={isForwarding} onClick={handleForwardDispatch} style={{ marginTop: '16px', width: '100%', padding: '16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: isForwarding ? 'wait' : 'pointer', opacity: isForwarding ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {isForwarding ? <Loader2 className="spinner" size={20} /> : <Forward size={20} />} 
                                Forward to {selectedTargets.length} chat{selectedTargets.length > 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ForwardModal;
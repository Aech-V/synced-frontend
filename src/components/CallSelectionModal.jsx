import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Phone, Video, Mic, Monitor, Check, Loader2 } from 'lucide-react';
import { searchGlobalUsers } from '../utils/api';

const CallSelectionModal = ({ isOpen, action, onClose, availableRooms, onExecuteCall }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [globalUsers, setGlobalUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedTargets, setSelectedTargets] = useState([]); 

    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};

    // Determine Mode
    const isGroupCall = action === 'START_VOICE_HUDDLE' || action === 'INITIATE_VIDEO_MEETING';
    const isVideo = action === 'START_VIDEO_CALL' || action === 'INITIATE_VIDEO_MEETING';

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setGlobalUsers([]);
            setSelectedTargets([]);
        }
    }, [isOpen]);

    // Global Search Engine (Debounced)
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

    // Filter Local Rooms
    const localResults = useMemo(() => {
        return availableRooms.filter(room => {
            if (room.type === 'secret') return false; // Vault isolation
            // For 1-on-1 calls, only show direct messages
            if (!isGroupCall && room.type !== 'direct') return false;
            
            let displayName = room.name;
            if (room.type === 'direct') {
                const otherUser = room.participants?.find(p => p.userId?._id !== currentUser.id && p.userId?._id !== currentUser._id)?.userId;
                displayName = otherUser?.username || 'Unknown';
            }
            return displayName.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [availableRooms, searchQuery, currentUser, isGroupCall]);

    const handleTargetClick = (target) => {
        if (!isGroupCall) {
            // 1-on-1 instantly executes the call
            onExecuteCall([target], action);
        } else {
            // Multi-select for Huddles/Meetings
            const exists = selectedTargets.find(t => t.id === target.id);
            if (exists) {
                setSelectedTargets(prev => prev.filter(t => t.id !== target.id));
            } else {
                setSelectedTargets(prev => [...prev, target]);
            }
        }
    };

    if (!isOpen) return null;

    const getHeaderIcon = () => {
        if (action === 'START_VOICE_CALL') return <Phone size={24} color="var(--text-primary)" />;
        if (action === 'START_VIDEO_CALL') return <Video size={24} color="var(--text-primary)" />;
        if (action === 'START_VOICE_HUDDLE') return <Mic size={24} color="var(--text-primary)" />;
        return <Monitor size={24} color="var(--text-primary)" />;
    };

    const getHeaderTitle = () => {
        if (action === 'START_VOICE_CALL') return 'Start Voice Call';
        if (action === 'START_VIDEO_CALL') return 'Start Video Call';
        if (action === 'START_VOICE_HUDDLE') return 'Start Voice Huddle';
        return 'Initiate Video Meeting';
    };

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
                    {/* Header */}
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {getHeaderIcon()}
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{getHeaderTitle()}</h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                    </div>

                    <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {isGroupCall && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '16px' }}>Select multiple participants to invite to this {isVideo ? 'meeting' : 'huddle'}.</p>}

                        {/* Search Input */}
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                            <Search size={18} color="var(--text-secondary)" />
                            <input
                                placeholder="Search contacts..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', marginLeft: '12px', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Target List */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Local Rooms / Friends */}
                            {localResults.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recent Chats</span>
                                    {localResults.map(room => {
                                        const isChannel = room.type === 'channel' || room.type === 'group';
                                        let displayName = room.name;
                                        let avatar = `https://ui-avatars.com/api/?name=${room.name}&background=random`;
                                        let targetId = room._id;
                                        
                                        if (room.type === 'direct') {
                                            const otherUser = room.participants?.find(p => p.userId?._id !== currentUser.id && p.userId?._id !== currentUser._id)?.userId;
                                            displayName = otherUser?.username;
                                            avatar = otherUser?.avatar || `https://ui-avatars.com/api/?name=${displayName}&background=random`;
                                            targetId = otherUser?._id;
                                        }

                                        const isSelected = selectedTargets.some(t => t.id === targetId);
                                        const targetObj = { id: targetId, roomId: room._id, type: isChannel ? 'room' : 'user', name: isChannel ? `# ${displayName}` : displayName, avatar };

                                        return (
                                            <div key={room._id} onClick={() => handleTargetClick(targetObj)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent' }}>
                                                <img src={avatar} alt={displayName} style={{ width: '40px', height: '40px', borderRadius: isChannel ? '25%' : '50%', objectFit: 'cover' }} />
                                                <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text-primary)' }}>{targetObj.name}</span>
                                                {isGroupCall && (
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent', borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)' }}>
                                                        {isSelected && <Check size={12} color="var(--accent-text)" />}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Global Users */}
                            {!isGroupCall && globalUsers.length > 0 && (
                                <div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Global Network</span>
                                    {globalUsers.map(user => {
                                        const targetObj = { id: user._id, type: 'user', name: user.username, avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random` };
                                        return (
                                            <div key={user._id} onClick={() => handleTargetClick(targetObj)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>
                                                <img src={targetObj.avatar} alt={user.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.username}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Execute Group Call Button */}
                        {isGroupCall && selectedTargets.length > 0 && (
                            <button onClick={() => onExecuteCall(selectedTargets, action)} style={{ marginTop: '16px', width: '100%', padding: '16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {isVideo ? <Monitor size={20} /> : <Mic size={20} />} Start {isVideo ? 'Meeting' : 'Huddle'} ({selectedTargets.length})
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CallSelectionModal;
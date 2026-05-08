import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MessageSquare, Hash, Users, Lock, Rss, ChevronLeft, Check, UserPlus } from 'lucide-react';
import axios from 'axios';
import { triggerHaptic } from '../utils/haptics';

const NewChatModal = ({ isOpen, onClose, initialMode = 'menu', onRoomCreated }) => {
    const [view, setView] = useState(initialMode); // 'menu', 'direct', 'channel', 'group', 'secret', 'broadcast'
    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};
    const token = localStorage.getItem('synced_token');

    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Channel / Secret State
    const [channelData, setChannelData] = useState({ name: '', description: '', avatar: '' });
    const [secretPassword, setSecretPassword] = useState('');

    // --- DEBOUNCED AUTO-SEARCH ENGINE ---
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await axios.get(`http://localhost:5000/api/users/search?q=${searchQuery}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Filter out the current user!
                const filtered = res.data.filter(u => u._id !== currentUser.id && u._id !== currentUser._id);
                setSearchResults(filtered);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 400); // 400ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, token, currentUser.id, currentUser._id]);

    // --- RESET STATE ON CLOSE ---
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setView(initialMode);
                setSearchQuery('');
                setSearchResults([]);
                setSelectedUsers([]);
                setChannelData({ name: '', description: '', avatar: '' });
                setSecretPassword('');
            }, 300);
        } else {
            setView(initialMode);
        }
    }, [isOpen, initialMode]);

    // --- CREATION HANDLER ---
    const handleCreate = async (targetUser = null) => {
        triggerHaptic('success');
        let payload = { type: view };

        // Process Payload based on view type
        if (view === 'direct') {
            payload.targetUserIds = [targetUser._id];
        } else if (view === 'secret') {
            if (!secretPassword) return alert("Password is required for Secret Chats.");
            payload.targetUserIds = [targetUser._id];
            payload.password = secretPassword;
        } else if (view === 'group' || view === 'broadcast') {
            if (selectedUsers.length === 0) return;
            if (view === 'broadcast' && selectedUsers.length > 50) return alert("Max 50 users for a broadcast.");
            payload.targetUserIds = selectedUsers.map(u => u._id);
            payload.name = channelData.name || 'New Group';
            payload.avatar = channelData.avatar;
        } else if (view === 'channel') {
            if (!channelData.name) return alert("Channel name is required.");
            payload.name = channelData.name;
            payload.description = channelData.description;
            payload.avatar = channelData.avatar;
        }

        try {
            const endpoint = view === 'broadcast' ? '/api/rooms/broadcast' : '/api/rooms/create';
            const res = await axios.post(`http://localhost:5000${endpoint}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Pass the new/existing room back to the main app to route the user
            if (view !== 'broadcast') {
                onRoomCreated(res.data.room);
            } else {
                alert(res.data.message); // Tell user broadcast succeeded
            }
            onClose();

        } catch (error) {
            console.error("Creation failed", error);
            triggerHaptic('error');
            alert("Failed to create chat. Check network.");
        }
    };

    // --- SUB-COMPONENTS FOR CLEAN UI ---
    const renderMenu = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
                { id: 'direct', icon: <MessageSquare size={20} />, title: 'New Direct Message', subtitle: 'Start a 1-on-1 conversation' },
                { id: 'channel', icon: <Hash size={20} />, title: 'Create Public Channel', subtitle: 'Unlimited members, admin-only posting' },
                { id: 'group', icon: <Users size={20} />, title: 'Create Private Group', subtitle: 'Interactive 2-way chat for selected members' },
                { id: 'secret', icon: <Lock size={20} />, title: 'Initiate Secret Chat', subtitle: 'Password protected, hidden, ephemeral' },
                { id: 'broadcast', icon: <Rss size={20} />, title: 'Draft Broadcast', subtitle: 'Send a single message to up to 50 DMs silently' }
            ].map(item => (
                <div key={item.id} onClick={() => setView(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '12px', cursor: 'pointer' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.icon}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.subtitle}</div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderUserList = () => (
        <div style={{ marginTop: '16px', flex: 1, overflowY: 'auto' }}>
            {searchQuery && searchResults.length === 0 && !isSearching && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <UserPlus size={48} color="var(--border-subtle)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No users found</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>We couldn't find anyone matching "{searchQuery}".</p>
                    <button style={{ padding: '8px 16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Invite to Synced</button>
                </div>
            )}

            {searchResults.map(user => {
                const isSelected = selectedUsers.some(u => u._id === user._id);
                return (
                    <div
                        key={user._id}
                        onClick={() => {
                            if (view === 'direct' || view === 'secret') handleCreate(user);
                            else {
                                if (isSelected) setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
                                else setSelectedUsers([...selectedUsers, user]);
                            }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent' }}
                    >
                        <div style={{ position: 'relative' }}>
                            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`} alt={user.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                            {user.isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', backgroundColor: '#10b981', border: '2px solid var(--bg-surface)', borderRadius: '50%' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.username}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.about || 'Available'}</div>
                        </div>
                        {(view === 'group' || view === 'broadcast') && (
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent', borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)' }}>
                                {isSelected && <Check size={12} color="var(--accent-text)" />}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                onClick={onClose} // Close on background click
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
                    style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-surface)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                >
                    {/* Header */}
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {view !== 'menu' && (
                                <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                {view === 'menu' ? 'New Chat' :
                                    view === 'direct' ? 'New Message' :
                                        view === 'channel' ? 'New Channel' :
                                            view === 'group' ? 'New Group' :
                                                view === 'secret' ? 'Secret Chat' : 'Broadcast'}
                            </h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {view === 'menu' && renderMenu()}

                        {/* Search & Selection Mode (DM, Group, Broadcast, Secret) */}
                        {['direct', 'group', 'broadcast', 'secret'].includes(view) && (
                            <>
                                {view === 'secret' && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>VAULT PASSWORD</label>
                                        <input
                                            type="password" placeholder="Set a password for this chat..." value={secretPassword} onChange={e => setSecretPassword(e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', marginBottom: '16px' }}
                                        />
                                    </div>
                                )}

                                {/* Selected Chips for Groups/Broadcasts */}
                                {(view === 'group' || view === 'broadcast') && selectedUsers.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                        {selectedUsers.map(u => (
                                            <div key={u._id} onClick={() => setSelectedUsers(selectedUsers.filter(su => su._id !== u._id))} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px 4px 4px', backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', borderRadius: '16px', cursor: 'pointer' }}>
                                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{u.username}</span>
                                                <X size={12} color="var(--text-secondary)" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                    <Search size={18} color="var(--text-secondary)" />
                                    <input
                                        type="text" placeholder={`Search global network...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ flex: 1, border: 'none', background: 'none', outline: 'none', marginLeft: '12px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                {renderUserList()}

                                {(view === 'group' || view === 'broadcast') && selectedUsers.length > 0 && (
                                    <button onClick={() => handleCreate()} style={{ marginTop: '16px', width: '100%', padding: '16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                                        Create {view === 'group' ? 'Group' : 'Broadcast'} ({selectedUsers.length})
                                    </button>
                                )}
                            </>
                        )}

                        {/* Channel Creation Form */}
                        {view === 'channel' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>CHANNEL NAME</label>
                                    <input type="text" placeholder="e.g. Engineering Updates" value={channelData.name} onChange={e => setChannelData({ ...channelData, name: e.target.value })} style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>DESCRIPTION (Optional)</label>
                                    <textarea placeholder="What is this channel about?" value={channelData.description} onChange={e => setChannelData({ ...channelData, description: e.target.value })} style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px' }} />
                                </div>
                                <button onClick={() => handleCreate()} style={{ marginTop: 'auto', width: '100%', padding: '16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                                    Create Public Channel
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NewChatModal;
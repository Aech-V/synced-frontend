import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Eye, ShieldAlert, UserX, ChevronRight, X, Search, Unlock, Ban, Clock, CheckCircle2, Loader2, ChevronDown, Check, MinusCircle } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { triggerHaptic } from '../../utils/haptics';
import { useIsMobile } from '../../hooks/useMediaQuery';

const getExclusionField = (field) => {
    switch (field) {
        case 'lastSeen': return 'exclusionList';
        case 'profilePhoto': return 'profilePhotoExclusions';
        case 'groupAdds': return 'groupAddExclusions';
        default: return null;
    }
};

const PrivacyDropdownRow = ({ label, description, field, icon: Icon, value, onChange, onOpenExclusion }) => {
    const [isOpen, setIsOpen] = useState(false);

    const OPTIONS = [
        { id: 'everyone', label: 'Everyone' },
        { id: 'contacts', label: 'My Contacts' },
        { id: 'except', label: 'Contacts Except...' },
        { id: 'nobody', label: 'Nobody' }
    ];

    return (
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, paddingRight: '16px' }}>
                    <div style={{ marginTop: '2px', color: 'var(--text-secondary)' }}><Icon size={18} /></div>
                    <div>
                        <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>{label}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', display: 'block' }}>{description}</span>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', minWidth: '150px', transition: 'border-color 0.2s' }}
                    >
                        {OPTIONS.find(opt => opt.id === value)?.label || 'Select'} <ChevronDown size={14} />
                    </button>

                    {isOpen && <div style={{ position: 'fixed', inset: '-100vh -100vw', zIndex: 40 }} onClick={() => setIsOpen(false)} />}

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                                style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 50, minWidth: '180px', overflow: 'hidden' }}
                            >
                                {OPTIONS.map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => { 
                                            onChange(field, opt.id); 
                                            setIsOpen(false);
                                            if (opt.id === 'except') onOpenExclusion();
                                        }}
                                        style={{ padding: '12px 16px', fontSize: '0.85rem', color: opt.id === value ? 'var(--accent-primary)' : 'var(--text-primary)', cursor: 'pointer', backgroundColor: opt.id === value ? 'var(--bg-surface-hover)' : 'transparent', transition: 'background-color 0.2s', fontWeight: opt.id === value ? 'bold' : 'normal' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-surface-hover)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = opt.id === value ? 'var(--bg-surface-hover)' : 'transparent'}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {value === 'except' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(252, 203, 6, 0.08)', border: '1px solid rgba(252, 203, 6, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Manage your exclusion list for this setting.</span>
                            <button onClick={onOpenExclusion} style={{ padding: '6px 12px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, #111827)', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1}>Edit List</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PrivacyTab = () => {
    const user = JSON.parse(localStorage.getItem('synced_user')) || {};
    
    const [privacySettings, setPrivacySettings] = useState(user.privacySettings || {
        lastSeen: 'contacts',
        exclusionList: [],
        profilePhoto: 'everyone',
        profilePhotoExclusions: [],
        groupAdds: 'everyone',
        groupAddExclusions: [],
        readReceipts: true
    });
    
    const [showBlockedManager, setShowBlockedManager] = useState(false);
    const [exclusionConfig, setExclusionConfig] = useState(null); 
    const isMobile = useIsMobile();

    const updateBackend = async (field, value) => {
        const newSettings = { ...privacySettings, [field]: value };
        setPrivacySettings(newSettings); 

        try {
            const response = await apiClient.put('/users/privacy', newSettings);
            
            triggerHaptic('light');
            if (field === 'profilePhoto') {
                window.dispatchEvent(new CustomEvent('privacy_photo_changed', { detail: value }));
            }
            
            const updatedUser = { ...user, privacySettings: response.data.privacySettings };
            localStorage.setItem('synced_user', JSON.stringify(updatedUser));
        } catch (error) {
            triggerHaptic('error');
            console.error("Failed to sync privacy settings:", error);
        }
    };

    const openExclusionManager = (field, label) => {
        setExclusionConfig({ field, label });
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Privacy Engine</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' }}>Control your digital footprint and who can interact with you.</p>

            <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                <PrivacyDropdownRow label="Last Seen & Online" description="Who can see when you were last active." field="lastSeen" icon={Clock} value={privacySettings.lastSeen} onChange={updateBackend} onOpenExclusion={() => openExclusionManager('lastSeen', 'Last Seen & Online')} />
                <PrivacyDropdownRow label="Profile Photo" description="Who can see your avatar." field="profilePhoto" icon={Eye} value={privacySettings.profilePhoto} onChange={updateBackend} onOpenExclusion={() => openExclusionManager('profilePhoto', 'Profile Photo')} />
                <PrivacyDropdownRow label="Groups" description="Who can add you to group chats without an invite link." field="groupAdds" icon={Users} value={privacySettings.groupAdds} onChange={updateBackend} onOpenExclusion={() => openExclusionManager('groupAdds', 'Groups')} />

                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ marginTop: '2px', color: 'var(--text-secondary)' }}><CheckCircle2 size={18} /></div>
                        <div>
                            <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>Read Receipts</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>If turned off, you won't send or receive read receipts.</span>
                        </div>
                    </div>
                    <button
                        onClick={() => updateBackend('readReceipts', !privacySettings.readReceipts)}
                        style={{ width: '48px', height: '28px', borderRadius: '14px', backgroundColor: privacySettings.readReceipts ? 'var(--accent-primary)' : 'var(--bg-surface)', border: `1px solid ${privacySettings.readReceipts ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <motion.div animate={{ x: privacySettings.readReceipts ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ width: '22px', height: '22px', backgroundColor: privacySettings.readReceipts ? '#000' : 'var(--text-secondary)', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </button>
                </div>
            </div>

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '32px 0 12px 16px', fontWeight: 'bold' }}>Security</h3>
            <div onClick={() => setShowBlockedManager(true)} style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}><UserX size={20} color="#ef4444" /></div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.05rem' }}>Blocked Contacts</span>
                </div>
                <ChevronRight size={20} color="var(--text-secondary)" />
            </div>

            <AnimatePresence>
                {showBlockedManager && <BlockedContactsManager isMobile={isMobile} onClose={() => setShowBlockedManager(false)} />}
                {exclusionConfig && (
                    <ExclusionManagerModal 
                        isMobile={isMobile} 
                        config={exclusionConfig} 
                        currentList={privacySettings[getExclusionField(exclusionConfig.field)] || []}
                        onSave={(newList) => {
                            updateBackend(getExclusionField(exclusionConfig.field), newList);
                            setExclusionConfig(null);
                        }}
                        onClose={() => setExclusionConfig(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const ExclusionManagerModal = ({ isMobile, config, currentList, onSave, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [localExcludedIds, setLocalExcludedIds] = useState([...currentList]);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 3) { setSearchResults([]); return; }
        try {
            const res = await apiClient.get(`/users/search?q=${query}`);
            setSearchResults(res.data);
        } catch (error) { console.error(error); }
    };

    const toggleExclusion = (userId) => {
        triggerHaptic('light');
        if (localExcludedIds.includes(userId)) {
            setLocalExcludedIds(prev => prev.filter(id => id !== userId));
        } else {
            setLocalExcludedIds(prev => [...prev, userId]);
        }
    };

    const modalStyle = isMobile ? {
        position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: 'var(--bg-primary)', zIndex: 9999, display: 'flex', flexDirection: 'column', borderRadius: 0
    } : {
        position: 'fixed', top: '50%', left: '50%', width: '90%', maxWidth: '500px', height: '80vh', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden'
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: isMobile ? 'transparent' : 'rgba(0,0,0,0.6)', backdropFilter: isMobile ? 'none' : 'blur(4px)' }}>
            <motion.div initial={isMobile ? { x: '100%', y: 0 } : { scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }} animate={isMobile ? { x: 0, y: 0 } : { scale: 1, opacity: 1, x: '-50%', y: '-50%' }} exit={isMobile ? { x: '100%', y: 0 } : { scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={modalStyle}>
                
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ backgroundColor: 'rgba(252, 203, 6, 0.1)', padding: '8px', borderRadius: '50%' }}><MinusCircle size={20} color="var(--accent-primary)" /></div>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Exclude from</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{config.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-surface-hover)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="text" placeholder="Search contacts to exclude..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 40px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }} />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: 'var(--bg-primary)' }}>
                    {searchResults.length === 0 && searchQuery.length < 3 ? (
                        <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-secondary)' }}>
                            <Users size={48} opacity={0.2} style={{ marginBottom: '16px' }} />
                            <p style={{ margin: 0 }}>Search for users to add to your exclusion list.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Currently excluding {localExcludedIds.length} user(s).</p>
                        </div>
                    ) : (
                        searchResults.map(u => {
                            const isExcluded = localExcludedIds.includes(u._id);
                            return (
                                <div key={u._id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>@{u.username}</span>
                                    </div>
                                    <button onClick={() => toggleExclusion(u._id)} style={{ padding: '6px 12px', backgroundColor: isExcluded ? 'var(--bg-surface-hover)' : 'var(--accent-primary)', color: isExcluded ? 'var(--text-secondary)' : 'var(--accent-text, #111827)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isExcluded ? <><Check size={14} /> Excluded</> : 'Exclude'}
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
                
                <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}>
                    <button onClick={() => onSave(localExcludedIds)} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, #111827)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        Save Exclusion List
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const BlockedContactsManager = ({ isMobile, onClose }) => {
    const [blockedList, setBlockedList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlockedContacts();
    }, []);

    const fetchBlockedContacts = async () => {
        try {
            const res = await apiClient.get('/users/blocked');
            setBlockedList(res.data);
            setLoading(false);
        } catch (error) { console.error("Failed to load blocked list", error); }
    };

    const searchToBlock = async (query) => {
        setSearchQuery(query);
        if (query.length < 3) { setSearchResults([]); return; }
        try {
            const res = await apiClient.get(`/users/search?q=${query}`);
            const filtered = res.data.filter(u => !blockedList.some(b => b.userId._id === u._id));
            setSearchResults(filtered);
        } catch (error) { console.error(error); }
    };

    const handleBlock = async (targetUserId) => {
        try {
            await apiClient.post('/users/block', { targetUserId });
            triggerHaptic('success');
            setSearchQuery('');
            setSearchResults([]);
            fetchBlockedContacts(); 
        } catch (error) { alert(error.response?.data?.error || "Failed to block."); }
    };

    const handleUnblock = async (targetUserId, username) => {
        if (!window.confirm(`Are you sure you want to unblock @${username}? They will be able to message and call you again.`)) return;
        try {
            await apiClient.post('/users/unblock', { targetUserId });
            triggerHaptic('success');
            setBlockedList(prev => prev.filter(b => b.userId._id !== targetUserId));
        } catch (error) { alert("Failed to unblock."); }
    };

    const modalStyle = isMobile ? {
        position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: 'var(--bg-primary)', zIndex: 9999, display: 'flex', flexDirection: 'column', borderRadius: 0
    } : {
        position: 'fixed', top: '50%', left: '50%', width: '90%', maxWidth: '500px', height: '80vh', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden'
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: isMobile ? 'transparent' : 'rgba(0,0,0,0.6)', backdropFilter: isMobile ? 'none' : 'blur(4px)' }}>
            <motion.div initial={isMobile ? { x: '100%', y: 0 } : { scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }} animate={isMobile ? { x: 0, y: 0 } : { scale: 1, opacity: 1, x: '-50%', y: '-50%' }} exit={isMobile ? { x: '100%', y: 0 } : { scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={modalStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '50%' }}><ShieldAlert size={20} color="#ef4444" /></div>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Blocked Contacts</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-surface-hover)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="text" placeholder="Search username to block..." value={searchQuery} onChange={(e) => searchToBlock(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 40px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }} />
                    </div>
                    {searchResults.length > 0 && (
                        <div style={{ marginTop: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)', maxHeight: '200px', overflowY: 'auto' }}>
                            {searchResults.map(u => (
                                <div key={u._id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>@{u.username}</span>
                                    </div>
                                    <button onClick={() => handleBlock(u._id)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Ban size={14} /> Block</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: 'var(--bg-primary)' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}><Loader2 size={24} color="var(--text-secondary)" /></motion.div>
                        </div>
                    ) : blockedList.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-secondary)' }}>
                            <ShieldAlert size={48} opacity={0.2} style={{ marginBottom: '16px' }} />
                            <p style={{ margin: 0 }}>You haven't blocked anyone.</p>
                        </div>
                    ) : (
                        blockedList.map((block) => (
                            <div key={block.userId._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '12px', marginBottom: '8px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <img src={block.userId.avatar || `https://ui-avatars.com/api/?name=${block.userId.username}`} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem' }}>@{block.userId.username}</span>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>Blocked on {new Date(block.blockedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleUnblock(block.userId._id, block.userId.username)} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s' }} onMouseEnter={e => e.target.style.backgroundColor = 'var(--bg-primary)'} onMouseLeave={e => e.target.style.backgroundColor = 'var(--bg-surface)'}>
                                    <Unlock size={14} /> Unblock
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default PrivacyTab;
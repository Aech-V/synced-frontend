import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, User as UserIcon, FileText, Lock, MessageSquare, Plus } from 'lucide-react';
import { searchGlobalUsers, searchMessages, searchFiles } from '../../utils/api';

const SearchSkeleton = () => (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {[1, 2, 3].map(i => (
            <motion.div key={i} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ width: '30%', height: '12px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '4px' }} />
                    <div style={{ width: '70%', height: '10px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '4px' }} />
                </div>
            </motion.div>
        ))}
    </div>
);

const SearchAndFilter = ({
    searchQuery, setSearchQuery,
    isSearchFocused, setIsSearchFocused,
    isSearching, debouncedQuery,
    activeFilter, setActiveFilter, onGlobalAction,
    rooms, setCurrentRoom, searchInputRef
}) => {
    const [globalUsers, setGlobalUsers] = useState([]);
    const [globalMsgs, setGlobalMsgs] = useState([]);
    const [globalFiles, setGlobalFiles] = useState([]);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};

    // ==========================================
    // 1. AUTO-QUERY ENGINE
    // ==========================================
    useEffect(() => {
        if (debouncedQuery.trim().length > 2 && debouncedQuery !== '/vault') {
            setIsGlobalLoading(true);
            Promise.all([
                searchGlobalUsers(debouncedQuery),
                searchMessages(debouncedQuery),
                searchFiles(debouncedQuery)
            ]).then(([users, msgs, files]) => {
                setGlobalUsers(users || []);
                setGlobalMsgs(msgs || []);
                setGlobalFiles(files || []);
            }).catch(err => console.error("Search failed:", err))
                .finally(() => setIsGlobalLoading(false));
        } else {
            setGlobalUsers([]);
            setGlobalMsgs([]);
            setGlobalFiles([]);
        }
        setActiveIndex(-1); // Reset keyboard nav
    }, [debouncedQuery]);

    // ==========================================
    // 2. DATA FILTERING & FLATTENING (For Keyboard Nav)
    // ==========================================
    const localContacts = useMemo(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) return [];
        const lowerQ = debouncedQuery.toLowerCase();
        return rooms.filter(r => {
            const name = r.type === 'direct' ? r.participants?.find(p => p.userId?._id !== currentUser.id && p.userId?._id !== currentUser._id)?.userId?.username : r.name;
            return name?.toLowerCase().includes(lowerQ);
        }).slice(0, 3);
    }, [rooms, debouncedQuery, currentUser]);

    // Exclude users already in local contacts from the Global Network list
    const filteredGlobalUsers = useMemo(() => {
        const localNames = localContacts.map(c => c.type === 'direct' ? c.participants.find(p => p.userId?._id !== currentUser.id)?.userId?.username : c.name);
        return globalUsers.filter(gu => !localNames.includes(gu.username)).slice(0, 5);
    }, [globalUsers, localContacts, currentUser]);

    const flatResults = useMemo(() => {
        const results = [];
        localContacts.forEach(c => results.push({ type: 'local', data: c }));
        filteredGlobalUsers.forEach(u => results.push({ type: 'global', data: u }));
        globalMsgs.forEach(m => results.push({ type: 'message', data: m }));
        globalFiles.forEach(f => results.push({ type: 'file', data: f }));
        return results;
    }, [localContacts, filteredGlobalUsers, globalMsgs, globalFiles]);

    // ==========================================
    // 3. SMART ROUTING & KEYBOARD HANDLERS
    // ==========================================
    const handleSelect = (item) => {
        if (item.type === 'local') {
            setCurrentRoom(item.data.name);
        } else if (item.type === 'global') {
            onGlobalAction('OPEN_PROFILE', item.data);
        } else if (item.type === 'message' || item.type === 'file') {
            setCurrentRoom(item.data.roomId.name);
        }
        setIsSearchFocused(false);
        setSearchQuery('');
    };

    const handleKeyDown = (e) => {
        if (!isSearchFocused || flatResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % flatResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < flatResults.length) {
                handleSelect(flatResults[activeIndex]);
            }
        }
    };

    // ==========================================
    // 4. RENDERERS
    // ==========================================
    const renderCategory = (title, items, type) => {
        if (!items || items.length === 0) return null;
        return (
            <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{title}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {items.map((item, idx) => {
                        const globalIndex = flatResults.findIndex(fr => fr.type === type && fr.data._id === item._id);
                        const isActive = activeIndex === globalIndex;

                        return (
                            <div
                                key={item._id || idx}
                                onClick={() => handleSelect({ type, data: item })}
                                onMouseEnter={() => setActiveIndex(globalIndex)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    backgroundColor: isActive ? 'var(--bg-surface-hover)' : 'transparent',
                                    border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                                    transition: 'all 0.1s'
                                }}
                            >
                                {type === 'local' || type === 'global' ? (
                                    <>
                                        <img src={item.avatar || `https://ui-avatars.com/api/?name=${item.username || item.name}&background=random`} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        <div style={{ flex: 1, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                            {item.username || (item.type === 'direct' ? item.participants.find(p => p.userId?._id !== currentUser.id)?.userId?.username : item.name)}
                                        </div>
                                    </>
                                ) : type === 'message' ? (
                                    <>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><MessageSquare size={16} /></div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.senderId?.username} in #{item.roomId?.name}</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><FileText size={16} /></div>
                                        <div style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.text || 'Media Attachment'}</div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {items.length >= 5 && (
                        <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', cursor: 'pointer' }}>
                            + View more {title.toLowerCase()}...
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <AnimatePresence>
                {isSearchFocused && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsSearchFocused(false)}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 40 }}
                    />
                )}
            </AnimatePresence>

            <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', padding: '16px 24px', zIndex: 50, borderBottom: isSearchFocused ? 'none' : '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <motion.div layout style={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', border: isSearchFocused ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 12px', transition: 'border-color 0.2s', overflow: 'hidden' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px', flexShrink: 0 }} />
                        <input
                            ref={searchInputRef}
                            placeholder="Search network, messages, and files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onKeyDown={handleKeyDown}
                            style={{ width: '100%', padding: '12px 0', backgroundColor: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <AnimatePresence>
                            {isGlobalLoading && (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} style={{ display: 'flex', color: 'var(--text-secondary)' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={16} /></motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <AnimatePresence>
                        {isSearchFocused && (
                            <motion.button
                                initial={{ opacity: 0, width: 0, x: 20 }} animate={{ opacity: 1, width: 'auto', x: 0 }} exit={{ opacity: 0, width: 0, x: 20 }}
                                onClick={() => { setIsSearchFocused(false); setSearchQuery(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', padding: 0, flexShrink: 0 }}
                            >
                                Cancel
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {!isSearchFocused && (
                        <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto', marginTop: '12px' }} exit={{ opacity: 0, y: 10, height: 0, marginTop: 0 }} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                            {['All', 'Unread', 'Channels', 'DMs'].map(filter => (
                                <div 
                                    key={filter} 
                                    // FIX: Removed triggerHaptic here to prevent the ReferenceError crash!
                                    onClick={() => setActiveFilter(filter)} 
                                    style={{ position: 'relative', padding: '8px 18px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', color: activeFilter === filter ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.2s', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}
                                >
                                    {/* The Magical Sliding Pill */}
                                    {activeFilter === filter && (
                                        <motion.div
                                            layoutId="filter-active-pill"
                                            style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg-surface-hover)', borderRadius: '20px', border: '1px solid var(--border-subtle)', zIndex: 0 }}
                                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                        />
                                    )}
                                    <span style={{ position: 'relative', zIndex: 1, fontWeight: activeFilter === filter ? '700' : '500' }}>{filter}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isSearchFocused && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', zIndex: 50, maxHeight: '500px', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                            {searchQuery.trim() === '/vault' ? (
                                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                                    <Lock size={32} color="#ef4444" style={{ marginBottom: '12px' }} />
                                    <h3 style={{ color: '#ef4444', margin: '0 0 8px 0', letterSpacing: '2px' }}>RESTRICTED AREA</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>You are attempting to access the Secret Vault.</p>
                                    <button onClick={() => { setIsSearchFocused(false); setSearchQuery(''); if (onGlobalAction) onGlobalAction('OPEN_VAULT'); }} style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Unlock Vault</button>
                                </div>
                            ) : isGlobalLoading ? (
                                <SearchSkeleton />
                            ) : debouncedQuery.length > 2 ? (
                                flatResults.length > 0 ? (
                                    <div style={{ padding: '16px 24px' }}>
                                        {renderCategory('Your Contacts', localContacts, 'local')}
                                        {renderCategory('Global Network', filteredGlobalUsers, 'global')}
                                        {renderCategory('Messages', globalMsgs, 'message')}
                                        {renderCategory('Files & Media', globalFiles, 'file')}
                                    </div>
                                ) : (
                                    <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <Search size={32} color="var(--border-subtle)" style={{ marginBottom: '12px' }} />
                                        <div>No users or messages found in the global network.</div>
                                    </div>
                                )
                            ) : (
                                <div style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                                    Type at least 3 characters to search the global network, messages, and files.
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export default SearchAndFilter;
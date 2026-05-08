import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Calendar } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const SearchChatOverlay = ({ isOpen, onClose, onSearch, results, onJumpToMessage }) => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Debounce the search input to prevent spamming the filter/backend
    useEffect(() => {
        const handler = setTimeout(() => {
            if (query.trim().length > 1) {
                setIsSearching(true);
                onSearch(query);
                setIsSearching(false);
            } else if (query.trim().length === 0) {
                onSearch(''); // Clear results
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [query, onSearch]);

    // Utility to highlight the searched term in the text snippet
    const getHighlightedText = (text, highlight) => {
        if (!text || !highlight) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === highlight.toLowerCase() ? 
                        <span key={i} style={{ backgroundColor: 'rgba(252, 203, 6, 0.4)', color: 'var(--text-primary)', fontWeight: 'bold', borderRadius: '2px', padding: '0 2px' }}>{part}</span> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    };

    const handleClose = () => {
        setQuery('');
        onSearch('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ position: 'absolute', top: '70px', left: 0, right: 0, zIndex: 35, backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '400px' }}
                >
                    {/* Search Input Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                        <Search size={20} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Search in this conversation..." 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem', padding: '0 16px' }}
                        />
                        <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Results List */}
                    {query.length > 1 && (
                        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                            {isSearching ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Searching...</div>
                            ) : results.length > 0 ? (
                                results.map((msg, idx) => (
                                    <div 
                                        key={msg._id || idx} 
                                        onClick={() => { triggerHaptic('light'); onJumpToMessage(msg._id); }}
                                        style={{ display: 'flex', flexDirection: 'column', padding: '12px 24px', cursor: 'pointer', transition: 'background-color 0.2s', borderBottom: '1px solid rgba(128,128,128,0.05)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                {msg.senderId?.username || msg.senderName || 'Unknown'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={12} />
                                                {new Date(msg.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {getHighlightedText(msg.text, query)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <Search size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                    <div style={{ fontSize: '0.95rem' }}>No messages found for "{query}"</div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchChatOverlay;
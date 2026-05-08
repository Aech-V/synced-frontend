import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2 } from 'lucide-react';

const DraftingModal = ({ isOpen, onClose, message, setMessage, onSend, currentRoom }) => {
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'var(--bg-surface)', zIndex: 9999,
                        display: 'flex', flexDirection: 'column', padding: '24px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Drafting: #{currentRoom}</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <Minimize2 size={24} />
                        </button>
                    </div>
                    
                    <textarea 
                        autoFocus 
                        value={message || ''} 
                        onChange={(e) => setMessage(e.target.value)} 
                        onKeyDown={handleKeyDown} 
                        style={{ 
                            flexGrow: 1, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', padding: '24px', 
                            outline: 'none', resize: 'none', fontSize: '1.1rem', lineHeight: '1.6', fontFamily: 'inherit' 
                        }} 
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button onClick={onSend} style={{ padding: '16px 32px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', fontWeight: 'bold', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '1.1rem' }}>
                            Send
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DraftingModal;
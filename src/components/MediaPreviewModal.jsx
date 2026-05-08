import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ShieldAlert } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

const MediaPreviewModal = ({ file, previewUrl, onCancel, onSend }) => {
    // The Ephemeral Flag
    const [isEphemeral, setIsEphemeral] = useState(false);

    const handleSend = () => {
        triggerHaptic('success');
        onSend({
            file,
            previewUrl,
            isEphemeral
        });
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
        >
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', alignItems: 'center' }}>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px' }}>
                    <X size={28} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <ShieldAlert size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>End-to-End Encrypted</span>
                </div>
            </div>

            {/* PREVIEW AREA */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
                <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', objectFit: 'contain' }} />
            </div>

            {/* ACTION FOOTER */}
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
                
                {/* THE VOID TOGGLE */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        triggerHaptic('light');
                        setIsEphemeral(!isEphemeral);
                    }}
                    style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        backgroundColor: isEphemeral ? 'var(--accent-primary)' : 'transparent',
                        border: isEphemeral ? 'none' : '2px dashed var(--text-secondary)',
                        color: isEphemeral ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    1
                </motion.button>

                {/* SEND BUTTON */}
                <motion.button 
                    whileTap={{ scale: 0.9 }} onClick={handleSend}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(252, 203, 6, 0.3)' }}
                >
                    <Send size={24} color="var(--accent-text)" />
                </motion.button>
            </div>
        </motion.div>
    );
};

export default MediaPreviewModal;
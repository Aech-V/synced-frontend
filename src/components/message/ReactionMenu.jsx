import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ReactionMenu = ({ isOpen, onClose, isMine, onSelect }) => {
    const handleSelect = (emoji, e) => {
        e.stopPropagation();
        triggerHaptic('success');
        onSelect(emoji);
        onClose();
    };

    return (
        <>
            {isOpen && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                />
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6, y: -15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.6, y: -15 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            [isMine ? 'right' : 'left']: 0,
                            transformOrigin: isMine ? 'top right' : 'top left',
                            backgroundColor: 'var(--bg-surface)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '30px',
                            padding: '8px 16px',
                            display: 'flex', alignItems: 'center', gap: '12px',
                            boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
                            zIndex: 100
                        }}
                    >
                        {DEFAULT_REACTIONS.map((emoji, index) => (
                            <motion.div
                                key={emoji}
                                initial={{ opacity: 0, scale: 0, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.04, type: "spring", stiffness: 500, damping: 20 }}
                                whileHover={{ scale: 1.4, originY: 0 }}
                                whileTap={{ scale: 0.8 }}
                                onPointerDown={(e) => handleSelect(emoji, e)}
                                style={{ fontSize: '1.4rem', cursor: 'pointer', transformOrigin: 'top center' }}
                            >
                                {emoji}
                            </motion.div>
                        ))}
                        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />
                        <motion.div
                            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <Plus size={18} strokeWidth={2.5} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ReactionMenu;
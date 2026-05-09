import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, FileText, Mic } from 'lucide-react';

const ATTACHMENT_OPTIONS = [
    { id: 'gallery', icon: ImageIcon, label: 'Photos & Videos', color: '#3b82f6' },
    { id: 'document', icon: FileText, label: 'Document', color: '#8b5cf6' },
    { id: 'audio', icon: Mic, label: 'Audio File', color: '#f59e0b' }
];

const AttachmentMenu = ({ isOpen, onClose, onSelect, isMobile }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="attach-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'transparent' }}
                    />

                    <motion.div
                        key="attach-menu"
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        style={{
                            position: 'absolute',
                            bottom: isMobile ? '70px' : '85px',
                            right: isMobile ? '16px' : '80px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            padding: '8px',
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '220px',
                            transformOrigin: 'bottom right' 
                        }}
                    >
                        {ATTACHMENT_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => { onSelect(opt.id); onClose(); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '12px 16px', background: 'transparent',
                                    border: 'none', borderRadius: '12px', cursor: 'pointer',
                                    color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem',
                                    transition: 'background-color 0.2s', textAlign: 'left', width: '100%'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ 
                                    color: opt.color, backgroundColor: `${opt.color}15`, 
                                    padding: '8px', borderRadius: '50%', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    <opt.icon size={20} />
                                </div>
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AttachmentMenu;

// const ATTACHMENTS = [
//     { id: 'camera', label: 'Camera', icon: Camera, color: '#3b82f6' },
//     { id: 'gallery', label: 'Gallery', icon: ImageIcon, color: '#3b82f6' },
//     { id: 'audio', label: 'Audio', icon: Mic, color: '#3b82f6' },
//     { id: 'document', label: 'Document', icon: FileText, color: '#64748b' },
//     { id: 'drive', label: 'Drive', icon: Cloud, color: '#64748b' },
//     { id: 'code', label: 'Snippet', icon: Code, color: '#64748b' },
//     { id: 'contact', label: 'Contact', icon: Contact, color: '#64748b' },
//     { id: 'calendar', label: 'Invite', icon: Calendar, color: '#64748b' },
//     { id: 'location', label: 'Location', icon: MapPin, color: 'var(--accent-primary)' },
//     { id: 'live_location', label: 'Live Loc', icon: Navigation, color: 'var(--accent-primary)' },
//     { id: 'poll', label: 'Poll', icon: BarChart2, color: 'var(--accent-primary)' },
//     { id: 'payment', label: 'Payment', icon: CreditCard, color: 'var(--accent-primary)' }
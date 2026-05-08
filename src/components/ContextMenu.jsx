import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Reply, Trash2, Edit2, Forward } from 'lucide-react';

const ContextMenu = ({ isOpen, x, y, message, onClose, onAction, currentUserId, isAdmin }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Safe permission & time checks
    const isMine = message && (message.senderId === currentUserId || message.senderId?._id === currentUserId);
    const isUnder30Mins = message?.createdAt ? (Date.now() - new Date(message.createdAt).getTime()) / 60000 < 30 : false;
    const canDelete = isMine || isAdmin;

    // --- BOUNDARY DETECTION FIX ---
    // Ensure the menu never renders off the bottom or right side of the screen
    const MENU_ESTIMATED_HEIGHT = 220; 
    const MENU_ESTIMATED_WIDTH = 200;
    
    // If the Y coordinate + menu height goes off-screen, push it UP above the message
    const safeY = y + MENU_ESTIMATED_HEIGHT > window.innerHeight 
        ? window.innerHeight - MENU_ESTIMATED_HEIGHT - 20 
        : y;
        
    const safeX = x + MENU_ESTIMATED_WIDTH > window.innerWidth 
        ? window.innerWidth - MENU_ESTIMATED_WIDTH - 20 
        : x;

    const menuContent = (
        <AnimatePresence>
            {isOpen && message && (
                <>
                    <motion.div
                        key="context-backdrop" 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
                        style={{ 
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'transparent',
                            zIndex: 9998 
                        }}
                    />
                    
                    <motion.div
                        key="context-menu-box" 
                        initial={{ opacity: 0, scale: 0.9, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -5 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{
                            // FIX: Use the calculated safe coordinates
                            position: 'fixed', top: `${safeY}px`, left: `${safeX}px`,
                            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                            borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', 
                            padding: '8px 0', minWidth: '200px', zIndex: 9999,
                            display: 'flex', flexDirection: 'column', 
                            // Change origin based on whether we flipped it up or down
                            transformOrigin: y !== safeY ? 'bottom left' : 'top left',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
                        }}
                    >
                        <div onClick={() => { onAction('REPLY', message); onClose(); }} className="context-item"><Reply size={16} /> Reply</div>
                        <div onClick={() => { onAction('FORWARD', message); onClose(); }} className="context-item"><Forward size={16} /> Forward</div>
                        <div onClick={() => { navigator.clipboard.writeText(message.text); onClose(); }} className="context-item"><Copy size={16} /> Copy Text</div>
                        
                        {isMine && isUnder30Mins && !message.isDeleted && (
                            <div onClick={() => { onAction('EDIT', message); onClose(); }} className="context-item"><Edit2 size={16} /> Edit</div>
                        )}
                        
                        {canDelete && !message.isDeleted && (
                            <div onClick={() => { onAction('DELETE', message); onClose(); }} className="context-item" style={{ color: '#ff4d4d' }}><Trash2 size={16} /> Delete</div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return ReactDOM.createPortal(menuContent, document.body);
};

export default ContextMenu;
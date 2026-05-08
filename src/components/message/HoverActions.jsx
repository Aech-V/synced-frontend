import React from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, SmilePlus } from 'lucide-react';

const HoverActions = ({ isMine, onReactionClick, onMenuClick }) => {
    return (
        <div 
            className="desktop-only" 
            style={{ 
                position: 'absolute', 
                top: '50%', 
                [isMine ? 'right' : 'left']: '100%', 
                padding: isMine ? '0 12px 0 0' : '0 0 0 12px',
                transform: 'translateY(-50%)', 
                display: 'flex', 
                gap: '4px', 
                zIndex: 10 
            }}
        >
            <motion.button 
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} 
                onClick={onReactionClick} 
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
                <SmilePlus size={16} />
            </motion.button>
            <motion.button 
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} 
                onClick={onMenuClick} 
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
                <MoreHorizontal size={16} />
            </motion.button>
        </div>
    );
};

export default HoverActions;
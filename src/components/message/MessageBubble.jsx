import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useMessageAction } from '../../hooks/useMessageAction';
import { apiClient } from '../../utils/api';
import StatusIndicator from './StatusIndicator';
import ReactionMenu from './ReactionMenu';
import HoverActions from './HoverActions';
import MessageContent from './MessageContent';
import BubbleTail from './BubbleTail';
import { useTheme } from '../../context/ThemeContext';

const MessageBubble = ({ msg, isMine, radii, showHeader, isHighlighted, onOpenContext, onCloseContext, isFirstInCluster, onReact, isEditing, onSaveEdit, onCancelEdit, onSwipeReply }) => {
    const { appearance, resolvedTheme } = useTheme();
    const triggerAction = useMessageAction();
    const controls = useAnimation();
    const bubbleRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [localReaction, setLocalReaction] = useState(msg?.reaction || null);
    const [showReactionMenu, setShowReactionMenu] = useState(false);

    // Ephemeral Burn Sequence
    useEffect(() => {
        if (msg?.isEphemeral && !msg?.isDeleted) {
            const timer = setTimeout(async () => {
                try {
                    await apiClient.delete(`/messages/burn/${msg._id}`);
                } catch (error) {
                    console.error("Failed to burn message", error);
                }
            }, 10000); 
            return () => clearTimeout(timer);
        }
    }, [msg]);

    if (!msg) return null;

    if (msg.type === 'system') {
        return <div style={{ textAlign: 'center', margin: '16px auto', padding: '6px 16px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', borderRadius: '16px', fontSize: '0.85rem', maxWidth: '80%' }}>{msg.text}</div>;
    }

    const handleDragEnd = async (event, info) => {
        if (showReactionMenu) return;
        if (info.offset.x > 60 && onSwipeReply) onSwipeReply();
        controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    };

    const handleContextMenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (msg.type === 'system' || msg.isDeleted) return;
        if (bubbleRef.current) {
            const rect = bubbleRef.current.getBoundingClientRect();
            onOpenContext(isMine ? rect.right - 180 : rect.left, Math.max(16, rect.bottom + 8), msg);
        }
    };

    // Color Engine
    const isGlass = appearance?.bubbleTransparency === true;
    const myBgSolid = '#2A2511'; 
    const myBgGlass = 'rgba(var(--accent-rgb), 0.85)'; 
    const otherBgSolid = 'var(--bg-surface)';
    const otherBgGlass = resolvedTheme === 'dark' || resolvedTheme === 'oled' 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(255, 255, 255, 0.6)';

    const bgColor = isMine ? (isGlass ? myBgGlass : myBgSolid) : (isGlass ? otherBgGlass : otherBgSolid);
    const tl = (isFirstInCluster && !isMine) ? '0px' : (radii?.tl || 'var(--bubble-radius)');
    const tr = (isFirstInCluster && isMine) ? '0px' : (radii?.tr || 'var(--bubble-radius)');

    return (
        <div
            id={`msg-${msg._id}`} 
            onClick={(e) => { if (isHighlighted && onCloseContext) { e.stopPropagation(); onCloseContext(); } }}
            style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start', 
                maxWidth: (msg.audioUrl || msg.isVoiceNote) ? '95%' : '85%', 
                marginBottom: radii?.clusterNext ? (localReaction ? '24px' : '2px') : (localReaction ? '28px' : '12px'),
                display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start',
                position: 'relative', zIndex: isHighlighted || showReactionMenu ? 9999 : 1,
                transition: 'margin-bottom 0.2s ease, transform 0.2s ease, background-color 0.3s ease', transform: isHighlighted ? 'scale(1.02)' : 'none'
            }}
            onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
        >
            <ReactionMenu isOpen={showReactionMenu} onClose={() => setShowReactionMenu(false)} isMine={isMine} onSelect={(emoji) => { setLocalReaction(emoji); if (onReact) onReact(msg._id, emoji); }} />
            
            {showHeader && !isMine && (
                <div style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px', padding: '0 8px', marginLeft: '4px' }}>
                    {msg.senderName}
                </div>
            )}

            <motion.div
                ref={bubbleRef} onContextMenu={handleContextMenu} onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!msg.isDeleted) setShowReactionMenu(true); }}
                drag={showReactionMenu || msg.isDeleted ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd} animate={controls}
                className={`message-bubble ${isMine ? 'bubble-mine' : 'bubble-other'} ${isFirstInCluster ? 'is-first' : ''}`}
                style={{
                    borderTopLeftRadius: tl, borderTopRightRadius: tr,
                    borderBottomRightRadius: radii?.br || 'var(--bubble-radius)', borderBottomLeftRadius: radii?.bl || 'var(--bubble-radius)',
                    position: 'relative',
                    backgroundColor: bgColor,
                    color: isMine ? '#ffffff' : 'var(--text-primary)',
                    border: isGlass ? '1px solid rgba(128, 128, 128, 0.15)' : (isMine ? '1px solid #93780B' : '1px solid var(--border-subtle)'),
                    backdropFilter: isGlass ? 'blur(16px)' : 'none',
                    WebkitBackdropFilter: isGlass ? 'blur(16px)' : 'none',
                    padding: (msg.audioUrl || msg.isVoiceNote) ? '10px 14px 22px 14px' : '10px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                {isFirstInCluster && appearance?.showBubbleTail !== false && (
                    <BubbleTail isOwn={isMine} isGlass={isGlass} bgColor={bgColor} />
                )}

                {isHovered && !isHighlighted && !showReactionMenu && !msg.isDeleted && <HoverActions isMine={isMine} onReactionClick={(e) => { e.stopPropagation(); setShowReactionMenu(true); }} onMenuClick={handleContextMenu} />}
                
                <MessageContent msg={msg} isMine={isMine} isEditing={isEditing} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit} />
                
                <div style={{ position: 'absolute', bottom: '4px', right: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.isEdited && <span style={{ fontSize: '0.65rem', fontStyle: 'italic', opacity: 0.7, color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>Edited</span>}
                    <span style={{ fontSize: '0.65rem', opacity: 0.8, color: isMine ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                    {isMine && <StatusIndicator status={msg.status} />}
                </div>

                {localReaction && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', bottom: '-19px', [isMine ? 'right' : 'left']: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '2px 6px', zIndex: 10, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setLocalReaction(null); }}>
                        {localReaction}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default MessageBubble;
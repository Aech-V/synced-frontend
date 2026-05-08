import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Send, Paperclip, Mic, Lock, ChevronUp, Smile, X, Edit, Reply } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import AttachmentMenu from './AttachmentMenu';
import DraftingModal from './DraftingModal';
import ActiveRecordingUI from './ActiveRecordingUI';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useIsMobile } from '../../hooks/useMediaQuery';

const ComposerInput = ({ currentRoom, message, setMessage, sendMessage, onOpenAssets, socket, editingMessage, editMessage, onCancelEdit, replyingMessage, onCancelReply }) => {
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isMobile = useIsMobile();

    const [showExpandIcon, setShowExpandIcon] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isAttachOpen, setIsAttachOpen] = useState(false);

    // Voice recorder setup
    const voice = useVoiceRecorder((audioBlob, duration) => {
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm;codecs=opus' });
        const payload = { type: 'audio', file: audioFile, duration, isVoiceNote: true };
        
        if (replyingMessage) {
            payload.replyTo = replyingMessage._id;
            payload.replyToObj = replyingMessage;
        }
        
        sendMessage(payload);
        if (replyingMessage) onCancelReply();
    });

    // File upload handler
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        let type = 'document';
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) type = 'image';
        if (file.type.startsWith('audio/')) type = 'audio';
        
        const payload = { 
            type, 
            file,
            fileName: file.name,
            fileSize: file.size,
            fileFormat: file.type.split('/')[1] || file.name.split('.').pop().toUpperCase()
        };
        
        if (replyingMessage) {
            payload.replyTo = replyingMessage._id;
            payload.replyToObj = replyingMessage;
        }
        
        sendMessage(payload);
        if (replyingMessage) onCancelReply();
        
        e.target.value = null;
        setIsAttachOpen(false); 
    };

    // Typing indicator logic
    const emitTypingState = (isTyping) => {
        if (socket && currentRoom) socket.emit('typing_change', { roomId: currentRoom, isTyping });
    };

    // Text input handler
    const handleTextChange = (e) => {
        setMessage(e.target.value);
        emitTypingState(true);
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => emitTypingState(false), 1500);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            if (scrollHeight > 100) {
                textareaRef.current.style.height = `100px`;
                setShowExpandIcon(true);
            } else {
                textareaRef.current.style.height = `${scrollHeight}px`;
                setShowExpandIcon(false);
            }
        }
    };

    // Message send trigger
    const triggerSend = () => {
        if (!(message || '').trim()) return;
        try {
            if (editingMessage) {
                editMessage(editingMessage._id, currentRoom, message);
                onCancelEdit();
            } else {
                const payload = { type: 'text', text: message };
                if (replyingMessage) {
                    payload.replyTo = replyingMessage._id;
                    payload.replyToObj = replyingMessage;
                }
                sendMessage(payload);
                setMessage('');
                if (replyingMessage) onCancelReply();
            }
            emitTypingState(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            triggerHaptic('success');
            setIsDrafting(false);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            setShowExpandIcon(false);
        } catch (error) {
            triggerHaptic('error');
        }
    };

    const hasText = (message || '').trim() !== '';

    return (
        <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <AttachmentMenu
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                isMobile={isMobile}
                onSelect={(type) => {
                    if (type === 'gallery' || type === 'document' || type === 'audio') {
                        if (fileInputRef.current) {
                            if (type === 'gallery') fileInputRef.current.accept = 'image/*,video/*';
                            else if (type === 'audio') fileInputRef.current.accept = 'audio/*';
                            else fileInputRef.current.accept = '*/*'; 
                            
                            fileInputRef.current.click(); 
                        }
                    } else if (type === 'camera') {
                        console.log("Trigger Camera Modal");
                    } else if (type === 'location') {
                        console.log("Trigger Location Flow");
                    } else if (type === 'poll') {
                        console.log("Trigger Poll Builder");
                    }
                }}
            />
            
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <DraftingModal isOpen={isDrafting} onClose={() => setIsDrafting(false)} message={message} setMessage={setMessage} onSend={triggerSend} currentRoom={currentRoom} />

            {/* Context bars */}
            <AnimatePresence>
                {editingMessage && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', borderLeft: '4px solid var(--accent-primary)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={14} /> Editing Message</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px', marginTop: '2px' }}>{editingMessage.text}</span>
                        </div>
                        <button onClick={onCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
                    </motion.div>
                )}
                {replyingMessage && !editingMessage && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', borderLeft: '4px solid var(--text-secondary)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Reply size={14} /> Replying to {replyingMessage.senderName}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px', marginTop: '2px' }}>{replyingMessage.text || 'Media Attachment'}</span>
                        </div>
                        <button onClick={onCancelReply} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Composer container */}
            <div style={{ padding: isMobile ? '8px 12px' : '12px 24px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '12px', alignItems: 'flex-end', zIndex: 100, position: 'relative' }}>

                {/* Input pill */}
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', backgroundColor: voice.isRecording ? 'transparent' : 'var(--bg-surface)', border: voice.isRecording ? 'none' : '1px solid var(--border-subtle)', borderRadius: '24px', padding: isMobile ? '4px 6px' : '6px 8px', transition: 'all 0.2s ease' }}>
                    {voice.isRecording ? (
                        <ActiveRecordingUI isMobile={isMobile} {...voice} />
                    ) : (
                        <>
                            <button onClick={onOpenAssets} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.2s', flexShrink: 0 }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                                <Smile size={24} />
                            </button>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <textarea ref={textareaRef} value={message || ''} onChange={handleTextChange} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), triggerSend())} placeholder="Message..." rows={1} style={{ width: '100%', padding: '10px 8px', backgroundColor: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', resize: 'none', maxHeight: '100px', overflowY: 'auto', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.4' }} />
                                {showExpandIcon && <button onClick={() => setIsDrafting(true)} style={{ position: 'absolute', top: '-30px', right: '0', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '50%', color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}><Maximize2 size={16} /></button>}
                            </div>

                            <button onClick={() => setIsAttachOpen(!isAttachOpen)} style={{ background: 'none', border: 'none', color: isAttachOpen ? 'var(--accent-primary)' : 'var(--text-secondary)', padding: '8px', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: isAttachOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                                <Paperclip size={22} />
                            </button>
                        </>
                    )}
                </div>

                {/* Floating action button */}
                <div style={{ position: 'relative', width: isMobile ? '44px' : '50px', height: isMobile ? '44px' : '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: isMobile ? '2px' : '4px' }}>
                    <AnimatePresence>
                        {voice.isRecording && !voice.isLocked && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ position: 'absolute', bottom: isMobile ? '60px' : '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)', padding: '16px 8px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 100 }}>
                                <motion.div style={{ scale: voice.lockScale, opacity: voice.lockOpacity, color: 'var(--text-secondary)' }}><Lock size={20} /></motion.div>
                                <ChevronUp size={20} color="var(--text-secondary)" style={{ marginTop: '8px' }} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {hasText && !voice.isRecording ? (
                        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }} onClick={triggerSend} style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(252, 203, 6, 0.3)' }}><Send size={isMobile ? 20 : 22} style={{ marginLeft: '2px' }} /></motion.button>
                    ) : (
                        <motion.button
                            drag={!voice.isLocked} dragConstraints={voice.isRecording ? { left: -160, right: 0, top: -100, bottom: 0 } : { left: 0, right: 0, top: 0, bottom: 0 }} dragElastic={0.1}
                            onDragEnd={voice.handleDragEnd} onPointerDown={voice.handlePointerDown} onPointerUp={voice.handlePointerUp} onPointerCancel={voice.handlePointerCancel}
                            style={{ x: voice.dragX, y: voice.dragY, width: voice.isRecording ? (isMobile ? '56px' : '64px') : '100%', height: voice.isRecording ? (isMobile ? '56px' : '64px') : '100%', borderRadius: '50%', backgroundColor: voice.isRecording ? '#10b981' : 'var(--bg-surface-hover)', color: voice.isRecording ? '#fff' : 'var(--text-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 110, boxShadow: voice.isRecording ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none', touchAction: 'none', transition: voice.isRecording ? 'none' : 'background-color 0.2s' }}
                        >
                            {voice.isLocked ? <Send size={isMobile ? 20 : 24} /> : <Mic size={voice.isRecording ? (isMobile ? 24 : 26) : (isMobile ? 22 : 24)} />}
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComposerInput;
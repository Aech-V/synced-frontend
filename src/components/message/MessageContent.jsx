import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Forward, Flame, ShieldAlert, X, FileText, Download } from 'lucide-react';
import ReplyContext from './ReplyContext';
import VoidViewer from './VoidViewer';
import LottieWrapper from 'lottie-react';
import SnippetMediaCard from './SnippetMediaCard';
import PollBubble from './PollBubble';
import PaymentMediaCard from './PaymentMediaCard';
import { useChatStore } from '../../../store/useChatStore';

// --- AUDIO IMPORTS ---
import VoiceNotePlayer from '../VoiceNotePlayer'; 
import Mp3MediaCard from './Mp3MediaCard'; 

const Lottie = LottieWrapper.default || LottieWrapper;

const MessageContent = ({ msg, isMine }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isViewingVoid, setIsViewingVoid] = useState(false);
    const [showVoidViewer, setShowVoidViewer] = useState(false);
    const [isLocallyBurned, setIsLocallyBurned] = useState(msg.isBurned || false);
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const removeOptimisticMessage = useChatStore(state => state.removeOptimisticMessage);

    const handleBurn = (msgId) => {
        setIsViewingVoid(false);
        setIsLocallyBurned(true);
        if (msg.roomId) {
            removeOptimisticMessage(msg.roomId, msgId);
        }
        if (window.socketRef) {
            window.socketRef.emit('burn_message', { messageId: msgId, roomId: msg.roomId });
        }
    };

    if (msg.isDeleted) {
        return (
            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Ban size={14} /> This message was deleted
            </div>
        );
    }

    // --- 1. BULLETPROOF AUDIO RESOLVER ---
    let resolvedAudioUrl = msg.audioUrl || msg.fileUrl || msg.mediaUrl || '';
    
    // Fallback: Sometimes backend accidentally maps the audio URL to the text field
    if (!resolvedAudioUrl && msg.text && msg.text.startsWith('http') && (msg.isVoiceNote || msg.type === 'audio')) {
        resolvedAudioUrl = msg.text; 
    }
    
    // Security Bypass: Force HTTPS to prevent browser "Mixed Content" silent blocking
    if (resolvedAudioUrl && resolvedAudioUrl.startsWith('http://')) {
        resolvedAudioUrl = resolvedAudioUrl.replace('http://', 'https://');
    }

    // --- 2. REAL AVATAR RESOLVER ---
    // Dig into the populated senderId object to grab the true database avatar
    let resolvedAvatar = msg.senderAvatar || msg.senderId?.avatar;
    if (!resolvedAvatar) {
        resolvedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName || 'User')}&background=random`;
    }

    return (
        <>
            {msg.replyTo && <ReplyContext replyToMsg={msg.replyTo} isMine={isMine} />}

            {msg.isForwarded && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontStyle: 'italic' }}>
                    <Forward size={14} />
                    {msg.forwardCount > 4 ? 'Forwarded many times' : 'Forwarded'}
                </div>
            )}

            {/* Render text ONLY if it's not actually holding the audio URL fallback */}
            {msg.text && msg.text !== resolvedAudioUrl && (
                <div style={{ margin: 0, display: 'inline', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.text}
                    <span style={{ display: 'inline-block', width: msg.isEdited ? '95px' : '60px', height: '16px', verticalAlign: 'middle' }} />
                </div>
            )}

            {/* --- FIXED AUDIO RENDERING BLOCK --- */}
            {(msg.type === 'audio' || msg.type === 'voice' || msg.audioUrl || msg.isVoiceNote) && (
                <div style={{ margin: '8px 0' }}>
                    {msg.isVoiceNote || msg.type === 'audio' || msg.type === 'voice' ? (
                        <VoiceNotePlayer
                            audioUrl={resolvedAudioUrl}
                            duration={msg.duration || 0}
                            senderAvatar={resolvedAvatar}
                            isOwn={isMine}
                        />
                    ) : (
                        <Mp3MediaCard
                            audioUrl={resolvedAudioUrl}
                            fileName={msg.fileName || 'Audio File'}
                            fileSize={msg.fileSize}
                            isOwn={isMine}
                        />
                    )}
                </div>
            )}

            {msg.type === 'snippet' && msg.snippetData && (
                <div style={{ margin: '8px 0' }}>
                    <SnippetMediaCard
                        code={msg.snippetData.code}
                        language={msg.snippetData.language}
                        fileName={msg.snippetData.fileName}
                        isOwn={isMine}
                    />
                </div>
            )}

            {msg.type === 'poll' && msg.pollData && (
                <div style={{ margin: '8px 0' }}>
                    <PollBubble
                        pollData={msg.pollData}
                        messageId={msg._id}
                        createdAt={msg.createdAt}
                        isOwn={isMine}
                        socket={window.socketRef} 
                        roomId={msg.roomId}
                    />
                </div>
            )}

            {msg.type === 'payment' && msg.paymentData && (
                <div style={{ margin: '8px 0' }}>
                    <PaymentMediaCard
                        paymentData={msg.paymentData}
                        isOwn={isMine}
                    />
                </div>
            )}

            {/* --- UPGRADED IMAGE RENDERER --- */}
            {msg.imageUrl && !msg.isEphemeral && msg.type !== 'document' && msg.type !== 'audio' && msg.type !== 'snippet' && (
                <div 
                    className="media-wrapper" 
                    onClick={() => setFullScreenImage(msg.imageUrl)} 
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
                    onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                >
                    {!imageLoaded && <div className="skeleton-loader" />}
                    <img src={msg.imageUrl} alt="Attachment" className="media-image" style={{ opacity: imageLoaded ? 1 : 0 }} onLoad={() => setImageLoaded(true)} />
                </div>
            )}

            {/* --- EPHEMERAL VOID VIEWER --- */}
            {msg.imageUrl && msg.isEphemeral && msg.type !== 'document' && msg.type !== 'audio' && (
                <div style={{ padding: '8px' }}>
                    {isLocallyBurned ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', padding: '12px 16px', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            <Flame size={16} /> Payload Burned
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowVoidViewer(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-hover)', color: isMine ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            <ShieldAlert size={18} /> Tap to View Void
                        </button>
                    )}

                    {showVoidViewer && (
                        <VoidViewer
                            imageUrl={msg.imageUrl}
                            messageId={msg._id}
                            onClose={() => setShowVoidViewer(false)}
                            onBurned={(id) => setIsLocallyBurned(true)}
                        />
                    )}
                </div>
            )}

            {/* --- GENERIC DOCUMENT UI CARD --- */}
            {msg.type === 'document' && (
                <div 
                    onClick={() => window.open(msg.fileUrl || msg.mediaUrl || msg.documentUrl, '_blank')}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', 
                        padding: '12px', backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : 'var(--bg-surface-hover)', 
                        borderRadius: '12px', margin: '8px 0', cursor: 'pointer',
                        border: isMine ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-subtle)'
                    }} 
                >
                    <div style={{ padding: '12px', backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)', borderRadius: '10px' }}>
                        <FileText size={24} color={isMine ? '#fff' : 'var(--accent-primary)'} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: isMine ? '#fff' : 'var(--text-primary)' }}>
                            {msg.fileName || 'Document File'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                            {msg.fileSize ? `${(msg.fileSize / 1024 / 1024).toFixed(2)} MB` : 'File'} • {msg.fileFormat || 'DOC'}
                        </span>
                    </div>
                    <Download size={20} color={isMine ? '#fff' : 'var(--text-secondary)'} />
                </div>
            )}

            {msg.type === 'sticker' && msg.stickerData && (
                <div style={{ width: '160px', height: '160px', margin: '8px 0' }}>
                    <Lottie animationData={msg.stickerData} loop={true} style={{ width: '100%', height: '100%' }} />
                </div>
            )}

            {msg.type === 'gif' && msg.gifUrl && (
                <div style={{ borderRadius: '12px', overflow: 'hidden', margin: '8px 0', maxWidth: '250px' }}>
                    <img src={msg.gifUrl} alt="GIF" style={{ width: '100%', display: 'block' }} />
                </div>
            )}

            {fullScreenImage && createPortal(
                <AnimatePresence>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
                        onClick={() => setFullScreenImage(null)}
                    >
                        <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-surface)', border: 'none', borderRadius: '50%', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                            <X size={24} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            src={fullScreenImage} 
                            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default MessageContent;
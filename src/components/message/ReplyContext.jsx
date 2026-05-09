import React from 'react';

const ReplyContext = ({ replyToMsg, onClick, isMine }) => { 
    if (!replyToMsg) return null;

    // Dynamically assign background, borders, and explicit text colors
    const dynamicReplyStyle = {
        ...replyStyle,
        backgroundColor: isMine ? '#3B3624' : 'rgba(0, 0, 0, 0.08)',
        borderLeft: isMine ? '4px solid #FCCB06' : '4px solid var(--accent-primary)',
    };
    
    const dynamicNameStyle = {
        ...nameStyle,
        color: isMine ? '#ffffff' : 'var(--text-primary)'
    };

    const dynamicTextStyle = {
        ...textStyle,
        color: isMine ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-primary)'
    };

    if (typeof replyToMsg === 'string') {
        return (
            <div className="reply-context-card" onClick={onClick} style={dynamicReplyStyle}>
                <span style={dynamicNameStyle}>Replied Message</span>
                <span style={dynamicTextStyle}>Original message attached</span>
            </div>
        );
    }

    let messagePreview = replyToMsg.text;
    
    if (!messagePreview || messagePreview.trim() === '') {
        const type = replyToMsg.type || '';
        const fileType = replyToMsg.fileType || '';
        
        const hasImage = replyToMsg.imageUrl || type.includes('image') || fileType.includes('image');
        const hasVideo = replyToMsg.videoUrl || type.includes('video') || fileType.includes('video');
        const hasAudio = replyToMsg.audioUrl || type.includes('audio') || fileType.includes('audio');
        const hasDocument = replyToMsg.fileUrl || replyToMsg.documentUrl || type.includes('file') || fileType.includes('pdf');

        if (hasImage) messagePreview = '📷 Photo';
        else if (hasVideo) messagePreview = '🎥 Video';
        else if (hasAudio) messagePreview = '🎤 Voice Note';
        else if (replyToMsg.gifUrl || type === 'gif') messagePreview = '🎞️ GIF';
        else if (replyToMsg.stickerData || type === 'sticker') messagePreview = '✨ Sticker';
        else if (hasDocument) messagePreview = '📄 Document';
        else messagePreview = '📎 Attachment';
    }

    return (
        <div className="reply-context-card" onClick={onClick} style={dynamicReplyStyle}>
            <span style={dynamicNameStyle}>
                {replyToMsg.senderName || 'User'}
            </span>
            <span style={dynamicTextStyle}>
                {messagePreview}
            </span>
        </div>
    );
};

const replyStyle = {
    display: 'block',
    width: '100%',
    minWidth: 'min(140px, 100%)',
    maxWidth: '100%', 
    boxSizing: 'border-box',
    padding: '8px 12px', 
    borderRadius: '8px', 
    marginBottom: '8px', 
    cursor: 'pointer',
    overflow: 'hidden'
};

const nameStyle = { 
    display: 'block',
    fontSize: '0.75rem', 
    fontWeight: 'bold', 
    opacity: 0.9, 
    marginBottom: '4px',
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis',
    width: '100%'
};

const textStyle = { 
    display: 'block', 
    fontSize: '0.8rem', 
    opacity: 0.75, 
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis',
    width: '100%'
};

export default ReplyContext;
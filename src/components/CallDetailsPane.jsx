import React from 'react';
import { motion } from 'framer-motion';
import { X, Phone, Video, MessageSquare, ArrowUpRight, ArrowDownLeft, XCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useIsMobile } from '../hooks/useMediaQuery';

const CallDetailsPane = ({ details, onClose, onGlobalAction }) => {
    const isMobile = useIsMobile();
    
    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};
    const myId = String(currentUser.id || currentUser._id);

    if (!details) return null;

    // --- IDENTITY RESOLUTION ENGINE (UPGRADED) ---
    let displayName = details.contactName && details.contactName !== 'Unknown' && details.contactName !== 'Unknown Contact' 
        ? details.contactName 
        : 'Unknown Contact';
    let displayAvatar = details.avatar;

    const callerObj = details.callerId;
    const callerIdStr = String(callerObj?._id || callerObj);

    if (callerIdStr && callerIdStr !== myId && callerObj?.username) {
        displayName = callerObj.username;
        displayAvatar = callerObj.avatar || displayAvatar;
    } else if (details.participants) {
        const target = details.participants.find(p => String(p.userId?._id || p.userId) !== myId);
        if (target && target.userId && target.userId.username) {
            displayName = target.userId.username;
            displayAvatar = target.userId.avatar || displayAvatar;
        }
    }

    if (!displayAvatar) {
        displayAvatar = `https://ui-avatars.com/api/?name=${displayName}&background=random`;
    }
    // ---------------------------------------------

    const getDirectionIcon = (direction) => {
        if (direction === 'missed') return <XCircle size={18} color="#ef4444" />;
        if (direction === 'incoming') return <ArrowDownLeft size={18} color="#10b981" />;
        return <ArrowUpRight size={18} color="var(--text-secondary)" />;
    };

    const handleDial = (type) => {
        triggerHaptic('success');
        if (onGlobalAction) {
            const isGroupCall = details.roomId?.type !== 'direct' && details.participants?.length > 1;
            onGlobalAction('REDIAL_CALL', {
                targetId: details.identityId,
                roomId: details.roomId?._id,
                type: isGroupCall ? 'room' : 'user',
                callType: type, 
                isGroup: isGroupCall
            });
        }
    };

    const formatDuration = (durStr) => {
        if (!durStr) return '';
        const [mins, secs] = durStr.replace('m', '').replace('s', '').split(' ').map(Number);
        if (mins > 0) return `${mins} min ${secs} sec`;
        return `${secs} seconds`;
    };

    const callDate = details.createdAt ? new Date(details.createdAt) : new Date();
    const isToday = new Date().toDateString() === callDate.toDateString();
    const isYesterday = new Date(Date.now() - 86400000).toDateString() === callDate.toDateString();
    const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : callDate.toLocaleDateString(undefined, { weekday: 'long' });

    return (
        <motion.div
            initial={false}
            animate={{ x: isMobile ? (details ? '0%' : '100%') : '0%' }}
            transition={{ type: "spring", stiffness: 350, damping: 30, mass: 1 }}
            style={{
                position: isMobile ? 'fixed' : 'relative',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: isMobile ? 100 : 1,
                display: 'flex', flexDirection: 'column',
                backgroundColor: 'var(--bg-primary)',
                pointerEvents: (!details && isMobile) ? 'none' : 'auto',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', zIndex: 10 }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' }}>Call info</h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={22} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
                <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', overflow: 'hidden' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-subtle)' }}>
                            <img 
                                src={displayAvatar} 
                                alt={displayName} 
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236B7280'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                                }}
                            />
                        </div>
                        <h3 style={{ margin: '0 0 0 16px', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {displayName}
                        </h3>
                        
                        <div style={{ display: 'flex', gap: '20px', marginLeft: '16px' }}>
                            <button onClick={() => onGlobalAction && onGlobalAction('NEW_MESSAGE')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}><MessageSquare size={20} /></button>
                            <button onClick={() => handleDial('video')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}><Video size={20} /></button>
                            <button onClick={() => handleDial('voice')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}><Phone size={20} /></button>
                        </div>
                    </div>

                    <div style={{ padding: '0' }}>
                        <div style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                            {dateLabel}
                        </div>
                        
                        {(details.subCalls || []).map((subCall, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderTop: index !== 0 ? '1px solid var(--border-subtle)' : 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', marginRight: '16px' }}>
                                    {getDirectionIcon(subCall.direction)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px' }}>
                                        {subCall.direction === 'missed' ? 'Missed voice call' : `${subCall.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} ${subCall.type} call`}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{subCall.exactTime}</div>
                                </div>
                                {subCall.duration && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                        {formatDuration(subCall.duration)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CallDetailsPane;
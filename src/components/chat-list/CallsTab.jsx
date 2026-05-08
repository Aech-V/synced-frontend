import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const CallsTab = ({ setActiveCallDetails, onGlobalAction }) => {
    const [callLogs, setCallLogs] = useState([]);
    const currentUserObj = JSON.parse(localStorage.getItem('synced_user')) || {};
    const currentUserId = currentUserObj.id || currentUserObj._id;

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                const token = localStorage.getItem('synced_token');
                const response = await axios.get('http://localhost:5000/api/calls/history?page=1', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    setCallLogs(response.data.data);
                }
            } catch (error) {
                console.error("Failed to load calls", error);
            }
        };
        fetchCalls();
    }, []);

    // --- PREMIUM BULLETPROOF IDENTITY ENGINE ---
    const groupedCalls = useMemo(() => {
        const grouped = [];
        let currentGroup = null;

        callLogs.forEach((call) => {
            const isOutgoing = (call.callerId?._id || call.callerId) === currentUserId;
            
            // 1. Unbreakable Identity Extraction
            let otherUser = null;
            if (isOutgoing) {
                // If I called them, extract the target from participants
                otherUser = call.participants?.find(p => (p.userId?._id || p.userId) !== currentUserId)?.userId;
                if (!otherUser && call.participants?.length > 0) otherUser = call.participants[0].userId;
            } else {
                // If they called me, extract them from callerId
                otherUser = call.callerId;
            }

            // 2. Fallback Formatting
            let displayName = 'Unknown Contact';
            if (otherUser && otherUser.username) {
                displayName = otherUser.username;
            } else if (call.roomId && call.roomId.name) {
                // Prevent UUIDs from leaking into the UI
                const isUUID = call.roomId.name.length > 20 && call.roomId.name.includes('-');
                if (!isUUID) displayName = call.roomId.name;
            }

            const identityId = otherUser?._id || (call.roomId ? call.roomId._id : null);
            const avatar = otherUser?.avatar || `https://ui-avatars.com/api/?name=${displayName}&background=random`;
            
            // 3. Formatted Sub-Call Payload
            const exactTime = new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const direction = isOutgoing ? 'outgoing' : (call.status === 'missed' || call.status === 'declined' ? 'missed' : 'incoming');
            const durationFormatted = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : null;

            const subCall = { direction, type: call.type, exactTime, duration: durationFormatted };

            if (currentGroup && currentGroup.identityId === identityId && currentGroup.type === call.type && currentGroup.isOutgoing === isOutgoing) {
                currentGroup.attemptCount += 1;
                currentGroup.subCalls.push(subCall);
            } else {
                if (currentGroup) grouped.push(currentGroup);
                
                currentGroup = {
                    ...call,
                    identityId,
                    contactName: displayName,
                    avatar,
                    isOutgoing,
                    isMissed: direction === 'missed',
                    attemptCount: 1,
                    subCalls: [subCall],
                    timestamp: exactTime
                };
            }
        });
        if (currentGroup) grouped.push(currentGroup);
        return grouped;
    }, [callLogs, currentUserId]);

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
            {groupedCalls.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '0.95rem' }}>No recent calls</div>
            ) : (
                groupedCalls.map((group, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => { triggerHaptic('light'); setActiveCallDetails && setActiveCallDetails(group); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '16px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', flexShrink: 0, position: 'relative' }}>
                                <img src={group.avatar} alt={group.contactName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: group.isMissed ? '#ef4444' : 'var(--text-primary)', fontWeight: '700', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {group.contactName}
                                    </span>
                                    {group.attemptCount > 1 && (
                                        <span style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
                                            {group.attemptCount}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px', fontWeight: '500' }}>
                                    {group.isOutgoing 
                                        ? <PhoneOutgoing size={14} color="var(--text-secondary)" /> 
                                        : (group.isMissed ? <PhoneMissed size={14} color="#ef4444"/> : <PhoneIncoming size={14} color="#10b981" />)}
                                    {group.timestamp}
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation(); 
                                triggerHaptic('success');
                                const isGroupCall = group.roomId?.type !== 'direct' && group.participants?.length > 1;
                                onGlobalAction('REDIAL_CALL', {
                                    targetId: typeof group.identityId === 'object' ? group.identityId._id : group.identityId,
                                    roomId: group.roomId?._id,
                                    type: isGroupCall ? 'room' : 'user',
                                    callType: group.type, 
                                    isGroup: isGroupCall
                                });
                            }}
                            style={{ background: 'var(--bg-surface-hover)', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s', flexShrink: 0 }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {group.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default CallsTab;
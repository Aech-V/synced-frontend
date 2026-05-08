import React, { useEffect, useState, useMemo } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { triggerHaptic } from '../../utils/haptics';

const CallsTab = ({ setActiveCallDetails, onGlobalAction }) => {
    const [callLogs, setCallLogs] = useState([]);
    const currentUserObj = JSON.parse(localStorage.getItem('synced_user')) || {};
    const currentUserId = currentUserObj.id || currentUserObj._id;

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                const response = await apiClient.get('/calls/history?page=1');
                if (response.data.success) {
                    setCallLogs(response.data.data);
                }
            } catch (error) {
                console.error("Failed to load calls", error);
            }
        };
        fetchCalls();
    }, []);

    // Premium bulletproof identity engine
    const groupedCalls = useMemo(() => {
        const grouped = [];
        let currentGroup = null;

        callLogs.forEach((call) => {
            const isOutgoing = (call.callerId?._id || call.callerId) === currentUserId;
            
            let identityId;
            let displayUser;

            if (call.participants && call.participants.length > 1 && call.roomId?.type !== 'direct') {
                identityId = call.roomId?._id || 'group';
                displayUser = { username: call.roomId?.name || 'Group Call', avatar: null };
            } else {
                if (isOutgoing) {
                    const receiver = call.participants && call.participants[0] ? call.participants[0].userId : null;
                    identityId = receiver?._id || receiver;
                    displayUser = receiver;
                } else {
                    identityId = call.callerId?._id || call.callerId;
                    displayUser = call.callerId;
                }
            }

            const callData = {
                _id: call._id,
                type: call.type,
                status: call.status,
                duration: call.duration,
                createdAt: call.createdAt,
                isOutgoing
            };

            if (currentGroup && currentGroup.identityId === identityId) {
                currentGroup.calls.push(callData);
            } else {
                if (currentGroup) grouped.push(currentGroup);
                currentGroup = {
                    identityId,
                    displayUser,
                    roomId: call.roomId,
                    type: call.type,
                    calls: [callData]
                };
            }
        });

        if (currentGroup) grouped.push(currentGroup);
        return grouped;
    }, [callLogs, currentUserId]);

    const renderCallIcon = (status, isOutgoing) => {
        if (status === 'missed' && !isOutgoing) return <PhoneMissed size={16} color="#ef4444" />;
        if (status === 'declined') return <PhoneMissed size={16} color="#ef4444" />;
        if (isOutgoing) return <PhoneOutgoing size={16} color="var(--text-secondary)" />;
        return <PhoneIncoming size={16} color="var(--text-secondary)" />;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            {groupedCalls.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 20px' }}>
                    <Phone size={48} opacity={0.2} style={{ marginBottom: '16px' }} />
                    <p>Your call history is empty.</p>
                </div>
            ) : (
                groupedCalls.map((group, index) => (
                    <div 
                        key={index}
                        onClick={() => {
                            triggerHaptic('light');
                            setActiveCallDetails(group);
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--bg-primary)', borderRadius: '16px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <img 
                                    src={group.displayUser?.avatar || `https://ui-avatars.com/api/?name=${group.displayUser?.username || 'G'}&background=random`} 
                                    alt="Avatar" 
                                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ color: group.calls[0].status === 'missed' && !group.calls[0].isOutgoing ? '#ef4444' : 'var(--text-primary)', fontWeight: '600', fontSize: '1.05rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {group.displayUser?.username || 'Unknown User'}
                                    {group.calls.length > 1 && <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '6px' }}>({group.calls.length})</span>}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                                    {renderCallIcon(group.calls[0].status, group.calls[0].isOutgoing)}
                                    <span>{group.calls[0].type === 'video' ? 'Video' : 'Voice'}</span>
                                    <span>•</span>
                                    <span>{new Date(group.calls[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
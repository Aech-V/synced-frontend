import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquareDashed, SearchX, CheckCircle, Loader2 } from 'lucide-react';
import StatusIndicator from '../message/StatusIndicator';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isYesterday = new Date(now.setDate(now.getDate() - 1)).getDate() === date.getDate();
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const RoomList = ({ rooms, currentRoom, setCurrentRoom, searchQuery, activeFilter }) => {
    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};
    const myId = String(currentUser.id || currentUser._id);

    // Sleek Loading State (Only if rooms array is literally undefined)
    if (!rooms) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}>
                <Loader2 size={28} color="var(--text-secondary)" />
            </motion.div>
        </div>
    );

    // Filter logic
    const filteredRooms = rooms.filter(room => {
        let displayRoomName = room.name || 'Unknown';

        if (room.type === 'direct' || room.type === 'secret') {
            const otherParticipant = room.participants?.find(p => String(p.userId?._id || p.userId) !== myId);
            if (otherParticipant && otherParticipant.userId?.username) {
                displayRoomName = otherParticipant.userId.username;
            } else {
                displayRoomName = "Unknown Contact";
            }
        }

        if (searchQuery && !displayRoomName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (activeFilter === 'Channels' && room.type !== 'channel') return false;

        if (activeFilter === 'DMs' && room.type !== 'direct' && room.type !== 'secret') return false;

        if (activeFilter === 'Unread') {
            if (!room.lastMessage) return false;
            const myParticipantRecord = room.participants?.find(p => String(p.userId?._id || p.userId) === myId);
            const lastRead = myParticipantRecord?.lastReadTimestamp ? new Date(myParticipantRecord.lastReadTimestamp) : new Date(0);
            const lastMessageTime = new Date(room.lastMessage.createdAt);
            if (lastMessageTime <= lastRead) return false;
        }
        return true;
    });

    // Premium Dynamic Empty States
    if (filteredRooms.length === 0) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '8px 16px' }}>
                {searchQuery ? (
                    // Search Empty State
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                            <SearchX size={28} color="var(--text-secondary)" />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', marginBottom: '8px' }}>No results found</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>We couldn't find anything matching "{searchQuery}".</span>
                    </div>
                ) : activeFilter === 'Unread' ? (
                    // Unread Empty State
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <CheckCircle size={28} color="#10b981" />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', marginBottom: '8px' }}>All caught up!</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>You have no unread messages.</span>
                    </div>
                ) : (
                    // True Default Empty State
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                        <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid var(--border-subtle)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }}>
                            <MessageSquareDashed size={40} color="var(--accent-primary)" />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: '1.2rem', marginBottom: '10px' }}>It's quiet here</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '220px' }}>Tap the + button below to start a new conversation.</span>
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ padding: '8px 16px' }}>
            {filteredRooms.map(room => {
                let displayRoomName = room.name;
                let displayAvatar = `https://ui-avatars.com/api/?name=${room.name}&background=random`;
                let isOnline = false;

                if (room.type === 'direct' || room.type === 'secret') {
                    const otherParticipant = room.participants?.find(p => String(p.userId?._id || p.userId) !== myId);
                    const otherUser = otherParticipant?.userId;

                    if (otherUser && otherUser.username) {
                        displayRoomName = otherUser.username;
                        displayAvatar = otherUser.avatar || `https://ui-avatars.com/api/?name=${displayRoomName}&background=random`;
                        isOnline = otherUser.isOnline;
                    } else {
                        displayRoomName = "Unknown Contact";
                    }
                }

                const isChannel = room.type === 'channel';
                const isActive = currentRoom === room.name;
                const lastMsg = room.lastMessage;
                const isLastMessageMine = lastMsg && String(lastMsg.senderId?._id || lastMsg.senderId) === myId;
                const previewText = lastMsg ? (lastMsg.text || 'Sent an attachment') : 'No messages yet';
                const timestamp = room.lastMessage ? formatTime(room.lastMessage.createdAt) : '';
                const unreadCount = room.unreadCount || 0;

                return (
                    <motion.div
                        key={room._id}
                        variants={itemVariants}
                        onClick={() => setCurrentRoom(room.name)}
                        className={`room-item ${isActive ? 'active' : ''}`}
                    >
                        <div onClick={() => setCurrentRoom(room.name)} style={{ padding: '12px', marginBottom: '6px', borderRadius: '16px', backgroundColor: isActive ? 'var(--bg-surface-hover)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'background-color 0.2s' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: isChannel ? '16px' : '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                                {isChannel ? <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>#</span> : <img src={displayAvatar} alt={displayRoomName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />}
                                {!isChannel && isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', backgroundColor: '#10b981', border: '3px solid var(--bg-primary)', borderRadius: '50%' }} />}
                            </div>

                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: unreadCount > 0 ? '700' : '600', color: isActive || unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-primary)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {displayRoomName}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', marginLeft: '8px', flexShrink: 0, fontWeight: unreadCount > 0 ? '700' : '500' }}>
                                        {timestamp}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {isLastMessageMine && <StatusIndicator status={room.lastMessage?.status} />}
                                    <span style={{ fontSize: '0.85rem', color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unreadCount > 0 ? '600' : '400', flex: 1, paddingRight: '8px', lineHeight: '1.4' }}>
                                        {previewText}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )
            })}
        </motion.div>
    );
};
export default RoomList;
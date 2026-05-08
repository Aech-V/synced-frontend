import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';

// @desc Manages all incoming real-time matrix events and synchronizes them with local state
export const useSocketEvents = (socket, currentRoom, currentUserId, currentUserObj, setChatHistory, setAvailableRooms, setIsTyping) => {
    const currentRoomRef = useRef(currentRoom);
    const { removeOptimisticMessage } = useChatStore();

    useEffect(() => { 
        currentRoomRef.current = currentRoom; 
    }, [currentRoom]);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (savedMessage) => {
            const isCurrentRoom = savedMessage.roomName === currentRoomRef.current || savedMessage.roomId === currentRoomRef.current;
            const isMyMessage = savedMessage.senderId === currentUserId;

            // 1. Acknowledgment & Read Receipts (Only for others' messages)
            if (!isMyMessage) {
                socket.emit('message_delivered', { messageId: savedMessage._id, roomId: savedMessage.roomId });
                if (isCurrentRoom) {
                    socket.emit('mark_as_read', { messageId: savedMessage._id, roomId: savedMessage.roomId });
                }
            }

            // 2. Notification Engine
            if (!isCurrentRoom && !isMyMessage) {
                const prefs = currentUserObj.notificationSettings || {};
                const dnd = prefs.dnd || {};
                const isOnDND = dnd.isActive && (!dnd.until || new Date(dnd.until) > new Date());
                
                if (!isOnDND && prefs.messageSounds !== false && !savedMessage.isSecretRoom) {
                    new Audio('/notification.mp3').play().catch(() => null);
                }
            }

            // 3. Chat History Injection & Deduplication (Fixes Blocked User / Multi-Device Sync)
            if (isCurrentRoom) {
                setChatHistory(prev => {
                    // Prevent duplicates if Optimistic UI or a reconnect already injected it
                    if (prev.some(msg => msg._id === savedMessage._id)) {
                        return prev;
                    }
                    return [...prev, savedMessage];
                });

                // Clear from optimistic store if it was injected from this device
                if (isMyMessage) {
                    removeOptimisticMessage(savedMessage.roomId, savedMessage.tempId);
                }
            }

            // 4. Global Room List Updates
            setAvailableRooms(prev => {
                const roomIndex = prev.findIndex(r => r._id === savedMessage.roomId || r.name === savedMessage.roomName);
                if (roomIndex > -1) {
                    const increment = (!isCurrentRoom && !isMyMessage && savedMessage.type !== 'system') ? 1 : 0;
                    const updatedRoom = {
                        ...prev[roomIndex],
                        lastMessage: savedMessage,
                        unreadCount: (prev[roomIndex].unreadCount || 0) + increment
                    };
                    return [updatedRoom, ...prev.filter((_, i) => i !== roomIndex)];
                }
                return prev;
            });
        };

        const handleReactionUpdated = ({ messageId, emoji }) => {
            setChatHistory(prev => prev.map(msg => msg._id === messageId ? { ...msg, reaction: emoji } : msg));
        };

        const handleMessageStatusUpdate = ({ messageId, status }) => {
            setChatHistory(prev => prev.map(msg => msg._id === messageId ? { ...msg, status } : msg));
            setAvailableRooms(prev => prev.map(r => r.lastMessage?._id === messageId ? { ...r, lastMessage: { ...r.lastMessage, status } } : r));
        };

        const handleRoomMessagesRead = ({ roomId }) => {
            if (currentRoomRef.current === roomId) {
                setChatHistory(prev => prev.map(msg => ({ ...msg, status: 'read' })));
            }
            setAvailableRooms(prev => prev.map(r => (r.name === roomId || r._id === roomId) ? { ...r, unreadCount: 0, lastMessage: r.lastMessage ? { ...r.lastMessage, status: 'read' } : null } : r));
        };

        const handleUserTyping = ({ isTyping }) => setIsTyping(isTyping);

        const handleMessageDeleted = ({ messageId }) => {
            setChatHistory(prev => prev.map(msg => msg._id === messageId ? { ...msg, isDeleted: true, text: null, imageUrl: null } : msg));
        };

        const handleMessageEdited = ({ messageId, newText }) => {
            setChatHistory(prev => prev.map(msg => msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg));
        };

        // Event Bindings
        socket.on('receive_message', handleReceiveMessage);
        socket.on('reaction_updated', handleReactionUpdated);
        socket.on('message_status_update', handleMessageStatusUpdate);
        socket.on('room_messages_read', handleRoomMessagesRead);
        socket.on('user_typing', handleUserTyping);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('message_edited', handleMessageEdited);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('reaction_updated', handleReactionUpdated);
            socket.off('message_status_update', handleMessageStatusUpdate);
            socket.off('room_messages_read', handleRoomMessagesRead);
            socket.off('user_typing', handleUserTyping);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_edited', handleMessageEdited);
        };
    }, [socket, currentUserId, currentUserObj, removeOptimisticMessage, setChatHistory, setAvailableRooms, setIsTyping]);
};
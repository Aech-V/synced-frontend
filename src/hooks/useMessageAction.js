import { useCallback } from 'react';
import { useChatStore } from '../../store/useChatStore';

export const useMessageAction = (socket, currentRoomId) => {
    const { addOptimisticMessage, confirmOptimisticMessage, removeOptimisticMessage } = useChatStore();

    const sendMessage = useCallback((messagePayload) => {
        if (!socket || !currentRoomId) return;

        const tempId = Date.now();
        
        const optimisticData = {
            ...messagePayload,
            roomId: currentRoomId,
            tempId,
            status: 'sending'
        };

        addOptimisticMessage(currentRoomId, optimisticData);

        socket.emit('send_message', optimisticData, (response) => {
            if (response && response.success) {
                confirmOptimisticMessage(currentRoomId, response.tempId, {
                    messageId: response.messageId,
                    status: response.status
                });
            } else {
                console.error("[MATRIX ERROR] Rollback initiated for failed message:", response?.error);
                removeOptimisticMessage(currentRoomId, response?.tempId || tempId);
            }
        });
    }, [socket, currentRoomId, addOptimisticMessage, confirmOptimisticMessage, removeOptimisticMessage]);

    return { sendMessage };
};
import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
    // Optimistic UI State
    optimisticMessages: {},
    
    addOptimisticMessage: (roomId, message) => set((state) => {
        const currentMessages = state.optimisticMessages[roomId] || [];
        return {
            optimisticMessages: {
                ...state.optimisticMessages,
                [roomId]: [...currentMessages, { ...message, status: 'sending', tempId: Date.now() }]
            }
        };
    }),

    confirmOptimisticMessage: (roomId, tempId, confirmationData) => set((state) => {
        const currentMessages = state.optimisticMessages[roomId] || [];
        return {
            optimisticMessages: {
                ...state.optimisticMessages,
                [roomId]: currentMessages.map(msg => 
                    msg.tempId === tempId ? { ...msg, _id: confirmationData.messageId, status: confirmationData.status } : msg
                )
            }
        };
    }),

    removeOptimisticMessage: (roomId, tempId) => set((state) => {
        const currentMessages = state.optimisticMessages[roomId] || [];
        return {
            optimisticMessages: {
                ...state.optimisticMessages,
                [roomId]: currentMessages.filter(msg => msg.tempId !== tempId)
            }
        };
    }),

    // Attachment Suite State
    activeAttachment: null,
    setActiveAttachment: (attachmentData) => set({ activeAttachment: attachmentData }),
    clearActiveAttachment: () => set({ activeAttachment: null }),

    // E2E Cryptography State
    localKeyPair: null,
    setLocalKeyPair: (keys) => set({ localKeyPair: keys })
}));
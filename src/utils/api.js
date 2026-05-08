import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor automatically attaches JWT token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('synced_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Media Upload
export const uploadMediaFile = async (file) => {
    try {
        if (file.type.startsWith('audio/') || file.name.includes('voice_note')) {
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            const base64data = await base64Promise;

            const response = await apiClient.post('/messages/upload/audio', {
                audio: base64data,
                isVoiceNote: true
            });
            
            return { 
                mediaUrl: response.data.url, 
                fileSize: response.data.size, 
                fileFormat: response.data.format 
            };
        }

        const formData = new FormData();
        formData.append('media', file);

        const response = await apiClient.post('/messages/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    } catch (error) {
        console.error("Upload failed:", error);
        throw error;
    }
};

// Global Search Engine
export const searchGlobalUsers = async (query) => {
    if (!query) return [];
    const res = await apiClient.get(`/users/search?q=${query}`);
    return res.data;
};

export const searchMessages = async (query) => {
    if (!query) return [];
    const res = await apiClient.get(`/messages/search?q=${query}`);
    return res.data;
};

export const searchFiles = async (query) => {
    const res = await apiClient.get(`/messages/files?q=${query || ''}`);
    return res.data;
};

// Direct Message Routing
export const resolveDirectMessage = async (targetUserId) => {
    try {
        const res = await apiClient.post('/rooms/findOrCreate', {
            targetUserId: targetUserId
        });
        return res.data;
    } catch (error) {
        console.error("Failed to resolve Direct Message routing:", error);
        throw error;
    }
};
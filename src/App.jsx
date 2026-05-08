import { useEffect, useState, useRef, useMemo } from "react";
import io from "socket.io-client";
import Auth from "./Auth";
import { AnimatePresence, motion } from "framer-motion";
import ChatListPane from "./components/chat-list/ChatListPane";
import ActiveConversationPane from "./components/ActiveConversationPane";
import GlobalNav from "./components/GlobalNav";
import NewChatModal from "./components/NewChatModal";
import ActiveCallModal from './components/ActiveCallModal';
import CallDetailsPane from "./components/CallDetailsPane";
import { uploadMediaFile, resolveDirectMessage, apiClient } from './utils/api';
import { useWebRTC } from './hooks/useWebRTC';
import VaultModal from "./components/VaultModal";
import ForwardModal from "./components/ForwardModal";
import CallSelectionModal from "./components/CallSelectionModal";
import { CheckCircle2, MessageSquare, Phone, Radio, Hash } from 'lucide-react';
import { useIsMobile } from './hooks/useMediaQuery';
import { useChatStore } from '../store/useChatStore';
import { useSocketEvents } from './hooks/useSocketEvents';

const EmptyWorkspace = ({ icon: Icon, title, subtitle, action, actionText }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', position: 'relative' }}>
    <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
        <Icon size={52} color="var(--accent-primary)" strokeWidth={1.5} />
      </div>
      <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0 0 12px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>{title}</h2>
      <p style={{ fontSize: '1.05rem', maxWidth: '340px', textAlign: 'center', margin: '0 0 32px 0', lineHeight: '1.6', opacity: 0.8 }}>{subtitle}</p>
      {action && (
        <button onClick={action} style={{ padding: '14px 28px', backgroundColor: 'var(--accent-primary)', color: '#2A2511', border: 'none', borderRadius: '100px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(252, 203, 6, 0.25)', transition: 'all 0.2s ease' }}>
          {actionText}
        </button>
      )}
    </div>
  </div>
);

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('synced_token'));
  const [socket, setSocket] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [activeNav, setActiveNav] = useState('Chats');
  const [isTyping, setIsTyping] = useState(false);
  const isMobile = useIsMobile();

  const optimisticMessages = useChatStore((state) => state.optimisticMessages);
  const addOptimistic = useChatStore((state) => state.addOptimisticMessage);
  const removeOptimistic = useChatStore((state) => state.removeOptimisticMessage);

  const storedUser = localStorage.getItem('synced_user');
  const currentUserObj = storedUser && storedUser !== 'undefined' ? JSON.parse(storedUser) : {};
  const currentUserId = currentUserObj.id || currentUserObj._id;

  const rtc = useWebRTC(socket, currentUserId);
  const [activeCallDetails, setActiveCallDetails] = useState(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState('menu');
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [callModalAction, setCallModalAction] = useState(null);

  const searchInputRef = useRef(null);

  const mergedMessages = useMemo(() => {
    const pending = optimisticMessages[currentRoom] || [];
    return [...chatHistory, ...pending];
  }, [chatHistory, optimisticMessages, currentRoom]);

  useSocketEvents(socket, currentRoom, currentUserId, currentUserObj, setChatHistory, setAvailableRooms, setIsTyping);

  useEffect(() => {
    if (!token) return;

    const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socketUrl = rawApiUrl.replace('/api', '');

    const newSocket = io(socketUrl, { 
        auth: { token },
        transports: ['polling', 'websocket'] 
    });

    newSocket.on("connect_error", (err) => {
      if (err.message.includes("Authentication") || err.message.includes("token")) handleLogout();
    });
    setSocket(newSocket);

    apiClient.get('/users/rooms').then(res => {
      setAvailableRooms(res.data || []);
      res.data?.forEach(room => newSocket.emit('join_room', room.name));
    });
    return () => newSocket.disconnect();
  }, [token]);

  useEffect(() => {
    if (token && currentRoom && socket) {
      setChatHistory([]);
      apiClient.get(`/messages/${currentRoom}`).then(res => setChatHistory((res.data.data || []).reverse()));
      socket.emit('join_room', currentRoom);
      socket.emit('mark_room_as_read', { roomId: currentRoom });
    }
  }, [token, currentRoom, socket]);

  const sendMessage = async (payload) => {
    if (!socket || !currentRoom) return;
    try {
      let finalImageUrl = payload.imageUrl || null;
      let finalAudioUrl = payload.audioUrl || null;

      if (payload.file) {
        const uploadResult = await uploadMediaFile(payload.file);
        if (payload.type === 'audio') finalAudioUrl = uploadResult.mediaUrl;
        else finalImageUrl = uploadResult.mediaUrl;
      }

      const tempId = Date.now().toString();
      const socketPayload = {
        room: currentRoom, type: payload.type || 'text', text: payload.text || '',
        imageUrl: finalImageUrl, audioUrl: finalAudioUrl, tempId
      };

      const optimisticMsg = {
        ...socketPayload, _id: tempId, senderId: currentUserId,
        senderName: currentUserObj.username, status: 'sending', createdAt: new Date().toISOString()
      };

      addOptimistic(currentRoom, optimisticMsg);

      socket.emit('send_message', socketPayload, (ack) => {
        if (!ack || !ack.success) {
          removeOptimistic(currentRoom, tempId);
          alert("Failed to send message.");
        } else {
          removeOptimistic(currentRoom, tempId);
        }
      });
    } catch (error) {
      alert("Failed to process message.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('synced_token');
    localStorage.removeItem('synced_user');
    setToken(null);
    if (socket) socket.disconnect();
  };

  return (
    <AnimatePresence mode="wait">
      {!token ? (
        <motion.div key="auth-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(12px)' }} style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 1000 }}>
          <Auth onLoginSuccess={setToken} />
        </motion.div>
      ) : (
        <motion.div key="main-app" initial={{ opacity: 0, filter: 'blur(12px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} className="app-container">
          <GlobalNav activeNav={activeNav} setActiveNav={setActiveNav} currentRoom={currentRoom} />
          
          <ChatListPane
            activeNav={activeNav} 
            rooms={availableRooms} 
            currentRoom={currentRoom}
            setCurrentRoom={setCurrentRoom} 
            onLogout={handleLogout} 
            searchInputRef={searchInputRef}
            onGlobalAction={(action) => action === 'OPEN_VAULT' && setIsVaultModalOpen(true)}
            socket={socket}
            activeCallDetails={activeCallDetails}
            setActiveCallDetails={setActiveCallDetails}
            openModal={(mode) => {
                setCreationMode(mode);
                setIsCreationModalOpen(true);
            }}
          />

          {(!isMobile || currentRoom || activeCallDetails) && (
            <div className="active-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {activeNav === 'Chats' && currentRoom ? (
                <ActiveConversationPane
                  currentRoom={currentRoom} rooms={availableRooms} chatHistory={mergedMessages}
                  currentUser={currentUserObj} message={message} setMessage={setMessage}
                  sendMessage={sendMessage} socket={socket} isTyping={isTyping} rtc={rtc}
                />
              ) : (
                <EmptyWorkspace icon={MessageSquare} title="Synced" subtitle="Select a chat to start messaging." />
              )}
            </div>
          )}

          {/* --- MODALS --- */}
          <NewChatModal
            isOpen={isCreationModalOpen}
            onClose={() => setIsCreationModalOpen(false)}
            initialMode={creationMode}
            onRoomCreated={(room) => {
                setAvailableRooms(prev => [...prev, room]);
                setCurrentRoom(room.name);
            }}
          />

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;
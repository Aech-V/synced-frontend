import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import Auth from "./Auth";
import { AnimatePresence, motion } from "framer-motion";
import ChatListPane from "./components/chat-list/ChatListPane";
import ActiveConversationPane from "./components/ActiveConversationPane";
import GlobalNav from "./components/GlobalNav";
import NewChatModal from "./components/NewChatModal";
import ActiveCallModal from './components/ActiveCallModal';
import CallDetailsPane from "./components/CallDetailsPane";
import { uploadMediaFile, resolveDirectMessage } from './utils/api';
import { useWebRTC } from './hooks/useWebRTC';
import VaultModal from "./components/VaultModal";
import ForwardModal from "./components/ForwardModal";
import CallSelectionModal from "./components/CallSelectionModal";
import { CheckCircle2, MessageSquare, Phone, Radio, Hash } from 'lucide-react';
import { apiClient } from './utils/api';
import { useIsMobile } from './hooks/useMediaQuery';
import { useChatStore } from '../store/useChatStore';

const EmptyWorkspace = ({ icon: Icon, title, subtitle, action, actionText }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', width: '100%', backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)'
  }}>
    <div style={{
      width: '96px', height: '96px', borderRadius: '50%',
      backgroundColor: 'var(--bg-surface-hover)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      border: '1px solid var(--border-subtle)'
    }}>
      <Icon size={44} color="var(--accent-primary)" strokeWidth={1.5} />
    </div>

    <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', margin: '0 0 12px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
      {title}
    </h2>
    <p style={{ fontSize: '1rem', maxWidth: '340px', textAlign: 'center', margin: '0 0 32px 0', lineHeight: '1.6', opacity: 0.8 }}>
      {subtitle}
    </p>

    {action && (
      <button onClick={action} style={{
        padding: '14px 28px', backgroundColor: 'var(--accent-primary)',
        color: '#2A2511', border: 'none', borderRadius: '100px',
        fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem',
        boxShadow: '0 4px 14px rgba(252, 203, 6, 0.25)',
        transition: 'all 0.2s ease'
      }}
        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
      >
        {actionText}
      </button>
    )}
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

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const roomsRef = useRef(availableRooms);
  useEffect(() => { roomsRef.current = availableRooms; }, [availableRooms]);

  const currentRoomRef = useRef(currentRoom);
  useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);

  useEffect(() => {
    if (activeNav !== 'Calls') setActiveCallDetails(null);
  }, [activeNav]);

  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth <= 768) setCurrentRoom(null);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openModal('direct');
      }
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        openModal('group');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const openModal = (mode = 'menu') => {
    setCreationMode(mode);
    setIsCreationModalOpen(true);
  };

  const handleRoomCreated = (roomData) => {
    if (roomData.type !== 'secret') {
      setAvailableRooms(prev => [roomData, ...prev.filter(r => r._id !== roomData._id)]);
    }
    setCurrentRoom(roomData.name);
    if (socket) {
      socket.emit('room_created', roomData);
      socket.emit('join_room', roomData.name);
    }
  };

  useEffect(() => {
    if (!token) return;
    const newSocket = io(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : "http://localhost:5000", { auth: { token: token } });

    newSocket.on("connect_error", (err) => {
      if (err.message.includes("Authentication") || err.message.includes("token")) {
        console.warn("[NETWORK] Socket token expired or invalid. Forcing re-authentication.");
        handleLogout();
      }
    });

    setSocket(newSocket);

    apiClient.get('/users/rooms')
      .then(response => {
        const rooms = response.data || [];
        setAvailableRooms(rooms);
        rooms.forEach(room => newSocket.emit('join_room', room.name));
      })
      .catch(err => console.error("Failed to load sidebar rooms", err));

    return () => newSocket.disconnect();
  }, [token]);

  useEffect(() => {
    if (token && currentRoom && socket) {
      setChatHistory([]);
      setIsTyping(false);

      apiClient.get(`/messages/${currentRoom}`)
        .then((response) => {
          const messagesArray = response.data.data || [];
          setChatHistory(messagesArray.reverse());
        })
        .catch((err) => console.error("Failed to load history", err));

      socket.emit('join_room', currentRoom);
      socket.emit('mark_room_as_read', { roomId: currentRoom });
      
      setAvailableRooms(prev => prev.map(room => {
        if (room.name === currentRoom) return { ...room, unreadCount: 0 };
        return room;
      }));
    }
  }, [token, currentRoom, socket]);

  useEffect(() => {
    if (!token || !socket) return;

    const handleReceiveMessage = (savedMessage) => {
      const activeRoom = roomsRef.current.find(r => r.name === currentRoomRef.current);
      const isCurrentRoom = activeRoom && activeRoom._id === savedMessage.roomId; 
      const isMyMessage = savedMessage.senderId === currentUserIdRef.current;

      if (!isMyMessage) {
        socket.emit('message_delivered', { messageId: savedMessage._id, roomId: savedMessage.roomId });
        if (isCurrentRoom) {
          socket.emit('mark_as_read', { messageId: savedMessage._id, roomId: currentRoomRef.current });
        }
      }

      if (!isCurrentRoom && !isMyMessage) {
        const prefs = currentUserObj.notificationSettings || {};
        const dnd = prefs.dnd || {};
        let isOnDND = false;

        if (dnd.isActive) {
          if (!dnd.until || new Date(dnd.until) > new Date()) {
            isOnDND = true;
          }
        }

        const soundsEnabled = prefs.messageSounds !== false;
        const isVaultMessage = savedMessage.isSecretRoom === true;

        if (!isOnDND && soundsEnabled && !isVaultMessage) {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(err => console.log('Browser blocked auto-play', err));
        }
      }

      if (isCurrentRoom) {
        setChatHistory(prevChat => [...prevChat, savedMessage]);
      }

      setAvailableRooms(prev => {
        const roomIndex = prev.findIndex(r => r._id === savedMessage.roomId);
        if (roomIndex > -1) {
          const increment = (!isCurrentRoom && !isMyMessage && savedMessage.type !== 'system') ? 1 : 0;
          const updatedRoom = {
            ...prev[roomIndex],
            lastMessage: savedMessage,
            unreadCount: isCurrentRoom ? 0 : (prev[roomIndex].unreadCount || 0) + increment
          };
          const filtered = prev.filter(r => r._id !== savedMessage.roomId);
          return [updatedRoom, ...filtered];
        }
        return prev;
      });
    };

    const handleReactionUpdated = ({ messageId, emoji }) => {
      setChatHistory((prev) => prev.map(msg =>
        msg._id === messageId ? { ...msg, reaction: emoji } : msg
      ));
    };

    const handleMessageStatusUpdate = ({ messageId, status }) => {
      setChatHistory((prev) => prev.map(msg =>
        msg._id === messageId ? { ...msg, status: status } : msg
      ));
      setAvailableRooms(prev => prev.map(room => {
        if (room.lastMessage?._id === messageId) {
          return { ...room, lastMessage: { ...room.lastMessage, status } };
        }
        return room;
      }));
    };

    const handleRoomMessagesRead = ({ roomId }) => {
      if (currentRoomRef.current === roomId) {
        setChatHistory(prev => prev.map(msg => ({ ...msg, status: 'read' })));
      }
      setAvailableRooms(prev => prev.map(room => {
        if (room.name === roomId && room.lastMessage) {
          return { ...room, lastMessage: { ...room.lastMessage, status: 'read' }, unreadCount: 0 };
        }
        return room;
      }));
    };

    const handleUserTyping = ({ isTyping }) => setIsTyping(isTyping);

    const handleMessageDeleted = ({ messageId }) => {
      setChatHistory((prev) => prev.map(msg =>
        msg._id === messageId ? { ...msg, isDeleted: true, text: null, imageUrl: null, reaction: null } : msg
      ));
    };

    const handleMessageEdited = ({ messageId, newText }) => {
      setChatHistory((prev) => prev.map(msg =>
        msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg
      ));
    };

    const handleRoomPreviewUpdate = ({ roomId, text }) => {
      setAvailableRooms(prev => prev.map(r =>
        r.name === roomId ? { ...r, lastMessage: { ...r.lastMessage, text: text } } : r
      ));
    };

    const handleNewRoomAdded = (newRoom) => {
      if (newRoom.type !== 'secret') {
        socket.emit('join_room', newRoom.name);
        setAvailableRooms(prev => {
          if (prev.some(r => r._id === newRoom._id)) return prev;
          return [newRoom, ...prev];
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('room_messages_read', handleRoomMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);
    socket.on('room_preview_update', handleRoomPreviewUpdate);
    socket.on('new_room_added', handleNewRoomAdded);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('room_messages_read', handleRoomMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
      socket.off('room_preview_update', handleRoomPreviewUpdate);
      socket.off('new_room_added', handleNewRoomAdded);
    };
  }, [token, socket]);

  const sendMessage = async (payload) => {
    if (!socket || !currentRoom) return;
    try {
      let finalImageUrl = payload.imageUrl || null;
      let finalAudioUrl = payload.audioUrl || null;
      let finalFileSize = 0;
      let finalFileFormat = 'text';

      if (payload.file) {
        const uploadResult = await uploadMediaFile(payload.file);
        if (payload.type === 'audio') finalAudioUrl = uploadResult.mediaUrl;
        else finalImageUrl = uploadResult.mediaUrl;

        finalFileSize = uploadResult.fileSize || 0;
        finalFileFormat = uploadResult.fileFormat || 'unknown';
      }

      const tempId = Date.now().toString();

      const socketPayload = {
        room: currentRoom,
        type: payload.type || 'text',
        text: payload.text || '',
        imageUrl: finalImageUrl,
        audioUrl: finalAudioUrl,
        stickerData: payload.stickerData || null,
        gifUrl: payload.gifUrl || null,
        isEphemeral: payload.isEphemeral || false,
        replyTo: payload.replyTo || null,
        tempId: tempId,
        fileSize: finalFileSize,
        fileFormat: finalFileFormat
      };

      const optimisticMsg = {
        ...socketPayload,
        _id: tempId,
        senderId: currentUserId,
        senderName: currentUserObj.username,
        status: 'sending',
        replyTo: payload.replyToObj || null,
        createdAt: new Date().toISOString()
      };

      setChatHistory(prev => [...prev, optimisticMsg]);

      setAvailableRooms(prev => {
        const roomIndex = prev.findIndex(r => r.name === currentRoom);
        if (roomIndex > -1) {
            const updatedRoom = {
                ...prev[roomIndex],
                lastMessage: optimisticMsg,
            };
            const filtered = prev.filter(r => r.name !== currentRoom);
            return [updatedRoom, ...filtered]; // Jumps room to top
        }
        return prev;
      });

      socket.emit('send_message', socketPayload, (ack) => {
        if (ack && ack.success) {
          setChatHistory(prev => prev.map(msg => 
              msg._id === tempId 
                  ? { ...msg, _id: ack.messageId, status: 'sent' } 
                  : msg
          ));
          
          setAvailableRooms(prev => prev.map(room => {
              if (room.name === currentRoom && room.lastMessage?._id === tempId) {
                  return { ...room, lastMessage: { ...room.lastMessage, _id: ack.messageId, status: 'sent' } };
              }
              return room;
          }));
          
        } else {
          setChatHistory(prev => prev.filter(msg => msg._id !== tempId));
          alert("Failed to send message. Please check your network.");
        }
      });
    } catch (error) {
      console.error("Failed to process message:", error);
      alert("Failed to send message. Please check your network.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('synced_token');
    localStorage.removeItem('synced_user');
    setToken(null);
    setCurrentRoom(null);
    if (socket) socket.disconnect();
  };

  const deleteMessage = (messageId, roomId) => socket.emit('delete_message', { messageId, roomId });
  const editMessage = (messageId, roomId, newText) => socket.emit('edit_message', { messageId, roomId, newText });

  const executeForward = async (selectedTargets) => {
    if (!socket || !forwardingMessage) return;

    try {
      const finalRoomIds = [];

      for (const target of selectedTargets) {
        if (target.type === 'room') {
          finalRoomIds.push(target.id);
        } else if (target.type === 'user') {
          const res = await resolveDirectMessage(target.id);
          finalRoomIds.push(res.room._id);
        }
      }

      socket.emit('forward_message', {
        messageId: forwardingMessage._id,
        targetRoomIds: finalRoomIds
      }, (ack) => {
        if (ack && ack.success) {
          setToastMessage(`Message forwarded to ${ack.successCount} chat(s)`);
          setTimeout(() => setToastMessage(''), 3000);
          setForwardingMessage(null);
        } else {
          alert(ack?.error || "Forwarding failed.");
        }
      });
    } catch (error) {
      console.error("Forwarding preparation failed:", error);
      alert("Failed to prepare forwarding payload.");
    }
  };

  const executeCallSelection = async (selectedTargets, action) => {
    setCallModalAction(null); 
    const isVideo = action === 'START_VIDEO_CALL' || action === 'INITIATE_VIDEO_MEETING';
    const callType = isVideo ? 'video' : 'voice';
    const isGroup = action === 'START_VOICE_HUDDLE' || action === 'INITIATE_VIDEO_MEETING';

    try {
      if (!isGroup) {
        const target = selectedTargets[0];
        let roomId = target.roomId;

        if (!roomId && target.type === 'user') {
          const res = await resolveDirectMessage(target.id);
          roomId = res.room._id;
          setAvailableRooms(prev => prev.some(r => r._id === res.room._id) ? prev : [res.room, ...prev]);
          setCurrentRoom(res.room.name);
        }
        rtc.initiateCall(roomId, target.id, callType, false);
      } else {
        const targetIds = selectedTargets.map(t => t.id);
        const tempRoomId = selectedTargets[0]?.roomId || `temp_huddle_${Date.now()}`;
        rtc.initiateCall(tempRoomId, targetIds, callType, true);
      }
    } catch (error) {
      console.error("Failed to initiate call from modal:", error);
      alert("Could not start the call.");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!token ? (
        <motion.div
          key="auth-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)', scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 1000 }}
        >
          <Auth onLoginSuccess={(newToken) => setToken(newToken)} />
        </motion.div>
      ) : (
        <motion.div
          key="main-app"
          initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.95 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="app-container"
        >
          <GlobalNav activeNav={activeNav} setActiveNav={setActiveNav} currentRoom={currentRoom} />

          <ChatListPane
            activeNav={activeNav}
            rooms={availableRooms}
            currentRoom={currentRoom}
            setCurrentRoom={setCurrentRoom}
            onLogout={handleLogout}
            openModal={openModal}
            searchInputRef={searchInputRef}
            activeCallDetails={activeCallDetails}
            setActiveCallDetails={setActiveCallDetails}
            socket={socket}
            onGlobalAction={(action, data) => {
              if (action === 'OPEN_VAULT') setIsVaultModalOpen(true);
              if (['START_VOICE_CALL', 'START_VIDEO_CALL', 'START_VOICE_HUDDLE', 'INITIATE_VIDEO_MEETING'].includes(action)) {
                setCallModalAction(action);
              }
              if (action === 'REDIAL_CALL') {
                const target = { id: data.targetId, roomId: data.roomId, type: data.type };
                let simulatedAction = data.callType === 'video' ? 'START_VIDEO_CALL' : 'START_VOICE_CALL';
                if (data.isGroup) {
                  simulatedAction = data.callType === 'video' ? 'INITIATE_VIDEO_MEETING' : 'START_VOICE_HUDDLE';
                }
                executeCallSelection([target], simulatedAction);
              }
            }}
          />

          {(!isMobile || currentRoom || activeCallDetails) && (
            <div className="active-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {activeNav === 'Chats' && currentRoom ? (
                <ActiveConversationPane
                  currentRoom={currentRoom}
                  rooms={availableRooms}
                  chatHistory={chatHistory}
                  currentUser={currentUserObj}
                  message={message}
                  setMessage={setMessage}
                  sendMessage={sendMessage}
                  onCloseMobileChat={() => setCurrentRoom(null)}
                  socket={socket}
                  isTyping={isTyping}
                  rtc={rtc}
                  deleteMessage={deleteMessage}
                  editMessage={editMessage}
                  onGlobalAction={(action, data) => {
                    if (action === 'NEW_MESSAGE') openModal('direct');
                    if (action === 'CREATE_GROUP') openModal('group');
                    if (action === 'GLOBAL_SEARCH') {
                      if (window.innerWidth <= 768) setCurrentRoom(null);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                    if (action === 'OPEN_VAULT') setIsVaultModalOpen(true);
                    if (action === 'OPEN_FORWARD_MODAL') setForwardingMessage(data);
                    if (action === 'CLEAR_HISTORY') setChatHistory([]);
                  }}
                />
              ) : activeNav === 'Chats' ? (
                <EmptyWorkspace
                  icon={MessageSquare}
                  title="Synced for Web"
                  subtitle="Send and receive messages seamlessly without keeping your phone online."
                  action={() => openModal('direct')}
                  actionText="Start Conversation"
                />
              ) : activeNav === 'Calls' && activeCallDetails ? (
                <CallDetailsPane
                  details={activeCallDetails}
                  onClose={() => setActiveCallDetails(null)}
                  onGlobalAction={(action, data) => {
                    if (action === 'REDIAL_CALL') {
                      const target = { id: data.targetId, roomId: data.roomId, type: data.type };
                      let simulatedAction = data.callType === 'video' ? 'START_VIDEO_CALL' : 'START_VOICE_CALL';
                      if (data.isGroup) {
                        simulatedAction = data.callType === 'video' ? 'INITIATE_VIDEO_MEETING' : 'START_VOICE_HUDDLE';
                      }
                      executeCallSelection([target], simulatedAction);
                    }
                  }}
                />
              ) : activeNav === 'Calls' ? (
                <EmptyWorkspace
                  icon={Phone}
                  title="Your Calls"
                  subtitle="Select a contact from the list to start a high-quality voice or video call."
                />
              ) : activeNav === 'Status' ? (
                <EmptyWorkspace
                  icon={Radio}
                  title="Status Updates"
                  subtitle="Stay updated with your friends. Click on a status to view it."
                />
              ) : (
                <EmptyWorkspace
                  icon={Hash}
                  title="Channels"
                  subtitle="Discover and join channels to stay updated on what matters to you."
                />
              )}
            </div>
          )}

          <ActiveCallModal rtc={rtc} availableRooms={availableRooms} currentUser={currentUserObj} />

          <NewChatModal
            isOpen={isCreationModalOpen}
            initialMode={creationMode}
            onClose={() => setIsCreationModalOpen(false)}
            onRoomCreated={handleRoomCreated}
          />

          <VaultModal
            isOpen={isVaultModalOpen}
            onClose={() => setIsVaultModalOpen(false)}
            onRoomUnlocked={(roomData) => {
              if (roomData.type !== 'secret') {
                setAvailableRooms(prev => [roomData, ...prev.filter(r => r._id !== roomData._id)]);
              }
              setCurrentRoom(roomData.name);
            }}
          />

          <CallSelectionModal
            isOpen={!!callModalAction}
            action={callModalAction}
            onClose={() => setCallModalAction(null)}
            availableRooms={availableRooms}
            onExecuteCall={executeCallSelection}
          />

          <ForwardModal
            isOpen={!!forwardingMessage}
            onClose={() => setForwardingMessage(null)}
            messageToForward={forwardingMessage}
            availableRooms={availableRooms}
            onForward={executeForward}
          />

          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }}
                style={{ position: 'fixed', bottom: '40px', left: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 24px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', fontWeight: 'bold' }}
              >
                <CheckCircle2 size={20} color="var(--accent-primary)" />
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;
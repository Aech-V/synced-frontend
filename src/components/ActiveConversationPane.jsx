import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './message/MessageBubble';
import ContextMenu from './ContextMenu';
import ChatHeader from './ChatHeader';
import ComposerInput from './composer/ComposerInput';
import { Search, Edit, Users } from 'lucide-react';
import AssetDrawer from './assets/AssetDrawer';
import ContactProfilePanel from './ContactProfilePanel';
import SearchChatOverlay from './message/SearchChatOverlay';
import { triggerHaptic } from '../utils/haptics';
import { apiClient } from '../utils/api';
import { useIsMobile } from '../hooks/useMediaQuery';

const ActiveConversationPane = ({ currentRoom, rooms = [], chatHistory, currentUser, message, setMessage, sendMessage, onCloseMobileChat, onGlobalAction, socket, isTyping, rtc, editMessage, deleteMessage }) => {
    const [contextState, setContextState] = useState({ isOpen: false, x: 0, y: 0, msg: null });
    const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyingMessage, setReplyingMessage] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const currentUserObj = JSON.parse(localStorage.getItem('synced_user')) || {};

    const isMobile = useIsMobile();

    const handleOpenContext = (x, y, msg) => setContextState({ isOpen: true, x, y, msg });

    const handleContextAction = (action, msg) => {
        triggerHaptic('light');
        if (action === 'DELETE') deleteMessage(msg._id, currentRoom);
        if (action === 'EDIT') {
            setEditingMessage(msg);
            setMessage(msg.text || '');
        }
        if (action === 'REPLY') setReplyingMessage(msg);
        if (action === 'FORWARD') {
            if (onGlobalAction) onGlobalAction('OPEN_FORWARD_MODAL', msg);
        }
    };

    const handleAssetSelect = (asset) => {
        setIsAssetDrawerOpen(false);
        triggerHaptic('success');

        if (asset.type === 'text') {
            setMessage(prev => prev + asset.text);
        } else {
            console.log("[SOCKET]: Emitting rich media payload:", asset);
            sendMessage(asset);
        }
    };

    const handleReact = (msgId, emoji) => {
        if (socket && currentRoom) {
            socket.emit('add_reaction', { messageId: msgId, roomId: currentRoom, emoji: emoji });
        }
    };

    const handleSearch = (query) => {
        if (!query) {
            setSearchResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matches = chatHistory.filter(msg =>
            msg.text && msg.text.toLowerCase().includes(lowerQuery)
        );
        setSearchResults(matches);
    };

    const handleJumpToMessage = (messageId) => {
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.transition = 'background-color 0.3s ease';
            element.style.backgroundColor = 'rgba(252, 203, 6, 0.15)';

            setTimeout(() => {
                element.style.backgroundColor = 'transparent';
            }, 2000);
            setIsSearchOpen(false);
        } else {
            alert("This message is deeper in your history. Scroll up to load older messages first.");
        }
    };

    // INTERCEPT GLOBAL ACTIONS TO HANDLE BACKEND API CALLS DIRECTLY
    const handleInterceptedGlobalAction = (action, data) => {
        if (action === 'CLEAR_HISTORY') {
            const activeRoomObj = rooms.find(r => r.name === currentRoom);
            if (activeRoomObj) {
                apiClient.put(`/rooms/${activeRoomObj._id}/clearHistory`)
                    .then(() => {
                        if (onGlobalAction) onGlobalAction('CLEAR_HISTORY');
                    })
                    .catch(e => alert("Failed to clear history on the server."));
            }
        } else if (onGlobalAction) {
            onGlobalAction(action, data);
        }
    };

    return (
        <motion.div
            className="active-workspace"
            initial={false}
            animate={{ x: isMobile ? (currentRoom ? '0%' : '100%') : '0%' }}
            transition={{ type: "spring", stiffness: 350, damping: 30, mass: 1 }}
            style={{
                position: isMobile ? 'fixed' : 'relative',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: isMobile ? 100 : 1,
                display: 'flex', flexDirection: 'row',
                backgroundColor: 'var(--bg-primary)',
                pointerEvents: (!currentRoom && isMobile) ? 'none' : 'auto',
                overflow: 'hidden'
            }}
        >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
                {!currentRoom ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, padding: '24px' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                            style={{ textAlign: 'center', marginBottom: '40px' }}
                        >
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', border: '1px solid var(--border-subtle)' }}>
                                <img src="/synced-logo.png" alt="Workspace" style={{ width: '48px', filter: 'grayscale(100%)', opacity: 0.3 }} />
                            </div>
                            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                                {/* First JSX block: The Greeting */}
                                {(() => {
                                    const hour = new Date().getHours();
                                    if (hour < 12) return 'Good morning';
                                    if (hour < 18) return 'Good afternoon';
                                    return 'Good evening';
                                })()},
                                {currentUserObj?.username || 'User'}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>What would you like to do today?</p>
                        </motion.div>

                        <motion.div
                            initial="hidden" animate="show"
                            variants={{
                                hidden: { opacity: 0 },
                                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                            }}
                            style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px', marginBottom: '48px' }}
                        >
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="action-card" onClick={() => onGlobalAction && onGlobalAction('GLOBAL_SEARCH')}>
                                <div className="card-icon"><Search size={24} strokeWidth={2} /></div>
                                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Global Search</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Ctrl + K</kbd>
                                </p>
                            </motion.div>

                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="action-card" onClick={() => onGlobalAction && onGlobalAction('NEW_MESSAGE')}>
                                <div className="card-icon"><Edit size={24} strokeWidth={2} /></div>
                                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Direct Message</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Alt + N</kbd>
                                </p>
                            </motion.div>

                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="action-card" onClick={() => onGlobalAction && onGlobalAction('CREATE_GROUP')}>
                                <div className="card-icon"><Users size={24} strokeWidth={2} /></div>
                                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Create Group</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Alt + G</kbd>
                                </p>
                            </motion.div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                            style={{ width: '100%', maxWidth: '600px' }}
                        >
                            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', textAlign: 'left' }}>Suggested Contacts</h4>
                            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                                {rooms.filter(r => r.type === 'direct').slice(0, 4).map(room => {
                                    const otherUser = room.participants?.find(p => p.userId?._id !== (currentUserObj.id || currentUserObj._id))?.userId;
                                    if (!otherUser) return null;
                                    return (
                                        <div
                                            key={room._id}
                                            onClick={() => onGlobalAction && onGlobalAction('NEW_MESSAGE')}
                                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
                                        >
                                            <img src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.username}&background=random`} alt={otherUser.username} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{otherUser.username}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{otherUser.isOnline ? 'Online' : 'Offline'}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {rooms.filter(r => r.type === 'direct').length === 0 && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>Your active contacts will appear here.</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    <div
                        className="active-conversation-wrapper"
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            position: 'relative',
                            backgroundImage: 'var(--chat-bg-image)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundAttachment: 'fixed',
                            boxShadow: 'inset 0 0 0 2000px var(--chat-bg-dim)'
                        }}
                    >
                        <ChatHeader
                            currentRoom={currentRoom}
                            roomObj={rooms.find(r => r.name === currentRoom)}
                            onCloseMobileChat={onCloseMobileChat}
                            onOpenProfile={() => setIsProfileOpen(true)}
                            onGlobalAction={handleInterceptedGlobalAction}
                            isTyping={isTyping}
                            rtc={rtc}
                            onOpenSearch={() => setIsSearchOpen(true)}
                        />


                        <div style={{ flexGrow: 1, padding: '24px 24px 8px 24px', backgroundColor: 'transparent', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '0px' }}>

                            {chatHistory.length === 0 ? (
                                <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>No messages yet. Initialize the channel.</div>
                            ) : (
                                [...chatHistory].reverse().map((msg, index, array) => {
                                    const currentUserId = currentUserObj.id || currentUserObj._id;
                                    const msgSenderId = msg.senderId?._id || msg.senderId;
                                    const isMine = msgSenderId === currentUserId;

                                    const olderMsg = array[index + 1];
                                    const newerMsg = array[index - 1];

                                    const olderSenderId = olderMsg?.senderId?._id || olderMsg?.senderId;
                                    const newerSenderId = newerMsg?.senderId?._id || newerMsg?.senderId;

                                    const clusterOlder = olderMsg && olderSenderId === msgSenderId && Math.abs(new Date(msg.createdAt) - new Date(olderMsg.createdAt)) < 60000;
                                    const clusterNewer = newerMsg && newerSenderId === msgSenderId && Math.abs(new Date(msg.createdAt) - new Date(newerMsg.createdAt)) < 60000;

                                    const isFirstInCluster = !clusterOlder;
                                    let tr = 'var(--bubble-radius)'; let tl = 'var(--bubble-radius)';
                                    let br = 'var(--bubble-radius)'; let bl = 'var(--bubble-radius)';
                                    if (isMine) { if (clusterOlder) tr = '4px'; if (clusterNewer) br = '4px'; }
                                    else { if (clusterOlder) tl = '4px'; if (clusterNewer) bl = '4px'; }

                                    return (
                                        <MessageBubble
                                            key={msg._id || index} msg={msg} isMine={isMine}
                                            radii={{ tl, tr, br, bl, clusterNext: clusterNewer }}
                                            showHeader={isFirstInCluster} isFirstInCluster={isFirstInCluster}
                                            isHighlighted={contextState.isOpen && contextState.msg?._id === msg._id}
                                            onOpenContext={handleOpenContext}
                                            onCloseContext={() => setContextState({ ...contextState, isOpen: false })}
                                            onReact={handleReact}
                                            onSwipeReply={() => handleContextAction('REPLY', msg)}
                                        />
                                    )
                                })
                            )}

                            <div id="infinite-scroll-trigger" style={{ height: '20px', width: '100%', flexShrink: 0 }} />
                        </div>

                        <ComposerInput
                            currentRoom={currentRoom} message={message} setMessage={setMessage}
                            sendMessage={sendMessage} onOpenAssets={() => setIsAssetDrawerOpen(true)}
                            editingMessage={editingMessage}
                            editMessage={editMessage}
                            onCancelEdit={() => {
                                setEditingMessage(null);
                                setMessage('');
                            }}
                            replyingMessage={replyingMessage}
                            onCancelReply={() => setReplyingMessage(null)}
                        />

                        <AnimatePresence>
                            {isAssetDrawerOpen && (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 105, pointerEvents: 'none' }}>
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        onClick={() => setIsAssetDrawerOpen(false)}
                                        style={{ position: 'absolute', inset: 0, backgroundColor: isMobile ? 'rgba(0,0,0,0.5)' : 'transparent', pointerEvents: 'auto' }}
                                    />

                                    <div style={{ position: 'absolute', bottom: isMobile ? '0' : '80px', left: isMobile ? '0' : '24px', pointerEvents: 'auto' }}>
                                        <AssetDrawer onSelect={handleAssetSelect} onClose={() => setIsAssetDrawerOpen(false)} />
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {(() => {
                    const activeRoomObj = rooms.find(r => r.name === currentRoom);
                    const myParticipantRecord = activeRoomObj?.participants?.find(p => (p.userId?._id || p.userId) === (currentUserObj.id || currentUserObj._id));
                    const isAdmin = myParticipantRecord?.role === 'admin';

                    return (
                        <ContextMenu
                            isOpen={contextState.isOpen}
                            x={contextState.x}
                            y={contextState.y}
                            message={contextState.msg}
                            onClose={() => setContextState({ ...contextState, isOpen: false })}
                            onAction={handleContextAction}
                            currentUserId={currentUserObj.id || currentUserObj._id}
                            isAdmin={isAdmin}
                        />
                    );
                })()}
            </div>

            <AnimatePresence>
                {isProfileOpen && currentRoom && (() => {
                    const activeRoomObj = rooms.find(r => r.name === currentRoom);
                    const targetUserRecord = activeRoomObj?.participants?.find(p => (p.userId?._id || p.userId) !== (currentUserObj.id || currentUserObj._id));
                    const targetUserObj = targetUserRecord?.userId || { username: currentRoom };

                    return (
                        <ContactProfilePanel
                            roomName={currentRoom}
                            roomId={activeRoomObj?._id}
                            targetUser={targetUserObj}
                            isMobile={isMobile}
                            onClose={() => setIsProfileOpen(false)}
                            onCall={(type) => {
                                setIsProfileOpen(false);

                                const targetId = targetUserObj._id || targetUserObj;

                                if (rtc && rtc.initiateCall) {
                                    rtc.initiateCall(activeRoomObj._id, targetId, type, false);
                                } else if (onGlobalAction) {
                                    onGlobalAction('INITIATE_CALL', { targetUser: targetUserObj, type });
                                }
                            }}
                        />
                    );
                })()}
            </AnimatePresence>
        </motion.div>
    );
};

export default ActiveConversationPane;
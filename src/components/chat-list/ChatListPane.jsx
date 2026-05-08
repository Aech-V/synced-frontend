import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useDebounce } from '../../hooks/useDebounce';
import FloatingActionButton from '../FloatingActionButton';
import StatusViewerModal from '../StatusViewerModal';
import CallDetailsPane from '../CallDetailsPane';
import ChatListHeader from './ChatListHeader';
import SearchAndFilter from './SearchAndFilter';
import RoomList from './RoomList';
import StatusTab from './StatusTab';
import CallsTab from './CallsTab';

const ChatListPane = ({ activeNav, rooms = [], currentRoom, setCurrentRoom, onLogout, onGlobalAction, openModal, searchInputRef, activeCallDetails, setActiveCallDetails, socket }) => {
    // Top-Level State
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Modal Management
    const [viewingStatus, setViewingStatus] = useState(null);

    // Hooks
    const isOnline = useNetworkStatus();
    const debouncedQuery = useDebounce(searchQuery, 300);

    useEffect(() => {
        setIsSearching(searchQuery !== debouncedQuery);
    }, [searchQuery, debouncedQuery]);

    useEffect(() => {
        if (activeNav === 'Channels') {
            setActiveFilter('Channels');
        } else if (activeNav === 'Chats' && activeFilter === 'Channels') {
            setActiveFilter('All');
        }
    }, [activeNav]);

    // Bulk Read Sync
    useEffect(() => {
        if (currentRoom && socket) {
            socket.emit('mark_room_as_read', { roomId: currentRoom });
        }
    }, [currentRoom, socket]);

    // Missed Message Sync
    useEffect(() => {
        if (isOnline && socket && currentRoom) {
            const room = rooms.find(r => r.name === currentRoom || r._id === currentRoom);
            if (room && room.lastMessage) {
                const lastMessageId = typeof room.lastMessage === 'object' ? room.lastMessage._id : room.lastMessage;
                socket.emit('sync_missed_messages', { roomId: currentRoom, lastMessageId });
            }
        }
    }, [isOnline, socket, currentRoom, rooms]);

    return (
        <div className="chat-list-pane" style={{ position: 'relative' }}>
            <ChatListHeader
                isOnline={isOnline}
                onGlobalAction={onGlobalAction}
                onLogout={onLogout}
                onOpenMenu={() => onGlobalAction && onGlobalAction('open_settings')}
                onNewChat={() => openModal('direct')} 
            />

            <div style={{ flexGrow: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {['Chats', 'Channels'].includes(activeNav) && (
                    <>
                        <SearchAndFilter
                            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                            isSearchFocused={isSearchFocused} setIsSearchFocused={setIsSearchFocused}
                            isSearching={isSearching} debouncedQuery={debouncedQuery}
                            activeFilter={activeFilter} setActiveFilter={setActiveFilter}
                            onGlobalAction={onGlobalAction}
                            rooms={rooms}
                            setCurrentRoom={setCurrentRoom}
                            searchInputRef={searchInputRef}
                        />
                        <RoomList
                            rooms={rooms}
                            currentRoom={currentRoom} setCurrentRoom={setCurrentRoom}
                            searchQuery={searchQuery} activeFilter={activeFilter}
                        />
                    </>
                )}

                {activeNav === 'Status' && <StatusTab setViewingStatus={setViewingStatus} />}
                {activeNav === 'Calls' && <CallsTab setActiveCallDetails={setActiveCallDetails} onGlobalAction={onGlobalAction} />}
            </div>

            <FloatingActionButton
                activeNav={activeNav}
                onAction={(actionType) => openModal(actionType)} 
                onGlobalAction={onGlobalAction} 
            />

            <AnimatePresence>
                {viewingStatus && <StatusViewerModal status={viewingStatus} onClose={() => setViewingStatus(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default ChatListPane;
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Smile, Sticker, Gift } from 'lucide-react';
import EmojiTab from './EmojiTab';
import StickerGrid from './StickerGrid';
import GifTab from './GifTab';
import { useIsMobile } from '../../hooks/useMediaQuery';

// Tab configuration
const TABS = [
    { id: 'emojis', icon: Smile, label: 'Emojis' },
    { id: 'stickers', icon: Sticker, label: 'Stickers' },
    { id: 'gifs', icon: Gift, label: 'GIFs' }
];

const AssetDrawer = ({ onSelect, onClose }) => {
    const [activeTab, setActiveTab] = useState('emojis');
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const isMobile = useIsMobile();

    // Mobile-specific slide-up animation
    const isMobileAnimation = { 
        initial: { y: '100%', opacity: 1 }, 
        animate: { y: 0, opacity: 1 }, 
        exit: { y: '100%', opacity: 1 } 
    };
    
    // Desktop-specific fade and scale animation
    const isDesktopAnimation = { 
        initial: { opacity: 0, y: 20, scale: 0.95 }, 
        animate: { opacity: 1, y: 0, scale: 1 }, 
        exit: { opacity: 0, y: 20, scale: 0.95 } 
    };
    
    const animProps = isMobile ? isMobileAnimation : isDesktopAnimation;

    return (
        <motion.div 
            {...animProps}
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ 
                position: isMobile ? 'fixed' : 'absolute', 
                bottom: isMobile ? '0px' : 'calc(100% + 10px)', 
                left: isMobile ? '0px' : '0px', 
                width: isMobile ? '100vw' : '350px', 
                height: '350px', 
                backgroundColor: 'var(--bg-surface)', 
                borderTopLeftRadius: '24px', 
                borderTopRightRadius: '24px', 
                borderBottomLeftRadius: isMobile ? '0px' : '24px', 
                borderBottomRightRadius: isMobile ? '0px' : '24px', 
                border: isMobile ? 'none' : '1px solid var(--border-subtle)', 
                boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', 
                zIndex: 999999, 
                display: 'flex', 
                flexDirection: 'column',
                transformOrigin: 'bottom left', 
                overflow: 'hidden'
            }}
        >
            {/* Mobile drag handle indicator */}
            {isMobile && (
                <div style={{ 
                    width: '40px', 
                    height: '4px', 
                    backgroundColor: 'var(--border-subtle)', 
                    borderRadius: '2px', 
                    margin: '12px auto', 
                    flexShrink: 0 
                }} />
            )}
            
            {/* Navigation and Search Container */}
            <div style={{ 
                padding: '0 20px', 
                paddingTop: isMobile ? 0 : '16px', 
                position: 'relative', 
                height: '50px', 
                display: 'flex', 
                alignItems: 'center' 
            }}>
                <AnimatePresence mode="wait">
                    {!isSearching ? (
                        // Tab Selection Interface
                        <motion.div 
                            key="tabs" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            style={{ display: 'flex', gap: '24px', flex: 1 }}
                        >
                            {TABS.map(tab => (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setActiveTab(tab.id)} 
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                                        transition: 'color 0.2s' 
                                    }}
                                >
                                    <tab.icon size={20} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{tab.label}</span>
                                </button>
                            ))}
                        </motion.div>
                    ) : (
                        // Search Input Interface
                        <motion.div 
                            key="search" 
                            initial={{ x: 50, opacity: 0 }} 
                            animate={{ x: 0, opacity: 1 }} 
                            exit={{ x: 50, opacity: 0 }} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                flex: 1, 
                                backgroundColor: 'var(--bg-primary)', 
                                borderRadius: '12px', 
                                padding: '0 12px' 
                            }}
                        >
                            <Search size={18} color="var(--text-secondary)" />
                            <input 
                                autoFocus 
                                placeholder={`Search ${activeTab}...`} 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                style={{ 
                                    flex: 1, 
                                    background: 'none', 
                                    border: 'none', 
                                    padding: '10px', 
                                    color: 'var(--text-primary)', 
                                    outline: 'none' 
                                }} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Search Toggle Button */}
                {activeTab !== 'emojis' && (
                    <button 
                        onClick={() => setIsSearching(!isSearching)} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            padding: '8px', 
                            cursor: 'pointer' 
                        }}
                    >
                        {isSearching ? <X size={20} /> : <Search size={20} />}
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: activeTab === 'emojis' ? '0' : '20px' 
            }}>
                {activeTab === 'emojis' && <EmojiTab onSelect={onSelect} />}
                {activeTab === 'stickers' && <StickerGrid onSelect={onSelect} />}
                {activeTab === 'gifs' && (
                    <GifTab 
                        onSelect={onSelect} 
                        searchQuery={searchQuery} 
                        isMobile={isMobile} 
                    />
                )}
            </div>
        </motion.div>
    );
};

export default AssetDrawer;
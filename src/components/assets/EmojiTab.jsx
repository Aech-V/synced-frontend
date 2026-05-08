import React from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const EmojiTab = ({ onSelect }) => {
    const handleEmojiClick = (emojiData) => {
        onSelect({
            type: 'text',
            text: emojiData.emoji
        });
    };

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <EmojiPicker 
                onEmojiClick={handleEmojiClick}
                theme={Theme.AUTO}
                width="100%"
                height="100%"
                lazyLoadEmojis={true}
                searchDisabled={false}
                skinTonesDisabled={false}
                style={{ 
                    '--epr-bg-color': 'transparent',
                    '--epr-border-color': 'transparent'
                }}
            />
        </div>
    );
};

export default EmojiTab;
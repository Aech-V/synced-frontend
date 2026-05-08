import React from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

// Initialize Giphy. Consider moving the key to a .env file later!
const gf = new GiphyFetch('hYu2Rfb1KaJThK3AiFYjjjEF5fcgKo91');

const GifTab = ({ onSelect, searchQuery, isMobile }) => {
    const fetchGifs = (offset) => {
        if (searchQuery.trim()) {
            return gf.search(searchQuery, { offset, limit: 15 });
        }
        return gf.trending({ offset, limit: 15 });
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <Grid
                key={searchQuery} 
                fetchGifs={fetchGifs}
                width={isMobile ? window.innerWidth - 40 : 340} 
                columns={2} 
                gutter={8}
                noLink={true}
                onGifClick={(gif, e) => {
                    e.preventDefault();
                    const gifUrl = gif.images.fixed_height.url;
                    onSelect({ type: 'gif', gifUrl: gifUrl });
                }}
            />
        </div>
    );
};

export default GifTab;
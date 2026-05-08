import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import LottieWrapper from 'lottie-react';
import StickerStudio from './StickerStudio';
import happyDog from '../../assets/stickers/happy-dog.json';
import cuteDoggie from '../../assets/stickers/cute-doggie.json';
import happyFace from '../../assets/stickers/happy-face.json';

const Lottie = LottieWrapper.default || LottieWrapper;

const STICKER_DB = [
    { id: 's1', data: happyDog }, 
    { id: 's2', data: cuteDoggie },
    { id: 's3', data: happyFace }
];

const StickerGrid = ({ onSelect }) => {
    const [showStudio, setShowStudio] = useState(false);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <motion.div 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowStudio(true)}
                style={{ aspectRatio: '1/1', borderRadius: '16px', border: '2px dashed var(--accent-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', color: 'var(--accent-primary)' }}
            >
                <Plus size={24} />
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Create</span>
            </motion.div>

            {STICKER_DB.map(sticker => (
                <motion.div 
                    key={sticker.id} 
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        if (sticker.data) onSelect({ type: 'sticker', stickerData: sticker.data });
                    }} 
                    style={{ cursor: 'pointer' }}
                >
                    {sticker.data ? (
                        <Lottie animationData={sticker.data} loop={true} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <div style={{ aspectRatio: '1/1', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>JSON missing</div>
                    )}
                </motion.div>
            ))}

            <AnimatePresence>
                {showStudio && <StickerStudio onClose={() => setShowStudio(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default StickerGrid;
import React, { useRef } from 'react';
import { motion } from 'framer-motion';

const StickerStudio = ({ onClose }) => {
    const canvasRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, 400, 400);
                ctx.drawImage(img, 0, 0, 400, 400);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
        >
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '450px' }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Sticker Studio</h3>
                <canvas ref={canvasRef} width={400} height={400} style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'var(--bg-primary)', borderRadius: '12px' }} />
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginTop: '16px', display: 'block', width: '100%' }} />
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
                    <button style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'var(--accent-primary)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Create</button>
                </div>
            </div>
        </motion.div>
    );
};

export default StickerStudio;
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crop, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const ImageCropperModal = ({ isOpen, onClose, imageFile, onCropComplete }) => {
    const canvasRef = useRef(null);
    const [imageObj, setImageObj] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const CANVAS_SIZE = 300; 

    // Lifecycle Management
    useEffect(() => {
        if (isOpen && imageFile) {
            const url = URL.createObjectURL(imageFile);
            const img = new Image();
            img.onload = () => {
                setImageObj(img);
                setZoom(1);
                setPan({ x: 0, y: 0 });
            };
            img.src = url;
        }
    }, [isOpen, imageFile]);

    // Render Engine
    useEffect(() => {
        if (!imageObj || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const scale = Math.max(CANVAS_SIZE / imageObj.width, CANVAS_SIZE / imageObj.height) * zoom;
        const scaledWidth = imageObj.width * scale;
        const scaledHeight = imageObj.height * scale;

        const x = (CANVAS_SIZE - scaledWidth) / 2 + pan.x;
        const y = (CANVAS_SIZE - scaledHeight) / 2 + pan.y;

        ctx.drawImage(imageObj, x, y, scaledWidth, scaledHeight);

        // Path geometry fix applied here
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.moveTo(CANVAS_SIZE, CANVAS_SIZE / 2); // Prevents the diagonal cut
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2, true);
        ctx.fill();
        
        ctx.strokeStyle = 'var(--accent-primary)';
        ctx.lineWidth = 2;
        ctx.stroke();

    }, [imageObj, zoom, pan]);

    // Gesture Handlers
    const handlePointerDown = (e) => {
        setIsDragging(true);
        setDragStart({ 
            x: e.clientX || e.touches[0].clientX, 
            y: e.clientY || e.touches[0].clientY 
        });
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;
        
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: clientX, y: clientY });
    };

    const handlePointerUp = () => setIsDragging(false);

    // Extraction Routine
    const handleCrop = () => {
        triggerHaptic('success');
        if (!imageObj || !canvasRef.current) return;

        const exportCanvas = document.createElement('canvas');
        const EXPORT_SIZE = 400; 
        exportCanvas.width = EXPORT_SIZE;
        exportCanvas.height = EXPORT_SIZE;
        const exportCtx = exportCanvas.getContext('2d');

        const scale = Math.max(EXPORT_SIZE / imageObj.width, EXPORT_SIZE / imageObj.height) * zoom;
        const scaledWidth = imageObj.width * scale;
        const scaledHeight = imageObj.height * scale;
        
        const panRatio = EXPORT_SIZE / CANVAS_SIZE;
        const x = (EXPORT_SIZE - scaledWidth) / 2 + (pan.x * panRatio);
        const y = (EXPORT_SIZE - scaledHeight) / 2 + (pan.y * panRatio);

        exportCtx.drawImage(imageObj, x, y, scaledWidth, scaledHeight);

        exportCanvas.toBlob((blob) => {
            const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            onCropComplete(croppedFile);
        }, 'image/jpeg', 0.9);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    style={{ backgroundColor: 'var(--bg-surface)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '24px', position: 'relative', border: '1px solid var(--border-subtle)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Crop size={20} /> Adjust Photo</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                    </div>

                    <div 
                        style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                        onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
                        onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
                    >
                        <canvas 
                            ref={canvasRef} 
                            width={CANVAS_SIZE} 
                            height={CANVAS_SIZE} 
                            style={{ borderRadius: '16px', backgroundColor: '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', padding: '0 16px' }}>
                        <ZoomOut size={20} color="var(--text-secondary)" />
                        <input 
                            type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--accent-primary)' }} 
                        />
                        <ZoomIn size={20} color="var(--text-secondary)" />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleCrop} style={{ flex: 1, padding: '14px', background: 'var(--accent-primary)', color: 'var(--accent-text, var(--bg-primary))', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Check size={18}/> Apply</button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageCropperModal;
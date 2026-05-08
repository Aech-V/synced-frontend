import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { triggerHaptic } from '../../utils/haptics';

const VoidViewer = ({ imageUrl, messageId, onClose, onBurned }) => {
    const [timeLeft, setTimeLeft] = useState(7);
    const [isBurning, setIsBurning] = useState(false);

    useEffect(() => {
        if (timeLeft === 0 && !isBurning) {
            triggerBurn();
            return;
        }
        
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev > 0 ? prev - 1 : 0);
        }, 1000);
        
        return () => clearInterval(timer);
    }, [timeLeft, isBurning]);

    // The Destruction Protocol
    const triggerBurn = async () => {
        setIsBurning(true);
        try {
            await axios.delete(`http://localhost:5000/api/messages/burn/${messageId}`);
            triggerHaptic('error'); 
            if (onBurned) onBurned(messageId);
            setTimeout(() => onClose(), 800); 
            
        } catch (error) {
            console.error("[SECURITY ERROR]: Failed to burn payload on server:", error);
            onClose(); // Failsafe close
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
                {/* Security Header */}
                <div style={{ position: 'absolute', top: '40px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <span style={{ color: '#ef4444', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.85rem' }}>VOID PROTOCOL ACTIVE</span>
                </div>

                {/* The Ephemeral Image */}
                <motion.div 
                    animate={isBurning ? { scale: 0.8, filter: 'blur(20px) brightness(2)', opacity: 0 } : { scale: 1, filter: 'blur(0px) brightness(1)', opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    style={{ position: 'relative', maxWidth: '90%', maxHeight: '70vh' }}
                >
                    <img src={imageUrl} alt="Ephemeral Content" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '16px', objectFit: 'contain' }} />
                </motion.div>

                {/* The Burn Timer */}
                <div style={{ position: 'absolute', bottom: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '3rem', fontWeight: '900', color: isBurning ? '#ef4444' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        00:0{timeLeft}
                    </div>
                    {isBurning ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            <Flame size={20} /> PAYLOAD DESTROYED
                        </motion.div>
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Image will permanently self-destruct</div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VoidViewer;
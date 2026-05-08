import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Image as ImageIcon, Zap } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const CameraModal = ({ isOpen, onClose, onCapture, onOpenGallery }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [flashOn, setFlashOn] = useState(false);

    // Start Camera securely and optimize battery by killing tracks on unmount
    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 } },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error("Camera access denied or failed:", error);
            alert("Unable to access camera. Please check permissions.");
            onClose();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const takePhoto = () => {
        triggerHaptic('success');
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw current video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(file); // Pass back to composer
                    stopCamera();
                    onClose();
                }
            }, 'image/jpeg', 0.9);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
            {/* Top Bar */}
            <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 }}>
                <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
                    <X size={28} />
                </button>
                <button onClick={() => { triggerHaptic('light'); setFlashOn(!flashOn); }} style={{ background: 'none', border: 'none', color: flashOn ? 'var(--accent-primary)' : '#fff', cursor: 'pointer', padding: '8px' }}>
                    <Zap size={24} />
                </button>
            </div>

            {/* Viewfinder */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: flashOn ? 'brightness(1.2)' : 'none' }} 
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Bottom Controls */}
            <div style={{ padding: '32px 24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000' }}>
                <button onClick={() => { stopCamera(); onOpenGallery(); }} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                    <ImageIcon size={24} />
                </button>

                <button onClick={takePhoto} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '4px solid #fff', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '2px' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.1s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                </button>

                <div style={{ width: '48px' }} /> {/* Spacer for centering */}
            </div>
        </div>
    );
};

export default CameraModal;
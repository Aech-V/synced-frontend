import React from 'react';
import { X, Navigation, Copy } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const InteractiveMapModal = ({ isOpen, onClose, latitude, longitude, address }) => {
    if (!isOpen) return null;

    // A generic embed URL (e.g., Google Maps embed)
    const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${latitude},${longitude}`;

    const handleCopy = () => {
        triggerHaptic('success');
        navigator.clipboard.writeText(`${latitude}, ${longitude}`);
        // Typically trigger a toast here
    };

    const handleDirections = () => {
        triggerHaptic('light');
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Location</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={24} />
                </button>
            </div>

            {/* Interactive Embed */}
            <div style={{ flex: 1, backgroundColor: '#e5e5e5' }}>
                <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    style={{ border: 0 }} 
                    src={mapEmbedUrl} 
                    allowFullScreen 
                />
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{address || "Dropped Pin"}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{latitude}, {longitude}</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleDirections} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Navigation size={18} /> Get Directions
                    </button>
                    <button onClick={handleCopy} style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Copy size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InteractiveMapModal;
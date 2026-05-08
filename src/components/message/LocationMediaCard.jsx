import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import InteractiveMapModal from './InteractiveMapModal'; // Created in step 4

const LocationMediaCard = ({ latitude, longitude, address, isOwn }) => {
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    // Using Google Maps Static API format as an example
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=400x200&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`;

    const bgColor = isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? '#ffffff' : 'var(--text-primary)';

    return (
        <>
            <div 
                onClick={() => setIsMapModalOpen(true)}
                style={{ 
                    display: 'flex', flexDirection: 'column', padding: '4px', 
                    backgroundColor: bgColor, borderRadius: '16px', width: '260px', 
                    cursor: 'pointer', overflow: 'hidden'
                }}
            >
                {/* Static Map Image */}
                <div style={{ width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                    <img 
                        src={staticMapUrl} 
                        alt="Location Map" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        // Fallback if API key isn't set yet
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200.png?text=Map+Unavailable' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '8px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                            <MapPin size={24} color="#ef4444" />
                        </div>
                    </div>
                </div>

                {/* Address Bar */}
                <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Shared Location
                    </span>
                    <span style={{ fontSize: '0.75rem', color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                    </span>
                </div>
            </div>

            {/* Interactive Expandable Modal */}
            <InteractiveMapModal 
                isOpen={isMapModalOpen} 
                onClose={() => setIsMapModalOpen(false)} 
                latitude={latitude} 
                longitude={longitude} 
                address={address} 
            />
        </>
    );
};

export default LocationMediaCard;
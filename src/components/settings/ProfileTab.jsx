import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, Link as LinkIcon, Clock, CheckCircle2, AlertCircle, Save, Phone, LocateFixed, Loader2, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { triggerHaptic } from '../../utils/haptics';
import ImageCropperModal from './ImageCropperModal';
import AuthVerificationModal from './AuthVerificationModal';
import { useIsMobile } from '../../hooks/useMediaQuery';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// Component Structure
const InputBlock = ({ label, value, onChange, placeholder, icon: Icon, type = "text", rightNode }) => (
    <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {Icon && <Icon size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />}
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)} 
                placeholder={placeholder}
                style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: Icon ? '12px 12px 12px 42px' : '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                }}
            />
            {rightNode && <div style={{ position: 'absolute', right: '12px' }}>{rightNode}</div>}
        </div>
    </div>
);

const uploadMediaFile = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('synced_token');
    const response = await axios.post('http://localhost:5000/api/users/upload-avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

const ProfileTab = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('synced_user')) || {});

    const [formData, setFormData] = useState({
        username: user.username || '',
        about: user.about || '',
        location: user.location || '',
        socialLink: user.socialLink || '',
        phone: user.phoneNumber || ''
    });

    const [statusExpiry, setStatusExpiry] = useState('none');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    
    const isMobile = useIsMobile();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const debouncedUsername = useDebounce(formData.username, 500);
    const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: true, error: null });

    const [showCropper, setShowCropper] = useState(false);
    const [tempImageFile, setTempImageFile] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleAutoLocate = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        setIsLocating(true);
        triggerHaptic('light');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    
                    const address = res.data.address;
                    const city = address.city || address.town || address.state || "Unknown City";
                    const country = address.country || "";
                    
                    handleChange('location', `${city}, ${country}`);
                    triggerHaptic('success');
                } catch (error) {
                    console.error("Geocoding failed", error);
                    alert("We found your coordinates, but couldn't translate them to a city name.");
                } finally {
                    setIsLocating(false);
                }
            }, 
            (error) => {
                console.error("Geolocation error", error);
                setIsLocating(false);
                triggerHaptic('error');
                
                switch(error.code) {
                    case 1: alert("Location access denied. Please allow location permissions in your browser settings."); break;
                    case 2: alert("Location information is currently unavailable on this device."); break;
                    case 3: alert("The location request timed out. This is common on desktop computers. Please type it manually."); break;
                    default: alert("An unknown error occurred while finding your location."); break;
                }
            }, 
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        if (debouncedUsername && debouncedUsername !== user.username) {
            checkUsername(debouncedUsername);
        } else {
            setUsernameStatus({ checking: false, available: true, error: null });
        }
    }, [debouncedUsername]);

    const checkUsername = async (uName) => {
        setUsernameStatus({ checking: true, available: false, error: null });
        try {
            const token = localStorage.getItem('synced_token');
            const res = await axios.get(`http://localhost:5000/api/users/check-username?u=${uName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsernameStatus({ checking: false, available: res.data.available, error: null });
        } catch (err) {
            setUsernameStatus({ checking: false, available: false, error: err.response?.data?.error || 'Error checking name' });
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return alert('File exceeds 5MB limit.');

        setTempImageFile(file);
        setShowCropper(true);
    };

    const executeSave = async () => {
        if (!usernameStatus.available && formData.username !== user.username) return triggerHaptic('error');

        setIsSaving(true);
        try {
            const token = localStorage.getItem('synced_token');

            if (formData.phone !== user.phoneNumber && typeof formData.phone === 'string' && formData.phone.trim() !== '') {
                await axios.post('http://localhost:5000/api/users/send-otp',
                    { phoneNumber: formData.phone },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setIsSaving(false);
                setShowOtp(true);
                return;
            }

            await finalProfileSave(token);

        } catch (error) {
            triggerHaptic('error');
            alert(error.response?.data?.error || "Failed to save profile.");
            setIsSaving(false);
        }
    };

    const finalProfileSave = async (token) => {
        let expiresAt = null;
        if (statusExpiry === '1hr') expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        if (statusExpiry === 'today') { expiresAt = new Date(); expiresAt.setHours(23, 59, 59, 999); }

        const payload = {
            ...formData,
            currentStatus: { text: formData.about, expiresAt }
        };

        const response = await axios.put('http://localhost:5000/api/users/profile', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        triggerHaptic('success');
        localStorage.setItem('synced_user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setHasUnsavedChanges(false);
        setIsSaving(false);
    };

    const EXPIRY_OPTIONS = [
        { id: 'none', label: "Don't clear" },
        { id: '1hr', label: "Clear in 1 Hour" },
        { id: 'today', label: "Clear Today" }
    ];

    return (
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px', position: 'relative' }}>
            <h2 style={{ margin: '0 0 32px 0', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Public Profile</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px', backgroundColor: 'var(--bg-surface-hover)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ position: 'relative' }}>
                    <img src={formData.avatar || user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    
                    <button style={{ position: 'absolute', bottom: '-6px', right: '-6px', background: 'var(--accent-primary)', border: '4px solid var(--bg-surface-hover)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', padding: 0 }}>
                        <Camera size={18} color="var(--accent-text, var(--bg-primary))" />
                        <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                    </button>
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Avatar</h3>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>5MB max. JPEG, PNG, or WEBP.</p>

                    {user.pastAvatars && user.pastAvatars.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>History:</span>
                            {user.pastAvatars.map((past, idx) => (
                                <img key={idx} src={past.url} alt="Past" style={{ width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.6} />
                            ))}
                            <button style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>Remove</button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>@</span>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                            style={{ width: '100%', padding: '14px 14px 14px 34px', backgroundColor: 'var(--bg-primary)', border: `1px solid ${usernameStatus.error ? '#ef4444' : (formData.username !== user.username && usernameStatus.available ? '#10b981' : 'var(--border-subtle)')}`, borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }}
                        />
                        {usernameStatus.checking && <span style={{ position: 'absolute', right: '14px', top: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Checking...</span>}
                        {formData.username !== user.username && !usernameStatus.checking && usernameStatus.available && <CheckCircle2 size={18} color="#10b981" style={{ position: 'absolute', right: '14px', top: '14px' }} />}
                    </div>
                    {usernameStatus.error && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#ef4444', marginTop: '6px' }}><AlertCircle size={14} /> {usernameStatus.error}</span>}
                    {formData.username !== user.username && usernameStatus.available && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#10b981', marginTop: '6px' }}>Available! Your old username will be locked for 7 days.</span>}
                </div>

                <InputBlock label="Phone Number" field="phone" value={formData.phone} onChange={(val) => handleChange('phone', val)} placeholder="+1 234 567 8900" icon={Phone} type="tel" />
                <InputBlock
                    label="Location / Timezone"
                    value={formData.location}
                    onChange={(val) => handleChange('location', val)}
                    placeholder="e.g., Ibadan, Nigeria"
                    icon={MapPin}
                    rightNode={
                        <button onClick={handleAutoLocate} disabled={isLocating} style={{ background: 'none', border: 'none', cursor: isLocating ? 'wait' : 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: 0 }} title="Auto-detect location">
                            {isLocating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <LocateFixed size={18} />}
                        </button>
                    }
                />
                <InputBlock label="Custom Social Link" field="socialLink" value={formData.socialLink} onChange={(val) => handleChange('socialLink', val)} placeholder="https://twitter.com/..." icon={LinkIcon} type="url" />

                <div style={{ marginBottom: '20px', backgroundColor: 'var(--bg-surface-hover)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Status</label>
                    <input
                        type="text"
                        value={formData.about}
                        onChange={(e) => handleChange('about', e.target.value)}
                        placeholder="🌴 On Vacation..."
                        style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', marginBottom: '16px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }}
                    />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="var(--text-secondary)" />
                        
                        <button 
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0, fontWeight: '500' }}
                        >
                            {EXPIRY_OPTIONS.find(opt => opt.id === statusExpiry)?.label} <ChevronDown size={14} />
                        </button>

                        {dropdownOpen && <div style={{ position: 'fixed', inset: '-100vh -100vw', zIndex: 40 }} onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} />}
                        
                        <AnimatePresence>
                            {dropdownOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: '100%', 
                                        left: '24px', 
                                        marginBottom: '8px',
                                        backgroundColor: 'var(--bg-surface)', 
                                        border: '1px solid var(--border-subtle)', 
                                        borderRadius: '12px', 
                                        boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
                                        zIndex: 50, 
                                        minWidth: '160px', 
                                        overflow: 'hidden' 
                                    }}
                                >
                                    {EXPIRY_OPTIONS.map(opt => (
                                        <div 
                                            key={opt.id} 
                                            onClick={() => { setStatusExpiry(opt.id); setHasUnsavedChanges(true); setDropdownOpen(false); }}
                                            style={{ padding: '12px 16px', fontSize: '0.85rem', color: opt.id === statusExpiry ? 'var(--accent-primary)' : 'var(--text-primary)', cursor: 'pointer', backgroundColor: opt.id === statusExpiry ? 'var(--bg-surface-hover)' : 'transparent', transition: 'background-color 0.2s', fontWeight: opt.id === statusExpiry ? 'bold' : 'normal' }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-surface-hover)'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = opt.id === statusExpiry ? 'var(--bg-surface-hover)' : 'transparent'}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div style={{ position: 'sticky', bottom: '24px', left: 0, right: 0, width: '100%', zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                <AnimatePresence>
                    {hasUnsavedChanges && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            style={{ 
                                backgroundColor: 'rgba(26, 27, 30, 0.95)', 
                                backdropFilter: 'blur(16px)', 
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                borderRadius: '999px', 
                                padding: isMobile ? '10px 16px' : '12px 24px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                width: 'calc(100% - 32px)',
                                maxWidth: '450px',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                                pointerEvents: 'auto'
                            }}
                        >
                            <span style={{ color: '#ffffff', fontWeight: '600', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                                {isMobile ? 'Unsaved' : 'Unsaved changes'}
                            </span>
                            <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center' }}>
                                <button onClick={() => { setFormData({ username: user.username, about: user.about, location: user.location, socialLink: user.socialLink, phone: user.phoneNumber, avatar: user.avatar }); setHasUnsavedChanges(false); setUsernameStatus({ checking: false, available: true, error: null }); }} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>Cancel</button>
                                <button onClick={executeSave} disabled={!usernameStatus.available || isSaving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 14px' : '10px 18px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, #111827)', border: 'none', borderRadius: '999px', cursor: (!usernameStatus.available || isSaving) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : '0.9rem', opacity: (!usernameStatus.available || isSaving) ? 0.7 : 1 }}>
                                    {isSaving ? 'Saving...' : 'Save'} <Save size={14} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ImageCropperModal
                isOpen={showCropper}
                imageFile={tempImageFile}
                onClose={() => setShowCropper(false)}
                onCropComplete={async (croppedFile) => {
                    setShowCropper(false);
                    try {
                        const uploadResult = await uploadMediaFile(croppedFile);
                        setFormData(prev => ({ ...prev, avatar: uploadResult.mediaUrl }));
                        setHasUnsavedChanges(true);
                    } catch (error) {
                        console.error(error);
                        alert("Failed to upload avatar. Is the backend route set up?");
                    }
                }}
            />

            <AuthVerificationModal
                isOpen={showOtp}
                phoneNumber={formData.phone}
                onClose={() => setShowOtp(false)}
                onVerify={async (code) => {
                    const token = localStorage.getItem('synced_token');
                    await axios.post('http://localhost:5000/api/users/verify-otp',
                        { phoneNumber: formData.phone, code },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setShowOtp(false);
                    setIsSaving(true);
                    await finalProfileSave(token);
                }}
            />
        </div>
    );
};

export default ProfileTab;
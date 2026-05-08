import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, FileText, Code, BellOff, ShieldAlert, Ban, Phone, Video, MessageSquare } from 'lucide-react';
import { apiClient } from '../utils/api';
import ReportUserModal from './ReportUserModal';
import { triggerHaptic } from '../utils/haptics';

const ContactProfilePanel = ({ roomName, isMobile, onClose, roomId, targetUser, onCall }) => {
    const [activeTab, setActiveTab] = useState('media');
    const [mediaItems, setMediaItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    // FIX: Dynamic Identity Resolution! 
    // Prioritize the target user's actual username. If it's a group/channel, fallback to the roomName.
    const displayName = targetUser?.username || roomName;

    useEffect(() => {
        let isMounted = true; 

        const fetchMedia = async () => {
            if (!roomId) {
                if (isMounted) setIsLoading(false);
                return;
            }
            
            try {
                const res = await apiClient.get(`/messages/${roomId}/media`);
                if (isMounted) setMediaItems(res.data.data || []);
            } catch (err) {
                console.error("Failed to fetch gallery", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchMedia();
        return () => { isMounted = false; };
    }, [roomId]);

    return (
        <>
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                style={{
                    width: isMobile ? '100%' : '380px', height: '100%',
                    backgroundColor: 'var(--bg-primary)', borderLeft: '1px solid var(--border-subtle)',
                    position: isMobile ? 'fixed' : 'relative', top: 0, right: 0, zIndex: 200,
                    display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.08)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'background-color 0.2s ease',
                            animation: 'none', 
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                    <span style={{ marginLeft: '12px', fontWeight: '700', fontSize: '1rem', letterSpacing: '-0.2px' }}>Contact Info</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    <div style={{ padding: '40px 24px', textAlign: 'center', background: 'linear-gradient(to bottom, var(--bg-surface), var(--bg-primary))' }}>
                        <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 20px auto' }}>
                            {/* FIX: Ensure the avatar generation uses the resolved displayName so initials match the name! */}
                            <img 
                                src={targetUser?.avatar || `https://ui-avatars.com/api/?name=${displayName}&background=random`} 
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} 
                                alt={displayName}
                            />
                        </div>
                        
                        {/* FIX: Use the resolved displayName here instead of the raw roomName */}
                        <h2 style={{ margin: '12px 0 6px 0', fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{displayName}</h2>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '500', opacity: 0.8 }}>Synced for Web</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '12px 24px 32px 24px' }}>
                        {[
                            { icon: MessageSquare, label: 'Message', action: onClose },
                            { icon: Phone, label: 'Voice', action: () => { triggerHaptic('light'); onCall('voice'); } },
                            { icon: Video, label: 'Video', action: () => { triggerHaptic('light'); onCall('video'); } }
                        ].map((item, i) => (
                            <div key={i} onClick={item.action} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px 10px', borderRadius: '20px', backgroundColor: 'rgba(128,128,128,0.06)', border: '1px solid rgba(128,128,128,0.08)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                <div style={{ color: 'var(--accent-primary)' }}><item.icon size={22} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', opacity: 0.9 }}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '0 24px 32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Shared Media</h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', cursor: 'pointer' }}>View All</span>
                        </div>

                        {isLoading ? (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-surface-hover)' }}>
                                        <div className="skeleton-loader" />
                                    </div>
                                ))}
                            </div>
                        ) : mediaItems.length > 0 ? (
                            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
                                {mediaItems.map((item, idx) => (
                                    <div key={idx} style={{ width: '100px', height: '100px', borderRadius: '16px', backgroundColor: 'var(--bg-surface-hover)', flexShrink: 0, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}>
                                        {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="shared media" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>{item.type === 'document' ? <FileText size={28} /> : <Code size={28} />}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '30px 0', textAlign: 'center', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
                                <ImageIcon size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>No shared items found</p>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '8px 16px 40px 16px' }}>
                        {[
                            { icon: BellOff, label: 'Mute Notifications', desc: 'Silence alerts for this chat', color: 'var(--text-primary)', action: () => setIsMuted(!isMuted) },
                            { icon: Ban, label: isBlocked ? 'Unblock Contact' : 'Block Contact', desc: 'Prevent this user from messaging you', color: '#ef4444', action: () => { triggerHaptic('light'); setIsBlocked(!isBlocked); } },
                            { icon: ShieldAlert, label: 'Report User', desc: 'Flag suspicious or harmful behavior', color: '#ef4444', action: () => setIsReportModalOpen(true) }
                        ].map((row, i) => (
                            <button key={i} onClick={row.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'none', border: 'none', borderRadius: '16px', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <div style={{ color: row.color }}><row.icon size={20} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: row.color }}>{row.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.8 }}>{row.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            <ReportUserModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} targetUser={targetUser} onSubmit={(data) => console.log(data)} />
        </>
    );
};

export default ContactProfilePanel;
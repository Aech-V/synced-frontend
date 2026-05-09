import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Clock } from 'lucide-react';
import { apiClient, uploadMediaFile } from '../../utils/api';
import { triggerHaptic } from '../../utils/haptics';

const StatusRing = ({ count }) => {
    if (count === 0) return null;

    const size = 60;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    if (count === 1) {
        return (
            <svg width={size} height={size} style={{ position: 'absolute', top: -2, left: -2, zIndex: 0 }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--accent-primary)" strokeWidth={strokeWidth} />
            </svg>
        );
    }

    const gap = 6;
    const segmentLength = (circumference / count) - gap;
    const dashArray = `${segmentLength} ${circumference}`;

    return (
        <svg width={size} height={size} style={{ position: 'absolute', top: -2, left: -2, transform: 'rotate(-90deg)', zIndex: 0 }}>
            {Array.from({ length: count }).map((_, i) => {
                const offset = -(circumference / count) * i;
                return (
                    <circle
                        key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke="var(--accent-primary)" strokeWidth={strokeWidth}
                        strokeDasharray={dashArray} strokeDashoffset={offset} strokeLinecap="round"
                    />
                );
            })}
        </svg>
    );
};

const StatusTab = ({ setViewingStatus }) => {
    const [statuses, setStatuses] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('synced_user')) || {};
    const myUserId = currentUser?.id || currentUser?._id;

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const res = await apiClient.get('/status');
                const statusArray = Array.isArray(res.data) ? res.data : (res.data.data || []);
                setStatuses(statusArray);
            } catch (error) {
                console.error("Failed to load statuses", error);
            }
        };
        fetchStatuses();
    }, []);

    const groupedStatuses = useMemo(() => {
        const groups = {};
        if (!Array.isArray(statuses)) return groups;

        statuses.forEach(status => {
            const uid = status.userId?._id;
            if (!uid) return;
            if (!groups[uid]) groups[uid] = { user: status.userId, items: [], latestAt: 0 };

            groups[uid].items.push(status);
            groups[uid].items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            const time = new Date(status.createdAt).getTime();
            if (time > groups[uid].latestAt) groups[uid].latestAt = time;
        });
        return groups;
    }, [statuses]);

    const myStatusGroup = groupedStatuses[myUserId];

    const otherStatusGroups = Object.values(groupedStatuses)
        .filter(g => g.user?._id !== myUserId)
        .sort((a, b) => b.latestAt - a.latestAt);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        triggerHaptic('light');

        try {
            const uploadResult = await uploadMediaFile(file);
            const response = await apiClient.post('/status', {
                mediaUrl: uploadResult.mediaUrl,
                mediaType: file.type.startsWith('video/') ? 'video' : 'image',
                text: ''
            });

            setStatuses([response.data.data, ...statuses]);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    return (
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>

            {/* MY STATUS HERO */}
            <div style={{ padding: '24px 20px', borderBottom: '8px solid var(--bg-surface)' }}>
                {myStatusGroup ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                        {/* LEFT SIDE: View Status */}
                        <div
                            onClick={() => setViewingStatus({ ...myStatusGroup, isOwn: true })}
                            style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'opacity 0.2s', flex: 1 }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                        >
                            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                                <StatusRing count={myStatusGroup.items.length} />
                                <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.username || 'U'}&background=random`} style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid var(--bg-primary)', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
                            </div>
                            <div>
                                <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.1rem' }}>My Status</span>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Tap to view your updates</div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Animated Upload Button */}
                        <motion.div
                            whileTap={!isUploading ? { scale: 0.9 } : {}}
                            style={{ position: 'relative', width: '42px', height: '42px', backgroundColor: 'var(--bg-surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isUploading ? 'wait' : 'pointer', border: '1px solid var(--border-subtle)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s', color: 'var(--text-primary)' }}
                            onMouseEnter={(e) => { if (!isUploading) { e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; } }}
                            onMouseLeave={(e) => { if (!isUploading) { e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; } }}
                        >
                            {isUploading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={18} /></motion.div> : <Plus size={20} />}
                            <input type="file" accept="image/*,video/*" onChange={handleUpload} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: isUploading ? 'wait' : 'pointer', zIndex: 10 }} disabled={isUploading} />
                        </motion.div>

                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                            <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.username || 'U'}&background=random`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />

                            {/* Animated Mini-Upload Badge */}
                            <div style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: 'var(--accent-primary)', borderRadius: '50%', padding: '4px', display: 'flex', border: '3px solid var(--bg-primary)' }}>
                                {isUploading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={14} color="#000" /></motion.div> : <Plus size={14} color="#000" strokeWidth={3} />}
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.1rem' }}>My Status</span>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Tap to add an update</div>
                        </div>
                        <input type="file" accept="image/*,video/*" onChange={handleUpload} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: isUploading ? 'wait' : 'pointer', zIndex: 10 }} disabled={isUploading} />
                    </div>
                )}
            </div>

            {/* RECENT UPDATES FEED */}
            <div style={{ padding: '20px 20px' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', marginBottom: '16px' }}>Recent Updates</h4>

                {otherStatusGroups.length === 0 ? (
                    // PREMIUM EMPTY STATE CARD
                    <div style={{ padding: '32px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', border: '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }}>
                            <Clock size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                        </motion.div>
                        <h5 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '700' }}>You're all caught up!</h5>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>No new updates from your contacts right now.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {otherStatusGroups.map(group => (
                            <div
                                key={group.user._id}
                                onClick={() => setViewingStatus(group)}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                            >
                                <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                                    <StatusRing count={group.items.length} />
                                    <img src={group.user.avatar || `https://ui-avatars.com/api/?name=${group.user.username || 'U'}&background=random`} style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid var(--bg-primary)', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
                                </div>
                                <div>
                                    <span style={{ fontWeight: '700', display: 'block', color: 'var(--text-primary)', fontSize: '1.05rem' }}>{group.user.username}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>{new Date(group.latestAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatusTab;
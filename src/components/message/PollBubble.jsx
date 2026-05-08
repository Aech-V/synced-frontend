import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const PollBubble = ({ pollData, messageId, createdAt, isOwn, socket, roomId }) => {
    const currentUserObj = JSON.parse(localStorage.getItem('synced_user')) || {};
    const currentUserId = currentUserObj.id || currentUserObj._id;
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [isExpired, setIsExpired] = useState(false);

    // 5 Minute Window Logic (300,000 ms)
    useEffect(() => {
        const checkExpiration = () => {
            const age = Date.now() - new Date(createdAt).getTime();
            const remaining = 300000 - age;
            if (remaining <= 0) {
                setIsExpired(true);
                setTimeLeft(0);
            } else {
                setIsExpired(false);
                setTimeLeft(Math.ceil(remaining / 1000)); // seconds left
            }
        };
        
        checkExpiration();
        const interval = setInterval(checkExpiration, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    const handleVote = (optionIndex) => {
        if (isExpired) return triggerHaptic('error');
        triggerHaptic('light');
        
        // Optimistic UI could go here via Zustand. 
        // For now, emit straight to backend:
        socket.emit('cast_poll_vote', { roomId, messageId, optionIndex, userId: currentUserId });
    };

    // Calculate total votes for percentage bars
    const totalVotes = pollData.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

    const bgColor = isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? '#ffffff' : 'var(--text-primary)';
    const subTextColor = isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', backgroundColor: bgColor, borderRadius: '16px', width: '280px' }}>
            {/* Poll Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                <BarChart2 size={20} color={isOwn ? '#ffffff' : 'var(--accent-primary)'} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: textColor, lineHeight: '1.4' }}>{pollData.question}</h4>
                    <span style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '4px', display: 'block' }}>
                        {isExpired ? 'Poll Closed' : `Closes in ${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2, '0')}`} • {totalVotes} votes
                    </span>
                </div>
            </div>

            {/* Poll Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pollData.options.map((opt, idx) => {
                    const votes = opt.votes?.length || 0;
                    const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                    const hasVotedForThis = opt.votes?.includes(currentUserId);

                    return (
                        <div 
                            key={idx} 
                            onClick={() => handleVote(idx)}
                            style={{ position: 'relative', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${hasVotedForThis ? (isOwn ? '#fff' : 'var(--accent-primary)') : 'rgba(128,128,128,0.2)'}`, cursor: isExpired ? 'default' : 'pointer', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}
                        >
                            {/* Progress Bar Background */}
                            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percentage}%`, backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(252, 203, 6, 0.15)', zIndex: -1, transition: 'width 0.4s ease' }} />
                            
                            <span style={{ fontSize: '0.9rem', color: textColor, fontWeight: hasVotedForThis ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {hasVotedForThis && <CheckCircle2 size={16} color={isOwn ? '#ffffff' : 'var(--accent-primary)'} />}
                                {opt.text}
                            </span>
                            {(isExpired || hasVotedForThis) && (
                                <span style={{ fontSize: '0.8rem', color: textColor, fontWeight: 'bold' }}>{percentage}%</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PollBubble;
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const AuthVerificationModal = ({ isOpen, onClose, onVerify, phoneNumber }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!isOpen) {
            setOtp(['', '', '', '', '', '']);
            setError(null);
            setTimeLeft(30);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, timeLeft]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError(null);

        // Auto-advance
        if (value !== '' && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) {
            triggerHaptic('error');
            setError('Please enter all 6 digits.');
            return;
        }

        setIsVerifying(true);
        try {
            // Pass the code up to the parent component to handle the actual API call
            await onVerify(code); 
        } catch (err) {
            triggerHaptic('error');
            setError('Invalid verification code.');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    style={{ backgroundColor: 'var(--bg-surface)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '32px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-subtle)' }}
                >
                    <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-surface-hover)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(252, 203, 6, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(252, 203, 6, 0.2)' }}>
                            <Shield size={32} color="var(--accent-primary)" />
                        </div>
                        <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Verify it's you</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            We sent a secure code to <strong>{phoneNumber}</strong>. Please enter it below to confirm changes.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                        {otp.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={el => inputRefs.current[idx] = el}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                style={{ width: '48px', height: '56px', fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: `2px solid ${error ? '#ef4444' : (digit ? 'var(--accent-primary)' : 'var(--border-subtle)')}`, borderRadius: '12px', outline: 'none', transition: 'border 0.2s' }}
                            />
                        ))}
                    </div>

                    {error && (
                        <motion.div initial={{ x: -10 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 500 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '24px', fontWeight: 'bold' }}>
                            <AlertCircle size={16} /> {error}
                        </motion.div>
                    )}

                    <button 
                        onClick={handleVerify} 
                        disabled={isVerifying || otp.join('').length < 6}
                        style={{ width: '100%', padding: '16px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, var(--bg-primary))', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: (isVerifying || otp.join('').length < 6) ? 'not-allowed' : 'pointer', opacity: (isVerifying || otp.join('').length < 6) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                    >
                        {isVerifying ? 'Verifying...' : 'Confirm'} {!isVerifying && <ArrowRight size={18} />}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <button 
                            disabled={timeLeft > 0} 
                            style={{ background: 'none', border: 'none', color: timeLeft > 0 ? 'var(--text-secondary)' : 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 'bold', cursor: timeLeft > 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <RefreshCw size={14} /> {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend Code'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AuthVerificationModal;
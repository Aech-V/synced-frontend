import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Fingerprint, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from './utils/api';
import { triggerHaptic } from './utils/haptics';
import { useIsMobile } from './hooks/useMediaQuery';
import { startAuthentication } from '@simplewebauthn/browser';

// --- PERFECTED FLOATING INPUT ---
const FloatingInput = ({ name, type, label, formik }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isError = formik.touched[name] && formik.errors[name];
    const actualType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

    return (
        <div style={{ marginBottom: isError ? '24px' : '16px', position: 'relative' }}> 
            <motion.div 
                className="floating-input-container"
                animate={isError ? { x: [-5, 5, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
            >
                <input
                    name={name}
                    type={actualType}
                    placeholder=" " 
                    className="floating-input"
                    value={formik.values[name]}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    style={isError ? { borderColor: '#ef4444', boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.1)' } : {}}
                />
                <label className="floating-label" style={{ color: isError ? '#ef4444' : '' }}>{label}</label>
                
                {type === 'password' && (
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </motion.div>
            <AnimatePresence>
                {isError && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -5 }} 
                        style={{ position: 'absolute', color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', marginLeft: '12px', fontWeight: '600' }}
                    >
                        {formik.errors[name]}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- INTERACTIVE STRENGTH METER ---
const PasswordStrength = ({ password }) => {
    let score = 0;
    if (password.length > 7) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const colors = ['#333', '#ef4444', '#f59e0b', '#10b981', '#10b981'];

    return (
        <div style={{ marginTop: '8px', marginBottom: '28px', padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: '6px', height: '4px' }}>
                {[1, 2, 3, 4].map(level => (
                    <motion.div 
                        key={level}
                        animate={{ backgroundColor: score >= level ? colors[score] : 'rgba(255,255,255,0.08)' }}
                        style={{ flex: 1, borderRadius: '2px' }}
                    />
                ))}
            </div>
        </div>
    );
};

// --- MAIN AUTH COMPONENT ---
const Auth = ({ onLoginSuccess }) => {
    const [authView, setAuthView] = useState('login'); 
    const [serverError, setServerError] = useState('');
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
    const isMobile = useIsMobile();

    const formik = useFormik({
        initialValues: { username: '', email: '', password: '', phone: '' },
        validationSchema: yup.object({
            email: yup.string().email('Invalid email format').required('Required'),
            password: yup.string().min(8, 'Must be at least 8 characters').required('Required'),
            username: authView === 'signup' ? yup.string().min(3, 'Handle is too short').required('Required') : yup.string()
        }),
        onSubmit: async (values) => {
            setServerError('');
            triggerHaptic('light');
            try {
                const endpoint = authView === 'login' ? '/auth/login' : '/auth/register';
                const response = await apiClient.post(endpoint, values);
                
                const { user, sessionId } = response.data;
                const token = response.data.token || response.data.accessToken;
                
                localStorage.setItem('synced_token', token);
                localStorage.setItem('synced_user', JSON.stringify(user));
                if (sessionId) localStorage.setItem('synced_session_id', sessionId);
                
                triggerHaptic('success');
                onLoginSuccess(token);
            } catch (error) {
                triggerHaptic('error');
                setServerError(error.response?.data?.message || 'Authentication failed. Verify your credentials.');
            }
        },
    });

    // --- FUNCTIONAL PASSKEY LOGIN ENGINE ---
    const handlePasskeyLogin = async () => {
        setServerError('');
        setIsPasskeyLoading(true);
        triggerHaptic('light');
        
        try {
            // Step 1: Fetch authentication options from backend
            const optionsResp = await apiClient.get('/auth/webauthn/generate-authentication');
            
            // Step 2: Trigger the browser's native biometrics prompt (FaceID/TouchID)
            const asseResp = await startAuthentication({ optionsJSON: optionsResp.data });
            
            // Step 3: Send the biometric signature back to the server to verify and log in
            const verificationResp = await apiClient.post('/auth/webauthn/verify-authentication', {
                authenticationResponse: asseResp
            });

            // Step 4: Login Success Handling
            const { user, sessionId, token } = verificationResp.data;
            localStorage.setItem('synced_token', token || verificationResp.data.accessToken);
            localStorage.setItem('synced_user', JSON.stringify(user));
            if (sessionId) localStorage.setItem('synced_session_id', sessionId);
            
            triggerHaptic('success');
            onLoginSuccess(token || verificationResp.data.accessToken);

        } catch (error) {
            console.error('[PASSKEY LOGIN ERROR]', error);
            triggerHaptic('error');
            if (error.name === 'NotAllowedError') {
                setServerError('Passkey login cancelled or timed out.');
            } else {
                setServerError('Passkey authentication failed. Do you have one registered?');
            }
        } finally {
            setIsPasskeyLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            <div className="data-canopy-bg" />

            {/* THE BASE LAYER: LOGIN */}
            <motion.div 
                className="glass-panel"
                animate={{ 
                    scale: authView === 'login' ? 1 : 0.95, 
                    opacity: authView === 'login' ? 1 : 0, 
                    filter: authView === 'login' ? 'blur(0px)' : 'blur(12px)',
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ 
                    position: 'absolute', 
                    width: '90%', 
                    maxWidth: '400px', 
                    borderRadius: '24px', 
                    padding: isMobile ? '32px 24px' : '40px', 
                    zIndex: 10,
                    pointerEvents: authView === 'login' ? 'auto' : 'none' 
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-1px', color: '#fff' }}>Welcome back.</h1>
                    <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.6)' }}>Sign in to continue to Synced.</p>
                </div>

                <form onSubmit={formik.handleSubmit}>
                    <FloatingInput name="email" type="email" label="Email or Phone Number" formik={formik} />
                    <FloatingInput name="password" type="password" label="Password" formik={formik} />
                    
                    {serverError && authView === 'login' && (
                        <div style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.85rem', marginBottom: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                            {serverError}
                        </div>
                    )}

                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="submit" disabled={formik.isSubmitting || isPasskeyLoading}
                        style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: '#fff', color: '#000', border: 'none', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}
                    >
                        {formik.isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Sign In'} <ArrowRight size={20} />
                    </motion.button>
                </form>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={isPasskeyLoading || formik.isSubmitting}
                        style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s' }} 
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.12)'} 
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                    >
                        {isPasskeyLoading ? <Loader2 className="spinner" size={18} /> : <Fingerprint size={18} />} 
                        {isPasskeyLoading ? 'Authenticating...' : 'Sign in with Passkey'}
                    </button>
                </div>

                <p style={{ textAlign: 'center', marginTop: '36px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                    New to Synced? <strong style={{ color: '#fff', cursor: 'pointer' }} onClick={() => { setServerError(''); setAuthView('signup'); }}>Create an account</strong>
                </p>
            </motion.div>

            {/* THE CARD STACK: SIGNUP SHEET SLIDING UP */}
            <AnimatePresence>
                {authView === 'signup' && (
                    <motion.div 
                        className="solid-panel"
                        initial={{ y: '100vh' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100vh' }}
                        transition={{ type: "spring", damping: 28, stiffness: 220 }}
                        style={{ position: 'absolute', width: '100%', maxWidth: '460px', height: isMobile ? '90vh' : '85vh', bottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: '32px', padding: isMobile ? '32px 24px' : '40px 32px', zIndex: 20, display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexShrink: 0 }}>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Join the Network</h2>
                            <button onClick={() => { setServerError(''); setAuthView('login'); }} style={{ background: 'var(--bg-surface-hover)', border: 'none', color: 'var(--text-primary)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                            <form onSubmit={formik.handleSubmit}>
                                <FloatingInput name="username" type="text" label="Unique Handle (@username)" formik={formik} />
                                <FloatingInput name="phone" type="tel" label="Phone Number (For Contact Sync)" formik={formik} />
                                <FloatingInput name="email" type="email" label="Backup Email" formik={formik} />
                                <FloatingInput name="password" type="password" label="Create Password" formik={formik} />
                                <PasswordStrength password={formik.values.password} />
                                
                                {serverError && authView === 'signup' && (
                                    <div style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.85rem', marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                                        {serverError}
                                    </div>
                                )}

                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    type="submit" disabled={formik.isSubmitting}
                                    style={{ width: '100%', padding: '18px', borderRadius: '16px', backgroundColor: 'var(--accent-primary)', color: '#000', border: 'none', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', cursor: 'pointer', marginTop: '16px', boxShadow: '0 8px 24px rgba(252, 203, 6, 0.2)' }}
                                >
                                    {formik.isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Create Account'}
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Auth;
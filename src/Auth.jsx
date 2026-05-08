import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Fingerprint, Mail, Smartphone, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from './utils/api';
import { triggerHaptic } from './utils/haptics';

// --- PREMIUM FLOATING INPUT WITH KINETIC SHAKE ---
const FloatingInput = ({ name, type, label, formik, icon: Icon }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isError = formik.touched[name] && formik.errors[name];
    const actualType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

    return (
        <div style={{ marginBottom: '16px' }}>
            <motion.div 
                className="floating-input-container"
                animate={isError ? { x: [-5, 5, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
            >
                <input
                    name={name}
                    type={actualType}
                    placeholder=" " /* Required for CSS :placeholder-shown to work */
                    className="floating-input"
                    value={formik.values[name]}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    style={{ borderColor: isError ? '#ef4444' : '' }}
                />
                <label className="floating-label">{label}</label>
                
                {type === 'password' && (
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </motion.div>
            <AnimatePresence>
                {isError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '6px', marginLeft: '8px' }}>
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
    const widths = ['0%', '25%', '50%', '75%', '100%'];

    return (
        <div style={{ marginTop: '-8px', marginBottom: '20px', padding: '0 8px' }}>
            <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                {[1, 2, 3, 4].map(level => (
                    <motion.div 
                        key={level}
                        animate={{ backgroundColor: score >= level ? colors[score] : 'rgba(255,255,255,0.1)' }}
                        style={{ flex: 1, borderRadius: '2px' }}
                    />
                ))}
            </div>
        </div>
    );
};

// --- MAIN AUTH COMPONENT ---
const Auth = ({ onLoginSuccess }) => {
    const [authView, setAuthView] = useState('login'); // 'login', 'signup', 'otp'
    const [serverError, setServerError] = useState('');

    // Formik Setup
    const formik = useFormik({
        initialValues: { username: '', email: '', password: '', phone: '' },
        validationSchema: yup.object({
            email: yup.string().email('Invalid email').required('Required'),
            password: yup.string().min(8, 'Too short').required('Required'),
            username: authView === 'signup' ? yup.string().min(3).required('Required') : yup.string()
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
                setServerError(error.response?.data?.message || 'Authentication failed');
            }
        },
    });

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* The Animated Data Canopy */}
            <div className="data-canopy-bg" />

            {/* THE BASE LAYER: LOGIN */}
            <motion.div 
                className="glass-panel"
                animate={{ 
                    scale: authView === 'login' ? 1 : 0.95, 
                    opacity: authView === 'login' ? 1 : 0,
                    filter: authView === 'login' ? 'blur(0px)' : 'blur(8px)',
                }}
                style={{ 
                    position: 'absolute', 
                    width: '90%', 
                    maxWidth: '400px', 
                    borderRadius: '24px', 
                    padding: '40px', 
                    zIndex: 10,
                    pointerEvents: authView === 'login' ? 'auto' : 'none'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px' }}>Welcome back.</h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>Sign in to continue to Synced.</p>
                </div>

                <form onSubmit={formik.handleSubmit}>
                    <FloatingInput name="email" type="email" label="Email or Phone Number" formik={formik} />
                    <FloatingInput name="password" type="password" label="Password" formik={formik} />
                    
                    {serverError && authView === 'login' && <div style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.85rem', marginBottom: '16px' }}>{serverError}</div>}

                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="submit" disabled={formik.isSubmitting}
                        style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                        {formik.isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Sign In'} <ArrowRight size={20} />
                    </motion.button>
                </form>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button style={{ width: '100%', padding: '14px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        <Fingerprint size={18} /> Sign in with Passkey
                    </button>
                </div>

                <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    New to Synced? <strong style={{ color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setAuthView('signup')}>Create an account</strong>
                </p>
            </motion.div>

            {/* THE CARD STACK: SIGNUP SHEET SLIDING UP */}
            <AnimatePresence>
                {authView === 'signup' && (
                    <motion.div 
                        className="glass-panel"
                        initial={{ y: '100vh', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100vh', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        style={{ position: 'absolute', width: '100%', maxWidth: '420px', height: '85vh', bottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: '32px', padding: '40px 32px', zIndex: 20, display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Join the Network</h2>
                            <button onClick={() => setAuthView('login')} style={{ background: 'var(--bg-surface)', border: 'none', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                            <form onSubmit={formik.handleSubmit}>
                                <FloatingInput name="username" type="text" label="Unique Handle (@username)" formik={formik} />
                                <FloatingInput name="phone" type="tel" label="Phone Number (For Contact Sync)" formik={formik} />
                                <FloatingInput name="email" type="email" label="Backup Email" formik={formik} />
                                <FloatingInput name="password" type="password" label="Create Password" formik={formik} />
                                <PasswordStrength password={formik.values.password} />
                                
                                {serverError && authView === 'signup' && <div style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.85rem', marginBottom: '16px' }}>{serverError}</div>}

                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    type="submit" disabled={formik.isSubmitting}
                                    style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: 'var(--accent-primary)', color: '#000', border: 'none', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
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
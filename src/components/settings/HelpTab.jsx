import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Info, MessageSquare, Search, ChevronDown, ChevronUp, Send, Paperclip, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { triggerHaptic } from '../../utils/haptics';
import { useIsMobile } from '../../hooks/useMediaQuery';

const FAQS = [
    { id: 1, q: "How do I create a Secret Vault?", a: "To create a Secret Vault, click the FAB icon in the Chats tab and select 'Initiate Secret Chat'. You will need to set a secure PIN to lock it." },
    { id: 2, q: "Are my WebRTC calls encrypted?", a: "Yes, all 1-on-1 voice and video calls use WebRTC's native DTLS/SRTP protocols, meaning your media streams are securely encrypted peer-to-peer." },
    { id: 3, q: "How does Emergency Bypass work?", a: "If you have Do Not Disturb active, a user can bypass the silent mode if they call you three times consecutively within a 3-minute window." },
    { id: 4, q: "How do I report a user?", a: "You can report a user from their chat profile, or use the 'Contact Support' tab here and select 'Report User' from the category dropdown." },
    { id: 5, q: "Where can I view my past support tickets?", a: "The 'My Tickets' portal is currently in development and will be available in the next major update!" }
];

const HelpTab = () => {
    const user = JSON.parse(localStorage.getItem('synced_user')) || {};
    const [activeSection, setActiveSection] = useState('faq');
    
    // FAQ State
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaqId, setOpenFaqId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ subject: '', category: '', priority: 'Normal', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState({});

    const isMobile = useIsMobile();

    // Auto-capture device telemetry on mount
    useEffect(() => {
        setDeviceInfo({
            userAgent: navigator.userAgent,
            os: navigator.platform || 'Unknown',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
        });
    }, []);

    const filteredFaqs = useMemo(() => {
        return FAQS.filter(faq => faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || faq.a.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const token = localStorage.getItem('synced_token');
            await axios.post('http://localhost:5000/api/users/support', 
                { ...formData, deviceInfo, attachments: [] }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            triggerHaptic('success');
            setSubmitSuccess(true);
            setFormData({ subject: '', category: '', priority: 'Normal', message: '' });
            
            setTimeout(() => setSubmitSuccess(false), 4000);
        } catch (error) {
            triggerHaptic('error');
            alert(error.response?.data?.error || 'Failed to submit ticket. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const TABS = [
        { id: 'faq', label: 'FAQs', icon: HelpCircle },
        { id: 'contact', label: 'Contact Support', icon: MessageSquare },
        { id: 'info', label: 'App Info', icon: Info }
    ];

    return (
        <div style={{ maxWidth: '650px', margin: '0 auto', position: 'relative' }}>
            <h2 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Help Center</h2>

            {/* Premium Animated Segmented Navigation */}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-hover)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '32px', position: 'relative' }}>
                {TABS.map((tab) => {
                    const isActive = activeSection === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { triggerHaptic('light'); setActiveSection(tab.id); }}
                            style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none' }}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="helpTabActiveSegment" 
                                    style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg-primary)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)' }} 
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 'bold' : '500', transition: 'color 0.2s' }}>
                                <tab.icon size={18} />
                                <span style={{ display: isMobile && !isActive ? 'none' : 'block' }}>{tab.label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <AnimatePresence mode="wait">
                {/* 1. FAQs SECTION */}
                {activeSection === 'faq' && (
                    <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '24px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                            <Search size={18} color="var(--text-secondary)" />
                            <input 
                                type="text" placeholder="Search for answers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', marginLeft: '12px', color: 'var(--text-primary)', fontSize: '1rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredFaqs.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px' }}>No matching questions found.</p>
                            ) : (
                                filteredFaqs.map(faq => (
                                    <div key={faq.id} style={{ backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s' }}>
                                        <button 
                                            onClick={() => { triggerHaptic('light'); setOpenFaqId(openFaqId === faq.id ? null : faq.id); }}
                                            style={{ width: '100%', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.95rem' }}
                                        >
                                            {faq.q}
                                            {openFaqId === faq.id ? <ChevronUp size={18} color="var(--accent-primary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                                        </button>
                                        <AnimatePresence>
                                            {openFaqId === faq.id && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                    <div style={{ padding: '0 20px 20px 20px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                                        {faq.a}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 2. CONTACT SUPPORT SECTION */}
                {activeSection === 'contact' && (
                    <motion.div key="contact" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ maxWidth: '500px', margin: '0 auto' }}>
                        {submitSuccess ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '16px', border: '1px solid var(--accent-primary)', textAlign: 'center' }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}><CheckCircle size={64} color="var(--accent-primary)" style={{ marginBottom: '16px' }} /></motion.div>
                                <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.3rem' }}>Ticket Submitted!</h3>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>We've received your request and sent a confirmation email to <strong>{user.email}</strong>. Our team will review it shortly.</p>
                                <button onClick={() => setSubmitSuccess(false)} style={{ marginTop: '24px', padding: '12px 24px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Submit Another</button>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category *</label>
                                        <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}>
                                            <option value="" disabled>Select an issue...</option>
                                            <option value="General Question">General Question</option>
                                            <option value="Bug Report">Bug Report</option>
                                            <option value="Billing">Billing & Subscriptions</option>
                                            <option value="Report User">Report a User</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority *</label>
                                        <select required value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}>
                                            <option value="Low">Low</option>
                                            <option value="Normal">Normal</option>
                                            <option value="High">High / Critical</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject *</label>
                                    <input required type="text" placeholder="Brief summary of the issue" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message *</label>
                                    <textarea required placeholder="Describe your issue in detail..." value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', minHeight: '140px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                                    <button type="button" onClick={() => alert("File uploads will utilize the uploadMediaFile API in Phase 4.")} style={{ width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'transparent', border: '1px dashed var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <Paperclip size={18} /> Attach File
                                    </button>
                                    
                                    <button type="submit" disabled={isSubmitting} style={{ width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 28px', backgroundColor: 'var(--accent-primary)', color: 'var(--accent-text, var(--bg-primary))', border: 'none', borderRadius: '10px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', opacity: isSubmitting ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(252, 203, 6, 0.2)' }}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Ticket'} <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                )}

                {/* 3. APP INFO SECTION */}
                {activeSection === 'info' && (
                    <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ maxWidth: '400px', margin: '0 auto' }}>
                        <div style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '48px 32px', borderRadius: '24px', border: '1px solid var(--border-subtle)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                            
                            {/* Premium 3D App Icon */}
                            <div style={{ width: '88px', height: '88px', background: 'linear-gradient(135deg, var(--bg-surface-hover) 0%, var(--bg-primary) 100%)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>S</span>
                            </div>
                            
                            <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '800' }}>Synced</h3>
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '24px', backgroundColor: 'rgba(252, 203, 6, 0.1)', padding: '6px 14px', borderRadius: '20px', letterSpacing: '0.5px' }}>v0.0.1 Beta</span>
                            
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '36px' }}>
                                An enterprise-grade, highly secure communication platform with WebRTC architecture and Secret Vaults.
                            </p>

                            <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                                <button style={{ flex: 1, padding: '12px 0', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s' }}>Terms of Service</button>
                                <button style={{ flex: 1, padding: '12px 0', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s' }}>Privacy Policy</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HelpTab;
import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

const CATEGORIES = {
    'Spam': ['Commercial', 'Phishing'],
    'Harassment': ['Bullying', 'Threats'],
    'Harmful Content': ['Self-harm', 'Child Safety', 'Hate Speech', 'Drugs', 'Weapons', 'CSAM'],
    'Other': ['Impersonation', 'Scams', 'Other']
};

const ReportUserModal = ({ isOpen, onClose, targetUser, onSubmit }) => {
    const [step, setStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);

    const handleNext = (category) => {
        triggerHaptic('light');
        setSelectedCategory(category);
        setStep(2);
    };

    const handleReport = () => {
        triggerHaptic('success');
        onSubmit({ category: selectedCategory, subCategory: selectedSubCategory });
        setStep(3); // Success Screen
        setTimeout(onClose, 2000);
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', width: '90%', maxWidth: '400px', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-surface)' }}>
                    <ShieldAlert size={24} color="#ef4444" />
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Report User</h3>
                </div>

                <div style={{ padding: '24px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                    {step === 1 && (
                        <>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                                Why are you reporting <strong>{targetUser?.username || 'this user'}</strong>? Your report is anonymous.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.keys(CATEGORIES).map(cat => (
                                    <button key={cat} onClick={() => handleNext(cat)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }}>
                                        {cat} <ChevronRight size={18} color="var(--text-secondary)" />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                                Please specify the type of <strong>{selectedCategory.toLowerCase()}</strong>.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                                {CATEGORIES[selectedCategory].map(sub => (
                                    <button 
                                        key={sub} 
                                        onClick={() => { triggerHaptic('light'); setSelectedSubCategory(sub); }} 
                                        style={{ padding: '16px', backgroundColor: selectedSubCategory === sub ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-surface)', border: `1px solid ${selectedSubCategory === sub ? '#ef4444' : 'var(--border-subtle)'}`, borderRadius: '12px', color: selectedSubCategory === sub ? '#ef4444' : 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: selectedSubCategory === sub ? 'bold' : '500' }}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '14px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Back</button>
                                <button disabled={!selectedSubCategory} onClick={handleReport} style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', cursor: selectedSubCategory ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: selectedSubCategory ? 1 : 0.5 }}>Submit Report</button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '16px' }} />
                            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Report Submitted</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Our trust and safety team will review this shortly.</p>
                        </div>
                    )}
                </div>
                
                {step !== 3 && (
                    <button onClick={onClose} style={{ padding: '16px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReportUserModal;
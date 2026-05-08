import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css'; // Premium dark theme for code
import { Code2, Copy, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const SnippetMediaCard = ({ code, language, fileName, isOwn }) => {
    const [copied, setCopied] = useState(false);

    // Apply Prism highlighting on mount/change
    useEffect(() => {
        Prism.highlightAll();
    }, [code, language]);

    const handleCopy = () => {
        triggerHaptic('success');
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const bgColor = isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? '#ffffff' : 'var(--text-primary)';
    const headerBg = isOwn ? 'rgba(0,0,0,0.2)' : 'var(--border-subtle)';

    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', 
            backgroundColor: bgColor, borderRadius: '12px', width: '300px', 
            border: '1px solid rgba(128,128,128,0.1)', overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '8px 12px', backgroundColor: headerBg 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: textColor }}>
                    <Code2 size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{fileName || `snippet.${language || 'txt'}`}</span>
                </div>
                <button onClick={handleCopy} style={{ 
                    background: 'none', border: 'none', color: copied ? '#10b981' : textColor, 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' 
                }}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
            </div>

            {/* Code Body */}
            <div style={{ padding: '0 12px', maxHeight: '250px', overflowY: 'auto', fontSize: '0.85rem' }}>
                <pre style={{ margin: 0, padding: '12px 0', background: 'transparent' }}>
                    <code className={`language-${language || 'javascript'}`}>
                        {code}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export default SnippetMediaCard;
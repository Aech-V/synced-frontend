import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

const StatusIndicator = ({ status, onFailClick }) => {
    if (!status) return null;

    switch (status) {
        case 'sent':
            return <Check size={14} color="var(--text-secondary)" />;
        case 'delivered':
            return <CheckCheck size={14} color="var(--text-secondary)" />;
        case 'read':
            return <CheckCheck size={14} color="var(--accent-primary)" />;
        case 'failed':
            return (
                <button
                    onClick={onFailClick}
                    style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                    title="Message failed to send. Click for options."
                >
                    !
                </button>
            );
        default:
            return null;
    }
};

export default StatusIndicator;
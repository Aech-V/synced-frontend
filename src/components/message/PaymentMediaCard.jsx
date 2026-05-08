import React from 'react';
import { CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';

const PaymentMediaCard = ({ paymentData, isOwn }) => {
    const { amount, currency = "NGN", status, transactionId } = paymentData;

    const bgColor = isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-surface-hover)';
    const textColor = isOwn ? '#ffffff' : 'var(--text-primary)';

    // Status UI Mappings
    const statusConfig = {
        completed: { icon: CheckCircle, color: '#10b981', text: 'Payment Completed' },
        pending:   { icon: Clock, color: '#f59e0b', text: 'Payment Pending' },
        failed:    { icon: XCircle, color: '#ef4444', text: 'Payment Failed' }
    };

    const currentStatus = statusConfig[status?.toLowerCase()] || statusConfig.pending;
    const StatusIcon = currentStatus.icon;

    // Format Amount (e.g. 50,000.00)
    const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency }).format(amount);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', backgroundColor: bgColor, borderRadius: '16px', width: '260px', border: `1px solid ${currentStatus.color}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: `${currentStatus.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentStatus.color }}>
                    <CreditCard size={20} />
                </div>
                <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: currentStatus.color, fontWeight: 'bold' }}>
                        {currentStatus.text}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                        Ref: {transactionId || 'Awaiting ID'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '12px', borderTop: '1px dashed rgba(128,128,128,0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                    {isOwn ? 'You sent' : 'You received'}
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: textColor, letterSpacing: '-0.5px' }}>
                    {formattedAmount}
                </span>
            </div>
        </div>
    );
};

export default PaymentMediaCard;
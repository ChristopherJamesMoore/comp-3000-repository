import React from 'react';

type PendingApprovalPageProps = {
    status: 'pending' | 'rejected';
    onLogout: () => void;
};

const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ status, onLogout }) => (
    <div className="auth-page">
        <div className="auth-card">
            <div className="auth-card__header">
                <button className="auth-card__brand">LedgRx</button>
                <span className="auth-card__eyebrow">
                    {status === 'pending' ? 'Pending' : 'Rejected'}
                </span>
            </div>
            <h2>{status === 'pending' ? 'Account pending approval' : 'Application rejected'}</h2>
            <p>
                {status === 'pending'
                    ? 'Your account is awaiting admin approval. You will be able to access the supply chain once an administrator verifies your organisation.'
                    : 'Your account application has been rejected. Please contact an administrator if you believe this is an error.'}
            </p>
            <div className="auth-card__actions">
                <button
                    type="button"
                    className="button button--ghost auth-card__primary"
                    onClick={onLogout}
                >
                    Log out
                </button>
            </div>
        </div>
    </div>
);

export default PendingApprovalPage;

import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';

type AdminSecurityPageProps = {
    userName: string;
    onAccountClick: () => void;
    onNavSelect: (nav: DashboardNav) => void;
    onAddBackupPasskey: () => Promise<void>;
};

const AdminSecurityPage: React.FC<AdminSecurityPageProps> = ({
    userName,
    onAccountClick,
    onNavSelect,
    onAddBackupPasskey,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async () => {
        setError('');
        setSuccess(false);
        setSubmitting(true);
        try {
            await onAddBackupPasskey();
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to register backup passkey.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout
            userName={userName}
            onAccountClick={onAccountClick}
            activeNav="security"
            onNavSelect={onNavSelect}
            heading="Security"
            isAdmin={true}
        >
            <div className="admin-dashboard">
                <div style={{ maxWidth: 480 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <ShieldCheck size={16} /> Backup passkey
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
                        Register an additional passkey on a USB security key. If your primary device is lost
                        you can still sign in using the backup key. You can register as many as you need.
                    </p>

                    {error && <div className="inline-error" style={{ marginBottom: 12 }}>{error}</div>}
                    {success && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--success, #22c55e)', marginBottom: 12 }}>
                            Backup passkey registered successfully.
                        </p>
                    )}

                    <button
                        className="button button--primary button--mini"
                        onClick={handleAdd}
                        disabled={submitting}
                    >
                        {submitting
                            ? <><Loader2 size={13} className="spin" /> Waiting for key…</>
                            : <><ShieldCheck size={13} /> Add backup passkey</>}
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminSecurityPage;

import React, { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { buildUrl } from '../utils/api';

type WorkerInfo = {
    username: string;
    orgId: string;
    companyName: string;
    companyType: string;
    jobTitle: string;
};

type WorkerInvitePageProps = {
    inviteToken: string;
    onSuccess: (token: string, tokenType: string) => void;
    onNavigateHome: () => void;
};

const WorkerInvitePage: React.FC<WorkerInvitePageProps> = ({ inviteToken, onSuccess, onNavigateHome }) => {
    const [worker, setWorker] = useState<WorkerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [registering, setRegistering] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const validate = async () => {
            try {
                const res = await fetch(buildUrl(`/api/worker/invite/${encodeURIComponent(inviteToken)}`));
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    setError(err.error || 'This invite link is invalid or has expired.');
                    return;
                }
                const data = await res.json();
                setWorker(data);
            } catch {
                setError('Failed to validate invite link.');
            } finally {
                setLoading(false);
            }
        };
        validate();
    }, [inviteToken]);

    const handleRegister = async () => {
        setError('');
        setRegistering(true);
        try {
            // Begin registration
            const beginRes = await fetch(buildUrl('/api/worker/webauthn/register/begin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteToken }),
            });
            if (!beginRes.ok) {
                const err = await beginRes.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to start passkey setup.');
            }
            const options = await beginRes.json();

            // Browser creates passkey
            const credential = await startRegistration({ optionsJSON: options });

            // Complete registration
            const completeRes = await fetch(buildUrl('/api/worker/webauthn/register/complete'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteToken, credential }),
            });
            if (!completeRes.ok) {
                const err = await completeRes.json().catch(() => ({}));
                throw new Error(err.error || 'Passkey setup failed.');
            }
            const data = await completeRes.json();
            setDone(true);
            setTimeout(() => onSuccess(data.token, 'worker'), 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Passkey setup failed.');
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <main className="auth-page">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <span className="auth-card__brand">LedgRx</span>
                        <span className="auth-card__eyebrow">Worker setup</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                        <Loader2 size={16} className="spin" />
                        <span>Validating invite link…</span>
                    </div>
                </div>
            </main>
        );
    }

    if (error && !worker) {
        return (
            <main className="auth-page">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <button className="auth-card__brand" onClick={onNavigateHome}>LedgRx</button>
                        <span className="auth-card__eyebrow">Worker setup</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', marginBottom: 16 }}>
                        <XCircle size={18} />
                        <strong>Invalid invite</strong>
                    </div>
                    <p>{error}</p>
                    <div className="auth-card__actions">
                        <button className="button button--ghost" onClick={onNavigateHome}>Back to home</button>
                    </div>
                </div>
            </main>
        );
    }

    if (done) {
        return (
            <main className="auth-page">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <span className="auth-card__brand">LedgRx</span>
                        <span className="auth-card__eyebrow">Worker setup</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', marginBottom: 16 }}>
                        <CheckCircle size={18} />
                        <strong>Passkey registered</strong>
                    </div>
                    <p>You're all set. Signing you in…</p>
                </div>
            </main>
        );
    }

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <button className="auth-card__brand" onClick={onNavigateHome}>LedgRx</button>
                    <span className="auth-card__eyebrow">Worker setup</span>
                </div>
                <h2>Set up your account.</h2>
                {worker && (
                    <div className="auth-card__meta" style={{ marginBottom: 16 }}>
                        <p>
                            You've been invited to join <strong>{worker.companyName}</strong> on LedgRx
                            {worker.jobTitle ? ` as ${worker.jobTitle}` : ''}.
                        </p>
                        <p style={{ marginTop: 4 }}>
                            Your username is <strong>{worker.username}</strong>. Click below to create a passkey on this device — no password needed.
                        </p>
                    </div>
                )}
                {error && <div className="inline-error">{error}</div>}
                <div className="auth-card__actions">
                    <button
                        className="button button--primary auth-card__primary"
                        onClick={handleRegister}
                        disabled={registering}
                    >
                        {registering
                            ? <><Loader2 size={15} className="spin" /> Setting up passkey…</>
                            : <><Fingerprint size={15} /> Create my passkey</>}
                    </button>
                    <button className="button button--ghost" onClick={onNavigateHome}>
                        Cancel
                    </button>
                </div>
                <p className="auth-card__hint" style={{ marginTop: 12 }}>
                    Your passkey is stored securely on this device using Face ID, Touch ID, or Windows Hello.
                </p>
            </div>
        </main>
    );
};

export default WorkerInvitePage;

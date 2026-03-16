import React, { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';
import { API_BASE } from '../utils/api';

type OrgRegisterPasskeyPageProps = {
    token: string;
    adminUsername: string;
    onSuccess: (jwtToken: string) => void;
    onNavigateHome: () => void;
};

type Status = 'validating' | 'ready' | 'registering' | 'done' | 'error';

const OrgRegisterPasskeyPage: React.FC<OrgRegisterPasskeyPageProps> = ({
    token,
    adminUsername,
    onSuccess,
    onNavigateHome,
}) => {
    const [status, setStatus] = useState<Status>('validating');
    const [error, setError] = useState('');

    useEffect(() => {
        const validate = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/org/invite/${token}`);
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Invalid or expired reset link.');
                }
                setStatus('ready');
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Invalid or expired reset link.');
                setStatus('error');
            }
        };
        validate();
    }, [token]);

    const handleRegister = async () => {
        setStatus('registering');
        setError('');
        try {
            const beginRes = await fetch(`${API_BASE}/api/org/webauthn/register/begin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminUsername }),
            });
            if (!beginRes.ok) {
                const data = await beginRes.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to begin passkey registration.');
            }
            const options = await beginRes.json();
            const credential = await startRegistration({ optionsJSON: options });
            const completeRes = await fetch(`${API_BASE}/api/org/webauthn/register/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminUsername, credential, resetToken: token }),
            });
            if (!completeRes.ok) {
                const data = await completeRes.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to complete passkey registration.');
            }
            const { token: jwtToken } = await completeRes.json();
            setStatus('done');
            onSuccess(jwtToken);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
            setStatus('ready');
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <button className="auth-card__brand" onClick={onNavigateHome}><img src="/logo_typ.png" alt="LedgRx" className="brand-logo-typ brand-logo-typ--sm" /></button>
                    <span className="auth-card__eyebrow">Passkey reset</span>
                </div>

                {status === 'validating' && (
                    <>
                        <h2>Validating reset link…</h2>
                        <p><Loader2 size={15} className="spin" style={{ display: 'inline' }} /> Please wait.</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2>Link invalid</h2>
                        <p>{error}</p>
                        <div className="auth-card__actions">
                            <button className="button button--primary auth-card__primary" onClick={onNavigateHome}>
                                Back to home
                            </button>
                        </div>
                    </>
                )}

                {(status === 'ready' || status === 'registering') && (
                    <>
                        <h2>Register a new passkey</h2>
                        <p>Your previous passkey has been revoked. Register a new one for <strong>{adminUsername}</strong> to regain access.</p>
                        {error && <div className="inline-error">{error}</div>}
                        <div className="auth-card__actions">
                            <button
                                className="button button--primary auth-card__primary"
                                onClick={handleRegister}
                                disabled={status === 'registering'}
                            >
                                {status === 'registering'
                                    ? <><Loader2 size={15} className="spin" /> Registering…</>
                                    : <><Fingerprint size={15} /> Register passkey</>}
                            </button>
                        </div>
                    </>
                )}

                {status === 'done' && (
                    <>
                        <h2>Passkey registered</h2>
                        <p>Your new passkey is active. Redirecting to your dashboard…</p>
                    </>
                )}
            </div>
        </main>
    );
};

export default OrgRegisterPasskeyPage;

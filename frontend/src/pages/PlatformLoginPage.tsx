import React, { useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';

type PlatformLoginPageProps = {
    onLogin: (username: string) => Promise<void>;
    onRecovery: () => void;
};

const PlatformLoginPage: React.FC<PlatformLoginPageProps> = ({ onLogin, onRecovery }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username.trim()) { setError('Enter your username.'); return; }
        setSubmitting(true);
        try {
            await onLogin(username.trim());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Passkey login failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <span className="auth-card__brand"><img src="/logo-removebg-preview.png" alt="" className="brand-logo brand-logo--sm" /> LedgRx</span>
                    <span className="auth-card__eyebrow">Staff access</span>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username webauthn"
                            required
                        />
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={15} className="spin" /> Waiting for passkey…</>
                                : <><Fingerprint size={15} /> Sign in with passkey</>}
                        </button>
                    </div>
                </form>
                <button
                    type="button"
                    onClick={onRecovery}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'transparent', userSelect: 'none', marginTop: 32, display: 'block' }}
                    aria-label="Recovery"
                >
                    ·
                </button>
            </div>
        </main>
    );
};

export default PlatformLoginPage;

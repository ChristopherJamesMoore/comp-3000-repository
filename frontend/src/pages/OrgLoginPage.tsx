import React, { useState } from 'react';
import { Home, Fingerprint, Loader2 } from 'lucide-react';

type OrgLoginPageProps = {
    onLogin: (username: string) => Promise<unknown>;
    onNavigateHome: () => void;
    onNavigateSignup: () => void;
    onNavigateWorkerLogin: () => void;
};

const OrgLoginPage: React.FC<OrgLoginPageProps> = ({ onLogin, onNavigateHome, onNavigateSignup, onNavigateWorkerLogin }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username.trim()) {
            setError('Enter your username.');
            return;
        }
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
                    <button className="auth-card__brand" onClick={onNavigateHome}>LedgRx</button>
                    <span className="auth-card__eyebrow">Organisation sign in</span>
                </div>
                <h2>Welcome back.</h2>
                <p>Sign in to your organisation's LedgRx admin account using your passkey.</p>
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
                    <p className="auth-card__hint">Lost access to your passkey? Contact your platform administrator to reset it.</p>
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={15} className="spin" /> Waiting for passkey…</>
                                : <><Fingerprint size={15} /> Sign in with passkey</>}
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateSignup}>
                            Register your organisation
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateHome}>
                            <Home size={16} />
                            Back to home
                        </button>
                    </div>
                    <div className="auth-card__divider">
                        <span>Are you a worker?</span>
                    </div>
                    <button type="button" className="button button--ghost" style={{ width: '100%' }} onClick={onNavigateWorkerLogin}>
                        Worker sign in
                    </button>
                </form>
            </div>
        </main>
    );
};

export default OrgLoginPage;

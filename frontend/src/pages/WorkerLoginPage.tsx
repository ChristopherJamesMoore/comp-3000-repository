import React, { useState } from 'react';
import { Home, Fingerprint, Loader2 } from 'lucide-react';

type WorkerLoginPageProps = {
    onLogin: (username: string) => Promise<unknown>;
    onNavigateHome: () => void;
    onNavigateOrgLogin: () => void;
};

const WorkerLoginPage: React.FC<WorkerLoginPageProps> = ({ onLogin, onNavigateHome, onNavigateOrgLogin }) => {
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
                    <span className="auth-card__eyebrow">Worker sign in</span>
                </div>
                <h2>Welcome back.</h2>
                <p>Sign in with your worker account using your passkey to access the supply chain dashboard.</p>
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
                    <p className="auth-card__hint">Lost your passkey? Contact your organisation admin to send a new invite link.</p>
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={15} className="spin" /> Waiting for passkey…</>
                                : <><Fingerprint size={15} /> Sign in with passkey</>}
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateOrgLogin}>
                            Sign in as organisation admin instead
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateHome}>
                            <Home size={16} />
                            Back to home
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default WorkerLoginPage;

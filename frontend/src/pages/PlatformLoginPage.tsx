import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

type PlatformLoginPageProps = {
    onLogin: (username: string, password: string) => Promise<void>;
};

const PlatformLoginPage: React.FC<PlatformLoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username || !password) { setError('Enter your username and password.'); return; }
        setSubmitting(true);
        try {
            await onLogin(username, password);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <span className="auth-card__brand">LedgRx</span>
                    <span className="auth-card__eyebrow">Staff access</span>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting ? <><Loader2 size={15} className="spin" /> Signing in…</> : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default PlatformLoginPage;

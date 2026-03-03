import React, { useState } from 'react';
import { Home } from 'lucide-react';

type OrgLoginPageProps = {
    onLogin: (username: string, password: string) => Promise<unknown>;
    onNavigateHome: () => void;
    onNavigateSignup: () => void;
    onNavigateWorkerLogin: () => void;
};

const OrgLoginPage: React.FC<OrgLoginPageProps> = ({ onLogin, onNavigateHome, onNavigateSignup, onNavigateWorkerLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username || !password) {
            setError('Enter your username and password.');
            return;
        }
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
                    <button className="auth-card__brand" onClick={onNavigateHome}>LedgRx</button>
                    <span className="auth-card__eyebrow">Organisation sign in</span>
                </div>
                <h2>Welcome back.</h2>
                <p>Sign in to your organisation's LedgRx admin account.</p>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                    <p className="auth-card__hint">Forgotten your password? Contact your platform administrator.</p>
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Sign in'}
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

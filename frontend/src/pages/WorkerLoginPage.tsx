import React, { useState } from 'react';
import { Home } from 'lucide-react';

type WorkerLoginPageProps = {
    onLogin: (username: string, password: string) => Promise<unknown>;
    onNavigateHome: () => void;
    onNavigateOrgLogin: () => void;
};

const WorkerLoginPage: React.FC<WorkerLoginPageProps> = ({ onLogin, onNavigateHome, onNavigateOrgLogin }) => {
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
                    <span className="auth-card__eyebrow">Worker sign in</span>
                </div>
                <h2>Welcome back.</h2>
                <p>Sign in with your worker account to access the supply chain dashboard.</p>
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
                    <p className="auth-card__hint">Forgotten your password? Contact your organisation admin.</p>
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Sign in'}
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

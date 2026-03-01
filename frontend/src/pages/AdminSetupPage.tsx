import React, { useState } from 'react';

type AdminSetupPageProps = {
    onBootstrap: (username: string, password: string) => Promise<unknown>;
    onNavigateLogin: () => void;
};

const AdminSetupPage: React.FC<AdminSetupPageProps> = ({ onBootstrap, onNavigateLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [alreadyExists, setAlreadyExists] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setSubmitting(true);
        try {
            await onBootstrap(username.trim(), password);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('already exists') || message.includes('409')) {
                setAlreadyExists(true);
            } else {
                setError(message || 'Setup failed.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (alreadyExists) {
        return (
            <main className="auth-page">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <button className="auth-card__brand" onClick={onNavigateLogin}>
                            LedgRx
                        </button>
                        <span className="auth-card__eyebrow">Setup</span>
                    </div>
                    <h2>Admin already configured.</h2>
                    <p>An administrator account already exists. Please sign in with your admin credentials.</p>
                    <div className="auth-card__actions">
                        <button type="button" className="button button--primary auth-card__primary" onClick={onNavigateLogin}>
                            Go to login
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <button className="auth-card__brand" onClick={onNavigateLogin}>
                        LedgRx
                    </button>
                    <span className="auth-card__eyebrow">First-time setup</span>
                </div>
                <h2>Create your administrator account.</h2>
                <p>Set up the first admin account to start managing organisation onboarding requests.</p>
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
                    <div className="field">
                        <label>Confirm password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting ? 'Creating account…' : 'Create admin account'}
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateLogin}>
                            Back to login
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default AdminSetupPage;

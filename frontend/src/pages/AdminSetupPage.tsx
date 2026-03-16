import React, { useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';

type AdminSetupPageProps = {
    onBootstrap: (username: string) => Promise<unknown>;
    onNavigateLogin: () => void;
};

const AdminSetupPage: React.FC<AdminSetupPageProps> = ({ onBootstrap, onNavigateLogin }) => {
    const [username, setUsername] = useState('');
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
        setSubmitting(true);
        try {
            await onBootstrap(username.trim());
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
                        <button className="auth-card__brand" onClick={onNavigateLogin}><img src="/logo-removebg-preview.png" alt="" className="brand-logo brand-logo--sm" /> LedgRx</button>
                        <span className="auth-card__eyebrow">Setup</span>
                    </div>
                    <h2>Admin already configured.</h2>
                    <p>An administrator account already exists. Please sign in with your admin passkey.</p>
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
                    <button className="auth-card__brand" onClick={onNavigateLogin}><img src="/logo-removebg-preview.png" alt="" className="brand-logo brand-logo--sm" /> LedgRx</button>
                    <span className="auth-card__eyebrow">First-time setup</span>
                </div>
                <h2>Create your administrator account.</h2>
                <p>Choose a username. You'll then be prompted to register a passkey on this device — no password needed.</p>
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
                    {error && <div className="inline-error">{error}</div>}
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={15} className="spin" /> Setting up passkey…</>
                                : <><Fingerprint size={15} /> Create admin &amp; register passkey</>}
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

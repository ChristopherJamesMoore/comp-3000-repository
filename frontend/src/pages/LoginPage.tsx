import React from 'react';
import { Home } from 'lucide-react';
import { AuthMode } from '../types';

type LoginPageProps = {
    authMode: AuthMode;
    loginForm: { username: string; password: string; email: string };
    authError: string;
    onLoginFormChange: (field: 'username' | 'password' | 'email', value: string) => void;
    onToggleMode: () => void;
    onSubmitLogin: (e: React.FormEvent) => void;
    onSubmitSignup: (e: React.FormEvent) => void;
    onNavigateHome: () => void;
    onSetup?: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({
    authMode,
    loginForm,
    authError,
    onLoginFormChange,
    onToggleMode,
    onSubmitLogin,
    onSubmitSignup,
    onNavigateHome,
    onSetup
}) => (
    <main className="auth-page">
        <div className="auth-card">
            <div className="auth-card__header">
                <button className="auth-card__brand" onClick={onNavigateHome}>
                    LedgRx
                </button>
                <span className="auth-card__eyebrow">{authMode === 'signup' ? 'Create account' : 'Sign in'}</span>
            </div>
            <h2>{authMode === 'signup' ? 'Build trust in every handoff.' : 'Welcome back.'}</h2>
            <p>
                {authMode === 'signup'
                    ? 'Register your organisation to begin tracking medication provenance on the LedgRx network.'
                    : 'Sign in to your organisation\'s LedgRx account.'}
            </p>
            <form onSubmit={authMode === 'signup' ? onSubmitSignup : onSubmitLogin}>
                <div className="field">
                    <label>Username</label>
                    <input
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => onLoginFormChange('username', e.target.value)}
                        required
                    />
                </div>
                <div className="field">
                    <label>Password</label>
                    <input
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => onLoginFormChange('password', e.target.value)}
                        required
                    />
                </div>
                {authMode === 'signup' && (
                    <div className="field">
                        <label>Work email</label>
                        <input
                            type="email"
                            value={loginForm.email}
                            onChange={(e) => onLoginFormChange('email', e.target.value)}
                            placeholder="you@organisation.com"
                        />
                    </div>
                )}
                {authError && <div className="inline-error">{authError}</div>}
                {authMode === 'login' && (
                    <p className="auth-card__hint">Forgotten your password? Contact your administrator.</p>
                )}
                <div className="auth-card__actions">
                    <button type="submit" className="button button--primary auth-card__primary">
                        {authMode === 'signup' ? 'Create account' : 'Sign in'}
                    </button>
                    <button type="button" className="button button--ghost" onClick={onToggleMode}>
                        {authMode === 'signup' ? 'Have an account? Sign in' : 'Need an account? Sign up'}
                    </button>
                    <button type="button" className="button button--ghost" onClick={onNavigateHome}>
                        <Home size={16} />
                        Back to home
                    </button>
                    {onSetup && (
                        <button type="button" className="button button--ghost" onClick={onSetup}>
                            First-time setup
                        </button>
                    )}
                </div>
            </form>
        </div>
    </main>
);

export default LoginPage;

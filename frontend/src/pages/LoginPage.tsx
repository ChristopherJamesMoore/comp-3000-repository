import React from 'react';
import { Home } from 'lucide-react';
import { AuthMode } from '../types';

type LoginPageProps = {
    authMode: AuthMode;
    loginForm: { username: string; password: string };
    authError: string;
    onLoginFormChange: (field: 'username' | 'password', value: string) => void;
    onToggleMode: () => void;
    onSubmitLogin: (e: React.FormEvent) => void;
    onSubmitSignup: (e: React.FormEvent) => void;
    onNavigateHome: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({
    authMode,
    loginForm,
    authError,
    onLoginFormChange,
    onToggleMode,
    onSubmitLogin,
    onSubmitSignup,
    onNavigateHome
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
                    ? 'Create your LedgRx account to start recording medication lineage.'
                    : 'Sign in to keep managing medication records.'}
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
                {authError && <div className="inline-error">{authError}</div>}
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
                </div>
            </form>
        </div>
    </main>
);

export default LoginPage;

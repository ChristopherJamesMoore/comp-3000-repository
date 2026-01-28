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
    <section className="panel panel--center">
        <form
            className="card card--form auth-card"
            onSubmit={authMode === 'signup' ? onSubmitSignup : onSubmitLogin}
        >
            <h2>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <p>
                {authMode === 'signup'
                    ? 'Sign up to start managing medication records.'
                    : 'Sign in to continue managing medication records.'}
            </p>
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
            <div className="form__actions">
                <button type="submit" className="button button--primary">
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
    </section>
);

export default LoginPage;

import React from 'react';
import { Home, ShieldCheck, LogIn, Plus } from 'lucide-react';
import { UserProfile, AuthMode } from '../types';

type TopbarProps = {
    authToken: string | null;
    profile: UserProfile | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
    onLogout: () => void;
};

const Topbar: React.FC<TopbarProps> = ({ authToken, profile, onNavigate, onLogout }) => (
    <header className="topbar">
        <button className="brand" onClick={() => onNavigate('/')}>
            LedgRx
        </button>
        <nav className="topbar__nav">
            <button className="topbar__link" onClick={() => onNavigate('/')}>
                <Home size={16} />
                Home
            </button>
            <button className="topbar__link" onClick={() => onNavigate('/app')}>
                <ShieldCheck size={16} />
                Dashboard
            </button>
            {!authToken ? (
                <>
                    <button className="topbar__link" onClick={() => onNavigate('/login', 'login')}>
                        <LogIn size={16} />
                        Sign in
                    </button>
                    <button className="topbar__link" onClick={() => onNavigate('/login', 'signup')}>
                        <Plus size={16} />
                        Sign up
                    </button>
                </>
            ) : (
                <>
                    <div className="topbar__account">
                        <span>Account</span>
                        <strong>{profile?.username || 'User'}</strong>
                    </div>
                    <button className="topbar__link" onClick={() => onNavigate('/account')}>
                        Account details
                    </button>
                    <button className="topbar__link" onClick={onLogout}>
                        Log out
                    </button>
                </>
            )}
        </nav>
    </header>
);

export default Topbar;

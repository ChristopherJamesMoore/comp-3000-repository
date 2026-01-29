import React from 'react';
import { AuthMode } from '../types';

type MarketingNavProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const MarketingNav: React.FC<MarketingNavProps> = ({ authToken, onNavigate }) => (
    <header className="home-nav">
        <button className="home-nav__brand" onClick={() => onNavigate('/')}
        >
            LedgRx
        </button>
        <nav className="home-nav__links">
            <button type="button" onClick={() => onNavigate('/product')} className="home-nav__link">
                Product
            </button>
            <button type="button" onClick={() => onNavigate('/solutions')} className="home-nav__link">
                Solutions
            </button>
            <button type="button" onClick={() => onNavigate('/resources')} className="home-nav__link">
                Resources
            </button>
            <button type="button" onClick={() => onNavigate('/customers')} className="home-nav__link">
                Customers
            </button>
            <button type="button" onClick={() => onNavigate('/pricing')} className="home-nav__link">
                Pricing
            </button>
        </nav>
        <div className="home-nav__actions">
            {authToken ? (
                <button className="home-nav__cta" onClick={() => onNavigate('/app')}>
                    Open dashboard
                </button>
            ) : (
                <>
                    <button className="home-nav__action" onClick={() => onNavigate('/login', 'login')}>
                        Log in
                    </button>
                    <button className="home-nav__cta" onClick={() => onNavigate('/login', 'signup')}>
                        Sign up
                    </button>
                </>
            )}
        </div>
    </header>
);

export default MarketingNav;

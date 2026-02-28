import React, { useState } from 'react';
import { AuthMode } from '../types';

type MarketingNavProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const MarketingNav: React.FC<MarketingNavProps> = ({ authToken, onNavigate }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleNavigate = (path: string, mode?: AuthMode) => {
        onNavigate(path, mode);
        setMobileOpen(false);
    };

    return (
        <header className={`home-nav${mobileOpen ? ' home-nav--open' : ''}`}>
            <button className="home-nav__brand" onClick={() => handleNavigate('/')}>
                LedgRx
            </button>

            <button
                type="button"
                className="home-nav__menu"
                aria-expanded={mobileOpen}
                aria-label="Toggle navigation menu"
                onClick={() => setMobileOpen((prev) => !prev)}
            >
                {mobileOpen ? 'Close' : 'Menu'}
            </button>

            <nav className="home-nav__links">
                <button type="button" onClick={() => handleNavigate('/product')} className="home-nav__link">
                    Product
                </button>
                <button type="button" onClick={() => handleNavigate('/solutions')} className="home-nav__link">
                    Solutions
                </button>
                <button type="button" onClick={() => handleNavigate('/resources')} className="home-nav__link">
                    Resources
                </button>
                <button type="button" onClick={() => handleNavigate('/customers')} className="home-nav__link">
                    Customers
                </button>
                <button type="button" onClick={() => handleNavigate('/pricing')} className="home-nav__link">
                    Pricing
                </button>
            </nav>
            <div className="home-nav__actions">
                {authToken ? (
                    <button className="home-nav__cta" onClick={() => handleNavigate('/app')}>
                        Open dashboard
                    </button>
                ) : (
                    <>
                        <button className="home-nav__action" onClick={() => handleNavigate('/login', 'login')}>
                            Log in
                        </button>
                        <button className="home-nav__cta" onClick={() => handleNavigate('/login', 'signup')}>
                            Sign up
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default MarketingNav;

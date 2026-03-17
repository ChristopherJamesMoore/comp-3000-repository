import React, { useState } from 'react';
import { AuthMode } from '../types';

type MarketingNavProps = {
    authToken: string | null;
    profileType?: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};


const MarketingNav: React.FC<MarketingNavProps> = ({ authToken, profileType, onNavigate }) => {
    const dashboardPath = profileType === 'org' ? '/org' : '/app';
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleNavigate = (path: string, mode?: AuthMode) => {
        onNavigate(path, mode);
        setMobileOpen(false);
    };

    return (
        <header className={`home-nav${mobileOpen ? ' home-nav--open' : ''}`}>
            <button className="home-nav__brand" onClick={() => handleNavigate('/')}>
                <img src="/logo_typ.png" alt="LedgRx" className="brand-logo-typ brand-logo-typ--light" />
                <img src="/logo_white.png" alt="LedgRx" className="brand-logo-typ brand-logo-typ--dark" />
            </button>

            <button
                type="button"
                className="home-nav__menu"
                aria-expanded={mobileOpen}
                aria-label="Toggle navigation menu"
                onClick={() => setMobileOpen((prev) => !prev)}
            >
                <span className="home-nav__menu-bar" />
                <span className="home-nav__menu-bar" />
                <span className="home-nav__menu-bar" />
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
                <div className="home-nav__mobile-auth">
                    {authToken ? (
                        <button className="home-nav__cta" onClick={() => handleNavigate(dashboardPath)}>
                            Open dashboard
                        </button>
                    ) : (
                        <>
                            <button className="home-nav__action" onClick={() => handleNavigate('/login/org')}>
                                Log in
                            </button>
                            <button className="home-nav__cta" onClick={() => handleNavigate('/signup')}>
                                Register
                            </button>
                        </>
                    )}
                </div>
            </nav>
            <div className="home-nav__actions">
                {authToken ? (
                    <button className="home-nav__cta" onClick={() => handleNavigate(dashboardPath)}>
                        Open dashboard
                    </button>
                ) : (
                    <>
                        <button className="home-nav__action" onClick={() => handleNavigate('/login/org')}>
                            Log in
                        </button>
                        <button className="home-nav__cta" onClick={() => handleNavigate('/signup')}>
                            Register
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default MarketingNav;

import React from 'react';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

type PricingPageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const PricingPage: React.FC<PricingPageProps> = ({ authToken, onNavigate }) => (
    <main className="home">
        <MarketingNav authToken={authToken} onNavigate={onNavigate} />

        <section className="home-hero">
            <div className="home-hero__inner">
                <p className="home-hero__eyebrow">Pricing</p>
                <h1>Simple plans for every scale.</h1>
                <p className="home-hero__lead">
                    Start with the essentials and expand as your network grows. Every plan includes private Fabric
                    connectivity, QR verification, and audit-ready reporting.
                </p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Plans</h2>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>Starter</h3>
                        <p>For early-stage pilots. Up to 5,000 records per month.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Growth</h3>
                        <p>Scale to multi-site operations and advanced reporting.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Enterprise</h3>
                        <p>Custom integrations, SLA support, and dedicated onboarding.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>All plans include</h2>
                <ul>
                    <li>Private Fabric network connectivity and secure API access.</li>
                    <li>Medication minting, custody events, and QR verification.</li>
                    <li>Role-based access control and audit-ready history.</li>
                </ul>
            </div>
        </section>

        <section className="home-cta">
            <div className="home-cta__inner">
                <h2>Ready to discuss pricing?</h2>
                <p>Sign up or log in to start a guided onboarding flow.</p>
                <button className="button button--primary" onClick={() => onNavigate('/login', 'signup')}>
                    Sign up
                </button>
            </div>
        </section>
    </main>
);

export default PricingPage;

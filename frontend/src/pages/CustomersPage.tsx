import React from 'react';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

type CustomersPageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const CustomersPage: React.FC<CustomersPageProps> = ({ authToken, onNavigate }) => (
    <main className="home">
        <MarketingNav authToken={authToken} onNavigate={onNavigate} />

        <section className="home-hero">
            <div className="home-hero__inner">
                <p className="home-hero__eyebrow">Customers</p>
                <h1>Trusted by teams who move medicine.</h1>
                <p className="home-hero__lead">
                    LedgRx supports multi-party networks across manufacturing, distribution, and care settings. The
                    dashboard is designed to be simple enough for daily operations and powerful enough for audit teams.
                </p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Use cases</h2>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>National manufacturers</h3>
                        <p>Maintain consistent lineage across multiple facilities and partners.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Regional distributors</h3>
                        <p>Track inbound and outbound medication custody with a single QR scan.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Pharmacy groups</h3>
                        <p>Verify provenance in seconds before dispensing high-value medications.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>What teams love</h2>
                <ul>
                    <li>Fast QR verification that fits existing workflows.</li>
                    <li>Clear custody history for compliance audits.</li>
                    <li>Private infrastructure with zero public Fabric exposure.</li>
                </ul>
            </div>
        </section>

        <section className="home-cta">
            <div className="home-cta__inner">
                <h2>Join the LedgRx network</h2>
                <p>We will help you tailor onboarding for your organization.</p>
                <button className="button button--primary" onClick={() => onNavigate('/login', 'signup')}>
                    Get started
                </button>
            </div>
        </section>
    </main>
);

export default CustomersPage;

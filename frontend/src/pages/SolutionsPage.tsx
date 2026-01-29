import React from 'react';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

type SolutionsPageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const SolutionsPage: React.FC<SolutionsPageProps> = ({ authToken, onNavigate }) => (
    <main className="home">
        <MarketingNav authToken={authToken} onNavigate={onNavigate} />

        <section className="home-hero">
            <div className="home-hero__inner">
                <p className="home-hero__eyebrow">Solutions</p>
                <h1>Built for every stakeholder.</h1>
                <p className="home-hero__lead">
                    From manufacturing to dispensing, LedgRx provides role-specific workflows and visibility without
                    leaking sensitive data outside your private network.
                </p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Manufacturers</h2>
                <p>Mint records, attach production metadata, and publish QR hashes in minutes.</p>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>Batch validation</h3>
                        <p>Confirm GTIN and expiry accuracy before any shipment leaves your floor.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Compliance-ready</h3>
                        <p>Maintain an immutable audit trail for regulatory reporting.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>Distributors</h2>
                <p>Log custody events and keep visibility across inbound and outbound shipments.</p>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>Receipt tracking</h3>
                        <p>Confirm handoffs and reduce disputes with a shared on-chain record.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Route verification</h3>
                        <p>Validate where products have been and where they are headed.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Pharmacies & clinics</h2>
                <p>Scan once and know the lineage before medication reaches a patient.</p>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>Instant QR lookup</h3>
                        <p>Fetch on-chain data in seconds with the LedgRx lookup tools.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Patient confidence</h3>
                        <p>Reduce counterfeit risk and increase transparency at the point of care.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-cta">
            <div className="home-cta__inner">
                <h2>Find the right workflow</h2>
                <p>We will help you configure LedgRx for your organization in minutes.</p>
                <button className="button button--primary" onClick={() => onNavigate('/login', 'signup')}>
                    Sign up
                </button>
            </div>
        </section>
    </main>
);

export default SolutionsPage;

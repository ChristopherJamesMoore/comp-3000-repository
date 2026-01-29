import React from 'react';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

type ResourcesPageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const ResourcesPage: React.FC<ResourcesPageProps> = ({ authToken, onNavigate }) => (
    <main className="home">
        <MarketingNav authToken={authToken} onNavigate={onNavigate} />

        <section className="home-hero">
            <div className="home-hero__inner">
                <p className="home-hero__eyebrow">Resources</p>
                <h1>Everything you need to launch.</h1>
                <p className="home-hero__lead">
                    Access onboarding guides, API references, and deployment checklists that help you roll out LedgRx
                    across your supply chain.
                </p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Guides & playbooks</h2>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>Onboarding</h3>
                        <p>Step-by-step setup for Fabric orgs, channels, and chaincode deployment.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Security</h3>
                        <p>Best practices for keeping crypto material secure and private.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Operations</h3>
                        <p>Monitoring, health checks, and backup workflows for your VPS.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>API & integrations</h2>
                <p>
                    Build internal tools on top of the LedgRx API. The backend is built to be reverse-proxied and
                    environment driven, so you can plug in scanners, dashboards, and reporting tools.
                </p>
            </div>
        </section>

        <section className="home-cta">
            <div className="home-cta__inner">
                <h2>Need implementation help?</h2>
                <p>Reach out and we will walk your team through deployment and onboarding.</p>
                <button className="button button--primary" onClick={() => onNavigate('/login', 'signup')}>
                    Contact us
                </button>
            </div>
        </section>
    </main>
);

export default ResourcesPage;

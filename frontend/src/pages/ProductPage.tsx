import React from 'react';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

type ProductPageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const ProductPage: React.FC<ProductPageProps> = ({ authToken, onNavigate }) => (
    <main className="home">
        <MarketingNav authToken={authToken} onNavigate={onNavigate} />

        <section className="home-hero">
            <div className="home-hero__inner">
                <p className="home-hero__eyebrow">Product</p>
                <h1>Traceability that works end to end.</h1>
                <p className="home-hero__lead">
                    LedgRx anchors medication records on a private Fabric network, generating a QR hash that can be
                    verified at every handoff without exposing your blockchain to the public web.
                </p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Core capabilities</h2>
                <div className="home-section__grid">
                    <div className="home-tile">
                        <h3>Batch lineage</h3>
                        <p>Capture GTIN, batch, expiry, and company metadata for every unit.</p>
                    </div>
                    <div className="home-tile">
                        <h3>QR verification</h3>
                        <p>Generate a deterministic QR hash that scanners can verify instantly.</p>
                    </div>
                    <div className="home-tile">
                        <h3>Private network</h3>
                        <p>Keep Fabric peer endpoints off the public internet while still serving APIs.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>Designed for real supply chains</h2>
                <p>
                    LedgRx fits existing workflows: manufacturers mint records, distributors acknowledge custody, and
                    pharmacies confirm arrival. Everything stays auditable without adding extra paperwork.
                </p>
            </div>
        </section>

        <section className="home-cta">
            <div className="home-cta__inner">
                <h2>See LedgRx in action</h2>
                <p>Sign in to the dashboard and create your first QR-backed medication record.</p>
                <button className="button button--primary" onClick={() => onNavigate('/login', 'login')}>
                    Sign in
                </button>
            </div>
        </section>
    </main>
);

export default ProductPage;

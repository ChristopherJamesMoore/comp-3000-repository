import React, { useEffect, useState } from 'react';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

type HomePageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const HomePage: React.FC<HomePageProps> = ({ authToken, onNavigate }) => {
    const headline = 'Trust every medication handoff.';
    const [typed, setTyped] = useState('');
    const [showCaret, setShowCaret] = useState(true);

    useEffect(() => {
        let index = 0;
        const typeTimer = window.setInterval(() => {
            index += 1;
            setTyped(headline.slice(0, index));
            if (index >= headline.length) {
                window.clearInterval(typeTimer);
            }
        }, 45);
        return () => window.clearInterval(typeTimer);
    }, []);

    useEffect(() => {
        const blinkTimer = window.setInterval(() => {
            setShowCaret((prev) => !prev);
        }, 500);
        return () => window.clearInterval(blinkTimer);
    }, []);

    return (
        <main className="home">
            <MarketingNav authToken={authToken} onNavigate={onNavigate} />

            <section className="home-hero">
                <div className="home-hero__inner">
                    <p className="home-hero__eyebrow">LedgRx • Private pharma traceability</p>
                    <h1 className="home-hero__typing">
                        <span>{typed || '\u00A0'}</span>
                        <span className={showCaret ? 'home-hero__caret' : 'home-hero__caret home-hero__caret--off'}>|</span>
                    </h1>
                    <p className="home-hero__lead">
                        LedgRx is a private, auditable trail for medications. We help manufacturers, distributors, and
                        pharmacists verify origin, track custody, and deliver instant QR verification.
                    </p>
                </div>
            </section>/plan

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Product</h2>
                <p>
                    Anchor each medication batch on a private Fabric network and generate a unique QR hash for instant
                    verification without exposing the network publicly.
                </p>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>Impact</h2>
                <p>
                    Reduce counterfeit risk, improve compliance, and give every stakeholder the confidence to verify
                    authenticity at every handoff.
                </p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>How it works</h2>
                <ul>
                    <li>Manufacturers mint the initial record with production details.</li>
                    <li>Distributors log receipt and custody transitions.</li>
                    <li>Pharmacies confirm arrival and verify with the QR hash.</li>
                </ul>
            </div>
        </section>

        <section className="home-section home-section--alt">
            <div className="home-section__inner">
                <h2>Who it’s for</h2>
                <ul>
                    <li>Manufacturers seeking tamper-proof provenance.</li>
                    <li>Distributors tracking shipments in real time.</li>
                    <li>Pharmacies and clinicians verifying patient safety.</li>
                </ul>
            </div>
        </section>

            <section className="home-cta">
                <div className="home-cta__inner">
                    <h2>Ready to secure your supply chain?</h2>
                    <p>Sign in to access your dashboard and start recording medication lineage.</p>
                    <button className="button button--primary" onClick={() => onNavigate('/login', 'login')}>
                        Sign in
                    </button>
                </div>
            </section>
        </main>
    );
};

export default HomePage;

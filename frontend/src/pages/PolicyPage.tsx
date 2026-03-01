import React from 'react';
import MarketingNav from '../components/MarketingNav';
import { AuthMode } from '../types';

type PolicyPageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
    eyebrow: string;
    title: string;
    intro: string;
    points: string[];
};

const PolicyPage: React.FC<PolicyPageProps> = ({
    authToken,
    onNavigate,
    eyebrow,
    title,
    intro,
    points
}) => (
    <main className="home">
        <MarketingNav authToken={authToken} onNavigate={onNavigate} />

        <section className="home-hero">
            <div className="home-hero__inner">
                <p className="home-hero__eyebrow">{eyebrow}</p>
                <h1>{title}</h1>
                <p className="home-hero__lead">{intro}</p>
            </div>
        </section>

        <section className="home-section">
            <div className="home-section__inner">
                <h2>Overview</h2>
                <ul>
                    {points.map((point) => (
                        <li key={point}>{point}</li>
                    ))}
                </ul>
            </div>
        </section>

        <section className="home-cta">
            <div className="home-cta__inner">
                <h2>Need a detailed copy?</h2>
                <p>Contact LedgRx for a full document package tailored to your organization.</p>
                <button className="button button--primary" onClick={() => onNavigate('/resources')}>
                    View resources
                </button>
            </div>
        </section>
    </main>
);

export default PolicyPage;

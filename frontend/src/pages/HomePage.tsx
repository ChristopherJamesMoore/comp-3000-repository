import React from 'react';
import { ShieldCheck, LogIn, Plus } from 'lucide-react';
import { AuthMode } from '../types';

type HomePageProps = {
    authToken: string | null;
    medicationsCount: number;
    error: string;
    lastUpdated: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const HomePage: React.FC<HomePageProps> = ({
    authToken,
    medicationsCount,
    error,
    lastUpdated,
    onNavigate
}) => (
    <>
        <header className="hero">
            <div className="hero__badge">
                <ShieldCheck size={16} />
                Trusted pharma traceability
            </div>
            <h1>LedgRx Control Center</h1>
            <p>
                LedgRx is a private, auditable trail for medications. We help manufacturers, distributors, and
                pharmacists verify origin, track batches, and deliver instant QR verification for downstream scanning.
            </p>
            <div className="hero__stats">
                <div>
                    <span>Total Records</span>
                    <strong>{medicationsCount}</strong>
                </div>
                <div>
                    <span>Network Status</span>
                    <strong>{error ? 'Offline' : 'Online'}</strong>
                </div>
                <div>
                    <span>Last Sync</span>
                    <strong>{lastUpdated ?? '—'}</strong>
                </div>
            </div>
            <div className="hero__actions">
                {!authToken ? (
                    <>
                        <button className="button button--primary" onClick={() => onNavigate('/login', 'login')}>
                            <LogIn size={16} />
                            Sign in
                        </button>
                        <button className="button button--ghost" onClick={() => onNavigate('/login', 'signup')}>
                            <Plus size={16} />
                            Create account
                        </button>
                    </>
                ) : (
                    <button className="button button--ghost" onClick={() => onNavigate('/app')}>
                        <ShieldCheck size={16} />
                        Open dashboard
                    </button>
                )}
            </div>
        </header>

        <section className="panel home-info">
            <div className="grid home-info__grid">
                <div className="card card--preview">
                    <div className="preview__header">
                        <div>
                            <h3>What we do</h3>
                            <p>Immutable traceability for the pharmaceutical supply chain.</p>
                        </div>
                    </div>
                    <div className="preview__body">
                        <ul className="feature-list">
                            <li>Anchor medication batches on a private Fabric network.</li>
                            <li>Generate QR hashes for instant verification.</li>
                            <li>Maintain audit-ready records without exposing the network.</li>
                        </ul>
                    </div>
                </div>
                <div className="card card--preview">
                    <div className="preview__header">
                        <div>
                            <h3>About us</h3>
                            <p>Built to reduce counterfeit risk and improve trust.</p>
                        </div>
                    </div>
                    <div className="preview__body">
                        <p>
                            LedgRx blends blockchain integrity with practical operations. We focus on trusted
                            collaboration between manufacturers, distributors, and pharmacies while keeping sensitive
                            infrastructure private.
                        </p>
                    </div>
                </div>
                <div className="card card--preview">
                    <div className="preview__header">
                        <div>
                            <h3>How it works</h3>
                            <p>Simple onboarding, real-time verification, tamper-resistant history.</p>
                        </div>
                    </div>
                    <div className="preview__body">
                        <ul className="feature-list">
                            <li>Create a medication record and commit it to the Fabric ledger.</li>
                            <li>Mint a QR hash tied to the serial + batch + expiry.</li>
                            <li>Scan and verify instantly with the public lookup flow.</li>
                        </ul>
                    </div>
                </div>
                <div className="card card--preview">
                    <div className="preview__header">
                        <div>
                            <h3>Who it’s for</h3>
                            <p>Supply-chain partners who need trust without exposing infrastructure.</p>
                        </div>
                    </div>
                    <div className="preview__body">
                        <ul className="feature-list">
                            <li>Manufacturers tracking production lots and provenance.</li>
                            <li>Distributors validating custody and handoff points.</li>
                            <li>Pharmacies and clinicians verifying patient safety.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    </>
);

export default HomePage;

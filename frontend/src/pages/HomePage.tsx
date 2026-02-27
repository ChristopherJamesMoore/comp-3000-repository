import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AuthMode } from '../types';
import MarketingNav from '../components/MarketingNav';

gsap.registerPlugin(ScrollTrigger);

type HomePageProps = {
    authToken: string | null;
    onNavigate: (path: string, mode?: AuthMode) => void;
};

/* Lightweight hook — fades in any element with .fade-section when it scrolls into view */
function useFadeOnScroll() {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        const root = ref.current;
        if (!root) return;
        const targets = root.querySelectorAll('.fade-section');
        const io = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
            { threshold: 0.15 },
        );
        targets.forEach((t) => io.observe(t));
        return () => io.disconnect();
}, []);
    return ref;
}

const HomePage: React.FC<HomePageProps> = ({ authToken, onNavigate }) => {
    const headline = 'Trust every medication handoff.';
    const [typed, setTyped] = useState('');
    const [showCaret, setShowCaret] = useState(true);
    const mainRef = useFadeOnScroll();
    const chainSectionRef = useRef<HTMLElement>(null);
    const chainModelRef = useRef<HTMLDivElement>(null);

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

    useLayoutEffect(() => {
        if (!chainSectionRef.current || !chainModelRef.current) return undefined;

        const media = gsap.matchMedia();

        media.add('(prefers-reduced-motion: no-preference)', () => {
            const ctx = gsap.context(() => {
                const links = gsap.utils.toArray<HTMLElement>('.home-chain__link');
                const caption = gsap.utils.toArray<HTMLElement>('.home-chain__caption-line');

                gsap.timeline({
                    scrollTrigger: {
                        trigger: chainSectionRef.current,
                        start: 'top 82%',
                        end: 'top 24%',
                        scrub: true
                    }
                })
                    .fromTo(
                        chainModelRef.current,
                        { rotateY: -20, rotateX: 12, rotateZ: -4, scale: 0.92 },
                        { rotateY: 385, rotateX: -10, rotateZ: 6, scale: 1.16, ease: 'none' }
                    )
                    .fromTo(
                        links,
                        { opacity: 0.45, scaleX: 0.9, transformOrigin: 'center center' },
                        { opacity: 1, scaleX: 1, stagger: 0.03, ease: 'none' },
                        0
                    );

                gsap.fromTo(
                    caption,
                    { opacity: 0, y: 16 },
                    {
                        opacity: 1,
                        y: 0,
                        stagger: 0.18,
                        scrollTrigger: {
                            trigger: chainSectionRef.current,
                            start: 'top 72%',
                            end: 'top 36%',
                            scrub: true
                        }
                    }
                );
            }, chainSectionRef);

            return () => ctx.revert();
        });

        return () => media.revert();
    }, []);

    return (
        <main className="home" ref={mainRef}>
            <MarketingNav authToken={authToken} onNavigate={onNavigate} />

            <section className="home-hero">
                <div className="home-hero__inner">
                    <p className="home-hero__eyebrow">LedgRx &bull; Private pharma traceability</p>
                    <h1 className="home-hero__typing">
                        <span>{typed || '\u00A0'}</span>
                        <span className={showCaret ? 'home-hero__caret' : 'home-hero__caret home-hero__caret--off'}>|</span>
                    </h1>
                    <p className="home-hero__lead">
                        LedgRx is a private, auditable trail for medications. We help manufacturers, distributors, and
                        pharmacists verify origin, track custody, and deliver instant QR verification.
                    </p>

                    <div className="home-hero__stats fade-section">
                        <div><strong>Hyperledger Fabric</strong><span>Private blockchain</span></div>
                        <div><strong>QR verification</strong><span>Instant scan</span></div>
                        <div><strong>Full audit trail</strong><span>Every handoff logged</span></div>
                    </div>
                </div>
            </section>

            <section className="home-chain fade-section" ref={chainSectionRef} aria-label="Blockchain visualization">
                <div className="home-chain__inner">
                    <p className="home-chain__eyebrow">Immutable event sequence</p>
                    <h2>Follow each block through the supply chain.</h2>
                    <div className="home-chain__stage">
                        <div className="home-chain__halo" />
                        <div className="home-chain__model" ref={chainModelRef}>
                            {Array.from({ length: 8 }).map((_, index) => (
                                <React.Fragment key={index}>
                                    <div className="home-chain__node">
                                        <span>{String(index + 1).padStart(2, '0')}</span>
                                    </div>
                                    {index < 7 && <div className="home-chain__link" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div className="home-chain__caption">
                        <p className="home-chain__caption-line">Scroll to rotate the chain</p>
                        <p className="home-chain__caption-line">Every transfer keeps cryptographic continuity</p>
                    </div>
                </div>
            </section>

            <section className="home-section fade-section">
                <div className="home-section__inner">
                    <h2>Product</h2>
                    <p>
                        Anchor each medication batch on a private Fabric network and generate a unique QR hash for instant
                        verification without exposing the network publicly.
                    </p>
                </div>
            </section>

            <section className="home-section home-section--alt fade-section">
                <div className="home-section__inner">
                    <h2>Impact</h2>
                    <p>
                        Reduce counterfeit risk, improve compliance, and give every stakeholder the confidence to verify
                        authenticity at every handoff.
                    </p>
                </div>
            </section>

            <section className="home-section fade-section">
                <div className="home-section__inner">
                    <h2>How it works</h2>
                    <div className="home-section__grid">
                        <div className="home-tile">
                            <span className="home-tile__step">1</span>
                            <h3>Mint</h3>
                            <p>Manufacturers record production details and create the initial on-chain record.</p>
                        </div>
                        <div className="home-tile">
                            <span className="home-tile__step">2</span>
                            <h3>Transfer</h3>
                            <p>Distributors log receipt and custody transitions as the batch moves through the supply chain.</p>
                        </div>
                        <div className="home-tile">
                            <span className="home-tile__step">3</span>
                            <h3>Verify</h3>
                            <p>Pharmacies confirm arrival and verify authenticity with a single QR scan.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="home-section home-section--alt fade-section">
                <div className="home-section__inner">
                    <h2>Who it's for</h2>
                    <div className="home-section__grid">
                        <div className="home-tile">
                            <h3>Manufacturers</h3>
                            <p>Tamper-proof provenance from the production line.</p>
                        </div>
                        <div className="home-tile">
                            <h3>Distributors</h3>
                            <p>Real-time shipment tracking with immutable records.</p>
                        </div>
                        <div className="home-tile">
                            <h3>Pharmacies &amp; Clinics</h3>
                            <p>Instant verification to safeguard patient safety.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="home-cta fade-section">
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

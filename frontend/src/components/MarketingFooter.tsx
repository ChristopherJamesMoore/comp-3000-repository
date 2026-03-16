import React from 'react';
import { AuthMode } from '../types';

type FooterLink = {
    label: string;
    path: string;
    mode?: AuthMode;
};

type FooterGroup = {
    title: string;
    links: FooterLink[];
};

type MarketingFooterProps = {
    onNavigate: (path: string, mode?: AuthMode) => void;
};

const footerGroups: FooterGroup[] = [
    {
        title: 'Compliance',
        links: [
            { label: 'ISO compliance', path: '/iso-compliance' },
            { label: 'Governance standards', path: '/governance-standards' },
            { label: 'Service level agreement', path: '/service-level-agreement' }
        ]
    },
    {
        title: 'Data & security',
        links: [
            { label: 'User data handling', path: '/user-data' },
            { label: 'Privacy & security', path: '/privacy-security' },
            { label: 'Data governance', path: '/data-governance' }
        ]
    },
    {
        title: 'Company',
        links: [
            { label: 'Product', path: '/product' },
            { label: 'Resources', path: '/resources' },
            { label: 'Sign in', path: '/login', mode: 'login' }
        ]
    }
];

const MarketingFooter: React.FC<MarketingFooterProps> = ({ onNavigate }) => (
    <footer className="marketing-footer">
        <div className="marketing-footer__inner">
            <div className="marketing-footer__brand">
                <button type="button" className="marketing-footer__logo" onClick={() => onNavigate('/')}>
                    <img src="/logo-removebg-preview.png" alt="" className="brand-logo" />
                    LedgRx
                </button>
            </div>

            <div className="marketing-footer__grid">
                {footerGroups.map((group) => (
                    <section key={group.title} className="marketing-footer__group">
                        <h4>{group.title}</h4>
                        {group.links.map((link) => (
                            <button
                                key={link.path}
                                type="button"
                                className="marketing-footer__link"
                                onClick={() => onNavigate(link.path, link.mode)}
                            >
                                {link.label}
                            </button>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    </footer>
);

export default MarketingFooter;

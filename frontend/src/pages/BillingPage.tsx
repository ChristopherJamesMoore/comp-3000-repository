import React from 'react';
import { CreditCard, ArrowLeft } from 'lucide-react';

type BillingPageProps = {
    onBack: () => void;
};

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: '£0',
        period: 'forever',
        features: ['Unlimited workers', 'Unlimited records', '90 day audit retention', 'Email support'],
        current: true,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '£49',
        period: '/month',
        features: ['Everything in Free', '1 year audit retention', 'Priority support', 'Custom branding', 'API access'],
        current: false,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        features: ['Everything in Pro', 'Unlimited audit retention', 'Dedicated account manager', 'SLA guarantee', 'SSO integration'],
        current: false,
    },
] as const;

const BillingPage: React.FC<BillingPageProps> = ({ onBack }) => (
    <div className="billing-page">
        <div className="billing-page__header">
            <button type="button" className="button button--ghost button--mini" onClick={onBack}>
                <ArrowLeft size={14} />
                Back to settings
            </button>
            <h1>Billing</h1>
            <p>Manage your subscription and payment methods.</p>
        </div>

        <div className="billing-page__section">
            <h3 className="billing-page__section-title">Plans</h3>
            <div className="billing-plans">
                {PLANS.map((plan) => (
                    <div key={plan.id} className={`billing-plan${plan.current ? ' billing-plan--current' : ''}`}>
                        {plan.current && <span className="billing-plan__badge">Current plan</span>}
                        <h4 className="billing-plan__name">{plan.name}</h4>
                        <div className="billing-plan__price">
                            <span className="billing-plan__amount">{plan.price}</span>
                            {plan.period && <span className="billing-plan__period">{plan.period}</span>}
                        </div>
                        <ul className="billing-plan__features">
                            {plan.features.map((f) => (
                                <li key={f}>{f}</li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            className={`button ${plan.current ? 'button--ghost' : 'button--primary'} button--mini`}
                            disabled
                        >
                            {plan.current ? 'Current' : plan.id === 'enterprise' ? 'Contact sales' : 'Upgrade'}
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="billing-page__section">
            <h3 className="billing-page__section-title">Payment method</h3>
            <div className="billing-page__card">
                <div className="billing-payment-empty">
                    <CreditCard size={24} />
                    <p>No payment method added</p>
                    <button type="button" className="button button--ghost button--mini" disabled>
                        Add payment method
                    </button>
                </div>
            </div>
        </div>

        <div className="billing-page__section">
            <h3 className="billing-page__section-title">Invoices</h3>
            <div className="billing-page__card">
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No invoices yet.</p>
            </div>
        </div>

        <p className="billing-page__note">
            Billing integration coming soon. All features are currently free during the beta period.
        </p>
    </div>
);

export default BillingPage;

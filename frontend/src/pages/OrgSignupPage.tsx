import React, { useState } from 'react';
import { Home, Fingerprint, Loader2 } from 'lucide-react';

type OrgSignupPageProps = {
    onSignup: (data: {
        adminFirstName: string;
        adminLastName: string;
        adminUsername: string;
        adminEmail: string;
        companyName: string;
        companyType: string;
        registrationNumber: string;
    }) => Promise<unknown>;
    onNavigateHome: () => void;
    onNavigateLogin: () => void;
};

const OrgSignupPage: React.FC<OrgSignupPageProps> = ({ onSignup, onNavigateHome, onNavigateLogin }) => {
    const [form, setForm] = useState({
        adminFirstName: '',
        adminLastName: '',
        adminUsername: '',
        adminEmail: '',
        companyName: '',
        companyType: '',
        registrationNumber: '',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.adminFirstName || !form.adminLastName || !form.adminUsername || !form.companyName || !form.companyType) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.adminUsername.length < 3) {
            setError('Username must be at least 3 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await onSignup(form);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Signup failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <button className="auth-card__brand" onClick={onNavigateHome}>LedgRx</button>
                    <span className="auth-card__eyebrow">Register organisation</span>
                </div>
                <h2>Build trust in every handoff.</h2>
                <p>Register your organisation. Once submitted, you'll be prompted to set up a passkey on this device — no password required.</p>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label>First name</label>
                        <input type="text" value={form.adminFirstName} onChange={set('adminFirstName')} required />
                    </div>
                    <div className="field">
                        <label>Last name</label>
                        <input type="text" value={form.adminLastName} onChange={set('adminLastName')} required />
                    </div>
                    <div className="field">
                        <label>Company name</label>
                        <input type="text" value={form.companyName} onChange={set('companyName')} required />
                    </div>
                    <div className="field">
                        <label>Company type</label>
                        <select value={form.companyType} onChange={set('companyType')} required>
                            <option value="">Select…</option>
                            <option value="production">Production</option>
                            <option value="distribution">Distribution</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="clinic">Clinic</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>Company registration number</label>
                        <input type="text" value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="Optional" />
                    </div>
                    <div className="field">
                        <label>Work email</label>
                        <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="you@company.com" />
                    </div>
                    <div className="field">
                        <label>Admin username</label>
                        <input type="text" value={form.adminUsername} onChange={set('adminUsername')} autoComplete="username" required />
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                    <div className="auth-card__actions">
                        <button type="submit" className="button button--primary auth-card__primary" disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={15} className="spin" /> Setting up passkey…</>
                                : <><Fingerprint size={15} /> Register &amp; create passkey</>}
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateLogin}>
                            Already registered? Sign in
                        </button>
                        <button type="button" className="button button--ghost" onClick={onNavigateHome}>
                            <Home size={16} />
                            Back to home
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default OrgSignupPage;

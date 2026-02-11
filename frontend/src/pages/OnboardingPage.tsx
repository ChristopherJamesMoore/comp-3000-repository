import React from 'react';

type OnboardingPageProps = {
    profileForm: { companyType: string; companyName: string; registrationNumber: string };
    profileError: string;
    profileSaving: boolean;
    onProfileFormChange: (field: 'companyType' | 'companyName' | 'registrationNumber', value: string) => void;
    onProfileSave: (e: React.FormEvent) => void;
};

const OnboardingPage: React.FC<OnboardingPageProps> = ({
    profileForm,
    profileError,
    profileSaving,
    onProfileFormChange,
    onProfileSave
}) => (
    <div className="auth-page">
        <div className="auth-card">
            <div className="auth-card__header">
                <button className="auth-card__brand">LedgRx</button>
                <span className="auth-card__eyebrow">Onboarding</span>
            </div>
            <h2>Welcome to LedgRx</h2>
            <p>Set up your company details to get started. This determines your role in the supply chain.</p>
            <form onSubmit={onProfileSave}>
                <div className="field">
                    <label>Company type</label>
                    <select
                        value={profileForm.companyType}
                        onChange={(e) => onProfileFormChange('companyType', e.target.value)}
                    >
                        <option value="">Select type</option>
                        <option value="production">Production</option>
                        <option value="distribution">Distribution</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="clinic">Clinic</option>
                    </select>
                </div>
                <div className="field">
                    <label>Company name</label>
                    <input
                        type="text"
                        value={profileForm.companyName}
                        onChange={(e) => onProfileFormChange('companyName', e.target.value)}
                        placeholder="Your company name"
                    />
                </div>
                <div className="field">
                    <label>Registration number</label>
                    <input
                        type="text"
                        value={profileForm.registrationNumber}
                        onChange={(e) => onProfileFormChange('registrationNumber', e.target.value)}
                        placeholder="Company registration number"
                    />
                </div>
                {profileError && <div className="inline-error">{profileError}</div>}
                <div className="auth-card__actions">
                    <button
                        type="submit"
                        className="button button--primary auth-card__primary"
                        disabled={profileSaving}
                    >
                        {profileSaving ? 'Saving...' : 'Request'}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

export default OnboardingPage;

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

type AccountPageProps = {
    profile: UserProfile | null;
    profileForm: { companyType: string; companyName: string; registrationNumber: string };
    profileError: string;
    profileSaving: boolean;
    onProfileFormChange: (field: 'companyType' | 'companyName' | 'registrationNumber', value: string) => void;
    onProfileSave: (e: React.FormEvent) => void;
    onBack: () => void;
    onLogout: () => void;
    onAdminClick?: () => void;
};

const AccountPage: React.FC<AccountPageProps> = ({
    profile,
    profileForm,
    profileError,
    profileSaving,
    onProfileFormChange,
    onProfileSave,
    onBack,
    onLogout,
    onAdminClick
}) => {
    const profileLocked = !!profile?.companyType && !!profile?.companyName;
    return (
    <>
        <header className="hero">
            <div className="hero__badge">
                <ShieldCheck size={16} />
                Account settings
            </div>
            <h1>Account details</h1>
            <p>Update your company details and manage your access to the LedgRx network.</p>
        </header>

        <section className="panel panel--account">
            <div className="card card--form account-card">
                <div className="account-card__header">
                    <h2>Account details</h2>
                    <span>{profile?.username || 'Authenticated user'}</span>
                </div>
                <form onSubmit={onProfileSave}>
                    {profileLocked && (
                        <div className="inline-error">
                            Company details are locked once saved. Contact an admin for changes.
                        </div>
                    )}
                    <div className="field">
                        <label>Company type</label>
                        <select
                            value={profileForm.companyType}
                            onChange={(e) => onProfileFormChange('companyType', e.target.value)}
                            disabled={profileLocked}
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
                            placeholder="Company name"
                            disabled={profileLocked}
                        />
                    </div>
                    {profileError && <div className="inline-error">{profileError}</div>}
                    <div className="form__actions">
                        <button type="submit" className="button button--primary" disabled={profileSaving}>
                            {profileSaving ? 'Saving...' : 'Save details'}
                        </button>
                        {profile?.isAdmin && onAdminClick && (
                            <button type="button" className="button button--ghost" onClick={onAdminClick}>
                                Admin dashboard →
                            </button>
                        )}
                        <button type="button" className="button button--ghost" onClick={onBack}>
                            Back to dashboard
                        </button>
                        <button type="button" className="button button--ghost" onClick={onLogout}>
                            Log out
                        </button>
                    </div>
                </form>
            </div>
        </section>
    </>
    );
};

export default AccountPage;

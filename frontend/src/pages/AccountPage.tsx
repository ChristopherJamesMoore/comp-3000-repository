import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';

type AccountPageProps = {
    profile: UserProfile | null;
    profileForm: { companyType: string; companyName: string };
    profileError: string;
    profileSaving: boolean;
    onProfileFormChange: (field: 'companyType' | 'companyName', value: string) => void;
    onProfileSave: (e: React.FormEvent) => void;
    onBack: () => void;
    adminUsers: UserProfile[];
    adminLoading: boolean;
    adminError: string;
    onReloadAdmin: () => void;
};

const AccountPage: React.FC<AccountPageProps> = ({
    profile,
    profileForm,
    profileError,
    profileSaving,
    onProfileFormChange,
    onProfileSave,
    onBack,
    adminUsers,
    adminLoading,
    adminError,
    onReloadAdmin
}) => (
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
                    <div className="field">
                        <label>Company type</label>
                        <select
                            value={profileForm.companyType}
                            onChange={(e) => onProfileFormChange('companyType', e.target.value)}
                        >
                            <option value="">Select type</option>
                            <option value="production">Production</option>
                            <option value="distribution">Distribution</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>Company name</label>
                        <input
                            type="text"
                            value={profileForm.companyName}
                            onChange={(e) => onProfileFormChange('companyName', e.target.value)}
                            placeholder="Company name"
                        />
                    </div>
                    {profileError && <div className="inline-error">{profileError}</div>}
                    <div className="form__actions">
                        <button type="submit" className="button button--primary" disabled={profileSaving}>
                            {profileSaving ? 'Saving...' : 'Save details'}
                        </button>
                        <button type="button" className="button button--ghost" onClick={onBack}>
                            Back to dashboard
                        </button>
                    </div>
                </form>
            </div>
        </section>

        {profile?.isAdmin && (
            <section className="panel panel--account">
                <div className="card card--form account-card">
                    <div className="account-card__header">
                        <h2>Admin: user directory</h2>
                        <span>{adminLoading ? 'Loading…' : `${adminUsers.length} users`}</span>
                    </div>
                    {adminError && <div className="inline-error">{adminError}</div>}
                    {!adminError && (
                        <div className="admin-table">
                            <div className="admin-table__row admin-table__row--head">
                                <span>Username</span>
                                <span>Company Type</span>
                                <span>Company Name</span>
                            </div>
                            {adminUsers.map((user) => (
                                <div className="admin-table__row" key={user.username}>
                                    <span>{user.username}</span>
                                    <span>{user.companyType || '—'}</span>
                                    <span>{user.companyName || '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="form__actions">
                        <button type="button" className="button button--ghost" onClick={onReloadAdmin}>
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>
            </section>
        )}
    </>
);

export default AccountPage;

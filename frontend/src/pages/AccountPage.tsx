import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

type AccountPageProps = {
    profile: UserProfile | null;
    profileForm: { companyType: string; companyName: string; registrationNumber: string };
    profileError: string;
    profileSaving: boolean;
    onProfileFormChange: (field: 'companyType' | 'companyName' | 'registrationNumber', value: string) => void;
    onProfileSave: (e: React.FormEvent) => void;
    onRequestEmailChange: (newEmail: string) => Promise<void>;
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
    onRequestEmailChange,
    onBack,
    onLogout,
    onAdminClick
}) => {
    const profileLocked = !!profile?.companyType && !!profile?.companyName;
    const isFormDirty =
        profileForm.companyType !== (profile?.companyType || '') ||
        profileForm.companyName !== (profile?.companyName || '') ||
        profileForm.registrationNumber !== (profile?.registrationNumber || '');
    const [changeEmailOpen, setChangeEmailOpen] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [changeEmailStatus, setChangeEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [changeEmailError, setChangeEmailError] = useState('');

    const handleRequestEmailChange = async () => {
        if (!newEmailInput.trim()) {
            setChangeEmailError('Enter a valid email address.');
            return;
        }
        setChangeEmailStatus('sending');
        setChangeEmailError('');
        try {
            await onRequestEmailChange(newEmailInput.trim());
            setChangeEmailStatus('sent');
        } catch (err: unknown) {
            setChangeEmailError(err instanceof Error ? err.message : 'Failed to send confirmation email.');
            setChangeEmailStatus('error');
        }
    };

    const openChangeEmail = () => {
        setChangeEmailOpen(true);
        setChangeEmailStatus('idle');
        setChangeEmailError('');
        setNewEmailInput('');
    };

    const closeChangeEmail = () => {
        setChangeEmailOpen(false);
        setChangeEmailStatus('idle');
        setChangeEmailError('');
        setNewEmailInput('');
    };

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{profile?.username || 'Authenticated user'}</span>
                        <button type="button" className="button button--ghost button--mini" onClick={onLogout}>
                            Sign out
                        </button>
                    </div>
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
                        <button type="submit" className="button button--primary" disabled={!isFormDirty || profileSaving}>
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
                    </div>
                </form>

                <div className="account-email-section">
                    <div className="field">
                        <label>Work email</label>
                        <div className="account-email-display">
                            <span className="account-email-display__value">
                                {profile?.email || <span style={{ color: 'var(--muted)' }}>No email set</span>}
                            </span>
                            {!changeEmailOpen && (
                                <button
                                    type="button"
                                    className="button button--ghost button--mini"
                                    onClick={openChangeEmail}
                                >
                                    Change email
                                </button>
                            )}
                        </div>
                    </div>
                    {changeEmailOpen && (
                        <div className="account-email-change">
                            {changeEmailStatus === 'sent' ? (
                                <p className="account-email-change__sent">
                                    Confirmation sent to <strong>{newEmailInput}</strong>. Click the link in the email to confirm your new address.
                                </p>
                            ) : (
                                <>
                                    <div className="field">
                                        <label>New email address</label>
                                        <input
                                            type="email"
                                            value={newEmailInput}
                                            onChange={(e) => setNewEmailInput(e.target.value)}
                                            placeholder="new@organisation.com"
                                        />
                                    </div>
                                    {changeEmailError && <div className="inline-error">{changeEmailError}</div>}
                                    <div className="form__actions">
                                        <button
                                            type="button"
                                            className="button button--primary button--mini"
                                            onClick={handleRequestEmailChange}
                                            disabled={changeEmailStatus === 'sending'}
                                        >
                                            {changeEmailStatus === 'sending' ? 'Sending...' : 'Send confirmation'}
                                        </button>
                                        <button
                                            type="button"
                                            className="button button--ghost button--mini"
                                            onClick={closeChangeEmail}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    </>
    );
};

export default AccountPage;

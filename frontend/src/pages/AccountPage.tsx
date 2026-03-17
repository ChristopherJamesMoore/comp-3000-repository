import React, { useState } from 'react';
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
    onBillingClick?: () => void;
    currentTheme: string;
    onThemeChange: (theme: string) => void;
};

const THEMES = [
    { id: 'light', name: 'Light', sidebar: '#ffffff', content: '#f9fafb' },
    { id: 'dark', name: 'Dark', sidebar: '#18181b', content: '#09090b' },
    { id: 'sidebar-dark', name: 'Black Sidebar', sidebar: '#18181b', content: '#f9fafb' },
] as const;

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
    onAdminClick,
    onBillingClick,
    currentTheme,
    onThemeChange
}) => {
    const profileLocked = !!profile?.companyType && !!profile?.companyName;
    const isOrgOrWorker = profile?.type === 'org' || profile?.type === 'worker';
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

    const typeLabel = profile?.type === 'org' ? 'Organisation Admin'
        : profile?.type === 'worker' ? 'Worker'
        : 'Platform';

    return (
        <div className="account-page">
            {/* Section 1 — Profile */}
            <div className="account-section">
                <h3 className="account-section__title">Profile</h3>
                <div className="account-section__body">
                    <div className="account-field-row">
                        <span className="account-field-row__label">Username</span>
                        <span className="account-field-row__value">{profile?.username || '—'}</span>
                    </div>
                    <div className="account-field-row">
                        <span className="account-field-row__label">Account type</span>
                        <span className="account-field-row__value">{typeLabel}</span>
                    </div>
                    {profile?.type === 'worker' && profile.jobTitle && (
                        <div className="account-field-row">
                            <span className="account-field-row__label">Job title</span>
                            <span className="account-field-row__value">{profile.jobTitle}</span>
                        </div>
                    )}
                    {profile?.approvalStatus && profile.approvalStatus !== 'approved' && (
                        <div className="account-field-row">
                            <span className="account-field-row__label">Status</span>
                            <span className={`pill pill--${profile.approvalStatus}`}>
                                {profile.approvalStatus}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2 — Organisation */}
            <div className="account-section">
                <h3 className="account-section__title">Organisation</h3>
                <div className="account-section__body">
                    {(profileLocked || isOrgOrWorker) ? (
                        <>
                            <div className="account-field-row">
                                <span className="account-field-row__label">Company type</span>
                                <span className="account-field-row__value" style={{ textTransform: 'capitalize' }}>
                                    {profile?.companyType || '—'}
                                </span>
                            </div>
                            <div className="account-field-row">
                                <span className="account-field-row__label">Company name</span>
                                <span className="account-field-row__value">{profile?.companyName || '—'}</span>
                            </div>
                            {profile?.registrationNumber && (
                                <div className="account-field-row">
                                    <span className="account-field-row__label">Registration number</span>
                                    <span className="account-field-row__value">{profile.registrationNumber}</span>
                                </div>
                            )}
                        </>
                    ) : (
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
                                    placeholder="Company name"
                                />
                            </div>
                            {profileError && <div className="inline-error">{profileError}</div>}
                            <div className="form__actions" style={{ marginTop: 12 }}>
                                <button type="submit" className="button button--primary" disabled={!isFormDirty || profileSaving}>
                                    {profileSaving ? 'Saving...' : 'Save details'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Section 3 — Email */}
            <div className="account-section">
                <h3 className="account-section__title">Email</h3>
                <div className="account-section__body">
                    <div className="account-field-row">
                        <span className="account-field-row__label">Work email</span>
                        <span className="account-field-row__value">
                            {profile?.email || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>No email set</span>}
                        </span>
                    </div>
                    {!changeEmailOpen && (
                        <button
                            type="button"
                            className="button button--ghost button--mini"
                            onClick={openChangeEmail}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            Change email
                        </button>
                    )}
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

            {/* Section 4 — Preferences */}
            <div className="account-section">
                <h3 className="account-section__title">Preferences</h3>
                <div className="account-section__body">
                    <span className="account-field-row__label">Theme</span>
                    <div className="theme-picker__options">
                        {THEMES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                className={`theme-picker__swatch${currentTheme === t.id ? ' theme-picker__swatch--active' : ''}`}
                                onClick={() => onThemeChange(t.id)}
                            >
                                <div className="theme-picker__preview">
                                    <div className="theme-picker__preview-sidebar" style={{ background: t.sidebar }} />
                                    <div className="theme-picker__preview-content" style={{ background: t.content }} />
                                </div>
                                <span className="theme-picker__name">{t.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section 5 — Billing link (org only) */}
            {profile?.type === 'org' && onBillingClick && (
                <div className="account-section">
                    <h3 className="account-section__title">Billing</h3>
                    <div className="account-section__body">
                        <div className="account-field-row">
                            <span className="account-field-row__label">Current plan</span>
                            <span className="account-field-row__value">
                                <span className="pill pill--approved">Free</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            className="button button--ghost button--mini"
                            onClick={onBillingClick}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            Manage billing
                        </button>
                    </div>
                </div>
            )}

            {/* Actions bar */}
            <div className="account-actions">
                <button type="button" className="button button--ghost button--mini" onClick={onLogout}>
                    Sign out
                </button>
                <button type="button" className="button button--ghost button--mini" onClick={onBack}>
                    Back to dashboard
                </button>
                {profile?.isAdmin && onAdminClick && (
                    <button type="button" className="button button--ghost button--mini" onClick={onAdminClick}>
                        Admin dashboard
                    </button>
                )}
            </div>
        </div>
    );
};

export default AccountPage;

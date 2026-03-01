import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';

type AdminFilter = 'all' | 'pending' | 'approved' | 'rejected';

type AdminPageProps = {
    userName: string;
    onAccountClick: () => void;
    onNavSelect: (nav: DashboardNav) => void;
    adminUsers: UserProfile[];
    adminLoading: boolean;
    adminError: string;
    onReloadAdmin: () => void;
    onApproveUser: (username: string) => Promise<unknown>;
    onRejectUser: (username: string) => Promise<unknown>;
    onDeleteUser: (username: string) => Promise<unknown>;
    onUpdateUserCompany: (username: string, data: { companyType: string; companyName: string; registrationNumber: string }) => Promise<unknown>;
    onResetUserPassword: (username: string, newPassword: string) => Promise<unknown>;
};

const AdminPage: React.FC<AdminPageProps> = ({
    userName,
    onAccountClick,
    onNavSelect,
    adminUsers,
    adminLoading,
    adminError,
    onReloadAdmin,
    onApproveUser,
    onRejectUser,
    onDeleteUser,
    onUpdateUserCompany,
    onResetUserPassword
}) => {
    const [filter, setFilter] = useState<AdminFilter>('all');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [expandMode, setExpandMode] = useState<'edit' | 'password' | null>(null);
    const [editForm, setEditForm] = useState({ companyType: '', companyName: '', registrationNumber: '' });
    const [passwordInput, setPasswordInput] = useState('');
    const [actionError, setActionError] = useState('');

    const closeExpanded = () => {
        setExpandedUser(null);
        setExpandMode(null);
        setActionError('');
        setPasswordInput('');
    };

    const openEdit = (user: UserProfile) => {
        setExpandedUser(user.username);
        setExpandMode('edit');
        setEditForm({
            companyType: user.companyType || '',
            companyName: user.companyName || '',
            registrationNumber: user.registrationNumber || ''
        });
        setActionError('');
    };

    const openPassword = (username: string) => {
        setExpandedUser(username);
        setExpandMode('password');
        setPasswordInput('');
        setActionError('');
    };

    const handleApprove = async (username: string) => {
        setActionError('');
        try {
            await onApproveUser(username);
            onReloadAdmin();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to approve user.');
        }
    };

    const handleReject = async (username: string) => {
        setActionError('');
        try {
            await onRejectUser(username);
            onReloadAdmin();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to reject user.');
        }
    };

    const handleDelete = async (username: string) => {
        if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
        setActionError('');
        try {
            await onDeleteUser(username);
            onReloadAdmin();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete user.');
        }
    };

    const handleSaveEdit = async () => {
        if (!expandedUser) return;
        setActionError('');
        try {
            await onUpdateUserCompany(expandedUser, editForm);
            closeExpanded();
            onReloadAdmin();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to update company info.');
        }
    };

    const handleSavePassword = async () => {
        if (!expandedUser) return;
        if (passwordInput.length < 6) {
            setActionError('Password must be at least 6 characters.');
            return;
        }
        setActionError('');
        try {
            await onResetUserPassword(expandedUser, passwordInput);
            closeExpanded();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to reset password.');
        }
    };

    const total = adminUsers.length;
    const pending = adminUsers.filter((u) => (u.approvalStatus || 'approved') === 'pending').length;
    const approved = adminUsers.filter((u) => (u.approvalStatus || 'approved') === 'approved').length;
    const rejected = adminUsers.filter((u) => (u.approvalStatus || 'approved') === 'rejected').length;

    const filtered = filter === 'all'
        ? adminUsers
        : adminUsers.filter((u) => (u.approvalStatus || 'approved') === filter);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return '—';
        }
    };

    return (
        <DashboardLayout
            userName={userName}
            onAccountClick={onAccountClick}
            activeNav="admin"
            onNavSelect={onNavSelect}
            heading="Admin"
            subheading="Manage organisation onboarding requests and user access."
            isAdmin={true}
        >
            <div className="admin-dashboard">
                <div className="admin-stats">
                    <div className="admin-stat">
                        <span className="admin-stat__value">{total}</span>
                        <span className="admin-stat__label">Total users</span>
                    </div>
                    <div className="admin-stat admin-stat--pending">
                        <span className="admin-stat__value">{pending}</span>
                        <span className="admin-stat__label">Pending</span>
                    </div>
                    <div className="admin-stat">
                        <span className="admin-stat__value">{approved}</span>
                        <span className="admin-stat__label">Approved</span>
                    </div>
                    <div className="admin-stat">
                        <span className="admin-stat__value">{rejected}</span>
                        <span className="admin-stat__label">Rejected</span>
                    </div>
                </div>

                <div className="admin-filters">
                    {(['all', 'pending', 'approved', 'rejected'] as AdminFilter[]).map((f) => (
                        <button
                            key={f}
                            className={filter === f ? 'admin-filter admin-filter--active' : 'admin-filter'}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                    <button className="button button--ghost button--mini" onClick={onReloadAdmin} style={{ marginLeft: 'auto' }}>
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>

                {adminError && <div className="inline-error">{adminError}</div>}
                {actionError && <div className="inline-error">{actionError}</div>}

                {adminLoading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

                {!adminLoading && !adminError && (
                    <div className="admin-table">
                        <div className="admin-table__row admin-table__row--head admin-table__row--full">
                            <span>Username</span>
                            <span>Company</span>
                            <span>Reg No.</span>
                            <span>Role</span>
                            <span>Requested</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>
                        {filtered.length === 0 && (
                            <p style={{ color: 'var(--muted)', padding: '12px' }}>
                                No users match the current filter.
                            </p>
                        )}
                        {filtered.map((user) => {
                            const status = user.approvalStatus || 'approved';
                            const isExpanded = expandedUser === user.username;
                            return (
                                <React.Fragment key={user.username}>
                                    <div className="admin-table__row admin-table__row--full">
                                        <span>{user.username}</span>
                                        <span>{user.companyName || '—'}</span>
                                        <span>{user.registrationNumber || '—'}</span>
                                        <span>{user.companyType || '—'}</span>
                                        <span>{formatDate(user.approvedAt)}</span>
                                        <span>
                                            <span className="admin-table__actions">
                                                {(status === 'pending' || status === 'rejected') && (
                                                    <button
                                                        className="button button--primary button--mini"
                                                        onClick={() => handleApprove(user.username)}
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                {(status === 'pending' || status === 'approved') && (
                                                    <button
                                                        className="button button--ghost button--mini"
                                                        onClick={() => handleReject(user.username)}
                                                    >
                                                        Reject
                                                    </button>
                                                )}
                                                {status === 'rejected' && (
                                                    <span className="pill pill--rejected">rejected</span>
                                                )}
                                                {status === 'approved' && (
                                                    <span className="pill pill--approved">approved</span>
                                                )}
                                            </span>
                                        </span>
                                        <span>
                                            <span className="admin-table__actions">
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => isExpanded && expandMode === 'edit' ? closeExpanded() : openEdit(user)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => isExpanded && expandMode === 'password' ? closeExpanded() : openPassword(user.username)}
                                                >
                                                    Reset password
                                                </button>
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => handleDelete(user.username)}
                                                >
                                                    Delete
                                                </button>
                                            </span>
                                        </span>
                                    </div>
                                    {isExpanded && expandMode === 'edit' && (
                                        <div className="admin-table__expanded">
                                            <div className="field">
                                                <label>Company type</label>
                                                <select
                                                    value={editForm.companyType}
                                                    onChange={(e) => setEditForm((f) => ({ ...f, companyType: e.target.value }))}
                                                >
                                                    <option value="">Select…</option>
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
                                                    value={editForm.companyName}
                                                    onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                                                />
                                            </div>
                                            <div className="field">
                                                <label>Registration number</label>
                                                <input
                                                    type="text"
                                                    value={editForm.registrationNumber}
                                                    onChange={(e) => setEditForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                                                />
                                            </div>
                                            <div className="admin-table__expanded-actions">
                                                <button className="button button--primary button--mini" onClick={handleSaveEdit}>Save</button>
                                                <button className="button button--ghost button--mini" onClick={closeExpanded}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                    {isExpanded && expandMode === 'password' && (
                                        <div className="admin-table__expanded">
                                            <div className="field">
                                                <label>New password</label>
                                                <input
                                                    type="password"
                                                    value={passwordInput}
                                                    onChange={(e) => setPasswordInput(e.target.value)}
                                                    placeholder="Min 6 characters"
                                                />
                                            </div>
                                            <div className="admin-table__expanded-actions">
                                                <button className="button button--primary button--mini" onClick={handleSavePassword}>Confirm</button>
                                                <button className="button button--ghost button--mini" onClick={closeExpanded}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminPage;

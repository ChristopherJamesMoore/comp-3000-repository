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
    onRejectUser
}) => {
    const [filter, setFilter] = useState<AdminFilter>('all');

    const handleApprove = async (username: string) => {
        try {
            await onApproveUser(username);
            onReloadAdmin();
        } catch { /* toast handled upstream */ }
    };

    const handleReject = async (username: string) => {
        try {
            await onRejectUser(username);
            onReloadAdmin();
        } catch { /* toast handled upstream */ }
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
                        </div>
                        {filtered.length === 0 && (
                            <p style={{ color: 'var(--muted)', padding: '12px' }}>
                                No users match the current filter.
                            </p>
                        )}
                        {filtered.map((user) => {
                            const status = user.approvalStatus || 'approved';
                            return (
                                <div className="admin-table__row admin-table__row--full" key={user.username}>
                                    <span>{user.username}</span>
                                    <span>{user.companyName || '—'}</span>
                                    <span>{user.registrationNumber || '—'}</span>
                                    <span>{user.companyType || '—'}</span>
                                    <span>{formatDate(user.approvedAt)}</span>
                                    <span>
                                        {status === 'pending' ? (
                                            <span className="admin-table__actions">
                                                <button
                                                    className="button button--primary button--mini"
                                                    onClick={() => handleApprove(user.username)}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => handleReject(user.username)}
                                                >
                                                    Reject
                                                </button>
                                            </span>
                                        ) : (
                                            <span className={`pill pill--${status}`}>
                                                {status}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminPage;

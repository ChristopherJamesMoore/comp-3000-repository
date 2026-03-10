import React, { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { OrgProfile, OrgWorker } from '../types';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';

type AdminFilter = 'all' | 'pending' | 'approved' | 'rejected';

type AdminPageProps = {
    userName: string;
    onAccountClick: () => void;
    onNavSelect: (nav: DashboardNav) => void;
    adminOrgs: OrgProfile[];
    adminOrgsLoading: boolean;
    adminOrgsError: string;
    onReloadAdmin: () => void;
    onApproveOrg: (orgId: string) => Promise<unknown>;
    onRejectOrg: (orgId: string) => Promise<unknown>;
    onDeleteOrg: (orgId: string) => Promise<unknown>;
    onUpdateOrg: (orgId: string, data: { companyName?: string; companyType?: string; registrationNumber?: string; adminEmail?: string }) => Promise<unknown>;
    onResetOrgPasskey: (orgId: string) => Promise<{ ok: boolean; registerUrl: string }>;
    onLoadOrgWorkers: (orgId: string) => Promise<OrgWorker[]>;
    onDeleteOrgWorker: (orgId: string, username: string) => Promise<unknown>;
    onResetWorkerPasskey: (orgId: string, username: string) => Promise<{ ok: boolean; registerUrl: string }>;
};

const AdminPage: React.FC<AdminPageProps> = ({
    userName,
    onAccountClick,
    onNavSelect,
    adminOrgs,
    adminOrgsLoading,
    adminOrgsError,
    onReloadAdmin,
    onApproveOrg,
    onRejectOrg,
    onDeleteOrg,
    onUpdateOrg,
    onResetOrgPasskey,
    onLoadOrgWorkers,
    onDeleteOrgWorker,
    onResetWorkerPasskey
}) => {
    const [filter, setFilter] = useState<AdminFilter>('all');
    const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
    const [expandMode, setExpandMode] = useState<'edit' | 'workers' | null>(null);
    const [editForm, setEditForm] = useState({ companyName: '', companyType: '', registrationNumber: '', adminEmail: '' });
    const [actionError, setActionError] = useState('');
    const [resetLinkTarget, setResetLinkTarget] = useState<string | null>(null);
    const [resetLinkUrl, setResetLinkUrl] = useState('');
    const [orgWorkers, setOrgWorkers] = useState<OrgWorker[]>([]);
    const [orgWorkersLoading, setOrgWorkersLoading] = useState(false);

    const closeExpanded = () => {
        setExpandedOrg(null);
        setExpandMode(null);
        setActionError('');
        setOrgWorkers([]);
        setResetLinkTarget(null);
        setResetLinkUrl('');
    };

    const openEdit = (org: OrgProfile) => {
        setExpandedOrg(org.orgId);
        setExpandMode('edit');
        setEditForm({
            companyName: org.companyName || '',
            companyType: org.companyType || '',
            registrationNumber: org.registrationNumber || '',
            adminEmail: org.adminEmail || '',
        });
        setActionError('');
    };

    const openWorkers = async (orgId: string) => {
        if (expandedOrg === orgId && expandMode === 'workers') {
            closeExpanded();
            return;
        }
        setExpandedOrg(orgId);
        setExpandMode('workers');
        setActionError('');
        setOrgWorkers([]);
        setOrgWorkersLoading(true);
        try {
            const workers = await onLoadOrgWorkers(orgId);
            setOrgWorkers(workers);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to load workers.');
        } finally {
            setOrgWorkersLoading(false);
        }
    };

    const handleApprove = async (orgId: string) => {
        setActionError('');
        try { await onApproveOrg(orgId); onReloadAdmin(); } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to approve.');
        }
    };

    const handleReject = async (orgId: string) => {
        setActionError('');
        try { await onRejectOrg(orgId); onReloadAdmin(); } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to reject.');
        }
    };

    const handleDelete = async (orgId: string, companyName: string) => {
        if (!window.confirm(`Delete organisation "${companyName}" and all its workers? This cannot be undone.`)) return;
        setActionError('');
        try { await onDeleteOrg(orgId); closeExpanded(); onReloadAdmin(); } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete.');
        }
    };

    const handleSaveEdit = async () => {
        if (!expandedOrg) return;
        setActionError('');
        try { await onUpdateOrg(expandedOrg, editForm); closeExpanded(); onReloadAdmin(); } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to update.');
        }
    };

    const handleResetOrgPasskey = async (orgId: string) => {
        setActionError('');
        try {
            const result = await onResetOrgPasskey(orgId);
            setResetLinkTarget(orgId);
            setResetLinkUrl(result.registerUrl);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to reset passkey.');
        }
    };

    const handleDeleteWorker = async (orgId: string, username: string) => {
        if (!window.confirm(`Remove worker "${username}"?`)) return;
        try {
            await onDeleteOrgWorker(orgId, username);
            setOrgWorkers((prev) => prev.filter((w) => w.username !== username));
            onReloadAdmin();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete worker.');
        }
    };

    const handleResetWorkerPasskey = async (orgId: string, username: string) => {
        setActionError('');
        try {
            const result = await onResetWorkerPasskey(orgId, username);
            setResetLinkTarget(`${orgId}:${username}`);
            setResetLinkUrl(result.registerUrl);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to reset passkey.');
        }
    };

    const total = adminOrgs.length;
    const pending = adminOrgs.filter((o) => o.approvalStatus === 'pending').length;
    const approved = adminOrgs.filter((o) => o.approvalStatus === 'approved').length;
    const rejected = adminOrgs.filter((o) => o.approvalStatus === 'rejected').length;

    const filtered = filter === 'all' ? adminOrgs : adminOrgs.filter((o) => o.approvalStatus === filter);

    return (
        <DashboardLayout
            userName={userName}
            onAccountClick={onAccountClick}
            activeNav="admin"
            onNavSelect={onNavSelect}
            heading="Admin"
            subheading=""
            isAdmin={true}
        >
            <div className="admin-dashboard">
                <div className="admin-stats">
                    <div className="admin-stat">
                        <span className="admin-stat__value">{total}</span>
                        <span className="admin-stat__label">Total orgs</span>
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

                {adminOrgsError && <div className="inline-error">{adminOrgsError}</div>}
                {actionError && <div className="inline-error">{actionError}</div>}
                {adminOrgsLoading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

                {!adminOrgsLoading && (
                    <div className="admin-table">
                        <div className="admin-table__row admin-table__row--head admin-table__row--full">
                            <span>Organisation</span>
                            <span>Type</span>
                            <span>Reg No.</span>
                            <span>Admin</span>
                            <span>Workers</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>
                        {filtered.length === 0 && (
                            <p style={{ color: 'var(--muted)', padding: '12px' }}>No organisations match the current filter.</p>
                        )}
                        {filtered.map((org) => {
                            const status = org.approvalStatus || 'pending';
                            const isExpanded = expandedOrg === org.orgId;
                            return (
                                <React.Fragment key={org.orgId}>
                                    <div className="admin-table__row admin-table__row--full">
                                        <span>
                                            <span className="admin-table__primary">{org.companyName}</span>
                                            {org.adminEmail && <span className="admin-table__secondary">{org.adminEmail}</span>}
                                        </span>
                                        <span>{org.companyType || '—'}</span>
                                        <span>{org.registrationNumber || '—'}</span>
                                        <span>{org.adminUsername}</span>
                                        <span>
                                            <button
                                                className="button button--ghost button--mini"
                                                onClick={() => openWorkers(org.orgId)}
                                                title="Show workers"
                                            >
                                                {org.workerCount ?? 0}
                                                {isExpanded && expandMode === 'workers'
                                                    ? <ChevronUp size={12} style={{ marginLeft: 4 }} />
                                                    : <ChevronDown size={12} style={{ marginLeft: 4 }} />
                                                }
                                            </button>
                                        </span>
                                        <span>
                                            <span className="admin-table__actions">
                                                {(status === 'pending' || status === 'rejected') && (
                                                    <button className="button button--primary button--mini" onClick={() => handleApprove(org.orgId)}>
                                                        Approve
                                                    </button>
                                                )}
                                                {(status === 'pending' || status === 'approved') && (
                                                    <button className="button button--ghost button--mini" onClick={() => handleReject(org.orgId)}>
                                                        Reject
                                                    </button>
                                                )}
                                                {status === 'rejected' && <span className="pill pill--rejected">rejected</span>}
                                                {status === 'approved' && <span className="pill pill--approved">approved</span>}
                                            </span>
                                        </span>
                                        <span>
                                            <span className="admin-table__actions">
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => isExpanded && expandMode === 'edit' ? closeExpanded() : openEdit(org)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => handleResetOrgPasskey(org.orgId)}
                                                >
                                                    Reset passkey
                                                </button>
                                                {resetLinkTarget === org.orgId && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', wordBreak: 'break-all' }}>
                                                        Send this link: <a href={resetLinkUrl} target="_blank" rel="noreferrer">{resetLinkUrl}</a>
                                                    </span>
                                                )}
                                                <button
                                                    className="button button--ghost button--mini"
                                                    onClick={() => handleDelete(org.orgId, org.companyName)}
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
                                                <select value={editForm.companyType} onChange={(e) => setEditForm((f) => ({ ...f, companyType: e.target.value }))}>
                                                    <option value="">Select…</option>
                                                    <option value="production">Production</option>
                                                    <option value="distribution">Distribution</option>
                                                    <option value="pharmacy">Pharmacy</option>
                                                    <option value="clinic">Clinic</option>
                                                </select>
                                            </div>
                                            <div className="field">
                                                <label>Company name</label>
                                                <input type="text" value={editForm.companyName} onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))} />
                                            </div>
                                            <div className="field">
                                                <label>Registration number</label>
                                                <input type="text" value={editForm.registrationNumber} onChange={(e) => setEditForm((f) => ({ ...f, registrationNumber: e.target.value }))} />
                                            </div>
                                            <div className="field">
                                                <label>Admin email</label>
                                                <input type="email" value={editForm.adminEmail} onChange={(e) => setEditForm((f) => ({ ...f, adminEmail: e.target.value }))} />
                                            </div>
                                            <div className="admin-table__expanded-actions">
                                                <button className="button button--primary button--mini" onClick={handleSaveEdit}>Save</button>
                                                <button className="button button--ghost button--mini" onClick={closeExpanded}>Cancel</button>
                                            </div>
                                        </div>
                                    )}

                                    {isExpanded && expandMode === 'workers' && (
                                        <div className="admin-table__expanded">
                                            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                                Workers for <strong>{org.companyName}</strong>
                                            </p>
                                            {orgWorkersLoading && <p style={{ color: 'var(--muted)' }}>Loading workers…</p>}
                                            {!orgWorkersLoading && orgWorkers.length === 0 && (
                                                <p style={{ color: 'var(--muted)' }}>No workers yet.</p>
                                            )}
                                            {!orgWorkersLoading && orgWorkers.length > 0 && (
                                                <div className="admin-table" style={{ marginTop: 0 }}>
                                                    <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                                                        <span>Username</span>
                                                        <span>Job title</span>
                                                        <span>Actions</span>
                                                    </div>
                                                    {orgWorkers.map((worker) => (
                                                        <React.Fragment key={worker.username}>
                                                            <div className="admin-table__row" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                                                                <span>{worker.username}</span>
                                                                <span>{worker.jobTitle || '—'}</span>
                                                                <span>
                                                                    <span className="admin-table__actions">
                                                                        <button
                                                                            className="button button--ghost button--mini"
                                                                            onClick={() => handleResetWorkerPasskey(org.orgId, worker.username)}
                                                                        >
                                                                            Reset passkey
                                                                        </button>
                                                                        {resetLinkTarget === `${org.orgId}:${worker.username}` && (
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', wordBreak: 'break-all' }}>
                                                                                Send: <a href={resetLinkUrl} target="_blank" rel="noreferrer">{resetLinkUrl}</a>
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            className="button button--ghost button--mini"
                                                                            onClick={() => handleDeleteWorker(org.orgId, worker.username)}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ marginTop: '8px' }}>
                                                <button className="button button--ghost button--mini" onClick={closeExpanded}>Close</button>
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

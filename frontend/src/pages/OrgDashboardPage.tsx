import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, List, Users, UserCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { OrgWorker, UserProfile } from '../types';

type OrgDashboardPageProps = {
    profile: UserProfile;
    orgWorkers: OrgWorker[];
    orgWorkersLoading: boolean;
    orgWorkersError: string;
    onLoadWorkers: () => void;
    onAddWorker: (username: string, password: string, jobTitle: string) => Promise<unknown>;
    onRemoveWorker: (username: string) => Promise<unknown>;
    onUpdateJobTitle: (username: string, jobTitle: string) => Promise<unknown>;
    onLogout: () => void;
    onAccountClick: () => void;
    // Records view - pass medications as JSX or a simple list
    recordsContent?: React.ReactNode;
};

type Tab = 'workers' | 'records';

const OrgDashboardPage: React.FC<OrgDashboardPageProps> = ({
    profile,
    orgWorkers,
    orgWorkersLoading,
    orgWorkersError,
    onLoadWorkers,
    onAddWorker,
    onRemoveWorker,
    onUpdateJobTitle,
    onLogout,
    onAccountClick,
    recordsContent
}) => {
    const sidebarStorageKey = 'ledgrx.org.sidebarCollapsed';
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        const saved = window.localStorage.getItem(sidebarStorageKey);
        return saved === 'true';
    });
    useEffect(() => {
        window.localStorage.setItem(sidebarStorageKey, String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    const [activeTab, setActiveTab] = useState<Tab>('workers');

    // Add worker form
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState({ username: '', password: '', jobTitle: '' });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);

    // Edit job title inline
    const [editingUsername, setEditingUsername] = useState<string | null>(null);
    const [editJobTitle, setEditJobTitle] = useState('');
    const [editError, setEditError] = useState('');

    useEffect(() => {
        if (activeTab === 'workers') {
            onLoadWorkers();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        if (!addForm.username || !addForm.password) {
            setAddError('Username and password are required.');
            return;
        }
        if (addForm.username.length < 3) { setAddError('Username must be at least 3 characters.'); return; }
        if (addForm.password.length < 6) { setAddError('Password must be at least 6 characters.'); return; }
        setAddSubmitting(true);
        try {
            await onAddWorker(addForm.username, addForm.password, addForm.jobTitle);
            setAddForm({ username: '', password: '', jobTitle: '' });
            setShowAddForm(false);
            onLoadWorkers();
        } catch (err: unknown) {
            setAddError(err instanceof Error ? err.message : 'Failed to add worker.');
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleRemove = async (username: string) => {
        if (!window.confirm(`Remove worker "${username}"? This cannot be undone.`)) return;
        try {
            await onRemoveWorker(username);
            onLoadWorkers();
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Failed to remove worker.');
        }
    };

    const handleSaveJobTitle = async (username: string) => {
        setEditError('');
        try {
            await onUpdateJobTitle(username, editJobTitle);
            setEditingUsername(null);
            onLoadWorkers();
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Failed to update job title.');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try { return new Date(dateStr).toLocaleDateString(); } catch { return '—'; }
    };

    return (
        <div className={`dashboard${sidebarCollapsed ? ' dashboard--collapsed' : ''}`}>
            <aside className="dashboard__sidebar">
                <div className="dashboard__sidebar-top">
                    <div className="dashboard__brand">
                        <span className="dashboard__brand-text">LedgRx</span>
                    </div>
                    <button
                        type="button"
                        className="dashboard__collapse"
                        onClick={() => setSidebarCollapsed((prev) => !prev)}
                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
                <button className="dashboard__account" onClick={onAccountClick} title={profile.username}>
                    <UserCircle2 size={18} className="dashboard__account-icon" />
                    <div className="dashboard__account-meta">
                        <span>Organisation</span>
                        <strong>{profile.companyName || profile.username}</strong>
                    </div>
                </button>
                <nav className="dashboard__nav">
                    <button
                        className={activeTab === 'workers' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => setActiveTab('workers')}
                        title="Manage workers"
                    >
                        <Users size={16} />
                        <span className="dashboard__link-label">Workers</span>
                    </button>
                    <button
                        className={activeTab === 'records' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => setActiveTab('records')}
                        title="View records"
                    >
                        <List size={16} />
                        <span className="dashboard__link-label">View records</span>
                    </button>
                </nav>
                <div style={{ marginTop: 'auto', padding: '12px 16px' }}>
                    <button className="button button--ghost button--mini" onClick={onLogout}>Sign out</button>
                </div>
            </aside>

            <div className="dashboard__content">
                {activeTab === 'workers' && (
                    <>
                        <div className="dashboard__topbar">
                            <div>
                                <h1>Workers</h1>
                                <p>Manage worker accounts for {profile.companyName || 'your organisation'}.</p>
                            </div>
                        </div>
                        <div className="admin-dashboard">
                            <div className="admin-filters" style={{ marginBottom: '12px' }}>
                                <button
                                    className="button button--primary button--mini"
                                    onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
                                >
                                    {showAddForm ? 'Cancel' : '+ Add worker'}
                                </button>
                                <button className="button button--ghost button--mini" onClick={onLoadWorkers} style={{ marginLeft: 'auto' }}>
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            {showAddForm && (
                                <form className="admin-table__expanded" onSubmit={handleAddWorker} style={{ marginBottom: '12px' }}>
                                    <div className="field">
                                        <label>Username</label>
                                        <input
                                            type="text"
                                            value={addForm.username}
                                            onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                                            placeholder="Min 3 characters"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Password</label>
                                        <input
                                            type="password"
                                            value={addForm.password}
                                            onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                                            placeholder="Min 6 characters"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Job title <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
                                        <input
                                            type="text"
                                            value={addForm.jobTitle}
                                            onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                                            placeholder="e.g. Distribution Manager"
                                        />
                                    </div>
                                    {addError && <div className="inline-error">{addError}</div>}
                                    <div className="admin-table__expanded-actions">
                                        <button type="submit" className="button button--primary button--mini" disabled={addSubmitting}>
                                            {addSubmitting ? 'Adding…' : 'Add worker'}
                                        </button>
                                        <button type="button" className="button button--ghost button--mini" onClick={() => setShowAddForm(false)}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            {orgWorkersError && <div className="inline-error">{orgWorkersError}</div>}
                            {editError && <div className="inline-error">{editError}</div>}
                            {orgWorkersLoading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

                            {!orgWorkersLoading && (
                                <div className="admin-table">
                                    <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                                        <span>Username</span>
                                        <span>Job title</span>
                                        <span>Added</span>
                                        <span>Actions</span>
                                    </div>
                                    {orgWorkers.length === 0 && (
                                        <p style={{ color: 'var(--muted)', padding: '12px' }}>No workers yet. Add one above.</p>
                                    )}
                                    {orgWorkers.map((worker) => (
                                        <React.Fragment key={worker.username}>
                                            <div className="admin-table__row" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                                                <span className="admin-table__primary">{worker.username}</span>
                                                <span>{worker.jobTitle || '—'}</span>
                                                <span>{formatDate(worker.createdAt)}</span>
                                                <span>
                                                    <span className="admin-table__actions">
                                                        <button
                                                            className="button button--ghost button--mini"
                                                            onClick={() => {
                                                                setEditingUsername(editingUsername === worker.username ? null : worker.username);
                                                                setEditJobTitle(worker.jobTitle || '');
                                                                setEditError('');
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="button button--ghost button--mini"
                                                            onClick={() => handleRemove(worker.username)}
                                                            title="Remove worker"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </span>
                                                </span>
                                            </div>
                                            {editingUsername === worker.username && (
                                                <div className="admin-table__expanded">
                                                    <div className="field">
                                                        <label>Job title</label>
                                                        <input
                                                            type="text"
                                                            value={editJobTitle}
                                                            onChange={(e) => setEditJobTitle(e.target.value)}
                                                            placeholder="e.g. Distribution Manager"
                                                        />
                                                    </div>
                                                    <div className="admin-table__expanded-actions">
                                                        <button className="button button--primary button--mini" onClick={() => handleSaveJobTitle(worker.username)}>Save</button>
                                                        <button className="button button--ghost button--mini" onClick={() => setEditingUsername(null)}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'records' && (
                    <>
                        <div className="dashboard__topbar">
                            <div>
                                <h1>Records</h1>
                                <p>Medication records for {profile.companyName || 'your organisation'}.</p>
                            </div>
                        </div>
                        <div className="admin-dashboard">
                            {recordsContent || <p style={{ color: 'var(--muted)' }}>No records available.</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrgDashboardPage;

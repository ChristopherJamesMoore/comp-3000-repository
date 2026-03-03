import React, { useEffect, useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import { ChevronLeft, ChevronRight, List, Users, UserCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { OrgWorker, UserProfile } from '../types';

type BulkWorkerRow = { username: string; password: string; jobTitle: string; _valid: boolean; _error: string };
type BulkWorkerResult = { succeeded: { username: string }[]; failed: { username: string; error: string }[] };

type OrgDashboardPageProps = {
    profile: UserProfile;
    orgWorkers: OrgWorker[];
    orgWorkersLoading: boolean;
    orgWorkersError: string;
    onLoadWorkers: () => void;
    onAddWorker: (username: string, password: string, jobTitle: string) => Promise<unknown>;
    onRemoveWorker: (username: string) => Promise<unknown>;
    onUpdateJobTitle: (username: string, jobTitle: string) => Promise<unknown>;
    onBulkAddWorkers: (workers: { username: string; password: string; jobTitle: string }[]) => Promise<BulkWorkerResult>;
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
    onBulkAddWorkers,
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

    // Bulk import
    const bulkFileRef = useRef<HTMLInputElement>(null);
    const [bulkRows, setBulkRows] = useState<BulkWorkerRow[]>([]);
    const [bulkResult, setBulkResult] = useState<BulkWorkerResult | null>(null);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkParseError, setBulkParseError] = useState('');

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

    const handleBulkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBulkParseError('');
        setBulkResult(null);
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = ev.target?.result;
                const wb = xlsx.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(ws, { defval: '' });
                const mapped: BulkWorkerRow[] = rows.map((row) => {
                    const username = String(row['username'] || row['Username'] || '').trim();
                    const password = String(row['password'] || row['Password'] || '').trim();
                    const jobTitle = String(row['jobTitle'] || row['Job Title'] || row['job_title'] || '').trim();
                    let _error = '';
                    if (!username || username.length < 3) _error = 'Username must be at least 3 characters.';
                    else if (!password || password.length < 6) _error = 'Password must be at least 6 characters.';
                    return { username, password, jobTitle, _valid: !_error, _error };
                });
                setBulkRows(mapped);
            } catch {
                setBulkParseError('Could not parse file. Upload a valid .xlsx or .csv file.');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const handleBulkSubmit = async () => {
        setBulkSubmitting(true);
        setBulkResult(null);
        try {
            const validRows = bulkRows.filter((r) => r._valid);
            const result = await onBulkAddWorkers(validRows.map(({ username, password, jobTitle }) => ({ username, password, jobTitle })));
            setBulkResult(result);
            if (result.failed.length === 0) {
                setBulkRows([]);
            }
            onLoadWorkers();
        } catch (err: unknown) {
            setBulkParseError(err instanceof Error ? err.message : 'Import failed.');
        } finally {
            setBulkSubmitting(false);
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
                        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                                <button
                                    className="button button--ghost button--mini"
                                    onClick={() => bulkFileRef.current?.click()}
                                    style={{ marginLeft: '8px' }}
                                >
                                    Import Excel
                                </button>
                                <input
                                    ref={bulkFileRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                    onChange={handleBulkFile}
                                />
                                <button className="button button--ghost button--mini" onClick={onLoadWorkers} style={{ marginLeft: 'auto' }}>
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            {bulkParseError && <div className="inline-error" style={{ marginBottom: '8px' }}>{bulkParseError}</div>}

                            {bulkRows.length > 0 && (
                                <div className="admin-table__expanded" style={{ marginBottom: '12px' }}>
                                    <p style={{ marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
                                        Expected columns: <code>username | password | jobTitle</code>
                                    </p>
                                    <div className="admin-table">
                                        <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                                            <span>Username</span>
                                            <span>Password</span>
                                            <span>Job title</span>
                                            <span>Status</span>
                                        </div>
                                        {bulkRows.map((row, i) => (
                                            <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                                                <span className="admin-table__primary">{row.username || <em style={{ color: 'var(--muted)' }}>empty</em>}</span>
                                                <span>{'••••••'}</span>
                                                <span>{row.jobTitle || '—'}</span>
                                                <span style={{ color: row._valid ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)', fontSize: '12px' }}>
                                                    {row._valid ? '✓ valid' : row._error}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="admin-table__expanded-actions" style={{ marginTop: '8px' }}>
                                        <button
                                            className="button button--primary button--mini"
                                            onClick={handleBulkSubmit}
                                            disabled={bulkSubmitting || bulkRows.filter((r) => r._valid).length === 0}
                                        >
                                            {bulkSubmitting ? 'Importing…' : `Import ${bulkRows.filter((r) => r._valid).length} workers`}
                                        </button>
                                        <button
                                            className="button button--ghost button--mini"
                                            onClick={() => { setBulkRows([]); setBulkResult(null); setBulkParseError(''); }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}

                            {bulkResult && (
                                <div className="admin-table__expanded" style={{ marginBottom: '12px' }}>
                                    <p style={{ fontWeight: 600, marginBottom: '6px' }}>
                                        Import results: {bulkResult.succeeded.length} succeeded, {bulkResult.failed.length} failed
                                    </p>
                                    {bulkResult.failed.length > 0 && (
                                        <div className="admin-table">
                                            <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                                <span>Username</span>
                                                <span>Error</span>
                                            </div>
                                            {bulkResult.failed.map((f, i) => (
                                                <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                                    <span>{f.username}</span>
                                                    <span style={{ color: 'var(--error, #ef4444)', fontSize: '12px' }}>{f.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

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

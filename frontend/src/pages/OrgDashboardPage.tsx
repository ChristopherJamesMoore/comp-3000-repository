import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import { ChevronLeft, ChevronRight, ChevronDown, List, Users, UserCircle2, RefreshCw, Trash2, Copy, Check, FileText, Search, QrCode } from 'lucide-react';
import { Medication, OrgWorker, UserProfile } from '../types';
import { AuditLogList } from '../components/AuditLogList';
import { useOrgAuditLog } from '../hooks/useAuditLog';
import type { AuthFetch } from '../hooks/useAuth';

const STAGES = [
    { key: 'manufactured', label: 'Prod' },
    { key: 'received',     label: 'Dist' },
    { key: 'arrived',      label: 'Pharmacy' },
] as const;

const StageTrack: React.FC<{ status?: string }> = ({ status = 'manufactured' }) => {
    const activeIndex = STAGES.findIndex((s) => s.key === status);
    return (
        <span className="stage-track">
            {STAGES.map((stage, i) => (
                <React.Fragment key={stage.key}>
                    <span className={`stage-track__step${i === activeIndex ? ' stage-track__step--active' : i < activeIndex ? ' stage-track__step--done' : ''}`}>
                        {stage.label}
                    </span>
                    {i < STAGES.length - 1 && <span className="stage-track__sep">&rsaquo;</span>}
                </React.Fragment>
            ))}
        </span>
    );
};

type BulkWorkerRow = { username: string; jobTitle: string; _valid: boolean; _error: string };
type BulkWorkerResult = { succeeded: { username: string; inviteUrl?: string }[]; failed: { username: string; error: string }[] };

type OrgDashboardPageProps = {
    profile: UserProfile;
    orgWorkers: OrgWorker[];
    orgWorkersLoading: boolean;
    orgWorkersError: string;
    onLoadWorkers: () => void;
    onAddWorker: (username: string, jobTitle: string) => Promise<{ worker: unknown; inviteUrl: string }>;
    onRemoveWorker: (username: string) => Promise<unknown>;
    onUpdateJobTitle: (username: string, jobTitle: string) => Promise<unknown>;
    onBulkAddWorkers: (workers: { username: string; jobTitle: string }[]) => Promise<BulkWorkerResult>;
    onLogout: () => void;
    onAccountClick: () => void;
    authFetch: AuthFetch;
};

type Tab = 'workers' | 'records' | 'audit';

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
    authFetch
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
    const auditLog = useOrgAuditLog();

    // Medications state (records tab)
    const [medications, setMedications] = useState<Medication[]>([]);
    const [medsLoading, setMedsLoading] = useState(false);
    const [medsError, setMedsError] = useState('');
    const [medsSearch, setMedsSearch] = useState('');
    const [expandedSerial, setExpandedSerial] = useState<string | null>(null);

    const fetchMedications = useCallback(async () => {
        setMedsLoading(true);
        setMedsError('');
        try {
            const res = await authFetch('/api/org/medications');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to load medications.');
            }
            setMedications(await res.json());
        } catch (err: unknown) {
            setMedsError(err instanceof Error ? err.message : 'Failed to load medications.');
        } finally {
            setMedsLoading(false);
        }
    }, [authFetch]);

    const filteredMedications = useMemo(() => {
        if (!medsSearch.trim()) return medications;
        const q = medsSearch.trim().toLowerCase();
        return medications.filter((med) =>
            [med.serialNumber, med.medicationName, med.batchNumber, med.gtin, med.productionCompany, med.distributionCompany, med.pharmacyCompany]
                .some((v) => (v ?? '').toLowerCase().includes(q))
        );
    }, [medications, medsSearch]);

    // Add worker form
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState({ username: '', jobTitle: '' });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addedInviteUrl, setAddedInviteUrl] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        });
    };

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
        if (activeTab === 'records') {
            fetchMedications();
        }
        if (activeTab === 'audit') {
            auditLog.load();
            auditLog.loadStorage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        setAddedInviteUrl('');
        if (!addForm.username) { setAddError('Username is required.'); return; }
        if (addForm.username.length < 3) { setAddError('Username must be at least 3 characters.'); return; }
        setAddSubmitting(true);
        try {
            const result = await onAddWorker(addForm.username, addForm.jobTitle);
            setAddedInviteUrl(result.inviteUrl);
            setAddForm({ username: '', jobTitle: '' });
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
                    const jobTitle = String(row['jobTitle'] || row['Job Title'] || row['job_title'] || '').trim();
                    let _error = '';
                    if (!username || username.length < 3) _error = 'Username must be at least 3 characters.';
                    return { username, jobTitle, _valid: !_error, _error };
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
            const result = await onBulkAddWorkers(validRows.map(({ username, jobTitle }) => ({ username, jobTitle })));
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
                        {!sidebarCollapsed && <img src="/logo_typ.png" alt="LedgRx" className="brand-logo-typ brand-logo-typ--sm" />}
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
                    <button
                        className={activeTab === 'audit' ? 'dashboard__link dashboard__link--active' : 'dashboard__link'}
                        onClick={() => setActiveTab('audit')}
                        title="Audit log"
                    >
                        <FileText size={16} />
                        <span className="dashboard__link-label">Audit log</span>
                    </button>
                </nav>
            </aside>

            <div className="dashboard__content">
                {activeTab === 'workers' && (
                    <>
                        <div className="dashboard__topbar">
                            <div>
                                <h1>Workers</h1>
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

                            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '-4px 0 10px' }}>
                                Excel / CSV must have columns: <code>username</code> <code>jobTitle</code> — jobTitle is optional. Each worker will receive a unique invite link to register their passkey.
                            </p>

                            {bulkParseError && <div className="inline-error" style={{ marginBottom: '8px' }}>{bulkParseError}</div>}

                            {bulkRows.length > 0 && (
                                <div className="admin-table__expanded" style={{ marginBottom: '12px' }}>
                                    <p style={{ marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>
                                        Expected columns: <code>username | jobTitle</code>
                                    </p>
                                    <div className="admin-table">
                                        <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                            <span>Username</span>
                                            <span>Job title</span>
                                            <span>Status</span>
                                        </div>
                                        {bulkRows.map((row, i) => (
                                            <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                                <span className="admin-table__primary">{row.username || <em style={{ color: 'var(--muted)' }}>empty</em>}</span>
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
                                        Import results: {bulkResult.succeeded.length} created, {bulkResult.failed.length} failed
                                    </p>
                                    {bulkResult.succeeded.length > 0 && (
                                        <>
                                            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Send each worker their unique invite link to register their passkey:</p>
                                            <div className="admin-table" style={{ marginBottom: '8px' }}>
                                                <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
                                                    <span>Username</span>
                                                    <span>Invite link (48h)</span>
                                                    <span></span>
                                                </div>
                                                {bulkResult.succeeded.map((s, i) => (
                                                    <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
                                                        <span>{s.username}</span>
                                                        <span style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                                                            {s.inviteUrl ? <a href={s.inviteUrl} target="_blank" rel="noreferrer">{s.inviteUrl}</a> : '—'}
                                                        </span>
                                                        <span>
                                                            {s.inviteUrl && (
                                                                <button className="button button--ghost button--mini" onClick={() => copyToClipboard(s.inviteUrl!, `bulk-${s.username}`)}>
                                                                    {copiedKey === `bulk-${s.username}` ? <Check size={13} /> : <Copy size={13} />}
                                                                </button>
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
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

                            {addedInviteUrl && (
                                <div className="admin-table__expanded" style={{ marginBottom: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>Worker created. Send them this invite link:</p>
                                    <p style={{ fontSize: '0.8rem', wordBreak: 'break-all', marginBottom: 8 }}>
                                        <a href={addedInviteUrl} target="_blank" rel="noreferrer">{addedInviteUrl}</a>
                                    </p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>The link expires in 48 hours. They'll use it to register their passkey.</p>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button className="button button--ghost button--mini" onClick={() => copyToClipboard(addedInviteUrl, 'single')}>
                                            {copiedKey === 'single' ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy link</>}
                                        </button>
                                        <button className="button button--ghost button--mini" onClick={() => { setAddedInviteUrl(''); setShowAddForm(false); }}>Done</button>
                                    </div>
                                </div>
                            )}

                            {showAddForm && !addedInviteUrl && (
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
                                        <label>Job title <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
                                        <input
                                            type="text"
                                            value={addForm.jobTitle}
                                            onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                                            placeholder="e.g. Distribution Manager"
                                        />
                                    </div>
                                    {addError && <div className="inline-error">{addError}</div>}
                                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                                        No password needed — the worker will receive an invite link to register their passkey.
                                    </p>
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
                            </div>
                        </div>
                        <section className="dashboard__panel">
                            <div className="records">
                                <div className="records__toolbar">
                                    <div className="search">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search serial, name, batch..."
                                            value={medsSearch}
                                            onChange={(e) => setMedsSearch(e.target.value)}
                                        />
                                    </div>
                                    <button className="button button--ghost" onClick={fetchMedications}>
                                        <RefreshCw size={16} className={medsLoading ? 'spin' : ''} />
                                        {medsLoading ? 'Refreshing' : 'Refresh'}
                                    </button>
                                </div>

                                {medsError && <div className="error-banner">{medsError}</div>}

                                <div className="records__list">
                                    {filteredMedications.length === 0 && !medsLoading && (
                                        <div className="empty-state">
                                            <QrCode size={32} />
                                            <p>No medication records found for your organisation.</p>
                                        </div>
                                    )}
                                    {filteredMedications.map((med) => (
                                        <React.Fragment key={med.serialNumber}>
                                            <div
                                                className={`record-row${expandedSerial === med.serialNumber ? ' record-row--expanded' : ''}`}
                                                onClick={() => setExpandedSerial(expandedSerial === med.serialNumber ? null : med.serialNumber)}
                                            >
                                                <StageTrack status={med.status} />
                                                <span className="record-row__serial">
                                                    <span className="pill">Serial</span>
                                                    {med.serialNumber}
                                                </span>
                                                <span className="record-row__name">{med.medicationName}</span>
                                                <span className="record-row__batch">{med.batchNumber}</span>
                                                <ChevronDown size={14} className={`record-row__chevron${expandedSerial === med.serialNumber ? ' record-row__chevron--open' : ''}`} />
                                            </div>
                                            {expandedSerial === med.serialNumber && (
                                                <div className="record-row__detail">
                                                    <div className="record-row__detail-grid">
                                                        <div>
                                                            <span>GTIN</span>
                                                            <strong>{med.gtin}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Expiry</span>
                                                            <strong>{med.expiryDate}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Production</span>
                                                            <strong>{med.productionCompany || '\u2014'}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Distribution</span>
                                                            <strong>{med.distributionCompany || '\u2014'}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Pharmacy</span>
                                                            <strong>{med.pharmacyCompany || '\u2014'}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {activeTab === 'audit' && (
                    <>
                        <div className="dashboard__topbar">
                            <div>
                                <h1>Audit Log</h1>
                            </div>
                        </div>
                        <div className="admin-dashboard">
                            <AuditLogList
                                entries={auditLog.entries}
                                total={auditLog.total}
                                page={auditLog.page}
                                loading={auditLog.loading}
                                error={auditLog.error}
                                onPageChange={auditLog.setPage}
                                storageBytes={auditLog.storage?.storageBytes}
                                limitBytes={auditLog.storage?.limitBytes}
                                onExport={auditLog.exportCsv}
                                onReset={auditLog.reset}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrgDashboardPage;

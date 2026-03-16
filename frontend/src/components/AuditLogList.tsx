import React, { useState } from 'react';
import { ChevronDown, Download, Trash2, AlertTriangle } from 'lucide-react';
import { AuditLogEntry, ActivityEntry } from '../types';

const ACTION_LABELS: Record<string, string> = {
    'medication.manufactured': 'Medication added',
    'medication.received': 'Marked received',
    'medication.arrived': 'Marked arrived',
    'medication.batch_received': 'Batch received',
    'medication.batch_arrived': 'Batch arrived',
    'medication.bulk_manufactured': 'Bulk medications added',
    'worker.created': 'Worker created',
    'worker.bulk_created': 'Workers imported',
    'worker.removed': 'Worker removed',
    'worker.job_title_updated': 'Job title updated',
    'worker.passkey_reset': 'Worker passkey reset',
    'org.approved': 'Organisation approved',
    'org.rejected': 'Organisation rejected',
    'org.deleted': 'Organisation deleted',
    'org.updated': 'Organisation updated',
    'org.passkey_reset': 'Org passkey reset',
    'admin.login': 'Admin login',
    'admin.backup_passkey_registered': 'Backup passkey registered',
    'audit.org_reset': 'Audit log reset',
    'audit.platform_reset': 'Audit log reset',
};

function formatDate(d: string) {
    try { return new Date(d).toLocaleString(); } catch { return d; }
}

function formatAction(action: string) {
    return ACTION_LABELS[action] || action;
}

function formatTarget(target: Record<string, unknown>) {
    if (target.serialNumber) return String(target.serialNumber);
    if (target.serialNumbers && Array.isArray(target.serialNumbers)) {
        const arr = target.serialNumbers as string[];
        return arr.length <= 3 ? arr.join(', ') : `${arr.slice(0, 3).join(', ')} +${arr.length - 3} more`;
    }
    if (target.username) return String(target.username);
    if (target.orgId) return String(target.orgId);
    if (target.count) return `${target.count} items`;
    return '';
}

// Worker activity list
export const WorkerActivityList: React.FC<{
    entries: ActivityEntry[];
    total: number;
    page: number;
    loading: boolean;
    error: string;
    onPageChange: (p: number) => void;
}> = ({ entries, total, page, loading, error, onPageChange }) => {
    return (
        <div className="audit-log">
            {error && <div className="inline-error">{error}</div>}
            {loading && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
            {!loading && entries.length === 0 && (
                <p style={{ color: 'var(--muted)', padding: '24px', textAlign: 'center' }}>No activity yet.</p>
            )}
            {entries.map((entry, i) => (
                <div className="audit-row" key={`${entry.createdAt}-${i}`}>
                    <span className="audit-row__action">{formatAction(entry.action)}</span>
                    <span className="audit-row__target">
                        {entry.serialNumbers.length <= 3
                            ? entry.serialNumbers.join(', ')
                            : `${entry.serialNumbers.slice(0, 3).join(', ')} +${entry.serialNumbers.length - 3} more`}
                    </span>
                    <span className="audit-row__date">{formatDate(entry.createdAt)}</span>
                </div>
            ))}
            <Pagination total={total} page={page} limit={50} onPageChange={onPageChange} />
        </div>
    );
};

// Full audit log list (org + platform)
export const AuditLogList: React.FC<{
    entries: AuditLogEntry[];
    total: number;
    page: number;
    loading: boolean;
    error: string;
    onPageChange: (p: number) => void;
    showOrg?: boolean;
    storageBytes?: number;
    limitBytes?: number;
    onExport?: () => void;
    onReset?: () => void;
}> = ({ entries, total, page, loading, error, onPageChange, showOrg, storageBytes, limitBytes, onExport, onReset }) => {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [resetConfirm, setResetConfirm] = useState(false);
    const overLimit = storageBytes !== undefined && limitBytes !== undefined && storageBytes >= limitBytes;

    return (
        <div className="audit-log">
            {overLimit && (
                <div className="audit-log__banner">
                    <AlertTriangle size={16} />
                    <span>Audit log has reached the 4 GB limit. Download the archive before resetting.</span>
                </div>
            )}
            {storageBytes !== undefined && limitBytes !== undefined && (
                <div className="audit-log__storage">
                    <span>{(storageBytes / 1024 / 1024).toFixed(1)} MB / {(limitBytes / 1024 / 1024 / 1024).toFixed(0)} GB used</span>
                    <div className="audit-log__storage-actions">
                        {onExport && (
                            <button className="button button--ghost button--mini" onClick={onExport}>
                                <Download size={13} /> Export CSV
                            </button>
                        )}
                        {onReset && !resetConfirm && (
                            <button className="button button--ghost button--mini" onClick={() => setResetConfirm(true)}>
                                <Trash2 size={13} /> Reset
                            </button>
                        )}
                        {onReset && resetConfirm && (
                            <>
                                <span style={{ fontSize: '0.78rem', color: 'var(--error, #ef4444)' }}>Are you sure?</span>
                                <button className="button button--ghost button--mini" onClick={() => { onReset(); setResetConfirm(false); }}>
                                    Confirm reset
                                </button>
                                <button className="button button--ghost button--mini" onClick={() => setResetConfirm(false)}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            {error && <div className="inline-error">{error}</div>}
            {loading && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
            {!loading && entries.length === 0 && (
                <p style={{ color: 'var(--muted)', padding: '24px', textAlign: 'center' }}>No audit entries yet.</p>
            )}
            {entries.map((entry, i) => (
                <React.Fragment key={`${entry.createdAt}-${i}`}>
                    <div
                        className={`audit-row audit-row--expandable${expandedIdx === i ? ' audit-row--expanded' : ''}`}
                        onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                    >
                        <span className="audit-row__action">{formatAction(entry.action)}</span>
                        <span className="audit-row__actor">{entry.actor?.username || ''}</span>
                        {showOrg && <span className="audit-row__org">{entry.orgId || '\u2014'}</span>}
                        <span className="audit-row__target">{formatTarget(entry.target || {})}</span>
                        <span className="audit-row__date">{formatDate(entry.createdAt)}</span>
                        <ChevronDown size={13} className={`audit-row__chevron${expandedIdx === i ? ' audit-row__chevron--open' : ''}`} />
                    </div>
                    {expandedIdx === i && (
                        <div className="audit-row__detail">
                            <div className="audit-row__detail-grid">
                                <div>
                                    <span>Actor</span>
                                    <strong>{entry.actor?.username} ({entry.actor?.type})</strong>
                                </div>
                                {entry.orgId && (
                                    <div>
                                        <span>Organisation</span>
                                        <strong>{entry.orgId}</strong>
                                    </div>
                                )}
                                <div>
                                    <span>Action</span>
                                    <strong>{entry.action}</strong>
                                </div>
                                {entry.target && Object.keys(entry.target).length > 0 && (
                                    <div>
                                        <span>Target</span>
                                        <strong>{JSON.stringify(entry.target)}</strong>
                                    </div>
                                )}
                                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                    <div>
                                        <span>Details</span>
                                        <strong>{JSON.stringify(entry.metadata)}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </React.Fragment>
            ))}
            <Pagination total={total} page={page} limit={50} onPageChange={onPageChange} />
        </div>
    );
};

const Pagination: React.FC<{ total: number; page: number; limit: number; onPageChange: (p: number) => void }> = ({ total, page, limit, onPageChange }) => {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return null;
    return (
        <div className="audit-log__pagination">
            <button className="button button--ghost button--mini" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Previous
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
            <button className="button button--ghost button--mini" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                Next
            </button>
        </div>
    );
};

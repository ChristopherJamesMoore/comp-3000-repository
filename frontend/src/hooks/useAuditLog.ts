import { useState, useCallback } from 'react';
import { buildUrl } from '../utils/api';
import { ActivityEntry, AuditLogEntry, AuditStorageInfo } from '../types';

function authHeaders() {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Worker activity log
export function useWorkerActivity() {
    const [entries, setEntries] = useState<ActivityEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(buildUrl(`/api/worker/activity?page=${p}&limit=50`), { headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load activity.');
            const data = await res.json();
            setEntries(data.entries || []);
            setTotal(data.total || 0);
            setPage(p);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load activity.');
        } finally {
            setLoading(false);
        }
    }, []);

    return { entries, total, page, loading, error, load, setPage: (p: number) => load(p) };
}

// Org audit log
export function useOrgAuditLog() {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [storage, setStorage] = useState<{ storageBytes: number; limitBytes: number } | null>(null);

    const load = useCallback(async (p = 1, filters?: { action?: string; worker?: string }) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(p), limit: '50' });
            if (filters?.action) params.set('action', filters.action);
            if (filters?.worker) params.set('worker', filters.worker);
            const res = await fetch(buildUrl(`/api/org/audit?${params}`), { headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load audit log.');
            const data = await res.json();
            setEntries(data.entries || []);
            setTotal(data.total || 0);
            setPage(p);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit log.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadStorage = useCallback(async () => {
        try {
            const res = await fetch(buildUrl('/api/org/audit/storage'), { headers: authHeaders() });
            if (res.ok) setStorage(await res.json());
        } catch { /* ignore */ }
    }, []);

    const exportCsv = useCallback(async () => {
        const res = await fetch(buildUrl('/api/org/audit/export'), { headers: authHeaders() });
        if (!res.ok) throw new Error('Export failed.');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `org-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const reset = useCallback(async () => {
        const res = await fetch(buildUrl('/api/org/audit/reset'), { method: 'POST', headers: authHeaders() });
        if (!res.ok) throw new Error('Reset failed.');
        setEntries([]);
        setTotal(0);
        await loadStorage();
    }, [loadStorage]);

    return { entries, total, page, loading, error, storage, load, loadStorage, exportCsv, reset, setPage: (p: number) => load(p) };
}

// Platform admin audit log
export function useAdminAuditLog() {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [storage, setStorage] = useState<AuditStorageInfo | null>(null);

    const load = useCallback(async (p = 1, filters?: { action?: string; org?: string }) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(p), limit: '50' });
            if (filters?.action) params.set('action', filters.action);
            if (filters?.org) params.set('org', filters.org);
            const res = await fetch(buildUrl(`/api/admin/audit?${params}`), { headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load audit log.');
            const data = await res.json();
            setEntries(data.entries || []);
            setTotal(data.total || 0);
            setPage(p);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit log.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadStorage = useCallback(async () => {
        try {
            const res = await fetch(buildUrl('/api/admin/audit/storage'), { headers: authHeaders() });
            if (res.ok) setStorage(await res.json());
        } catch { /* ignore */ }
    }, []);

    const exportCsv = useCallback(async () => {
        const res = await fetch(buildUrl('/api/admin/audit/export'), { headers: authHeaders() });
        if (!res.ok) throw new Error('Export failed.');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const reset = useCallback(async () => {
        const res = await fetch(buildUrl('/api/admin/audit/reset'), { method: 'POST', headers: authHeaders() });
        if (!res.ok) throw new Error('Reset failed.');
        setEntries([]);
        setTotal(0);
        await loadStorage();
    }, [loadStorage]);

    return { entries, total, page, loading, error, storage, load, loadStorage, exportCsv, reset, setPage: (p: number) => load(p) };
}

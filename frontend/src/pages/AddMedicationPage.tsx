import React, { useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import { Loader2, QrCode } from 'lucide-react';
import { Medication } from '../types';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';

type BulkMedRow = {
    serialNumber: string;
    medicationName: string;
    gtin: string;
    batchNumber: string;
    expiryDate: string;
    distributionCompany: string;
    pharmacyCompany: string;
    _valid: boolean;
    _error: string;
};

type BulkMedResult = {
    succeeded: { serialNumber: string; qrHash: string }[];
    failed: { serialNumber: string; error: string }[];
};

type AddMedicationPageProps = {
    userName: string;
    onAccountClick: () => void;
    activeNav: DashboardNav;
    onNavSelect: (nav: DashboardNav) => void;
    formData: Medication;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting: boolean;
    addError: string;
    canAdd: boolean;
    isAdmin?: boolean;
    companyName: string;
    onBulkAddMedications: (meds: object[]) => Promise<BulkMedResult>;
};

const AddMedicationPage: React.FC<AddMedicationPageProps> = ({
    userName,
    onAccountClick,
    activeNav,
    onNavSelect,
    formData,
    onInputChange,
    onSubmit,
    isSubmitting,
    addError,
    canAdd,
    isAdmin,
    companyName,
    onBulkAddMedications
}) => {
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const bulkFileRef = useRef<HTMLInputElement>(null);
    const [bulkRows, setBulkRows] = useState<BulkMedRow[]>([]);
    const [bulkResult, setBulkResult] = useState<BulkMedResult | null>(null);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkParseError, setBulkParseError] = useState('');

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
                const mapped: BulkMedRow[] = rows.map((row) => {
                    const serialNumber = String(row['serialNumber'] || row['Serial Number'] || row['serial_number'] || '').trim();
                    const medicationName = String(row['medicationName'] || row['Medication Name'] || row['medication_name'] || '').trim();
                    const gtin = String(row['gtin'] || row['GTIN'] || '').trim();
                    const batchNumber = String(row['batchNumber'] || row['Batch Number'] || row['batch_number'] || '').trim();
                    const expiryDate = String(row['expiryDate'] || row['Expiry Date'] || row['expiry_date'] || '').trim();
                    const distributionCompany = String(row['distributionCompany'] || row['Distribution Company'] || row['distribution_company'] || '').trim();
                    const pharmacyCompany = String(row['pharmacyCompany'] || row['Pharmacy Company'] || row['pharmacy_company'] || '').trim();
                    let _error = '';
                    if (!serialNumber) _error = 'serialNumber is required.';
                    else if (!medicationName) _error = 'medicationName is required.';
                    else if (!gtin) _error = 'gtin is required.';
                    else if (!batchNumber) _error = 'batchNumber is required.';
                    else if (!expiryDate) _error = 'expiryDate is required.';
                    else if (!distributionCompany) _error = 'distributionCompany is required.';
                    else if (!pharmacyCompany) _error = 'pharmacyCompany is required.';
                    return { serialNumber, medicationName, gtin, batchNumber, expiryDate, distributionCompany, pharmacyCompany, _valid: !_error, _error };
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
            const validRows = bulkRows.filter((r) => r._valid).map(({ serialNumber, medicationName, gtin, batchNumber, expiryDate, distributionCompany, pharmacyCompany }) => ({
                serialNumber, medicationName, gtin, batchNumber, expiryDate, distributionCompany, pharmacyCompany
            }));
            const result = await onBulkAddMedications(validRows);
            setBulkResult(result);
            if (result.failed.length === 0) {
                setBulkRows([]);
            }
        } catch (err: unknown) {
            setBulkParseError(err instanceof Error ? err.message : 'Import failed.');
        } finally {
            setBulkSubmitting(false);
        }
    };

    return (
        <DashboardLayout
            userName={userName}
            onAccountClick={onAccountClick}
            activeNav={activeNav}
            onNavSelect={onNavSelect}
            heading="Add medication"
            subheading=""
            canAdd={canAdd}
            canReceive={false}
            canArrived={false}
            isAdmin={isAdmin}
        >
            <section className="dashboard__panel">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button
                        className={`button button--mini${mode === 'single' ? ' button--primary' : ' button--ghost'}`}
                        onClick={() => setMode('single')}
                    >
                        Single
                    </button>
                    <button
                        className={`button button--mini${mode === 'bulk' ? ' button--primary' : ' button--ghost'}`}
                        onClick={() => setMode('bulk')}
                        disabled={!canAdd}
                    >
                        Bulk import
                    </button>
                </div>

                {mode === 'single' && (
                    <form className="card card--form" onSubmit={onSubmit}>
                        <h2>New medication entry</h2>
                        <p>All fields are required to generate a traceable QR payload.</p>
                        {!canAdd && (
                            <div className="inline-error">Only production companies can add medications.</div>
                        )}

                        <div className="field">
                            <label>Serial Number (UID)</label>
                            <input
                                type="text"
                                name="serialNumber"
                                placeholder="RX-2026-00001"
                                value={formData.serialNumber}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>
                        <div className="field">
                            <label>Medication Name</label>
                            <input
                                type="text"
                                name="medicationName"
                                placeholder="Aspirin"
                                value={formData.medicationName}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>
                        <div className="field">
                            <label>GTIN</label>
                            <input
                                type="text"
                                name="gtin"
                                placeholder="00312345678905"
                                value={formData.gtin}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>
                        <div className="field">
                            <label>Batch Number</label>
                            <input
                                type="text"
                                name="batchNumber"
                                placeholder="BATCH-APR-26"
                                value={formData.batchNumber}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>
                        <div className="field">
                            <label>Expiry Date</label>
                            <input
                                type="date"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>
                        <div className="field">
                            <label>Production Company</label>
                            <p className="field__info">Auto-filled from your account: <strong>{companyName}</strong></p>
                        </div>
                        <div className="field">
                            <label>Distribution Company</label>
                            <input
                                type="text"
                                name="distributionCompany"
                                placeholder="Global Logistics"
                                value={formData.distributionCompany}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>
                        <div className="field">
                            <label>Destination Pharmacy / Clinic</label>
                            <input
                                type="text"
                                name="pharmacyCompany"
                                placeholder="Destination pharmacy or clinic name"
                                value={formData.pharmacyCompany}
                                onChange={onInputChange}
                                required
                                disabled={!canAdd}
                            />
                        </div>

                        <div className="form__actions">
                            <button type="submit" className="button button--primary" disabled={isSubmitting || !canAdd}>
                                {isSubmitting ? <Loader2 size={16} className="spin" /> : <QrCode size={16} />}
                                {isSubmitting ? 'Anchoring...' : 'Add to Blockchain'}
                            </button>
                        </div>
                        {addError && <div className="inline-error">{addError}</div>}
                    </form>
                )}

                {mode === 'bulk' && (
                    <div className="card card--form">
                        <h2>Bulk import medications</h2>
                        <p style={{ marginBottom: '4px' }}>
                            Expected columns: <code>serialNumber | medicationName | gtin | batchNumber | expiryDate | distributionCompany | pharmacyCompany</code>
                        </p>
                        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '12px' }}>
                            Production company auto-filled from your account: <strong>{companyName}</strong>
                        </p>

                        <div style={{ marginBottom: '12px' }}>
                            <button
                                className="button button--ghost button--mini"
                                onClick={() => bulkFileRef.current?.click()}
                            >
                                Choose file (.xlsx / .csv)
                            </button>
                            <input
                                ref={bulkFileRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                style={{ display: 'none' }}
                                onChange={handleBulkFile}
                            />
                        </div>

                        {bulkParseError && <div className="inline-error" style={{ marginBottom: '8px' }}>{bulkParseError}</div>}

                        {bulkRows.length > 0 && (
                            <>
                                <div className="admin-table" style={{ marginBottom: '8px', overflowX: 'auto' }}>
                                    <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                                        <span>Serial No.</span>
                                        <span>Name</span>
                                        <span>GTIN</span>
                                        <span>Batch</span>
                                        <span>Expiry</span>
                                        <span>Distribution Co.</span>
                                        <span>Pharmacy</span>
                                        <span>Status</span>
                                    </div>
                                    {bulkRows.map((row, i) => (
                                        <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                                            <span className="admin-table__primary">{row.serialNumber || <em style={{ color: 'var(--muted)' }}>empty</em>}</span>
                                            <span>{row.medicationName || '—'}</span>
                                            <span>{row.gtin || '—'}</span>
                                            <span>{row.batchNumber || '—'}</span>
                                            <span>{row.expiryDate || '—'}</span>
                                            <span>{row.distributionCompany || '—'}</span>
                                            <span>{row.pharmacyCompany || '—'}</span>
                                            <span style={{ color: row._valid ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)', fontSize: '12px' }}>
                                                {row._valid ? '✓' : row._error}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="admin-table__expanded-actions">
                                    <button
                                        className="button button--primary button--mini"
                                        onClick={handleBulkSubmit}
                                        disabled={bulkSubmitting || bulkRows.filter((r) => r._valid).length === 0}
                                    >
                                        {bulkSubmitting ? 'Importing…' : `Import ${bulkRows.filter((r) => r._valid).length} medications`}
                                    </button>
                                    <button
                                        className="button button--ghost button--mini"
                                        onClick={() => { setBulkRows([]); setBulkResult(null); setBulkParseError(''); }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </>
                        )}

                        {bulkResult && (
                            <div style={{ marginTop: '12px' }}>
                                <p style={{ fontWeight: 600, marginBottom: '6px' }}>
                                    Results: {bulkResult.succeeded.length} succeeded, {bulkResult.failed.length} failed
                                </p>
                                {bulkResult.succeeded.length > 0 && (
                                    <div className="admin-table" style={{ marginBottom: '8px' }}>
                                        <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                            <span>Serial No.</span>
                                            <span>QR Hash</span>
                                        </div>
                                        {bulkResult.succeeded.map((s, i) => (
                                            <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                                <span className="admin-table__primary">{s.serialNumber}</span>
                                                <span style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{s.qrHash}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {bulkResult.failed.length > 0 && (
                                    <div className="admin-table">
                                        <div className="admin-table__row admin-table__row--head" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                            <span>Serial No.</span>
                                            <span>Error</span>
                                        </div>
                                        {bulkResult.failed.map((f, i) => (
                                            <div key={i} className="admin-table__row" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                                <span>{f.serialNumber}</span>
                                                <span style={{ color: 'var(--error, #ef4444)', fontSize: '12px' }}>{f.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </DashboardLayout>
    );
};

export default AddMedicationPage;

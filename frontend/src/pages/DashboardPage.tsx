import React from 'react';
import {
    Plus,
    List,
    RefreshCw,
    Search,
    QrCode,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import { Medication } from '../types';

type DashboardPageProps = {
    medications: Medication[];
    filteredMedications: Medication[];
    activeTab: 'add' | 'view';
    onTabChange: (tab: 'add' | 'view') => void;
    formData: Medication;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting: boolean;
    addError: string;
    isLoading: boolean;
    error: string;
    onRefresh: () => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    lastUpdated: string | null;
    onShowQR: (qrHash: string) => void;
    lookupSerial: string;
    onLookupSerialChange: (value: string) => void;
    onLookup: () => void;
    lookupLoading: boolean;
    lookupError: string;
    lookupResult: Medication | null;
};

const DashboardPage: React.FC<DashboardPageProps> = ({
    medications,
    filteredMedications,
    activeTab,
    onTabChange,
    formData,
    onInputChange,
    onSubmit,
    isSubmitting,
    addError,
    isLoading,
    error,
    onRefresh,
    searchQuery,
    onSearchChange,
    lastUpdated,
    onShowQR,
    lookupSerial,
    onLookupSerialChange,
    onLookup,
    lookupLoading,
    lookupError,
    lookupResult
}) => (
    <>
        <header className="hero">
            <div className="hero__badge">
                <ShieldCheck size={16} />
                Trusted pharma traceability
            </div>
            <h1>LedgRx Control Center</h1>
            <p>
                Anchor medication lineage to your private Fabric network. Track batches, verify origin, and generate QR
                codes for downstream scanning.
            </p>
            <div className="hero__stats">
                <div>
                    <span>Total Records</span>
                    <strong>{medications.length}</strong>
                </div>
                <div>
                    <span>Network Status</span>
                    <strong>{error ? 'Offline' : 'Online'}</strong>
                </div>
                <div>
                    <span>Last Sync</span>
                    <strong>{lastUpdated ?? '—'}</strong>
                </div>
            </div>
        </header>

        <section className="panel">
            <div className="panel__tabs">
                <button className={activeTab === 'add' ? 'tab tab--active' : 'tab'} onClick={() => onTabChange('add')}>
                    <Plus size={16} />
                    Add Medication
                </button>
                <button className={activeTab === 'view' ? 'tab tab--active' : 'tab'} onClick={() => onTabChange('view')}>
                    <List size={16} />
                    View Records
                </button>
            </div>

            <div className="panel__body">
                {activeTab === 'add' && (
                    <div className="grid">
                        <form className="card card--form" onSubmit={onSubmit}>
                            <h2>New medication entry</h2>
                            <p>All fields are required to generate a traceable QR payload.</p>

                            <div className="field">
                                <label>Serial Number (UID)</label>
                                <input
                                    type="text"
                                    name="serialNumber"
                                    placeholder="RX-2026-00001"
                                    value={formData.serialNumber}
                                    onChange={onInputChange}
                                    required
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
                                />
                            </div>
                            <div className="field">
                                <label>Production Company</label>
                                <input
                                    type="text"
                                    name="productionCompany"
                                    placeholder="PharmaCorp"
                                    value={formData.productionCompany}
                                    onChange={onInputChange}
                                    required
                                />
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
                                />
                            </div>

                            <div className="form__actions">
                                <button type="submit" className="button button--primary" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 size={16} className="spin" /> : <QrCode size={16} />}
                                    {isSubmitting ? 'Anchoring...' : 'Add to Blockchain'}
                                </button>
                            </div>
                            {addError && <div className="inline-error">{addError}</div>}
                        </form>

                        <div className="card card--preview">
                            <div className="preview__header">
                                <div>
                                    <h3>QR readiness</h3>
                                    <p>QR hash is generated after the transaction is committed.</p>
                                </div>
                                <div className="preview__status">Ready</div>
                            </div>
                            <div className="preview__body">
                                <div className="preview__placeholder">
                                    <QrCode size={32} />
                                    <span>Submit to mint a QR hash</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'view' && (
                    <div className="records">
                        <div className="records__toolbar">
                            <div className="search">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search serial, name, batch..."
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                />
                            </div>
                            <button className="button button--ghost" onClick={onRefresh}>
                                <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                                {isLoading ? 'Refreshing' : 'Refresh'}
                            </button>
                        </div>

                        {error && <div className="error-banner">{error}</div>}

                        <div className="records__grid">
                            {filteredMedications.length === 0 && !isLoading && (
                                <div className="empty-state">
                                    <QrCode size={32} />
                                    <p>No records yet. Add a medication to mint the first QR hash.</p>
                                </div>
                            )}
                            {filteredMedications.map((med) => (
                                <div className="record-card" key={med.serialNumber}>
                                    <div className="record-card__header">
                                        <div>
                                            <span className="pill">Serial</span>
                                            <h3>{med.serialNumber}</h3>
                                        </div>
                                        <button className="button button--mini" onClick={() => onShowQR(med.qrHash || '')}>
                                            <QrCode size={14} />
                                            View QR
                                        </button>
                                    </div>
                                    <div className="record-card__meta">
                                        <div>
                                            <span>Name</span>
                                            <strong>{med.medicationName}</strong>
                                        </div>
                                        <div>
                                            <span>GTIN</span>
                                            <strong>{med.gtin}</strong>
                                        </div>
                                        <div>
                                            <span>Batch</span>
                                            <strong>{med.batchNumber}</strong>
                                        </div>
                                        <div>
                                            <span>Expiry</span>
                                            <strong>{med.expiryDate}</strong>
                                        </div>
                                    </div>
                                    <div className="record-card__hash">
                                        <span>QR Hash</span>
                                        <button
                                            className="button button--ghost button--mini"
                                            onClick={() => onShowQR(med.qrHash || '')}
                                        >
                                            Show
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="lookup card">
                            <h3>Scan / lookup</h3>
                            <p>Enter a serial number from a QR scan to fetch on-chain data.</p>
                            <div className="lookup__row">
                                <input
                                    type="text"
                                    placeholder="Serial number"
                                    value={lookupSerial}
                                    onChange={(e) => onLookupSerialChange(e.target.value)}
                                />
                                <button className="button button--primary" onClick={onLookup} disabled={lookupLoading}>
                                    {lookupLoading ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                            {lookupError && <div className="inline-error">{lookupError}</div>}
                            {lookupResult && (
                                <div className="lookup__result">
                                    <div>
                                        <span>Serial</span>
                                        <strong>{lookupResult.serialNumber}</strong>
                                    </div>
                                    <div>
                                        <span>Name</span>
                                        <strong>{lookupResult.medicationName}</strong>
                                    </div>
                                    <div>
                                        <span>GTIN</span>
                                        <strong>{lookupResult.gtin}</strong>
                                    </div>
                                    <div>
                                        <span>Batch</span>
                                        <strong>{lookupResult.batchNumber}</strong>
                                    </div>
                                    <div>
                                        <span>Production</span>
                                        <strong>{lookupResult.productionCompany}</strong>
                                    </div>
                                    <div>
                                        <span>Distribution</span>
                                        <strong>{lookupResult.distributionCompany}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    </>
);

export default DashboardPage;

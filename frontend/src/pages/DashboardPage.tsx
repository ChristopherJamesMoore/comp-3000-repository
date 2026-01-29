import React from 'react';
import { RefreshCw, Search, QrCode } from 'lucide-react';
import { Medication } from '../types';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';

type DashboardPageProps = {
    userName: string;
    onAccountClick: () => void;
    activeNav: DashboardNav;
    onNavSelect: (nav: DashboardNav) => void;
    medications: Medication[];
    filteredMedications: Medication[];
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
    userName,
    onAccountClick,
    activeNav,
    onNavSelect,
    medications,
    filteredMedications,
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
    <DashboardLayout
        userName={userName}
        onAccountClick={onAccountClick}
        activeNav={activeNav}
        onNavSelect={onNavSelect}
        heading="Dashboard"
        subheading="Track medications across manufacturing, distribution, and pharmacy delivery."
    >
        <div className="dashboard__stats">
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

        {activeNav === 'receive' && (
                <section className="dashboard__panel">
                    <div className="card card--form">
                        <h2>Mark medication as received</h2>
                        <p>Log that a distributor has received a shipment from the manufacturer.</p>
                        <div className="field">
                            <label>Serial Number</label>
                            <input type="text" placeholder="RX-2026-00001" />
                        </div>
                        <div className="field">
                            <label>Receiving facility</label>
                            <input type="text" placeholder="Distribution Hub" />
                        </div>
                        <div className="form__actions">
                            <button type="button" className="button button--primary" disabled>
                                Coming soon
                            </button>
                        </div>
                    </div>
                </section>
            )}

        {activeNav === 'arrived' && (
                <section className="dashboard__panel">
                    <div className="card card--form">
                        <h2>Mark medication as arrived</h2>
                        <p>Confirm arrival at a pharmacy or clinic for final verification.</p>
                        <div className="field">
                            <label>Serial Number</label>
                            <input type="text" placeholder="RX-2026-00001" />
                        </div>
                        <div className="field">
                            <label>Receiving pharmacy</label>
                            <input type="text" placeholder="City Health Pharmacy" />
                        </div>
                        <div className="form__actions">
                            <button type="button" className="button button--primary" disabled>
                                Coming soon
                            </button>
                        </div>
                    </div>
                </section>
            )}

        {activeNav === 'view' && (
                <section className="dashboard__panel">
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
                                        <button className="button button--ghost button--mini" onClick={() => onShowQR(med.qrHash || '')}>
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
                </section>
            )}
    </DashboardLayout>
);

export default DashboardPage;

import React, { useState, useCallback } from 'react';
import { RefreshCw, Search, QrCode, X } from 'lucide-react';
import { Medication, AuditEntry, BatchResult } from '../types';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';
import QrScanner from '../components/QrScanner';

type DashboardPageProps = {
    userName: string;
    onAccountClick: () => void;
    activeNav: DashboardNav;
    onNavSelect: (nav: DashboardNav) => void;
    canAdd: boolean;
    canReceive: boolean;
    canArrived: boolean;
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
    lookupAudit: AuditEntry[];
    receiveSerial: string;
    receiveLoading: boolean;
    receiveError: string;
    onReceiveSerialChange: (value: string) => void;
    onMarkReceived: () => void;
    arrivedSerial: string;
    arrivedLoading: boolean;
    arrivedError: string;
    onArrivedSerialChange: (value: string) => void;
    onMarkArrived: () => void;
    // Batch receive
    receiveBatch: string[];
    batchReceiveLoading: boolean;
    batchReceiveError: string;
    batchReceiveResults: BatchResult | null;
    onAddToReceiveBatch: (serial: string) => void;
    onRemoveFromReceiveBatch: (serial: string) => void;
    onClearReceiveBatch: () => void;
    onBatchReceived: () => void;
    // Batch arrived
    arrivedBatch: string[];
    batchArrivedLoading: boolean;
    batchArrivedError: string;
    batchArrivedResults: BatchResult | null;
    onAddToArrivedBatch: (serial: string) => void;
    onRemoveFromArrivedBatch: (serial: string) => void;
    onClearArrivedBatch: () => void;
    onBatchArrived: () => void;
    // QR scanner
    onResolveQrHash: (hash: string) => Promise<string | null>;
};

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
    const [receiveInput, setReceiveInput] = useState('');
    const [arrivedInput, setArrivedInput] = useState('');
    const [receiveScannerActive, setReceiveScannerActive] = useState(false);
    const [arrivedScannerActive, setArrivedScannerActive] = useState(false);

    const handleReceiveAdd = useCallback(() => {
        if (receiveInput.trim()) {
            props.onAddToReceiveBatch(receiveInput.trim());
            setReceiveInput('');
        }
    }, [receiveInput, props]);

    const handleArrivedAdd = useCallback(() => {
        if (arrivedInput.trim()) {
            props.onAddToArrivedBatch(arrivedInput.trim());
            setArrivedInput('');
        }
    }, [arrivedInput, props]);

    const handleReceiveKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleReceiveAdd();
        }
    };

    const handleArrivedKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleArrivedAdd();
        }
    };

    const handleReceiveScan = useCallback(async (value: string) => {
        const serial = await props.onResolveQrHash(value);
        if (serial) {
            props.onAddToReceiveBatch(serial);
        }
    }, [props]);

    const handleArrivedScan = useCallback(async (value: string) => {
        const serial = await props.onResolveQrHash(value);
        if (serial) {
            props.onAddToArrivedBatch(serial);
        }
    }, [props]);

    return (
        <DashboardLayout
            userName={props.userName}
            onAccountClick={props.onAccountClick}
            activeNav={props.activeNav}
            onNavSelect={props.onNavSelect}
            heading="Dashboard"
            subheading="Track medications across manufacturing, distribution, and pharmacy delivery."
            canAdd={props.canAdd}
            canReceive={props.canReceive}
            canArrived={props.canArrived}
        >
            <div className="dashboard__stats">
                <div>
                    <span>Total Records</span>
                    <strong>{props.medications.length}</strong>
                </div>
                <div>
                    <span>Network Status</span>
                    <strong>{props.error ? 'Offline' : 'Online'}</strong>
                </div>
                <div>
                    <span>Last Sync</span>
                    <strong>{props.lastUpdated ?? '\u2014'}</strong>
                </div>
            </div>

            {props.activeNav === 'receive' && (
                <section className="dashboard__panel">
                    <div className="card card--form">
                        <h2>Mark medications as received</h2>
                        <p>Add serial numbers manually or scan QR codes, then submit the batch.</p>

                        <div className="batch-input-row">
                            <input
                                type="text"
                                placeholder="RX-2026-00001"
                                value={receiveInput}
                                onChange={(e) => setReceiveInput(e.target.value)}
                                onKeyDown={handleReceiveKeyDown}
                                disabled={!props.canReceive}
                            />
                            <button
                                type="button"
                                className="button button--ghost"
                                onClick={handleReceiveAdd}
                                disabled={!props.canReceive || !receiveInput.trim()}
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                className={`button ${receiveScannerActive ? 'button--primary' : 'button--ghost'}`}
                                onClick={() => setReceiveScannerActive((c) => !c)}
                                disabled={!props.canReceive}
                            >
                                {receiveScannerActive ? 'Stop scan' : 'Scan QR'}
                            </button>
                        </div>

                        {receiveScannerActive && props.canReceive && (
                            <QrScanner onScan={handleReceiveScan} isActive={receiveScannerActive} />
                        )}

                        {props.receiveBatch.length > 0 && (
                            <div className="batch-queue">
                                <div className="batch-queue__header">
                                    <span>{props.receiveBatch.length} queued</span>
                                    <button
                                        type="button"
                                        className="button button--ghost button--mini"
                                        onClick={props.onClearReceiveBatch}
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <div className="batch-queue__items">
                                    {props.receiveBatch.map((serial) => (
                                        <div className="batch-chip" key={serial}>
                                            <span>{serial}</span>
                                            <button
                                                type="button"
                                                className="batch-chip__remove"
                                                onClick={() => props.onRemoveFromReceiveBatch(serial)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form__actions">
                            <button
                                type="button"
                                className="button button--primary"
                                disabled={!props.canReceive || props.batchReceiveLoading || props.receiveBatch.length === 0}
                                onClick={props.onBatchReceived}
                            >
                                {props.batchReceiveLoading
                                    ? 'Processing...'
                                    : `Mark all received (${props.receiveBatch.length})`}
                            </button>
                        </div>

                        {props.batchReceiveError && <div className="inline-error">{props.batchReceiveError}</div>}

                        {props.batchReceiveResults && (
                            <div className="batch-results">
                                {props.batchReceiveResults.succeeded.map((item) => (
                                    <div className="batch-result batch-result--success" key={item.serialNumber}>
                                        {item.serialNumber} — received
                                    </div>
                                ))}
                                {props.batchReceiveResults.failed.map((item) => (
                                    <div className="batch-result batch-result--error" key={item.serialNumber}>
                                        {item.serialNumber} — {item.error}
                                    </div>
                                ))}
                            </div>
                        )}

                        {!props.canReceive && (
                            <div className="inline-error">
                                Set your account to Distribution to mark received.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {props.activeNav === 'arrived' && (
                <section className="dashboard__panel">
                    <div className="card card--form">
                        <h2>Mark medications as arrived</h2>
                        <p>Add serial numbers manually or scan QR codes, then submit the batch.</p>

                        <div className="batch-input-row">
                            <input
                                type="text"
                                placeholder="RX-2026-00001"
                                value={arrivedInput}
                                onChange={(e) => setArrivedInput(e.target.value)}
                                onKeyDown={handleArrivedKeyDown}
                                disabled={!props.canArrived}
                            />
                            <button
                                type="button"
                                className="button button--ghost"
                                onClick={handleArrivedAdd}
                                disabled={!props.canArrived || !arrivedInput.trim()}
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                className={`button ${arrivedScannerActive ? 'button--primary' : 'button--ghost'}`}
                                onClick={() => setArrivedScannerActive((c) => !c)}
                                disabled={!props.canArrived}
                            >
                                {arrivedScannerActive ? 'Stop scan' : 'Scan QR'}
                            </button>
                        </div>

                        {arrivedScannerActive && props.canArrived && (
                            <QrScanner onScan={handleArrivedScan} isActive={arrivedScannerActive} />
                        )}

                        {props.arrivedBatch.length > 0 && (
                            <div className="batch-queue">
                                <div className="batch-queue__header">
                                    <span>{props.arrivedBatch.length} queued</span>
                                    <button
                                        type="button"
                                        className="button button--ghost button--mini"
                                        onClick={props.onClearArrivedBatch}
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <div className="batch-queue__items">
                                    {props.arrivedBatch.map((serial) => (
                                        <div className="batch-chip" key={serial}>
                                            <span>{serial}</span>
                                            <button
                                                type="button"
                                                className="batch-chip__remove"
                                                onClick={() => props.onRemoveFromArrivedBatch(serial)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form__actions">
                            <button
                                type="button"
                                className="button button--primary"
                                disabled={!props.canArrived || props.batchArrivedLoading || props.arrivedBatch.length === 0}
                                onClick={props.onBatchArrived}
                            >
                                {props.batchArrivedLoading
                                    ? 'Processing...'
                                    : `Mark all arrived (${props.arrivedBatch.length})`}
                            </button>
                        </div>

                        {props.batchArrivedError && <div className="inline-error">{props.batchArrivedError}</div>}

                        {props.batchArrivedResults && (
                            <div className="batch-results">
                                {props.batchArrivedResults.succeeded.map((item) => (
                                    <div className="batch-result batch-result--success" key={item.serialNumber}>
                                        {item.serialNumber} — arrived
                                    </div>
                                ))}
                                {props.batchArrivedResults.failed.map((item) => (
                                    <div className="batch-result batch-result--error" key={item.serialNumber}>
                                        {item.serialNumber} — {item.error}
                                    </div>
                                ))}
                            </div>
                        )}

                        {!props.canArrived && (
                            <div className="inline-error">
                                Set your account to Pharmacy or Clinic to mark arrived.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {props.activeNav === 'view' && (
                <section className="dashboard__panel">
                    <div className="records">
                        <div className="records__toolbar">
                            <div className="search">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search serial, name, batch..."
                                    value={props.searchQuery}
                                    onChange={(e) => props.onSearchChange(e.target.value)}
                                />
                            </div>
                            <button className="button button--ghost" onClick={props.onRefresh}>
                                <RefreshCw size={16} className={props.isLoading ? 'spin' : ''} />
                                {props.isLoading ? 'Refreshing' : 'Refresh'}
                            </button>
                        </div>

                        {props.error && <div className="error-banner">{props.error}</div>}

                        <div className="records__grid">
                            {props.filteredMedications.length === 0 && !props.isLoading && (
                                <div className="empty-state">
                                    <QrCode size={32} />
                                    <p>No records yet. Add a medication to mint the first QR hash.</p>
                                </div>
                            )}
                            {props.filteredMedications.map((med) => (
                                <div className="record-card" key={med.serialNumber}>
                                    <div className="record-card__header">
                                        <div>
                                            <span className="pill">Serial</span>
                                            <h3>{med.serialNumber}</h3>
                                        </div>
                                        <button className="button button--mini" onClick={() => props.onShowQR(med.qrHash || '')}>
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
                                        <div>
                                            <span>Status</span>
                                            <strong>{med.status || 'manufactured'}</strong>
                                        </div>
                                    </div>
                                    <div className="record-card__hash">
                                        <span>QR Hash</span>
                                        <button className="button button--ghost button--mini" onClick={() => props.onShowQR(med.qrHash || '')}>
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
                                    value={props.lookupSerial}
                                    onChange={(e) => props.onLookupSerialChange(e.target.value)}
                                />
                                <button className="button button--primary" onClick={props.onLookup} disabled={props.lookupLoading}>
                                    {props.lookupLoading ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                            {props.lookupError && <div className="inline-error">{props.lookupError}</div>}
                            {props.lookupResult && (
                                <div className="lookup__result">
                                    <div>
                                        <span>Serial</span>
                                        <strong>{props.lookupResult.serialNumber}</strong>
                                    </div>
                                    <div>
                                        <span>Name</span>
                                        <strong>{props.lookupResult.medicationName}</strong>
                                    </div>
                                    <div>
                                        <span>GTIN</span>
                                        <strong>{props.lookupResult.gtin}</strong>
                                    </div>
                                    <div>
                                        <span>Batch</span>
                                        <strong>{props.lookupResult.batchNumber}</strong>
                                    </div>
                                    <div>
                                        <span>Production</span>
                                        <strong>{props.lookupResult.productionCompany}</strong>
                                    </div>
                                    <div>
                                        <span>Distribution</span>
                                        <strong>{props.lookupResult.distributionCompany}</strong>
                                    </div>
                                    <div>
                                        <span>Status</span>
                                        <strong>{props.lookupResult.status || 'manufactured'}</strong>
                                    </div>
                                </div>
                            )}
                            {props.lookupAudit.length > 0 && (
                                <div className="lookup__result">
                                    <div>
                                        <span>Audit trail</span>
                                        <strong>{props.lookupAudit.length} updates</strong>
                                    </div>
                                    {props.lookupAudit.map((entry, index) => (
                                        <div key={`${entry.action}-${index}`}>
                                            <span>{entry.action}</span>
                                            <strong>
                                                {entry.actorCompanyName || 'Unknown'} {'\u2022'} {new Date(entry.createdAt).toLocaleString()}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </DashboardLayout>
    );
};

export default DashboardPage;

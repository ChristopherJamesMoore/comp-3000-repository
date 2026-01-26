import React, { useState, useEffect, useMemo } from 'react';
import { Plus, List, RefreshCw, Search, QrCode, Copy, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';

type Toast = { type: 'success' | 'error' | 'info'; message: string };

const API_BASE =
    (process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim()) ||
    'https://ledgrx.duckdns.org';

const buildUrl = (path: string) => `${API_BASE.replace(/\/$/, '')}${path}`;

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
    const [medications, setMedications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [addError, setAddError] = useState('');
    const [toast, setToast] = useState<Toast | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [lookupSerial, setLookupSerial] = useState('');
    const [lookupResult, setLookupResult] = useState<any | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [formData, setFormData] = useState({
        serialNumber: '',
        gtin: '',
        batchNumber: '',
        expiryDate: '',
    });
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQRHash, setSelectedQRHash] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

    const fetchMedications = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(buildUrl('/api/medications'));
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch medications.');
            }
            const data = await response.json();
            setMedications(data);
            setLastUpdated(new Date().toLocaleString());
        } catch (error) {
            setError('Unable to reach the API. Check that the server is running.');
            console.error('Error fetching medications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'view') {
            fetchMedications();
        }
    }, [activeTab]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        if (!formData.serialNumber || !formData.gtin || !formData.batchNumber || !formData.expiryDate) {
            setAddError('All fields are required.');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(buildUrl('/api/medications'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                setToast({ type: 'success', message: data.qrHash ? 'Medication anchored on-chain.' : 'Medication added.' });
                setFormData({
                    serialNumber: '',
                    gtin: '',
                    batchNumber: '',
                    expiryDate: '',
                });
            } else {
                const errorData = await response.json();
                const message = errorData.error || 'Upload failed.';
                setAddError(message);
                setToast({ type: 'error', message });
            }
        } catch (error) {
            console.error('Error adding medication:', error);
            const message = 'An error occurred while adding the medication.';
            setAddError(message);
            setToast({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShowQR = (qrHash: string) => {
        if (showQRModal && selectedQRHash === qrHash) {
            setShowQRModal(false);
            return;
        }
        setSelectedQRHash(qrHash);
        setShowQRModal(true);
    };

    const handleCopyHash = async () => {
        if (!selectedQRHash) return;
        try {
            await navigator.clipboard.writeText(selectedQRHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            setToast({ type: 'error', message: 'Copy failed. Try manually selecting the hash.' });
        }
    };

    const handleLookup = async () => {
        if (!lookupSerial.trim()) {
            setLookupError('Enter a serial number to search.');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setLookupResult(null);
        try {
            const response = await fetch(buildUrl(`/api/medications/${encodeURIComponent(lookupSerial.trim())}`));
            if (response.status === 404) {
                const errorData = await response.json().catch(() => ({}));
                setLookupError(errorData.error || 'Medication not found.');
                return;
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Lookup failed.');
            }
            const data = await response.json();
            setLookupResult(data);
        } catch (error) {
            setLookupError(error.message || 'Lookup failed.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleHealthCheck = async () => {
        try {
            const response = await fetch(buildUrl('/api/health'));
            if (!response.ok) {
                throw new Error('Backend not reachable.');
            }
            setToast({ type: 'success', message: 'Backend online' });
        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Backend offline' });
        }
    };

    const filteredMedications = useMemo(() => {
        if (!searchQuery.trim()) return medications;
        const q = searchQuery.trim().toLowerCase();
        return medications.filter((med) =>
            [med.serialNumber, med.gtin, med.batchNumber, med.expiryDate, med.qrHash]
                .filter(Boolean)
                .some((value: string) => value.toLowerCase().includes(q))
        );
    }, [medications, searchQuery]);

    return (
        <div className="app">
            <div className="app__glow app__glow--one" />
            <div className="app__glow app__glow--two" />

            <header className="hero">
                <div className="hero__badge">
                    <ShieldCheck size={16} />
                    Trusted pharma traceability
                </div>
                <h1>LedgerRx Control Center</h1>
                <p>
                    Anchor medication lineage to your private Fabric network. Track batches, verify origin,
                    and generate QR codes for downstream scanning.
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
                    <button
                        className={activeTab === 'add' ? 'tab tab--active' : 'tab'}
                        onClick={() => setActiveTab('add')}
                    >
                        <Plus size={16} />
                        Add Medication
                    </button>
                    <button
                        className={activeTab === 'view' ? 'tab tab--active' : 'tab'}
                        onClick={() => setActiveTab('view')}
                    >
                        <List size={16} />
                        View Records
                    </button>
                </div>

                <div className="panel__body">
                    {activeTab === 'add' && (
                        <div className="grid">
                            <form className="card card--form" onSubmit={handleSubmit}>
                                <h2>New medication entry</h2>
                                <p>All fields are required to generate a traceable QR payload.</p>

                                <div className="field">
                                    <label>Serial Number (UID)</label>
                                    <input
                                        type="text"
                                        name="serialNumber"
                                        placeholder="RX-2026-00001"
                                        value={formData.serialNumber}
                                        onChange={handleInputChange}
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
                                        onChange={handleInputChange}
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
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label>Expiry Date</label>
                                    <input
                                        type="date"
                                        name="expiryDate"
                                        value={formData.expiryDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form__actions">
                                    <button
                                        type="button"
                                        className="button button--ghost"
                                        onClick={() =>
                                            setFormData({
                                                serialNumber: 'RX-2026-00001',
                                                gtin: '00312345678905',
                                                batchNumber: 'BATCH-APR-26',
                                                expiryDate: '2026-12-31',
                                            })
                                        }
                                    >
                                        Fill demo data
                                    </button>
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
                                    <div className="preview__status">{isSubmitting ? 'Processing' : 'Ready'}</div>
                                </div>
                                <div className="preview__body">
                                    <div className="preview__placeholder">
                                        <QrCode size={32} />
                                        <span>Submit to mint a QR hash</span>
                                    </div>
                                    <ul className="preview__checks">
                                        <li className={formData.serialNumber ? 'done' : ''}>
                                            <Check size={16} />
                                            Unique serial number
                                        </li>
                                        <li className={formData.gtin ? 'done' : ''}>
                                            <Check size={16} />
                                            Global trade item number
                                        </li>
                                        <li className={formData.batchNumber ? 'done' : ''}>
                                            <Check size={16} />
                                            Batch metadata
                                        </li>
                                        <li className={formData.expiryDate ? 'done' : ''}>
                                            <Check size={16} />
                                            Verified expiry date
                                        </li>
                                    </ul>
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
                                        placeholder="Search serial, GTIN, batch, expiry..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button className="button button--ghost" onClick={fetchMedications}>
                                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                                    {isLoading ? 'Refreshing' : 'Refresh'}
                                </button>
                            </div>
                            <div className="records__actions">
                                <button className="button button--ghost" onClick={handleHealthCheck}>
                                    <ShieldCheck size={16} />
                                    Check backend
                                </button>
                            </div>

                            {error && <div className="error-banner">{error}</div>}

                            <div className="lookup card">
                                <h3>Scan / lookup</h3>
                                <p>Enter a serial number from a QR scan to fetch on-chain data.</p>
                                <div className="lookup__row">
                                    <input
                                        type="text"
                                        placeholder="Serial number"
                                        value={lookupSerial}
                                        onChange={(e) => setLookupSerial(e.target.value)}
                                    />
                                    <button className="button button--primary" onClick={handleLookup} disabled={lookupLoading}>
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
                                            <span>GTIN</span>
                                            <strong>{lookupResult.gtin}</strong>
                                        </div>
                                        <div>
                                            <span>Batch</span>
                                            <strong>{lookupResult.batchNumber}</strong>
                                        </div>
                                        <div>
                                            <span>Expiry</span>
                                            <strong>{lookupResult.expiryDate}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                            <button className="button button--mini" onClick={() => handleShowQR(med.qrHash)}>
                                                <QrCode size={14} />
                                                View QR
                                            </button>
                                        </div>
                                        <div className="record-card__meta">
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
                                            <button className="button button--ghost button--mini" onClick={() => handleShowQR(med.qrHash)}>
                                                Show
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {toast && (
                <div className={`toast toast--${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {showQRModal && (
                <div className="modal" onClick={() => setShowQRModal(false)}>
                    <div className="modal__card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <div>
                                <h3>QR Payload</h3>
                                <p>Scan-ready hash for supply chain validation.</p>
                            </div>
                            <button className="button button--ghost button--mini" onClick={handleCopyHash}>
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy hash'}
                            </button>
                        </div>
                        <div className="modal__body">
                            <QRCodeSVG value={selectedQRHash} size={220} />
                            <p className="hash">{selectedQRHash}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

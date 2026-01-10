import React, { useState, useEffect } from 'react';
import { Plus, List, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
    const [medications, setMedications] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        serialNumber: '',
        gtin: '',
        batchNumber: '',
        expiryDate: '',
    });
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQRHash, setSelectedQRHash] = useState('');

    const fetchMedications = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/medications');
            const data = await response.json();
            setMedications(data);
        } catch (error) {
            console.error('Error fetching medications:', error);
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
        try {
            const response = await fetch('http://localhost:3001/api/medications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                alert('Medication added successfully!');
                setFormData({
                    serialNumber: '',
                    gtin: '',
                    batchNumber: '',
                    expiryDate: '',
                });
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error adding medication:', error);
            alert('An error occurred while adding the medication.');
        }
    };

    const handleShowQR = (qrHash: string) => {
        setSelectedQRHash(qrHash);
        setShowQRModal(true);
    };

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '2rem 0',
    };

    const innerContainerStyle: React.CSSProperties = {
        maxWidth: '64rem',
        margin: '0 auto',
        padding: '2rem',
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: '#fff',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    };

    const tabContainerStyle: React.CSSProperties = {
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
    };

    const tabButtonStyle: React.CSSProperties = {
        flex: 1,
        padding: '1rem 1.5rem',
        textAlign: 'center',
        fontWeight: '600',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        border: 'none',
    };

    const activeTabButtonStyle: React.CSSProperties = {
        color: '#2563eb',
        borderBottom: '2px solid #2563eb',
    };

    const inactiveTabButtonStyle: React.CSSProperties = {
        color: '#6b7280',
    };

    const formGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
    };

    const inputStyle: React.CSSProperties = {
        padding: '0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
    };

    const submitButtonStyle: React.CSSProperties = {
        width: '100%',
        marginTop: '1.5rem',
        backgroundColor: '#2563eb',
        color: '#fff',
        padding: '0.75rem 0',
        borderRadius: '0.375rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    };

    const refreshButtonStyle: React.CSSProperties = {
        marginBottom: '1rem',
        backgroundColor: '#e5e7eb',
        color: '#4b5563',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
    };

    const tableContainerStyle: React.CSSProperties = {
        overflowX: 'auto',
    };

    const tableStyle: React.CSSProperties = {
        minWidth: '100%',
        backgroundColor: '#fff',
    };

    const tableHeaderStyle: React.CSSProperties = {
        backgroundColor: '#f9fafb',
    };

    const thStyle: React.CSSProperties = {
        padding: '0.75rem 1.5rem',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '500',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    const tdStyle: React.CSSProperties = {
        padding: '1rem 1.5rem',
        whiteSpace: 'nowrap',
    };

    const qrButtonStyle: React.CSSProperties = {
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        border: 'none',
    };

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        textAlign: 'center',
    };

    return (
        <div style={containerStyle}>
            <div style={innerContainerStyle}>
                <h1 style={{ fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: '700', textAlign: 'center', marginBottom: '2rem' }}>Pharma Blockchain MVP</h1>
                <div style={cardStyle}>
                    <div style={tabContainerStyle}>
                        <button
                            style={{ ...tabButtonStyle, ...(activeTab === 'add' ? activeTabButtonStyle : inactiveTabButtonStyle) }}
                            onClick={() => setActiveTab('add')}
                        >
                            <Plus style={{ display: 'inline-block', marginRight: '0.5rem' }} size={16} />
                            Add Medication
                        </button>
                        <button
                            style={{ ...tabButtonStyle, ...(activeTab === 'view' ? activeTabButtonStyle : inactiveTabButtonStyle) }}
                            onClick={() => setActiveTab('view')}
                        >
                            <List style={{ display: 'inline-block', marginRight: '0.5rem' }} size={16} />
                            View All
                        </button>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        {activeTab === 'add' && (
                            <form onSubmit={handleSubmit}>
                                <div style={formGridStyle}>
                                    <input
                                        type="text"
                                        name="serialNumber"
                                        placeholder="Serial Number (UID)"
                                        value={formData.serialNumber}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="gtin"
                                        placeholder="GTIN"
                                        value={formData.gtin}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="batchNumber"
                                        placeholder="Batch Number"
                                        value={formData.batchNumber}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                    <input
                                        type="date"
                                        name="expiryDate"
                                        placeholder="Expiry Date"
                                        value={formData.expiryDate}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    style={submitButtonStyle}
                                >
                                    Add to Blockchain
                                </button>
                            </form>
                        )}
                        {activeTab === 'view' && (
                            <div>
                                <button
                                    onClick={fetchMedications}
                                    style={refreshButtonStyle}
                                >
                                    <RefreshCw style={{ display: 'inline-block', marginRight: '0.5rem' }} size={16} />
                                    Refresh
                                </button>
                                <div style={tableContainerStyle}>
                                    <table style={tableStyle}>
                                        <thead style={tableHeaderStyle}>
                                            <tr>
                                                <th style={thStyle}>Serial Number</th>
                                                <th style={thStyle}>GTIN</th>
                                                <th style={thStyle}>Batch Number</th>
                                                <th style={thStyle}>Expiry Date</th>
                                                <th style={thStyle}>QR Code</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            {medications.map((med) => (
                                                <tr key={med.serialNumber} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={tdStyle}>{med.serialNumber}</td>
                                                    <td style={tdStyle}>{med.gtin}</td>
                                                    <td style={tdStyle}>{med.batchNumber}</td>
                                                    <td style={tdStyle}>{med.expiryDate}</td>
                                                    <td style={tdStyle}>
                                                        <button onClick={() => handleShowQR(med.qrHash)} style={qrButtonStyle}>
                                                            Show QR
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showQRModal && (
                <div style={modalOverlayStyle} onClick={() => setShowQRModal(false)}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <QRCodeSVG value={selectedQRHash} size={256} />
                        <p style={{ marginTop: '1rem', wordBreak: 'break-all' }}>{selectedQRHash}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

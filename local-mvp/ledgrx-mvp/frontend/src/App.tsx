import React, { useState, useEffect } from 'react';
import { Plus, List, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
    const [medications, setMedications] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        manufacturer: '',
        dosage: '',
        expiryDate: '',
    });

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
                    id: '',
                    name: '',
                    manufacturer: '',
                    dosage: '',
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

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        backgroundColor: '#f3f4f6', // gray-100
        padding: '2rem 0',
    };

    const innerContainerStyle: React.CSSProperties = {
        maxWidth: '64rem', // max-w-4xl
        margin: '0 auto',
        padding: '2rem',
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: '#fff',
        borderRadius: '0.5rem', // rounded-lg
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // shadow-md
    };

    const tabContainerStyle: React.CSSProperties = {
        display: 'flex',
        borderBottom: '1px solid #e5e7eb', // border-b
    };

    const tabButtonStyle: React.CSSProperties = {
        flex: 1,
        padding: '1rem 1.5rem', // py-4 px-6
        textAlign: 'center',
        fontWeight: '600', // font-semibold
        cursor: 'pointer',
        backgroundColor: 'transparent',
        border: 'none',
    };

    const activeTabButtonStyle: React.CSSProperties = {
        color: '#2563eb', // text-blue-600
        borderBottom: '2px solid #2563eb', // border-b-2 border-blue-600
    };

    const inactiveTabButtonStyle: React.CSSProperties = {
        color: '#6b7280', // text-gray-500
    };

    const formGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem', // gap-6
    };

    const inputStyle: React.CSSProperties = {
        padding: '0.75rem', // p-3
        border: '1px solid #d1d5db', // border
        borderRadius: '0.375rem', // rounded-md
    };

    const submitButtonStyle: React.CSSProperties = {
        width: '100%', // w-full
        marginTop: '1.5rem', // mt-6
        backgroundColor: '#2563eb', // bg-blue-600
        color: '#fff', // text-white
        padding: '0.75rem 0', // py-3
        borderRadius: '0.375rem', // rounded-md
        fontWeight: '600', // font-semibold
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    };

    const refreshButtonStyle: React.CSSProperties = {
        marginBottom: '1rem', // mb-4
        backgroundColor: '#e5e7eb', // bg-gray-200
        color: '#4b5563', // text-gray-700
        padding: '0.5rem 1rem', // py-2 px-4
        borderRadius: '0.375rem', // rounded-md
        fontWeight: '600', // font-semibold
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
        backgroundColor: '#f9fafb', // bg-gray-50
    };

    const thStyle: React.CSSProperties = {
        padding: '0.75rem 1.5rem', // py-3 px-6
        textAlign: 'left',
        fontSize: '0.75rem', // text-xs
        fontWeight: '500', // font-medium
        color: '#6b7280', // text-gray-500
        textTransform: 'uppercase', // uppercase
        letterSpacing: '0.05em', // tracking-wider
    };

    const tdStyle: React.CSSProperties = {
        padding: '1rem 1.5rem', // py-4 px-6
        whiteSpace: 'nowrap',
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
                                        name="id"
                                        placeholder="ID (e.g., MED001)"
                                        value={formData.id}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Name (e.g., Aspirin)"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="manufacturer"
                                        placeholder="Manufacturer (e.g., PharmaCorp)"
                                        value={formData.manufacturer}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="dosage"
                                        placeholder="Dosage (e.g., 500mg)"
                                        value={formData.dosage}
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
                                                <th style={thStyle}>ID</th>
                                                <th style={thStyle}>Name</th>
                                                <th style={thStyle}>Manufacturer</th>
                                                <th style={thStyle}>Dosage</th>
                                                <th style={thStyle}>Expiry Date</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            {medications.map((med) => (
                                                <tr key={med.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={tdStyle}>{med.id}</td>
                                                    <td style={tdStyle}>{med.name}</td>
                                                    <td style={tdStyle}>{med.manufacturer}</td>
                                                    <td style={tdStyle}>{med.dosage}</td>
                                                    <td style={tdStyle}>{med.expiryDate}</td>
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
        </div>
    );
};

export default App;

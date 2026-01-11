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
        if (showQRModal && selectedQRHash === qrHash) {
            setShowQRModal(false);
            return;
        }
        setSelectedQRHash(qrHash);
        setShowQRModal(true);
    };

    return (
        <div>
            <div>
                <h1>Pharma Blockchain MVP</h1>
                <div>
                    <div>
                        <button onClick={() => setActiveTab('add')}>
                            <Plus size={16} />
                            Add Medication
                        </button>
                        <button onClick={() => setActiveTab('view')}>
                            <List size={16} />
                            View All
                        </button>
                    </div>
                    <div>
                        {activeTab === 'add' && (
                            <form onSubmit={handleSubmit}>
                                <div>
                                    <input
                                        type="text"
                                        name="serialNumber"
                                        placeholder="Serial Number (UID)"
                                        value={formData.serialNumber}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="gtin"
                                        placeholder="GTIN"
                                        value={formData.gtin}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="batchNumber"
                                        placeholder="Batch Number"
                                        value={formData.batchNumber}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <input
                                        type="date"
                                        name="expiryDate"
                                        placeholder="Expiry Date"
                                        value={formData.expiryDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <button type="submit">
                                    Add to Blockchain
                                </button>
                            </form>
                        )}
                        {activeTab === 'view' && (
                            <div>
                                <button onClick={fetchMedications}>
                                    <RefreshCw size={16} />
                                    Refresh
                                </button>
                                <div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Serial Number</th>
                                                <th>GTIN</th>
                                                <th>Batch Number</th>
                                                <th>Expiry Date</th>
                                                <th>QR Code</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {medications.map((med) => (
                                                <tr key={med.serialNumber}>
                                                    <td>{med.serialNumber}</td>
                                                    <td>{med.gtin}</td>
                                                    <td>{med.batchNumber}</td>
                                                    <td>{med.expiryDate}</td>
                                                    <td>
                                                        <button onClick={() => handleShowQR(med.qrHash)}>
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
                <div onClick={() => setShowQRModal(false)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <QRCodeSVG value={selectedQRHash} size={256} />
                        <p>{selectedQRHash}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

import React from 'react';
import { Loader2, QrCode } from 'lucide-react';
import { Medication } from '../types';
import DashboardLayout, { DashboardNav } from '../components/DashboardLayout';

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
    canAdd
}) => (
    <DashboardLayout
        userName={userName}
        onAccountClick={onAccountClick}
        activeNav={activeNav}
        onNavSelect={onNavSelect}
        heading="Add medication"
        subheading="Create a new on-chain medication record with a QR payload."
        canAdd={canAdd}
        canReceive={false}
        canArrived={false}
    >
        <section className="dashboard__panel">
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
                    <input
                        type="text"
                        name="productionCompany"
                        placeholder="PharmaCorp"
                        value={formData.productionCompany}
                        onChange={onInputChange}
                        required
                        disabled={!canAdd}
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
        </section>
    </DashboardLayout>
);

export default AddMedicationPage;

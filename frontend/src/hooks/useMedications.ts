import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { DashboardNav } from '../components/DashboardLayout';
import { Medication, Toast, AuditEntry } from '../types';
import type { AuthFetch } from './useAuth';

type UseMedicationsOptions = {
    authFetch: AuthFetch;
    route: string;
    activeTab: DashboardNav;
    setToast: (toast: Toast | null) => void;
};

export const useMedications = ({ authFetch, route, activeTab, setToast }: UseMedicationsOptions) => {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [addError, setAddError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [lookupSerial, setLookupSerial] = useState('');
    const [lookupResult, setLookupResult] = useState<Medication | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupAudit, setLookupAudit] = useState<AuditEntry[]>([]);
    const [formData, setFormData] = useState<Medication>({
        serialNumber: '',
        medicationName: '',
        gtin: '',
        batchNumber: '',
        expiryDate: '',
        productionCompany: '',
        distributionCompany: ''
    });
    const [receiveSerial, setReceiveSerial] = useState('');
    const [receiveLoading, setReceiveLoading] = useState(false);
    const [receiveError, setReceiveError] = useState('');
    const [arrivedSerial, setArrivedSerial] = useState('');
    const [arrivedLoading, setArrivedLoading] = useState(false);
    const [arrivedError, setArrivedError] = useState('');

    const fetchMedications = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await authFetch('/api/medications');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch medications.');
            }
            const data = await response.json();
            setMedications(data);
            setLastUpdated(new Date().toLocaleString());
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setError(message || 'Unable to reach the API.');
        } finally {
            setIsLoading(false);
        }
    }, [authFetch]);

    useEffect(() => {
        if (route === '/app' && activeTab === 'view') {
            fetchMedications();
        }
    }, [route, activeTab, fetchMedications]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setAddError('');
            if (
                !formData.serialNumber ||
                !formData.medicationName ||
                !formData.gtin ||
                !formData.batchNumber ||
                !formData.expiryDate ||
                !formData.productionCompany ||
                !formData.distributionCompany
            ) {
                setAddError('All fields are required.');
                return;
            }
            setIsSubmitting(true);
            try {
                const response = await authFetch('/api/medications', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                if (response.ok) {
                    const data = await response.json().catch(() => ({}));
                    setToast({
                        type: 'success',
                        message: data.qrHash ? 'Medication anchored on-chain.' : 'Medication added.'
                    });
                    setFormData({
                        serialNumber: '',
                        medicationName: '',
                        gtin: '',
                        batchNumber: '',
                        expiryDate: '',
                        productionCompany: '',
                        distributionCompany: ''
                    });
                } else {
                    const errorData = await response.json();
                    const message = errorData.error || 'Upload failed.';
                    setAddError(message);
                    setToast({ type: 'error', message });
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                setAddError(message || 'An error occurred while adding the medication.');
                setToast({ type: 'error', message: message || 'Upload failed.' });
            } finally {
                setIsSubmitting(false);
            }
        },
        [authFetch, formData, setToast]
    );

    const handleLookup = useCallback(async () => {
        if (!lookupSerial.trim()) {
            setLookupError('Enter a serial number to search.');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setLookupResult(null);
        setLookupAudit([]);
        try {
            const response = await authFetch(`/api/medications/${encodeURIComponent(lookupSerial.trim())}`);
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
            const auditResponse = await authFetch(`/api/medications/${encodeURIComponent(lookupSerial.trim())}/audit`);
            if (auditResponse.ok) {
                const auditData = await auditResponse.json().catch(() => ({}));
                setLookupAudit(Array.isArray(auditData.audit) ? auditData.audit : []);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setLookupError(message || 'Lookup failed.');
        } finally {
            setLookupLoading(false);
        }
    }, [authFetch, lookupSerial]);

    const handleMarkReceived = useCallback(async () => {
        if (!receiveSerial.trim()) {
            setReceiveError('Enter a serial number to mark received.');
            return;
        }
        setReceiveLoading(true);
        setReceiveError('');
        try {
            const response = await authFetch(`/api/medications/${encodeURIComponent(receiveSerial.trim())}/received`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to mark received.');
            }
            setToast({ type: 'success', message: 'Medication marked as received.' });
            setReceiveSerial('');
            fetchMedications();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setReceiveError(message || 'Failed to mark received.');
            setToast({ type: 'error', message: message || 'Failed to mark received.' });
        } finally {
            setReceiveLoading(false);
        }
    }, [authFetch, fetchMedications, receiveSerial, setToast]);

    const handleMarkArrived = useCallback(async () => {
        if (!arrivedSerial.trim()) {
            setArrivedError('Enter a serial number to mark arrived.');
            return;
        }
        setArrivedLoading(true);
        setArrivedError('');
        try {
            const response = await authFetch(`/api/medications/${encodeURIComponent(arrivedSerial.trim())}/arrived`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to mark arrived.');
            }
            setToast({ type: 'success', message: 'Medication marked as arrived.' });
            setArrivedSerial('');
            fetchMedications();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setArrivedError(message || 'Failed to mark arrived.');
            setToast({ type: 'error', message: message || 'Failed to mark arrived.' });
        } finally {
            setArrivedLoading(false);
        }
    }, [arrivedSerial, authFetch, fetchMedications, setToast]);

    const filteredMedications = useMemo(() => {
        if (!searchQuery.trim()) return medications;
        const q = searchQuery.trim().toLowerCase();
        return medications.filter((med) => {
            const fields = [
                med.serialNumber,
                med.medicationName,
                med.gtin,
                med.batchNumber,
                med.expiryDate,
                med.productionCompany,
                med.distributionCompany,
                med.qrHash
            ].map((value) => value ?? '');
            return fields.some((value) => value.toLowerCase().includes(q));
        });
    }, [medications, searchQuery]);

    return {
        medications,
        filteredMedications,
        isLoading,
        isSubmitting,
        error,
        addError,
        searchQuery,
        lastUpdated,
        lookupSerial,
        lookupResult,
        lookupError,
        lookupLoading,
        lookupAudit,
        formData,
        receiveSerial,
        receiveLoading,
        receiveError,
        arrivedSerial,
        arrivedLoading,
        arrivedError,
        fetchMedications,
        setSearchQuery,
        setLookupSerial,
        handleInputChange,
        handleSubmit,
        handleLookup,
        setReceiveSerial,
        setArrivedSerial,
        handleMarkReceived,
        handleMarkArrived
    };
};

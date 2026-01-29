import { useCallback, useState } from 'react';
import { Toast } from '../types';

export const useQrModal = (setToast: (toast: Toast | null) => void) => {
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQRHash, setSelectedQRHash] = useState('');
    const [copied, setCopied] = useState(false);

    const handleShowQR = useCallback((qrHash: string) => {
        setShowQRModal((current) => {
            if (current && selectedQRHash === qrHash) {
                return false;
            }
            return true;
        });
        setSelectedQRHash(qrHash);
    }, [selectedQRHash]);

    const closeQrModal = useCallback(() => {
        setShowQRModal(false);
    }, []);

    const handleCopyHash = useCallback(async () => {
        if (!selectedQRHash) return;
        try {
            await navigator.clipboard.writeText(selectedQRHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            setToast({ type: 'error', message: 'Copy failed. Try manually selecting the hash.' });
        }
    }, [selectedQRHash, setToast]);

    return {
        showQRModal,
        selectedQRHash,
        copied,
        handleShowQR,
        handleCopyHash,
        closeQrModal
    };
};

import React, { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

type QrScannerProps = {
    onScan: (value: string) => void;
    onError?: (error: string) => void;
    isActive: boolean;
};

const QR_READER_ID = 'qr-reader';

const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError, isActive }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isRunningRef = useRef(false);
    const lastScanRef = useRef('');

    const stopScanner = useCallback(async () => {
        if (scannerRef.current && isRunningRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (_) {
                // scanner may already be stopped
            }
            isRunningRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (!isActive) {
            stopScanner();
            return;
        }

        const scanner = new Html5Qrcode(QR_READER_ID);
        scannerRef.current = scanner;

        scanner
            .start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    if (decodedText !== lastScanRef.current) {
                        lastScanRef.current = decodedText;
                        onScan(decodedText);
                        setTimeout(() => {
                            lastScanRef.current = '';
                        }, 2000);
                    }
                },
                () => {
                    // QR not found in frame — normal, ignore
                }
            )
            .then(() => {
                isRunningRef.current = true;
            })
            .catch((err: unknown) => {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Camera access denied or unavailable.';
                if (onError) onError(message);
            });

        return () => {
            stopScanner();
        };
    }, [isActive, onScan, onError, stopScanner]);

    return (
        <div className="qr-scanner">
            <div id={QR_READER_ID} className="qr-scanner__viewport" />
            {!isActive && (
                <div className="qr-scanner__placeholder">
                    Camera is paused. Toggle scanning to resume.
                </div>
            )}
        </div>
    );
};

export default QrScanner;

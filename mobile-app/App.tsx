import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';

type Medication = {
  serialNumber: string;
  gtin: string;
  batchNumber: string;
  expiryDate: string;
  qrHash: string;
};

const API_BASE_URL =
  Platform.select({
    ios: 'http://localhost:3001',
    android: 'http://10.0.2.2:3001',
  }) ?? 'http://localhost:3001';

function App() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [medication, setMedication] = useState<Medication | null>(null);
  const [lastScan, setLastScan] = useState('');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const resetScan = useCallback(() => {
    setIsScanning(true);
    setIsLoading(false);
    setErrorMessage('');
    setMedication(null);
    setLastScan('');
  }, []);

  const searchMedication = useCallback(async (qrHash: string) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await fetch(`${API_BASE_URL}/api/medications`);
      if (!response.ok) {
        throw new Error('Failed to fetch medications');
      }
      const data: Medication[] = await response.json();
      const match = data.find((item) => item.qrHash === qrHash);
      if (!match) {
        setErrorMessage('No medication found for this QR code.');
        return;
      }
      setMedication(match);
    } catch (error) {
      setErrorMessage('Failed to query the blockchain API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (!value || !isScanning || value === lastScan) {
        return;
      }
      setIsScanning(false);
      setLastScan(value);
      searchMedication(value);
    },
  });

  const statusLabel = useMemo(() => {
    if (!hasPermission) {
      return 'Camera permission required.';
    }
    if (isLoading) {
      return 'Searching blockchain...';
    }
    if (errorMessage) {
      return errorMessage;
    }
    if (medication) {
      return 'Medication found.';
    }
    return 'Scan a QR code to look up a medication.';
  }, [errorMessage, hasPermission, isLoading, medication]);

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.statusText}>No camera device found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>LedgRX QR Scanner</Text>
      <View style={styles.scannerContainer}>
        {hasPermission ? (
          <Camera
            style={styles.camera}
            device={device}
            isActive={isScanning}
            codeScanner={codeScanner}
          />
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.statusText}>
              Allow camera access to scan QR codes.
            </Text>
            <Button title="Grant Permission" onPress={requestPermission} />
          </View>
        )}
      </View>
      <View style={styles.statusContainer}>
        {isLoading && <ActivityIndicator />}
        <Text style={styles.statusText}>{statusLabel}</Text>
        {medication && (
          <View style={styles.card}>
            <Text>Serial: {medication.serialNumber}</Text>
            <Text>GTIN: {medication.gtin}</Text>
            <Text>Batch: {medication.batchNumber}</Text>
            <Text>Expiry: {medication.expiryDate}</Text>
            <Text>QR Hash: {medication.qrHash}</Text>
          </View>
        )}
        {!isScanning && (
          <View style={styles.buttonRow}>
            <Button title="Scan Again" onPress={resetScan} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  statusText: {
    textAlign: 'center',
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  buttonRow: {
    alignItems: 'center',
  },
});

export default App;

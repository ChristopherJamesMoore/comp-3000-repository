const request = require('supertest');
const crypto = require('crypto');

const { createApp } = require('../server');

describe('server API', () => {
    test('POST /api/medications stores medication with QR hash', async () => {
        const submitTransaction = jest.fn().mockResolvedValue(undefined);
        const contract = { submitTransaction };
        const app = createApp(contract);

        const payload = {
            serialNumber: 'SN-001',
            gtin: '01234567890123',
            batchNumber: 'BATCH-1',
            expiryDate: '2030-01-01',
        };

        const expectedHash = crypto
            .createHash('sha256')
            .update(`${payload.batchNumber}${payload.expiryDate}${payload.serialNumber}`)
            .digest('hex');

        const response = await request(app)
            .post('/api/medications')
            .send(payload)
            .expect(200);

        expect(response.body).toEqual({ message: 'Medication added successfully' });
        expect(submitTransaction).toHaveBeenCalledWith(
            'addMedication',
            payload.serialNumber,
            payload.gtin,
            payload.batchNumber,
            payload.expiryDate,
            expectedHash
        );
    });

    test('GET /api/medications returns parsed ledger data', async () => {
        const medications = [
            { serialNumber: 'SN-001', gtin: '1', batchNumber: 'A', expiryDate: '2030-01-01', qrHash: 'hash' },
        ];
        const evaluateTransaction = jest.fn().mockResolvedValue(Buffer.from(JSON.stringify(medications)));
        const contract = { evaluateTransaction };
        const app = createApp(contract);

        const response = await request(app)
            .get('/api/medications')
            .expect(200);

        expect(response.body).toEqual(medications);
        expect(evaluateTransaction).toHaveBeenCalledWith('getAllMedications');
    });
});

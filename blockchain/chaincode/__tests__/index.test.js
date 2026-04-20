'use strict';

const { PharmaContract } = require('../index');

function makeStub({ state = {} } = {}) {
    const store = new Map(Object.entries(state));

    return {
        store,
        getTxTimestamp: jest.fn(() => ({ seconds: 1_700_000_000, nanos: 123_000_000 })),
        putState: jest.fn(async (key, value) => {
            store.set(key, value);
        }),
        getState: jest.fn(async (key) => store.get(key) || Buffer.alloc(0)),
        getStateByRange: jest.fn(async () => {
            const entries = [...store.entries()];
            let i = 0;
            return {
                next: async () => {
                    if (i >= entries.length) return { done: true };
                    const [key, value] = entries[i++];
                    return { done: false, value: { key, value } };
                },
                close: async () => {},
            };
        }),
    };
}

function makeCtx(stubOpts) {
    return { stub: makeStub(stubOpts) };
}

describe('PharmaContract.addMedication', () => {
    test('writes medication to ledger under the serial number', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();

        const result = await contract.addMedication(
            ctx,
            'SN-1',
            'Paracetamol',
            'GTIN-1',
            'BATCH-1',
            '2030-01-01',
            'ProdCo',
            'DistCo',
            'hash-1',
        );

        expect(ctx.stub.putState).toHaveBeenCalledTimes(1);
        const [key, buf] = ctx.stub.putState.mock.calls[0];
        expect(key).toBe('SN-1');

        const stored = JSON.parse(buf.toString());
        expect(stored).toMatchObject({
            serialNumber: 'SN-1',
            medicationName: 'Paracetamol',
            gtin: 'GTIN-1',
            batchNumber: 'BATCH-1',
            expiryDate: '2030-01-01',
            productionCompany: 'ProdCo',
            qrHash: 'hash-1',
        });
        expect(JSON.parse(result)).toEqual(stored);
    });

    test('derives createdAt from tx timestamp (seconds + nanos)', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();

        await contract.addMedication(ctx, 'SN-2', 'Med', 'G', 'B', 'E', 'P', 'D', 'H');

        const stored = JSON.parse(ctx.stub.putState.mock.calls[0][1].toString());
        // 1_700_000_000s + 123ms -> 2023-11-14T22:13:20.123Z
        expect(stored.createdAt).toBe(new Date(1_700_000_000_123).toISOString());
    });

    test('handles timestamp seconds exposed as a protobuf Long', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();
        ctx.stub.getTxTimestamp.mockReturnValue({
            seconds: { toNumber: () => 1_700_000_000 },
            nanos: 0,
        });

        await contract.addMedication(ctx, 'SN-3', 'M', 'G', 'B', 'E', 'P', 'D', 'H');

        const stored = JSON.parse(ctx.stub.putState.mock.calls[0][1].toString());
        expect(stored.createdAt).toBe(new Date(1_700_000_000_000).toISOString());
    });

    test('does not persist distributionCompany field', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();

        await contract.addMedication(ctx, 'SN-4', 'M', 'G', 'B', 'E', 'P', 'DistCo', 'H');

        const stored = JSON.parse(ctx.stub.putState.mock.calls[0][1].toString());
        expect(stored).not.toHaveProperty('distributionCompany');
    });
});

describe('PharmaContract.getMedication', () => {
    test('returns stored medication JSON when serial exists', async () => {
        const contract = new PharmaContract();
        const med = { serialNumber: 'SN-1', qrHash: 'h' };
        const ctx = makeCtx({ state: { 'SN-1': Buffer.from(JSON.stringify(med)) } });

        const raw = await contract.getMedication(ctx, 'SN-1');

        expect(JSON.parse(raw)).toEqual(med);
    });

    test('throws when serial does not exist', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();

        await expect(contract.getMedication(ctx, 'MISSING')).rejects.toThrow(
            'Medication MISSING does not exist',
        );
    });

    test('throws when stored value is zero-length', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx({ state: { 'SN-1': Buffer.alloc(0) } });

        await expect(contract.getMedication(ctx, 'SN-1')).rejects.toThrow(
            'Medication SN-1 does not exist',
        );
    });
});

describe('PharmaContract.getAllMedications', () => {
    test('returns all medications parsed from the range iterator', async () => {
        const contract = new PharmaContract();
        const a = { serialNumber: 'SN-A' };
        const b = { serialNumber: 'SN-B' };
        const ctx = makeCtx({
            state: {
                'SN-A': Buffer.from(JSON.stringify(a)),
                'SN-B': Buffer.from(JSON.stringify(b)),
            },
        });

        const raw = await contract.getAllMedications(ctx);

        expect(JSON.parse(raw)).toEqual([a, b]);
    });

    test('returns empty array when ledger is empty', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();

        const raw = await contract.getAllMedications(ctx);

        expect(JSON.parse(raw)).toEqual([]);
    });

    test('skips entries that fail to parse instead of throwing', async () => {
        const contract = new PharmaContract();
        const good = { serialNumber: 'SN-OK' };
        const ctx = makeCtx({
            state: {
                'SN-OK': Buffer.from(JSON.stringify(good)),
                'SN-BAD': Buffer.from('not-json'),
            },
        });

        const errSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const raw = await contract.getAllMedications(ctx);
        errSpy.mockRestore();

        expect(JSON.parse(raw)).toEqual([good]);
    });

    test('closes the iterator', async () => {
        const contract = new PharmaContract();
        const ctx = makeCtx();
        const iterator = {
            next: jest.fn().mockResolvedValue({ done: true }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        ctx.stub.getStateByRange.mockResolvedValue(iterator);

        await contract.getAllMedications(ctx);

        expect(iterator.close).toHaveBeenCalledTimes(1);
    });
});

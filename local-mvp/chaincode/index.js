'use strict';
const { Contract } = require('fabric-contract-api');

class MyContract extends Contract {

    async initLedger(ctx) {
        console.info('Ledger initialized');
    }

    async addMedication(
        ctx,
        serialNumber,
        gtin,
        batchNumber,
        expiryDate,
        manufacturer,
        productName,
        dosage
    ) {
        const exists = await this.getMedication(ctx, serialNumber).catch(() => false);
        if (exists && exists.length > 0) {
            throw new Error(`Medication with serial number ${serialNumber} already exists`);
        }

        const medication = {
            serialNumber,
            gtin,
            batchNumber,
            expiryDate,
            manufacturer,
            productName,
            dosage,
            createdAt: new Date().toISOString()
        };

        await ctx.stub.putState(serialNumber, Buffer.from(JSON.stringify(medication)));
        return JSON.stringify(medication);
    }

    async getMedication (ctx, serialNumber) {

        const data = await ctx.stub.getState (serialNumber);
        if (!data || data.length === 0) {

            throw new Error (`Medication with serial number ${serialNumber} does not exist`);
        }
        return data.toString();
    }

    async getAllMedications (ctx) {
        const iterator = await ctx.stub.getStateByRange('', '');
        const all = [];

        let result = await iterator.next();
        while (!result.done) {
            const strValue = result.value.value.toString ('utf8');
            try {
                all.push(JSON.parse(strValue));
            } catch (e) {}
            result = await iterator.next();
        }

        return JSON.stringify(all);
    }
}

module.exports = MyContract;
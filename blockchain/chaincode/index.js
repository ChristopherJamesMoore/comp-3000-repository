'use strict';

const { Contract } = require('fabric-contract-api');

class PharmaContract extends Contract {
    async initLedger(ctx) {
        console.log('Ledger initialized');
    }

    async addMedication(ctx, serialNumber, gtin, batchNumber, expiryDate, qrHash) {
        const medication = {
            serialNumber,
            gtin,
            batchNumber,
            expiryDate,
            qrHash,
            createdAt: new Date().toISOString()
        };
        await ctx.stub.putState(serialNumber, Buffer.from(JSON.stringify(medication)));
        return JSON.stringify(medication);
    }

    async getMedication(ctx, serialNumber) {
        const bytes = await ctx.stub.getState(serialNumber);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Medication ${serialNumber} does not exist`);
        }
        return bytes.toString();
    }

    async getAllMedications(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                allResults.push(JSON.parse(strValue));
            } catch (err) {
                console.log(err);
            }
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(allResults);
    }
}

module.exports.PharmaContract = PharmaContract;
module.exports.contracts = [ PharmaContract ];
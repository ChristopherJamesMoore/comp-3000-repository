'use strict';

const { Contract } = require('fabric-contract-api');

class PharmaContract extends Contract {
    async initLedger(ctx) {
        console.log('Ledger initialized');
    }

    async addMedication(ctx, id, name, manufacturer, dosage, expiryDate) {
        const medication = {
            id, name, manufacturer, dosage, expiryDate,
            createdAt: new Date().toISOString()
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(medication)));
        return JSON.stringify(medication);
    }

    async getMedication(ctx, id) {
        const bytes = await ctx.stub.getState(id);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Medication ${id} does not exist`);
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
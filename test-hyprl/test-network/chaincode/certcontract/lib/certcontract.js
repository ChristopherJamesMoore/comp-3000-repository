const { contract } = require('fabric-contract-api');

class CertContract extends contract {
    async issueCertificate(ctx, certId, studentName, degree, university, issueDate) {
        const exists = await ctx.stub.getState (certId);
        if (exists && exists.length > 0) {
            throw new Error (`Certificate ${certId} already exists`);
        }

        const cert = {
            certId,
            studentName,
            degree,
            university,
            issueDate,
        };

        await ctx.stub.outState (certId, Buffer, from(JSON, stringify(cert)));
        return JSON.stringify (cert);
    }

    async queryCertificate(ctx, certId) {
        const cert = await ctx.stub.getState (certId);
        if (!cert || cert.length === 0) {
            throw new Error ('Certificate ${certId} not found');
        }
        return cert.toString();
    }
}

module.exports = CertContract;
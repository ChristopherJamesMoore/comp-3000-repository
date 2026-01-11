const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const port = 3001;

const createApp = (contract) => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // API endpoint to add a medication
    app.post('/api/medications', async (req, res) => {
        try {
            const { gtin, batchNumber, expiryDate, serialNumber } = req.body;
            const qrHashSource = `${batchNumber}${expiryDate}${serialNumber}`;
            const qrHash = crypto.createHash('sha256').update(qrHashSource).digest('hex');

            await contract.submitTransaction('addMedication', serialNumber, gtin, batchNumber, expiryDate, qrHash);
            res.json({ message: 'Medication added successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // API endpoint to get all medications
    app.get('/api/medications', async (req, res) => {
        try {
            const result = await contract.evaluateTransaction('getAllMedications');
            res.json(JSON.parse(result.toString()));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return app;
};

async function createContract() {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const isDocker = fs.existsSync('/.dockerenv') || process.env.IN_DOCKER === 'true';

    if (isDocker) {
        if (ccp.certificateAuthorities?.['ca.org1.example.com']) {
            ccp.certificateAuthorities['ca.org1.example.com'].url = 'https://ca_org1:7054';
        }
        if (ccp.peers?.['peer0.org1.example.com']) {
            ccp.peers['peer0.org1.example.com'].url = 'grpcs://peer0.org1.example.com:7051';
        }
    }

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
        throw new Error('An identity for the user "appUser" does not exist in the wallet');
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: !isDocker } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    return network.getContract('pharma');
}

async function main() {
    try {
        const contract = await createContract();
        const app = createApp(contract);
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error(`Failed to start the server: ${error}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createApp, createContract };

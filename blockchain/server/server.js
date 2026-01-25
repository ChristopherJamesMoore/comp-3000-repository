const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs');

const getEnv = (name, fallback = undefined) => {
    const value = process.env[name];
    if (value === undefined || value === '') return fallback;
    return value;
};

const requireEnv = (name) => {
    const value = getEnv(name);
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const parseAllowedOrigins = () => {
    const raw = getEnv('CORS_ORIGIN', '');
    const origins = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const devOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ];
    return Array.from(new Set([...origins, ...devOrigins]));
};

const corsOptions = () => {
    const allowedOrigins = parseAllowedOrigins();
    return {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        }
    };
};

const normalizeEndpoint = (endpoint) => {
    if (!endpoint) return '';
    try {
        const url = new URL(endpoint);
        return url.host;
    } catch (error) {
        return endpoint;
    }
};

const readFileOrThrow = (filePath) => {
    if (!filePath) throw new Error('File path not provided');
    return fs.readFileSync(filePath);
};

const createApp = (contract) => {
    const app = express();
    app.use(cors(corsOptions()));
    app.use(express.json());

    // API endpoint to add a medication
    app.post('/api/medications', async (req, res) => {
        try {
            const { gtin, batchNumber, expiryDate, serialNumber } = req.body;
            if (!gtin || !batchNumber || !expiryDate || !serialNumber) {
                return res.status(400).json({ error: 'Missing required fields.' });
            }
            const qrHashSource = `${batchNumber}${expiryDate}${serialNumber}`;
            const qrHash = crypto.createHash('sha256').update(qrHashSource).digest('hex');

            await contract.submitTransaction('addMedication', serialNumber, gtin, batchNumber, expiryDate, qrHash);
            res.status(201).json({
                id: serialNumber,
                qrHash
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    // API endpoint to get all medications
    app.get('/api/medications', async (req, res) => {
        try {
            const result = await contract.evaluateTransaction('getAllMedications');
            res.json(JSON.parse(result.toString()));
        } catch (error) {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    // API endpoint to get medication by serial number
    app.get('/api/medications/:id', async (req, res) => {
        try {
            const serialNumber = req.params.id;
            if (!serialNumber) {
                return res.status(400).json({ error: 'Medication id is required.' });
            }
            const result = await contract.evaluateTransaction('getMedication', serialNumber);
            res.json(JSON.parse(result.toString()));
        } catch (error) {
            const message = error.message || 'Internal server error';
            if (message.includes('does not exist')) {
                return res.status(404).json({ error: message });
            }
            res.status(500).json({ error: message });
        }
    });

    app.get('/api/health', (req, res) => {
        res.json({ ok: true });
    });

    app.use((err, req, res, next) => {
        if (err && err.message === 'Not allowed by CORS') {
            return res.status(403).json({ error: 'CORS origin denied' });
        }
        return next(err);
    });

    return app;
};

async function createContract() {
    const connectionProfilePath = requireEnv('FABRIC_CONNECTION_PROFILE');
    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

    const peerEndpoint =
        normalizeEndpoint(getEnv('FABRIC_PEER_ENDPOINT')) ||
        normalizeEndpoint(
            Object.values(connectionProfile.peers || {})[0]?.url || ''
        );

    if (!peerEndpoint) {
        throw new Error('Unable to resolve Fabric peer endpoint.');
    }

    const tlsCertPath = getEnv('FABRIC_TLS_CERT_PATH');
    const tlsCertPem = tlsCertPath
        ? readFileOrThrow(tlsCertPath)
        : Buffer.from(Object.values(connectionProfile.peers || {})[0]?.tlsCACerts?.pem || '', 'utf8');

    if (!tlsCertPem || tlsCertPem.length === 0) {
        throw new Error('Unable to resolve Fabric TLS CA cert.');
    }

    const identityCertPath = requireEnv('FABRIC_ID_CERT_PATH');
    const identityKeyPath = requireEnv('FABRIC_ID_KEY_PATH');

    const identity = {
        mspId: requireEnv('FABRIC_MSPID'),
        credentials: readFileOrThrow(identityCertPath)
    };

    const privateKeyPem = readFileOrThrow(identityKeyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer = signers.newPrivateKeySigner(privateKey);

    const client = new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsCertPem));
    const gateway = connect({
        client,
        identity,
        signer
    });

    const channelName = requireEnv('FABRIC_CHANNEL');
    const chaincodeName = requireEnv('FABRIC_CHAINCODE');
    const network = gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}

async function main() {
    try {
        const contract = await createContract();
        const app = createApp(contract);
        const port = parseInt(getEnv('PORT', '3001'), 10);
        app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
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

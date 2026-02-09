const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

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

const parseChaincodeJson = (buffer) => {
    const raw = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer ?? '');
    const cleaned = raw.replace(/\u0000/g, '').trim();
    if (/^\d+(,\d+)+$/.test(cleaned)) {
        const bytes = cleaned.split(',').map((value) => Number(value));
        const decoded = Buffer.from(bytes).toString('utf8').trim();
        return JSON.parse(decoded);
    }
    return JSON.parse(cleaned);
};

const getAuthUsersFile = () => getEnv('AUTH_USERS_FILE', '');

const readUsersFromFile = () => {
    const filePath = getAuthUsersFile();
    if (!filePath) return [];
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error('AUTH_USERS_FILE must contain valid JSON');
    }
    if (!Array.isArray(parsed)) {
        throw new Error('AUTH_USERS_FILE must contain a JSON array');
    }
    return parsed;
};

const readUsersFromEnv = () => {
    const raw = getEnv('AUTH_USERS');
    if (!raw) return [];
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error('AUTH_USERS must be valid JSON');
    }
    if (!Array.isArray(parsed)) {
        throw new Error('AUTH_USERS must be a JSON array');
    }
    return parsed;
};

const loadAuthUsers = ({ allowEmpty = false } = {}) => {
    const envUsers = readUsersFromEnv();
    const fileUsers = readUsersFromFile();
    const users = [...envUsers, ...fileUsers];
    if (!allowEmpty && users.length === 0) {
        throw new Error('No auth users configured');
    }
    return users;
};

const verifyPassword = async (user, password) => {
    if (user.passwordHash) {
        return bcrypt.compare(password, user.passwordHash);
    }
    if (user.password) {
        return user.password === password;
    }
    return false;
};

const createToken = (payload) => {
    const secret = requireEnv('AUTH_JWT_SECRET');
    return jwt.sign(payload, secret, { expiresIn: '8h' });
};

const getMongoUri = () => getEnv('MONGODB_URI', '');
const getAdminUsernames = () =>
    (getEnv('ADMIN_USERNAMES', '') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

const isAdminUser = (username) => {
    if (!username) return false;
    return getAdminUsernames().includes(username);
};

const createAuthMiddleware = (db) => async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authentication token.' });
    }
    const token = header.slice('Bearer '.length);
    try {
        const secret = requireEnv('AUTH_JWT_SECRET');
        const payload = jwt.verify(token, secret);
        if (db) {
            const blacklist = db.collection('token_blacklist');
            const match = await blacklist.findOne({ jti: payload.jti });
            if (match) {
                return res.status(401).json({ error: 'Token has been revoked.' });
            }
        }
        req.user = payload;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const requireAdmin = (db) => async (req, res, next) => {
    const username = req.user?.sub;
    if (!username) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
        if (db) {
            const users = db.collection('users');
            const user = await users.findOne({ username });
            if (!user || !(user.isAdmin || isAdminUser(username))) {
                return res.status(403).json({ error: 'Admin access required.' });
            }
            return next();
        }
    if (!isAdminUser(username)) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    return next();
};

const createApp = (contract, db) => {
    const app = express();
    app.use(cors(corsOptions()));
    app.use(express.json());

    const usersCollection = db ? db.collection('users') : null;
    const blacklistCollection = db ? db.collection('token_blacklist') : null;
    const authMiddleware = createAuthMiddleware(db);

    app.get('/api/health', (req, res) => {
        res.json({ ok: true });
    });

    app.get('/api/auth/me', authMiddleware, async (req, res) => {
        try {
            const username = req.user?.sub;
            if (!username) {
                return res.status(401).json({ error: 'Invalid token.' });
            }
            if (usersCollection) {
                const user = await usersCollection.findOne({ username });
                if (!user) {
                    return res.status(404).json({ error: 'User not found.' });
                }
                return res.json({
                    username: user.username,
                    companyType: user.companyType || '',
                    companyName: user.companyName || '',
                    isAdmin: !!user.isAdmin || isAdminUser(username)
                });
            }
            return res.json({ username, isAdmin: isAdminUser(username) });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load profile.' });
        }
    });

    app.post('/api/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required.' });
            }
            let user = null;
            if (usersCollection) {
                user = await usersCollection.findOne({ username });
            } else {
                const users = loadAuthUsers({ allowEmpty: true });
                if (users.length === 0) {
                    return res.status(503).json({ error: 'No users configured.' });
                }
                user = users.find((entry) => entry.username === username) || null;
            }
            if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
            const ok = await verifyPassword(user, password);
            if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
            const token = createToken({ sub: username, jti: crypto.randomUUID() });
            return res.json({
                token,
                user: {
                    username,
                    companyType: user.companyType || '',
                    companyName: user.companyName || '',
                    isAdmin: !!user.isAdmin || isAdminUser(username)
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Authentication failed.' });
        }
    });

    app.post('/api/auth/signup', async (req, res) => {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required.' });
            }
            if (username.length < 3) {
                return res.status(400).json({ error: 'Username must be at least 3 characters.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }
            if (usersCollection) {
                const existing = await usersCollection.findOne({ username });
                if (existing) return res.status(409).json({ error: 'Username already exists.' });
                const passwordHash = await bcrypt.hash(password, 10);
                await usersCollection.insertOne({
                    username,
                    passwordHash,
                    companyType: '',
                    companyName: '',
                    createdAt: new Date(),
                    isAdmin: isAdminUser(username)
                });
            } else {
                const usersFile = getAuthUsersFile();
                if (!usersFile) {
                    return res.status(500).json({ error: 'Signup is disabled. AUTH_USERS_FILE not configured.' });
                }
                const envUsers = readUsersFromEnv();
                const fileUsers = readUsersFromFile();
                const existing = [...envUsers, ...fileUsers].find((entry) => entry.username === username);
                if (existing) {
                    return res.status(409).json({ error: 'Username already exists.' });
                }
                const passwordHash = await bcrypt.hash(password, 10);
                const updatedUsers = [...fileUsers, { username, passwordHash }];
                fs.mkdirSync(path.dirname(usersFile), { recursive: true });
                fs.writeFileSync(usersFile, JSON.stringify(updatedUsers, null, 2));
            }
            const token = createToken({ sub: username, jti: crypto.randomUUID() });
            return res
                .status(201)
                .json({ token, user: { username, companyType: '', companyName: '', isAdmin: isAdminUser(username) } });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Signup failed.' });
        }
    });

    app.post('/api/auth/profile', authMiddleware, async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Profile updates require MONGODB_URI.' });
            }
            const username = req.user?.sub;
            if (!username) {
                return res.status(401).json({ error: 'Invalid token.' });
            }
            const { companyType, companyName } = req.body;
            if (!companyType || !companyName) {
                return res.status(400).json({ error: 'Company type and name are required.' });
            }
            const normalizedType = String(companyType).trim().toLowerCase();
            if (!['production', 'distribution'].includes(normalizedType)) {
                return res.status(400).json({ error: 'Company type must be production or distribution.' });
            }
            const normalizedName = String(companyName).trim();
            if (normalizedName.length < 2) {
                return res.status(400).json({ error: 'Company name is too short.' });
            }
            const result = await usersCollection.findOneAndUpdate(
                { username },
                { $set: { companyType: normalizedType, companyName: normalizedName } },
                { returnDocument: 'after' }
            );
            if (!result.value) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({
                username: result.value.username,
                companyType: result.value.companyType || '',
                companyName: result.value.companyName || ''
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update profile.' });
        }
    });

    app.post('/api/auth/logout', authMiddleware, async (req, res) => {
        try {
            if (!blacklistCollection) {
                return res.json({ ok: true });
            }
            const { jti, exp } = req.user || {};
            if (!jti || !exp) {
                return res.status(400).json({ error: 'Invalid token.' });
            }
            const expiresAt = new Date(exp * 1000);
            await blacklistCollection.insertOne({ jti, expiresAt });
            await blacklistCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Logout failed.' });
        }
    });

    app.get('/api/admin/users', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User listing requires MONGODB_URI.' });
            }
            const users = await usersCollection
                .find({}, { projection: { _id: 0, username: 1, companyType: 1, companyName: 1, createdAt: 1 } })
                .toArray();
            return res.json({ users });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load users.' });
        }
    });

    app.use('/api/medications', authMiddleware);

    app.post('/api/medications', async (req, res) => {
        try {
            const {
                gtin,
                batchNumber,
                expiryDate,
                serialNumber,
                medicationName,
                productionCompany,
                distributionCompany
            } = req.body;
            if (
                !gtin ||
                !batchNumber ||
                !expiryDate ||
                !serialNumber ||
                !medicationName ||
                !productionCompany ||
                !distributionCompany
            ) {
                return res.status(400).json({ error: 'Missing required fields.' });
            }
            const qrHashSource = `${batchNumber}${expiryDate}${serialNumber}`;
            const qrHash = crypto.createHash('sha256').update(qrHashSource).digest('hex');

            await contract.submitTransaction(
                'addMedication',
                serialNumber,
                medicationName,
                gtin,
                batchNumber,
                expiryDate,
                productionCompany,
                distributionCompany,
                qrHash
            );
            res.status(201).json({
                id: serialNumber,
                qrHash
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.get('/api/medications', async (req, res) => {
        try {
            const result = await contract.evaluateTransaction('getAllMedications');
            res.json(parseChaincodeJson(result));
        } catch (error) {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.get('/api/medications/:id', async (req, res) => {
        try {
            const serialNumber = req.params.id;
            if (!serialNumber) {
                return res.status(400).json({ error: 'Medication id is required.' });
            }
            const result = await contract.evaluateTransaction('getMedication', serialNumber);
            res.json(parseChaincodeJson(result));
        } catch (error) {
            const message = error.message || 'Internal server error';
            if (message.includes('does not exist')) {
                return res.status(404).json({ error: message });
            }
            res.status(500).json({ error: message });
        }
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
        let db = null;
        const mongoUri = getMongoUri();
        if (mongoUri) {
            const client = new MongoClient(mongoUri);
            await client.connect();
            db = client.db();
        }
        const app = createApp(contract, db);
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

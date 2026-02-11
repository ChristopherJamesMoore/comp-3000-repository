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

const getCompanyRole = (user) => {
    const role = String(user?.companyType || '').trim().toLowerCase();
    return role;
};

const getUserApprovalStatus = (user) => {
    if (!user) return 'pending';
    return user.approvalStatus || 'approved';
};

const buildAuditEntry = (serialNumber, action, user) => ({
    serialNumber,
    action,
    createdAt: new Date(),
    actorUsername: user?.username || '',
    actorCompanyType: user?.companyType || '',
    actorCompanyName: user?.companyName || ''
});

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

const requireApproved = (db) => async (req, res, next) => {
    const username = req.user?.sub;
    if (!username) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
    if (isAdminUser(username)) return next();
    if (db) {
        const users = db.collection('users');
        const user = await users.findOne({ username });
        if (user?.isAdmin) return next();
        const status = getUserApprovalStatus(user);
        if (status !== 'approved') {
            return res.status(403).json({ error: 'Your account is pending approval.' });
        }
    }
    return next();
};

const loadUserForRequest = async (db, req) => {
    if (!db) return null;
    const username = req.user?.sub;
    if (!username) return null;
    const users = db.collection('users');
    const existing = await users.findOne({ username });
    if (existing) return existing;
    const admin = isAdminUser(username);
    const newUser = {
        username,
        companyType: '',
        companyName: '',
        createdAt: new Date(),
        isAdmin: admin,
        approvalStatus: admin ? 'approved' : 'pending',
        registrationNumber: '',
        approvedBy: null,
        approvedAt: null
    };
    await users.insertOne(newUser);
    return newUser;
};

const ensureStatus = async (statusCollection, serialNumber) => {
    const existing = await statusCollection.findOne({ serialNumber });
    if (existing) return existing;
    const now = new Date();
    const seeded = {
        serialNumber,
        status: 'manufactured',
        updatedAt: now,
        updatedBy: 'system',
        updatedByCompanyType: '',
        updatedByCompanyName: ''
    };
    await statusCollection.insertOne(seeded);
    return seeded;
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
                let user = await usersCollection.findOne({ username });
                if (!user) {
                    user = await loadUserForRequest(db, req);
                }
                if (!user) {
                    return res.status(404).json({ error: 'User not found.' });
                }
                return res.json({
                    username: user.username,
                    companyType: user.companyType || '',
                    companyName: user.companyName || '',
                    isAdmin: !!user.isAdmin || isAdminUser(username),
                    approvalStatus: getUserApprovalStatus(user),
                    registrationNumber: user.registrationNumber || ''
                });
            }
            return res.json({ username, isAdmin: isAdminUser(username), approvalStatus: 'approved' });
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
                    isAdmin: !!user.isAdmin || isAdminUser(username),
                    approvalStatus: getUserApprovalStatus(user),
                    registrationNumber: user.registrationNumber || ''
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
                const admin = isAdminUser(username);
                await usersCollection.insertOne({
                    username,
                    passwordHash,
                    companyType: '',
                    companyName: '',
                    createdAt: new Date(),
                    isAdmin: admin,
                    approvalStatus: admin ? 'approved' : 'pending',
                    registrationNumber: '',
                    approvedBy: null,
                    approvedAt: null
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
            const signupAdmin = isAdminUser(username);
            return res
                .status(201)
                .json({ token, user: { username, companyType: '', companyName: '', isAdmin: signupAdmin, approvalStatus: signupAdmin ? 'approved' : 'pending', registrationNumber: '' } });
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
            const { companyType, companyName, registrationNumber } = req.body;
            if (!companyType || !companyName) {
                return res.status(400).json({ error: 'Company type and name are required.' });
            }
            const normalizedType = String(companyType).trim().toLowerCase();
            if (!['production', 'distribution', 'pharmacy', 'clinic'].includes(normalizedType)) {
                return res.status(400).json({ error: 'Company type must be production, distribution, pharmacy, or clinic.' });
            }
            const normalizedName = String(companyName).trim();
            if (normalizedName.length < 2) {
                return res.status(400).json({ error: 'Company name is too short.' });
            }
            const existing = await usersCollection.findOne({ username });
            if (existing) {
                if ((existing.companyType && existing.companyType.trim()) || (existing.companyName && existing.companyName.trim())) {
                    return res.status(409).json({ error: 'Profile is locked once set. Contact an admin for changes.' });
                }
                const normalizedRegNum = String(registrationNumber || '').trim();
                const result = await usersCollection.findOneAndUpdate(
                    { username },
                    { $set: { companyType: normalizedType, companyName: normalizedName, registrationNumber: normalizedRegNum } },
                    { returnDocument: 'after' }
                );
                if (!result) {
                    return res.status(404).json({ error: 'User not found.' });
                }
                return res.json({
                    username: result.username,
                    companyType: result.companyType || '',
                    companyName: result.companyName || '',
                    isAdmin: !!result.isAdmin || isAdminUser(username),
                    approvalStatus: getUserApprovalStatus(result),
                    registrationNumber: result.registrationNumber || ''
                });
            }
            const profileAdmin = isAdminUser(username);
            const normalizedRegNum = String(registrationNumber || '').trim();
            await usersCollection.insertOne({
                username,
                companyType: normalizedType,
                companyName: normalizedName,
                registrationNumber: normalizedRegNum,
                createdAt: new Date(),
                isAdmin: profileAdmin,
                approvalStatus: profileAdmin ? 'approved' : 'pending',
                approvedBy: null,
                approvedAt: null
            });
            return res.json({
                username,
                companyType: normalizedType,
                companyName: normalizedName,
                isAdmin: profileAdmin,
                approvalStatus: profileAdmin ? 'approved' : 'pending',
                registrationNumber: normalizedRegNum
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
                .find({}, { projection: { _id: 0, username: 1, companyType: 1, companyName: 1, createdAt: 1, approvalStatus: 1, registrationNumber: 1, isAdmin: 1, approvedBy: 1, approvedAt: 1 } })
                .toArray();
            return res.json({ users });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load users.' });
        }
    });

    app.post('/api/admin/users/:username/approve', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User management requires MONGODB_URI.' });
            }
            const targetUsername = req.params.username;
            const result = await usersCollection.findOneAndUpdate(
                { username: targetUsername },
                { $set: { approvalStatus: 'approved', approvedBy: req.user.sub, approvedAt: new Date() } },
                { returnDocument: 'after' }
            );
            if (!result) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({ ok: true, user: { username: result.username, approvalStatus: result.approvalStatus } });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to approve user.' });
        }
    });

    app.post('/api/admin/users/:username/reject', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User management requires MONGODB_URI.' });
            }
            const targetUsername = req.params.username;
            const result = await usersCollection.findOneAndUpdate(
                { username: targetUsername },
                { $set: { approvalStatus: 'rejected', approvedBy: req.user.sub, approvedAt: new Date() } },
                { returnDocument: 'after' }
            );
            if (!result) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({ ok: true, user: { username: result.username, approvalStatus: result.approvalStatus } });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reject user.' });
        }
    });

    app.use('/api/medications', authMiddleware);
    app.use('/api/medications', requireApproved(db));

    app.post('/api/medications/batch/received', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) {
                return res.status(401).json({ error: 'Invalid user.' });
            }
            const role = getCompanyRole(user);
            if (!role) {
                return res.status(403).json({ error: 'Set your company profile before updating status.' });
            }
            if (role !== 'distribution') {
                return res.status(403).json({ error: 'Only distribution companies can mark received.' });
            }
            const { serialNumbers } = req.body;
            if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
                return res.status(400).json({ error: 'serialNumbers must be a non-empty array.' });
            }
            if (serialNumbers.length > 500) {
                return res.status(400).json({ error: 'Maximum 500 serial numbers per batch.' });
            }
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const succeeded = [];
            const failed = [];
            for (const serial of serialNumbers) {
                try {
                    const trimmed = String(serial).trim();
                    if (!trimmed) {
                        failed.push({ serialNumber: serial, error: 'Empty serial number.' });
                        continue;
                    }
                    const current = await ensureStatus(statusCollection, trimmed);
                    if (current.status !== 'manufactured') {
                        failed.push({ serialNumber: trimmed, error: `Cannot mark received from status '${current.status}'.` });
                        continue;
                    }
                    const now = new Date();
                    await statusCollection.updateOne(
                        { serialNumber: trimmed },
                        {
                            $set: {
                                status: 'received',
                                updatedAt: now,
                                updatedBy: user.username,
                                updatedByCompanyType: user.companyType || '',
                                updatedByCompanyName: user.companyName || ''
                            }
                        }
                    );
                    await auditCollection.insertOne(buildAuditEntry(trimmed, 'received', user));
                    succeeded.push({ serialNumber: trimmed, status: 'received' });
                } catch (err) {
                    failed.push({ serialNumber: String(serial), error: err.message || 'Unknown error.' });
                }
            }
            return res.json({ ok: true, processed: serialNumbers.length, succeeded, failed });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.post('/api/medications/batch/arrived', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) {
                return res.status(401).json({ error: 'Invalid user.' });
            }
            const role = getCompanyRole(user);
            if (!role) {
                return res.status(403).json({ error: 'Set your company profile before updating status.' });
            }
            if (!['pharmacy', 'clinic'].includes(role)) {
                return res.status(403).json({ error: 'Only pharmacies or clinics can mark arrived.' });
            }
            const { serialNumbers } = req.body;
            if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
                return res.status(400).json({ error: 'serialNumbers must be a non-empty array.' });
            }
            if (serialNumbers.length > 500) {
                return res.status(400).json({ error: 'Maximum 500 serial numbers per batch.' });
            }
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const succeeded = [];
            const failed = [];
            for (const serial of serialNumbers) {
                try {
                    const trimmed = String(serial).trim();
                    if (!trimmed) {
                        failed.push({ serialNumber: serial, error: 'Empty serial number.' });
                        continue;
                    }
                    const current = await ensureStatus(statusCollection, trimmed);
                    if (current.status !== 'received') {
                        failed.push({ serialNumber: trimmed, error: `Cannot mark arrived from status '${current.status}'.` });
                        continue;
                    }
                    const now = new Date();
                    await statusCollection.updateOne(
                        { serialNumber: trimmed },
                        {
                            $set: {
                                status: 'arrived',
                                updatedAt: now,
                                updatedBy: user.username,
                                updatedByCompanyType: user.companyType || '',
                                updatedByCompanyName: user.companyName || ''
                            }
                        }
                    );
                    await auditCollection.insertOne(buildAuditEntry(trimmed, 'arrived', user));
                    succeeded.push({ serialNumber: trimmed, status: 'arrived' });
                } catch (err) {
                    failed.push({ serialNumber: String(serial), error: err.message || 'Unknown error.' });
                }
            }
            return res.json({ ok: true, processed: serialNumbers.length, succeeded, failed });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.get('/api/medications/by-hash/:hash', async (req, res) => {
        try {
            const hash = req.params.hash;
            if (!hash || hash.length !== 64) {
                return res.status(400).json({ error: 'Invalid hash format.' });
            }
            const result = await contract.evaluateTransaction('getAllMedications');
            const medications = parseChaincodeJson(result);
            const match = medications.find((med) => med.qrHash === hash);
            if (!match) {
                return res.status(404).json({ error: 'No medication found for this QR hash.' });
            }
            if (usersCollection) {
                const statusCollection = db.collection('medication_status');
                const status = await statusCollection.findOne({ serialNumber: match.serialNumber });
                if (status) {
                    match.status = status.status;
                    match.statusUpdatedAt = status.updatedAt;
                    match.statusUpdatedBy = status.updatedBy;
                }
            }
            return res.json(match);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.post('/api/medications', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) {
                return res.status(401).json({ error: 'Invalid user.' });
            }
            const role = getCompanyRole(user);
            if (!role) {
                return res.status(403).json({ error: 'Set your company profile before adding medications.' });
            }
            if (role !== 'production') {
                return res.status(403).json({ error: 'Only production companies can add medications.' });
            }
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
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const now = new Date();
            await statusCollection.updateOne(
                { serialNumber },
                {
                    $set: {
                        serialNumber,
                        status: 'manufactured',
                        updatedAt: now,
                        updatedBy: user.username,
                        updatedByCompanyType: user.companyType || '',
                        updatedByCompanyName: user.companyName || ''
                    }
                },
                { upsert: true }
            );
            await auditCollection.insertOne(buildAuditEntry(serialNumber, 'manufactured', user));
            res.status(201).json({
                id: serialNumber,
                qrHash
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.post('/api/medications/:id/received', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) {
                return res.status(401).json({ error: 'Invalid user.' });
            }
            const role = getCompanyRole(user);
            if (!role) {
                return res.status(403).json({ error: 'Set your company profile before updating status.' });
            }
            if (role !== 'distribution') {
                return res.status(403).json({ error: 'Only distribution companies can mark received.' });
            }
            const serialNumber = req.params.id;
            if (!serialNumber) {
                return res.status(400).json({ error: 'Medication id is required.' });
            }
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const current = await ensureStatus(statusCollection, serialNumber);
            if (current.status !== 'manufactured') {
                return res.status(409).json({ error: `Cannot mark received from status '${current.status}'.` });
            }
            const now = new Date();
            await statusCollection.updateOne(
                { serialNumber },
                {
                    $set: {
                        status: 'received',
                        updatedAt: now,
                        updatedBy: user.username,
                        updatedByCompanyType: user.companyType || '',
                        updatedByCompanyName: user.companyName || ''
                    }
                }
            );
            await auditCollection.insertOne(buildAuditEntry(serialNumber, 'received', user));
            return res.json({ ok: true, status: 'received' });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.post('/api/medications/:id/arrived', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) {
                return res.status(401).json({ error: 'Invalid user.' });
            }
            const role = getCompanyRole(user);
            if (!role) {
                return res.status(403).json({ error: 'Set your company profile before updating status.' });
            }
            if (!['pharmacy', 'clinic'].includes(role)) {
                return res.status(403).json({ error: 'Only pharmacies or clinics can mark arrived.' });
            }
            const serialNumber = req.params.id;
            if (!serialNumber) {
                return res.status(400).json({ error: 'Medication id is required.' });
            }
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const current = await ensureStatus(statusCollection, serialNumber);
            if (current.status !== 'received') {
                return res.status(409).json({ error: `Cannot mark arrived from status '${current.status}'.` });
            }
            const now = new Date();
            await statusCollection.updateOne(
                { serialNumber },
                {
                    $set: {
                        status: 'arrived',
                        updatedAt: now,
                        updatedBy: user.username,
                        updatedByCompanyType: user.companyType || '',
                        updatedByCompanyName: user.companyName || ''
                    }
                }
            );
            await auditCollection.insertOne(buildAuditEntry(serialNumber, 'arrived', user));
            return res.json({ ok: true, status: 'arrived' });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.get('/api/medications/:id/audit', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            const serialNumber = req.params.id;
            if (!serialNumber) {
                return res.status(400).json({ error: 'Medication id is required.' });
            }
            const auditCollection = db.collection('medication_audits');
            const entries = await auditCollection
                .find({ serialNumber }, { projection: { _id: 0 } })
                .sort({ createdAt: 1 })
                .toArray();
            return res.json({ audit: entries });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.get('/api/medications', async (req, res) => {
        try {
            const result = await contract.evaluateTransaction('getAllMedications');
            const medications = parseChaincodeJson(result);
            if (!usersCollection) {
                return res.json(medications);
            }
            const statusCollection = db.collection('medication_status');
            const serials = medications.map((med) => med.serialNumber).filter(Boolean);
            const statuses = await statusCollection.find({ serialNumber: { $in: serials } }).toArray();
            const statusMap = new Map(statuses.map((entry) => [entry.serialNumber, entry]));
            const merged = medications.map((med) => {
                const status = statusMap.get(med.serialNumber);
                if (!status) return med;
                return {
                    ...med,
                    status: status.status,
                    statusUpdatedAt: status.updatedAt,
                    statusUpdatedBy: status.updatedBy,
                    statusUpdatedByCompanyType: status.updatedByCompanyType,
                    statusUpdatedByCompanyName: status.updatedByCompanyName
                };
            });
            res.json(merged);
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
            const medication = parseChaincodeJson(result);
            if (!usersCollection) {
                return res.json(medication);
            }
            const statusCollection = db.collection('medication_status');
            const status = await statusCollection.findOne({ serialNumber });
            if (!status) {
                return res.json(medication);
            }
            return res.json({
                ...medication,
                status: status.status,
                statusUpdatedAt: status.updatedAt,
                statusUpdatedBy: status.updatedBy,
                statusUpdatedByCompanyType: status.updatedByCompanyType,
                statusUpdatedByCompanyName: status.updatedByCompanyName
            });
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

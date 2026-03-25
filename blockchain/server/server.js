const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

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

const sendEmail = async ({ to, subject, html }) => {
    const host = getEnv('SMTP_HOST');
    if (!host || !to) return;
    try {
        const transport = nodemailer.createTransport({
            host,
            port: parseInt(getEnv('SMTP_PORT', '587'), 10),
            secure: getEnv('SMTP_PORT', '587') === '465',
            auth: { user: getEnv('SMTP_USER'), pass: getEnv('SMTP_PASS') }
        });
        const from = getEnv('SMTP_FROM', 'LedgRx <noreply@ledgrx.duckdns.org>');
        await transport.sendMail({ from, to, subject, html });
    } catch (err) {
        console.error('Email send failed:', err.message);
    }
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

function buildActor(req, user) {
    const type = req.user?.type === 'worker' ? 'worker' : req.user?.type === 'org' ? 'org_admin' : 'platform_admin';
    return { username: user?.username || req.user?.sub || '', type };
}

async function writeAuditLogs(db, { actor, orgId, action, target, metadata }) {
    if (!db) return;
    const entry = { actor, orgId: orgId || null, action, target: target || {}, metadata: metadata || {}, createdAt: new Date() };
    const writes = [db.collection('platform_audit_log').insertOne({ ...entry })];
    if (orgId) {
        writes.push(db.collection('org_audit_log').insertOne({ ...entry }));
    }
    if (actor.type === 'worker') {
        writes.push(db.collection('worker_activity_log').insertOne({
            username: actor.username,
            orgId,
            action,
            serialNumbers: target?.serialNumbers || (target?.serialNumber ? [target.serialNumber] : []),
            metadata: metadata || {},
            createdAt: entry.createdAt
        }));
    }
    await Promise.allSettled(writes);
}

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
    const tokenType = req.user?.type;
    if (!username) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
    if (tokenType === 'platform' || isAdminUser(username)) return next();
    if (db) {
        if (tokenType === 'worker') {
            const worker = await db.collection('workers').findOne({ username });
            if (!worker) return res.status(401).json({ error: 'Worker not found.' });
            const org = await db.collection('organisations').findOne({ orgId: worker.orgId });
            if (!org || org.approvalStatus !== 'approved') {
                return res.status(403).json({ error: 'Your organisation is pending approval.' });
            }
            return next();
        }
        if (tokenType === 'org') {
            const org = await db.collection('organisations').findOne({ adminUsername: username });
            if (!org || org.approvalStatus !== 'approved') {
                return res.status(403).json({ error: 'Your organisation is pending approval.' });
            }
            return next();
        }
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

const requireOrgAdmin = (req, res, next) => {
    if (req.user?.type !== 'org') {
        return res.status(403).json({ error: 'Organisation admin access required.' });
    }
    return next();
};

const loadUserForRequest = async (db, req) => {
    if (!db) return null;
    const tokenType = req.user?.type;
    const username = req.user?.sub;
    if (!username) return null;

    if (tokenType === 'worker') {
        return db.collection('workers').findOne({ username });
    }

    if (tokenType === 'org') {
        const org = await db.collection('organisations').findOne({ adminUsername: username });
        if (!org) return null;
        return {
            username: org.adminUsername,
            companyType: org.companyType,
            companyName: org.companyName,
            isAdmin: false,
            approvalStatus: org.approvalStatus,
            orgId: org.orgId
        };
    }

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

const getWebAuthnConfig = () => ({
    rpID: getEnv('WEBAUTHN_RP_ID', 'localhost'),
    rpName: getEnv('WEBAUTHN_RP_NAME', 'LedgRx'),
    origin: getEnv('WEBAUTHN_ORIGIN', 'http://localhost:3000'),
});

const createApp = (contract, db) => {
    const app = express();
    app.use(cors(corsOptions()));
    app.use(express.json());

    const usersCollection = db ? db.collection('users') : null;
    const blacklistCollection = db ? db.collection('token_blacklist') : null;
    const credentialsCollection = db ? db.collection('webauthn_credentials') : null;
    const challengesCollection = db ? db.collection('webauthn_challenges') : null;
    const invitesCollection = db ? db.collection('worker_invites') : null;
    const authMiddleware = createAuthMiddleware(db);

    // Ensure TTL indexes exist for challenges and invites
    if (challengesCollection) {
        challengesCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    }
    if (invitesCollection) {
        invitesCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    }
    // Ensure audit log indexes
    if (db) {
        db.collection('worker_activity_log').createIndex({ username: 1, createdAt: -1 }).catch(() => {});
        db.collection('org_audit_log').createIndex({ orgId: 1, createdAt: -1 }).catch(() => {});
        db.collection('platform_audit_log').createIndex({ createdAt: -1 }).catch(() => {});
        db.collection('platform_audit_log').createIndex({ orgId: 1, createdAt: -1 }).catch(() => {});
    }

    const saveChallenge = async (userType, identifier, challenge, type) => {
        if (!challengesCollection) throw new Error('Database required for passkey auth.');
        await challengesCollection.deleteMany({ userType, identifier, type });
        await challengesCollection.insertOne({
            userType, identifier, challenge, type,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            createdAt: new Date(),
        });
    };

    const getAndDeleteChallenge = async (userType, identifier, type) => {
        if (!challengesCollection) throw new Error('Database required for passkey auth.');
        const doc = await challengesCollection.findOneAndDelete({ userType, identifier, type });
        if (!doc || new Date() > doc.expiresAt) return null;
        return doc.challenge;
    };

    app.get('/api/health', (req, res) => {
        res.json({ ok: true });
    });

    app.get('/api/admin/check', async (req, res) => {
        try {
            if (getEnv('ADMIN_USERNAMES', '').trim()) {
                return res.json({ hasAdmin: true });
            }
            if (usersCollection) {
                const adminUser = await usersCollection.findOne({ isAdmin: true });
                return res.json({ hasAdmin: !!adminUser });
            }
            return res.json({ hasAdmin: false });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Check failed.' });
        }
    });

    app.post('/api/admin/bootstrap', async (req, res) => {
        try {
            if (getEnv('ADMIN_USERNAMES', '').trim()) {
                return res.status(409).json({ error: 'Admin already exists.' });
            }
            if (!usersCollection) {
                return res.status(501).json({ error: 'Bootstrap requires MONGODB_URI.' });
            }
            const adminUser = await usersCollection.findOne({ isAdmin: true });
            if (adminUser) {
                return res.status(409).json({ error: 'Admin already exists.' });
            }
            const { username } = req.body;
            if (!username) return res.status(400).json({ error: 'Username is required.' });
            if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
            const existing = await usersCollection.findOne({ username });
            if (existing) return res.status(409).json({ error: 'Username already exists.' });
            await usersCollection.insertOne({
                username, companyType: '', companyName: '',
                createdAt: new Date(), isAdmin: true,
                approvalStatus: 'approved', registrationNumber: '',
                approvedBy: null, approvedAt: null,
            });
            // Return registration options so the browser immediately registers a passkey
            const { rpID, rpName } = getWebAuthnConfig();
            const options = await generateRegistrationOptions({
                rpName, rpID,
                userID: new TextEncoder().encode(username),
                userName: username,
                userDisplayName: 'Platform Admin',
                attestationType: 'none',
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
                excludeCredentials: [],
                timeout: 60000,
            });
            await saveChallenge('platform', username, options.challenge, 'registration');
            return res.json({ username, registrationOptions: options });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Bootstrap failed.' });
        }
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
                    registrationNumber: user.registrationNumber || '',
                    email: user.email || '',
                    theme: user.theme || 'light'
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
            }
            if (!user) {
                try {
                    const users = loadAuthUsers({ allowEmpty: true });
                    user = users.find((entry) => entry.username === username) || null;
                } catch {
                    // AUTH_USERS / AUTH_USERS_FILE misconfiguration should not break
                    // login for users stored in MongoDB.
                }
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
                    registrationNumber: user.registrationNumber || '',
                    email: user.email || ''
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
            const { email: signupEmail } = req.body;
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
                    email: signupEmail ? String(signupEmail).trim().toLowerCase() : '',
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
            const { companyType, companyName, registrationNumber, email: profileEmail } = req.body;
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
                const normalizedEmail = profileEmail ? String(profileEmail).trim().toLowerCase() : undefined;
                const setFields = { companyType: normalizedType, companyName: normalizedName, registrationNumber: normalizedRegNum };
                if (normalizedEmail !== undefined) setFields.email = normalizedEmail;
                const result = await usersCollection.findOneAndUpdate(
                    { username },
                    { $set: setFields },
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
                    registrationNumber: result.registrationNumber || '',
                    email: result.email || ''
                });
            }
            const profileAdmin = isAdminUser(username);
            const normalizedRegNum = String(registrationNumber || '').trim();
            const normalizedEmailInsert = profileEmail ? String(profileEmail).trim().toLowerCase() : '';
            await usersCollection.insertOne({
                username,
                companyType: normalizedType,
                companyName: normalizedName,
                registrationNumber: normalizedRegNum,
                email: normalizedEmailInsert,
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
                registrationNumber: normalizedRegNum,
                email: normalizedEmailInsert
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update profile.' });
        }
    });

    app.post('/api/auth/theme', authMiddleware, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Theme changes require MONGODB_URI.' });
            const username = req.user?.sub;
            if (!username) return res.status(401).json({ error: 'Invalid token.' });
            const { theme } = req.body;
            const validThemes = ['light', 'dark', 'sidebar-dark'];
            if (!theme || !validThemes.includes(theme)) {
                return res.status(400).json({ error: `Invalid theme. Must be one of: ${validThemes.join(', ')}` });
            }
            switch (req.user.type) {
                case 'org':
                    await db.collection('organisations').updateOne(
                        { adminUsername: username },
                        { $set: { theme } }
                    );
                    break;
                case 'worker':
                    await db.collection('workers').updateOne(
                        { username },
                        { $set: { theme } }
                    );
                    break;
                default:
                    await db.collection('users').updateOne(
                        { username },
                        { $set: { theme } }
                    );
                    break;
            }
            return res.json({ ok: true, theme });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update theme.' });
        }
    });

    app.post('/api/auth/email-change-request', authMiddleware, async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Email changes require MONGODB_URI.' });
            }
            const username = req.user?.sub;
            if (!username) return res.status(401).json({ error: 'Invalid token.' });
            const { newEmail } = req.body;
            if (!newEmail || !String(newEmail).includes('@')) {
                return res.status(400).json({ error: 'A valid email address is required.' });
            }
            const normalizedEmail = String(newEmail).trim().toLowerCase();
            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await usersCollection.updateOne(
                { username },
                { $set: { pendingEmail: normalizedEmail, emailChangeToken: token, emailChangeExpiry: expiry } }
            );
            const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
            await sendEmail({
                to: normalizedEmail,
                subject: 'Confirm your new LedgRx email address',
                html: `
                    <p>You requested to update the email address on your LedgRx account.</p>
                    <p>Click the link below to confirm. This link expires in 24 hours.</p>
                    <p><a href="${appUrl}?emailToken=${token}">Confirm email address</a></p>
                    <p>If you did not request this change, you can safely ignore this email.</p>
                    <p>The LedgRx Team</p>
                `
            });
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to send confirmation email.' });
        }
    });

    app.get('/api/auth/email-change-confirm', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Email changes require MONGODB_URI.' });
            }
            const { token } = req.query;
            if (!token) return res.status(400).json({ error: 'Token is required.' });
            const user = await usersCollection.findOne({
                emailChangeToken: token,
                emailChangeExpiry: { $gt: new Date() }
            });
            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired confirmation link.' });
            }
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { email: user.pendingEmail },
                    $unset: { pendingEmail: '', emailChangeToken: '', emailChangeExpiry: '' }
                }
            );
            return res.json({ ok: true, email: user.pendingEmail });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to confirm email change.' });
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

    // ── WebAuthn — Platform (admin / platform users) ──────────────────────────

    app.post('/api/auth/webauthn/register/begin', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username } = req.body;
            if (!username) return res.status(400).json({ error: 'Username is required.' });
            const user = await usersCollection.findOne({ username });
            if (!user) return res.status(404).json({ error: 'User not found.' });
            const existingCredentials = await credentialsCollection.find({ userType: 'platform', identifier: username }).toArray();
            const { rpID, rpName, origin } = getWebAuthnConfig();
            const options = await generateRegistrationOptions({
                rpName, rpID,
                userID: new TextEncoder().encode(username),
                userName: username,
                userDisplayName: username,
                attestationType: 'none',
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
                excludeCredentials: existingCredentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
                timeout: 60000,
            });
            await saveChallenge('platform', username, options.challenge, 'registration');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin registration.' });
        }
    });

    app.post('/api/auth/webauthn/register/complete', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username, credential } = req.body;
            if (!username || !credential) return res.status(400).json({ error: 'username and credential are required.' });
            const expectedChallenge = await getAndDeleteChallenge('platform', username, 'registration');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired or not found. Please start again.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, registrationInfo } = await verifyRegistrationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
            if (!verified) return res.status(400).json({ error: 'Passkey verification failed.' });
            const { id, publicKey, counter, transports } = registrationInfo.credential;
            await credentialsCollection.insertOne({
                userType: 'platform', identifier: username,
                credentialId: id,
                publicKey: Buffer.from(publicKey),
                counter, transports,
                createdAt: new Date(),
            });
            const user = await usersCollection.findOne({ username });
            const token = createToken({ sub: username, jti: crypto.randomUUID() });
            return res.json({
                token,
                user: {
                    username,
                    companyType: user?.companyType || '',
                    companyName: user?.companyName || '',
                    isAdmin: !!user?.isAdmin || isAdminUser(username),
                    approvalStatus: getUserApprovalStatus(user),
                    registrationNumber: user?.registrationNumber || '',
                    email: user?.email || '',
                },
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to complete registration.' });
        }
    });

    app.post('/api/auth/webauthn/login/begin', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username } = req.body;
            if (!username) return res.status(400).json({ error: 'Username is required.' });
            const credentials = await credentialsCollection.find({ userType: 'platform', identifier: username }).toArray();
            if (credentials.length === 0) return res.status(404).json({ error: 'No passkey registered for this account.' });
            const { rpID } = getWebAuthnConfig();
            const options = await generateAuthenticationOptions({
                rpID, timeout: 60000,
                allowCredentials: credentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
                userVerification: 'preferred',
            });
            await saveChallenge('platform', username, options.challenge, 'authentication');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin login.' });
        }
    });

    app.post('/api/auth/webauthn/login/complete', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username, credential } = req.body;
            if (!username || !credential) return res.status(400).json({ error: 'username and credential are required.' });
            const expectedChallenge = await getAndDeleteChallenge('platform', username, 'authentication');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired. Please try again.' });
            const storedCred = await credentialsCollection.findOne({ userType: 'platform', identifier: username, credentialId: credential.id });
            if (!storedCred) return res.status(401).json({ error: 'Passkey not recognised.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, authenticationInfo } = await verifyAuthenticationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                credential: {
                    id: storedCred.credentialId,
                    publicKey: storedCred.publicKey.buffer ? new Uint8Array(storedCred.publicKey.buffer) : storedCred.publicKey,
                    counter: storedCred.counter,
                    transports: storedCred.transports,
                },
            });
            if (!verified) return res.status(401).json({ error: 'Passkey verification failed.' });
            await credentialsCollection.updateOne(
                { _id: storedCred._id },
                { $set: { counter: authenticationInfo.newCounter } }
            );
            const user = await usersCollection.findOne({ username });
            if (!user) return res.status(401).json({ error: 'User not found.' });
            const token = createToken({ sub: username, jti: crypto.randomUUID() });
            return res.json({
                token,
                user: {
                    username,
                    companyType: user.companyType || '',
                    companyName: user.companyName || '',
                    isAdmin: !!user.isAdmin || isAdminUser(username),
                    approvalStatus: getUserApprovalStatus(user),
                    registrationNumber: user.registrationNumber || '',
                    email: user.email || '',
                },
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Login failed.' });
        }
    });

    // ── WebAuthn — Organisation ───────────────────────────────────────────────

    app.get('/api/org/invite/:token', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const invite = await invitesCollection.findOne({ token: req.params.token, used: false, type: 'org_passkey_reset' });
            if (!invite || new Date() > invite.expiresAt) {
                return res.status(404).json({ error: 'Reset link is invalid or has expired.' });
            }
            return res.json({ valid: true, adminUsername: invite.orgAdminUsername });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to validate reset link.' });
        }
    });

    app.post('/api/org/webauthn/register/begin', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { adminUsername } = req.body;
            if (!adminUsername) return res.status(400).json({ error: 'adminUsername is required.' });
            const org = await db.collection('organisations').findOne({ adminUsername });
            if (!org) return res.status(404).json({ error: 'Organisation not found.' });
            const existingCredentials = await credentialsCollection.find({ userType: 'org', identifier: adminUsername }).toArray();
            const { rpID, rpName } = getWebAuthnConfig();
            const options = await generateRegistrationOptions({
                rpName, rpID,
                userID: new TextEncoder().encode(adminUsername),
                userName: adminUsername,
                userDisplayName: `${org.adminFirstName} ${org.adminLastName}`.trim() || adminUsername,
                attestationType: 'none',
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
                excludeCredentials: existingCredentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
                timeout: 60000,
            });
            await saveChallenge('org', adminUsername, options.challenge, 'registration');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin registration.' });
        }
    });

    app.post('/api/org/webauthn/register/complete', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { adminUsername, credential, resetToken } = req.body;
            if (!adminUsername || !credential) return res.status(400).json({ error: 'adminUsername and credential are required.' });
            const expectedChallenge = await getAndDeleteChallenge('org', adminUsername, 'registration');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired. Please start again.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, registrationInfo } = await verifyRegistrationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
            if (!verified) return res.status(400).json({ error: 'Passkey verification failed.' });
            const { id, publicKey, counter, transports } = registrationInfo.credential;
            await credentialsCollection.insertOne({
                userType: 'org', identifier: adminUsername,
                credentialId: id,
                publicKey: Buffer.from(publicKey),
                counter, transports,
                createdAt: new Date(),
            });
            if (resetToken) {
                await invitesCollection.updateOne({ token: resetToken }, { $set: { used: true, usedAt: new Date() } });
            }
            const org = await db.collection('organisations').findOne({ adminUsername });
            const token = createToken({ sub: adminUsername, type: 'org', orgId: org.orgId, jti: crypto.randomUUID() });
            return res.json({
                token,
                org: {
                    orgId: org.orgId, adminUsername: org.adminUsername,
                    companyName: org.companyName, companyType: org.companyType,
                    approvalStatus: org.approvalStatus, adminEmail: org.adminEmail,
                    adminFirstName: org.adminFirstName, adminLastName: org.adminLastName,
                    registrationNumber: org.registrationNumber,
                },
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to complete registration.' });
        }
    });

    app.post('/api/org/webauthn/login/begin', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username } = req.body;
            if (!username) return res.status(400).json({ error: 'Username is required.' });
            const credentials = await credentialsCollection.find({ userType: 'org', identifier: username }).toArray();
            if (credentials.length === 0) return res.status(404).json({ error: 'No passkey registered for this account.' });
            const { rpID } = getWebAuthnConfig();
            const options = await generateAuthenticationOptions({
                rpID, timeout: 60000,
                allowCredentials: credentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
                userVerification: 'preferred',
            });
            await saveChallenge('org', username, options.challenge, 'authentication');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin login.' });
        }
    });

    app.post('/api/org/webauthn/login/complete', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username, credential } = req.body;
            if (!username || !credential) return res.status(400).json({ error: 'username and credential are required.' });
            const expectedChallenge = await getAndDeleteChallenge('org', username, 'authentication');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired. Please try again.' });
            const storedCred = await credentialsCollection.findOne({ userType: 'org', identifier: username, credentialId: credential.id });
            if (!storedCred) return res.status(401).json({ error: 'Passkey not recognised.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, authenticationInfo } = await verifyAuthenticationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                credential: {
                    id: storedCred.credentialId,
                    publicKey: storedCred.publicKey.buffer ? new Uint8Array(storedCred.publicKey.buffer) : storedCred.publicKey,
                    counter: storedCred.counter,
                    transports: storedCred.transports,
                },
            });
            if (!verified) return res.status(401).json({ error: 'Passkey verification failed.' });
            await credentialsCollection.updateOne(
                { _id: storedCred._id },
                { $set: { counter: authenticationInfo.newCounter } }
            );
            const org = await db.collection('organisations').findOne({ adminUsername: username });
            if (!org) return res.status(401).json({ error: 'Organisation not found.' });
            const token = createToken({ sub: username, type: 'org', orgId: org.orgId, jti: crypto.randomUUID() });
            return res.json({
                token,
                org: {
                    orgId: org.orgId, adminUsername: org.adminUsername,
                    companyName: org.companyName, companyType: org.companyType,
                    approvalStatus: org.approvalStatus, adminEmail: org.adminEmail,
                    adminFirstName: org.adminFirstName, adminLastName: org.adminLastName,
                    registrationNumber: org.registrationNumber,
                },
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Login failed.' });
        }
    });

    // ── WebAuthn — Worker ─────────────────────────────────────────────────────

    app.get('/api/worker/invite/:token', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const invite = await invitesCollection.findOne({ token: req.params.token, used: false });
            if (!invite || new Date() > invite.expiresAt) {
                return res.status(404).json({ error: 'Invite link is invalid or has expired.' });
            }
            const worker = await db.collection('workers').findOne({ workerId: invite.workerId });
            if (!worker) return res.status(404).json({ error: 'Worker account not found.' });
            return res.json({
                valid: true,
                username: worker.username,
                orgId: worker.orgId,
                companyName: worker.companyName,
                companyType: worker.companyType,
                jobTitle: worker.jobTitle,
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to validate invite.' });
        }
    });

    app.post('/api/worker/webauthn/register/begin', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { inviteToken } = req.body;
            if (!inviteToken) return res.status(400).json({ error: 'inviteToken is required.' });
            const invite = await invitesCollection.findOne({ token: inviteToken, used: false });
            if (!invite || new Date() > invite.expiresAt) {
                return res.status(400).json({ error: 'Invite link is invalid or has expired.' });
            }
            const worker = await db.collection('workers').findOne({ workerId: invite.workerId });
            if (!worker) return res.status(404).json({ error: 'Worker account not found.' });
            const { rpID, rpName } = getWebAuthnConfig();
            const options = await generateRegistrationOptions({
                rpName, rpID,
                userID: new TextEncoder().encode(worker.username),
                userName: worker.username,
                userDisplayName: worker.username,
                attestationType: 'none',
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
                excludeCredentials: [],
                timeout: 60000,
            });
            await saveChallenge('worker', worker.username, options.challenge, 'registration');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin registration.' });
        }
    });

    app.post('/api/worker/webauthn/register/complete', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { inviteToken, credential } = req.body;
            if (!inviteToken || !credential) return res.status(400).json({ error: 'inviteToken and credential are required.' });
            const invite = await invitesCollection.findOne({ token: inviteToken, used: false });
            if (!invite || new Date() > invite.expiresAt) {
                return res.status(400).json({ error: 'Invite link is invalid or has expired.' });
            }
            const worker = await db.collection('workers').findOne({ workerId: invite.workerId });
            if (!worker) return res.status(404).json({ error: 'Worker account not found.' });
            const expectedChallenge = await getAndDeleteChallenge('worker', worker.username, 'registration');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired. Please start again.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, registrationInfo } = await verifyRegistrationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
            if (!verified) return res.status(400).json({ error: 'Passkey verification failed.' });
            const { id, publicKey, counter, transports } = registrationInfo.credential;
            await credentialsCollection.insertOne({
                userType: 'worker', identifier: worker.username,
                credentialId: id,
                publicKey: Buffer.from(publicKey),
                counter, transports,
                createdAt: new Date(),
            });
            await invitesCollection.updateOne({ _id: invite._id }, { $set: { used: true, usedAt: new Date() } });
            const org = await db.collection('organisations').findOne({ orgId: worker.orgId });
            if (!org || org.approvalStatus !== 'approved') {
                return res.status(403).json({ error: 'Your organisation is pending approval.' });
            }
            const token = createToken({ sub: worker.username, type: 'worker', orgId: worker.orgId, jti: crypto.randomUUID() });
            return res.json({
                token,
                worker: {
                    username: worker.username, orgId: worker.orgId,
                    companyName: worker.companyName, companyType: worker.companyType,
                    jobTitle: worker.jobTitle, approvalStatus: 'approved',
                },
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to complete registration.' });
        }
    });

    app.post('/api/worker/webauthn/login/begin', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username } = req.body;
            if (!username) return res.status(400).json({ error: 'Username is required.' });
            const credentials = await credentialsCollection.find({ userType: 'worker', identifier: username }).toArray();
            if (credentials.length === 0) return res.status(404).json({ error: 'No passkey registered for this account.' });
            const { rpID } = getWebAuthnConfig();
            const options = await generateAuthenticationOptions({
                rpID, timeout: 60000,
                allowCredentials: credentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
                userVerification: 'preferred',
            });
            await saveChallenge('worker', username, options.challenge, 'authentication');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin login.' });
        }
    });

    app.post('/api/worker/webauthn/login/complete', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username, credential } = req.body;
            if (!username || !credential) return res.status(400).json({ error: 'username and credential are required.' });
            const expectedChallenge = await getAndDeleteChallenge('worker', username, 'authentication');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired. Please try again.' });
            const storedCred = await credentialsCollection.findOne({ userType: 'worker', identifier: username, credentialId: credential.id });
            if (!storedCred) return res.status(401).json({ error: 'Passkey not recognised.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, authenticationInfo } = await verifyAuthenticationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                credential: {
                    id: storedCred.credentialId,
                    publicKey: storedCred.publicKey.buffer ? new Uint8Array(storedCred.publicKey.buffer) : storedCred.publicKey,
                    counter: storedCred.counter,
                    transports: storedCred.transports,
                },
            });
            if (!verified) return res.status(401).json({ error: 'Passkey verification failed.' });
            await credentialsCollection.updateOne(
                { _id: storedCred._id },
                { $set: { counter: authenticationInfo.newCounter } }
            );
            const worker = await db.collection('workers').findOne({ username });
            if (!worker) return res.status(401).json({ error: 'Worker not found.' });
            const org = await db.collection('organisations').findOne({ orgId: worker.orgId });
            if (!org || org.approvalStatus !== 'approved') {
                return res.status(403).json({ error: 'Your organisation is pending approval.' });
            }
            const token = createToken({ sub: username, type: 'worker', orgId: worker.orgId, jti: crypto.randomUUID() });
            return res.json({
                token,
                worker: {
                    username: worker.username, orgId: worker.orgId,
                    companyName: worker.companyName, companyType: worker.companyType,
                    jobTitle: worker.jobTitle, approvalStatus: 'approved',
                },
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Login failed.' });
        }
    });

    // ── Admin — Backup Passkey ────────────────────────────────────────────────

    app.get('/api/admin/webauthn/backup', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const username = req.user.sub;
            const credentials = await credentialsCollection.find({ userType: 'platform', identifier: username }).toArray();
            return res.json({ count: credentials.length, credentials: credentials.map((c) => ({ id: c._id, createdAt: c.createdAt })) });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to list credentials.' });
        }
    });

    app.post('/api/admin/webauthn/backup/begin', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const username = req.user.sub;
            const existingCredentials = await credentialsCollection.find({ userType: 'platform', identifier: username }).toArray();
            const { rpID, rpName } = getWebAuthnConfig();
            const options = await generateRegistrationOptions({
                rpName, rpID,
                userID: new TextEncoder().encode(username),
                userName: username,
                userDisplayName: username,
                attestationType: 'none',
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
                excludeCredentials: existingCredentials.map((c) => ({ id: c.credentialId, transports: c.transports })),
                timeout: 60000,
            });
            await saveChallenge('platform', username, options.challenge, 'backup_registration');
            return res.json(options);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to begin backup passkey registration.' });
        }
    });

    app.post('/api/admin/webauthn/backup/complete', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const username = req.user.sub;
            const { credential } = req.body;
            if (!credential) return res.status(400).json({ error: 'credential is required.' });
            const expectedChallenge = await getAndDeleteChallenge('platform', username, 'backup_registration');
            if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired. Please try again.' });
            const { rpID, origin } = getWebAuthnConfig();
            const { verified, registrationInfo } = await verifyRegistrationResponse({
                response: credential,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
            if (!verified) return res.status(400).json({ error: 'Passkey verification failed.' });
            const { id, publicKey, counter, transports } = registrationInfo.credential;
            await credentialsCollection.insertOne({
                userType: 'platform', identifier: username,
                credentialId: id,
                publicKey: Buffer.from(publicKey),
                counter, transports,
                createdAt: new Date(),
            });
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to complete backup passkey registration.' });
        }
    });

    // ── Admin — Passkey Management ────────────────────────────────────────────

    app.delete('/api/admin/orgs/:orgId/passkeys', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const org = await db.collection('organisations').findOne({ orgId: req.params.orgId });
            if (!org) return res.status(404).json({ error: 'Organisation not found.' });
            await credentialsCollection.deleteMany({ userType: 'org', identifier: org.adminUsername });
            const inviteToken = crypto.randomUUID();
            const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
            await invitesCollection.insertOne({
                token: inviteToken,
                workerId: null,
                orgAdminUsername: org.adminUsername,
                type: 'org_passkey_reset',
                used: false,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                createdAt: new Date(),
            });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: req.params.orgId,
                action: 'org.passkey_reset',
                target: { orgId: req.params.orgId, username: org.adminUsername },
                metadata: {}
            }).catch(() => {});
            return res.json({ ok: true, registerUrl: `${appUrl}/org/register-passkey?token=${inviteToken}&username=${encodeURIComponent(org.adminUsername)}` });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reset passkey.' });
        }
    });

    app.delete('/api/admin/orgs/:orgId/workers/:username/passkeys', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const worker = await db.collection('workers').findOne({ username: req.params.username, orgId: req.params.orgId });
            if (!worker) return res.status(404).json({ error: 'Worker not found.' });
            await credentialsCollection.deleteMany({ userType: 'worker', identifier: worker.username });
            const inviteToken = crypto.randomUUID();
            const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
            await invitesCollection.insertOne({
                token: inviteToken,
                workerId: worker.workerId,
                type: 'worker_passkey_reset',
                used: false,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                createdAt: new Date(),
            });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: req.params.orgId,
                action: 'worker.passkey_reset',
                target: { username: req.params.username, orgId: req.params.orgId },
                metadata: {}
            }).catch(() => {});
            return res.json({ ok: true, registerUrl: `${appUrl}/invite/${inviteToken}` });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reset passkey.' });
        }
    });

    app.get('/api/admin/users', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User listing requires MONGODB_URI.' });
            }
            const users = await usersCollection
                .find({}, { projection: { _id: 0, username: 1, companyType: 1, companyName: 1, createdAt: 1, approvalStatus: 1, registrationNumber: 1, isAdmin: 1, approvedBy: 1, approvedAt: 1, email: 1 } })
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
            if (result.email) {
                const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
                await sendEmail({
                    to: result.email,
                    subject: 'Your LedgRx account has been approved',
                    html: `
                        <p>Hello ${result.companyName || result.username},</p>
                        <p>Your LedgRx account has been approved. You can now sign in and begin tracking medication provenance across your supply chain.</p>
                        <p><strong>Username:</strong> ${result.username}</p>
                        <p><a href="${appUrl}">Sign in to LedgRx</a></p>
                        <p>If you have any questions, please contact your administrator.</p>
                        <p>The LedgRx Team</p>
                    `
                });
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

    app.delete('/api/admin/users/:username', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User management requires MONGODB_URI.' });
            }
            const targetUsername = req.params.username;
            if (targetUsername === req.user.sub) {
                return res.status(400).json({ error: 'Cannot delete your own account.' });
            }
            const result = await usersCollection.deleteOne({ username: targetUsername });
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to delete user.' });
        }
    });

    app.patch('/api/admin/users/:username/company', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User management requires MONGODB_URI.' });
            }
            const targetUsername = req.params.username;
            const { companyType, companyName, registrationNumber, email: patchEmail } = req.body;
            const patchFields = { companyType, companyName, registrationNumber };
            if (patchEmail !== undefined) patchFields.email = patchEmail ? String(patchEmail).trim().toLowerCase() : '';
            const result = await usersCollection.findOneAndUpdate(
                { username: targetUsername },
                { $set: patchFields },
                { returnDocument: 'after' }
            );
            if (!result) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({ ok: true, user: result });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update company info.' });
        }
    });

    app.post('/api/admin/users/:username/reset-password', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'User management requires MONGODB_URI.' });
            }
            const targetUsername = req.params.username;
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }
            const hashed = await bcrypt.hash(newPassword, 10);
            const result = await usersCollection.findOneAndUpdate(
                { username: targetUsername },
                { $set: { passwordHash: hashed } },
                { returnDocument: 'after' }
            );
            if (!result) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reset password.' });
        }
    });

    // ── Organisation Signup ──────────────────────────────────────────────────

    app.post('/api/org/signup', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Signup requires MONGODB_URI.' });
            const { adminFirstName, adminLastName, adminUsername, adminEmail,
                    companyName, companyType, registrationNumber } = req.body;
            if (!adminFirstName || !adminLastName || !adminUsername || !companyName || !companyType) {
                return res.status(400).json({ error: 'Missing required fields.' });
            }
            if (adminUsername.length < 3) {
                return res.status(400).json({ error: 'Username must be at least 3 characters.' });
            }
            const normalizedType = String(companyType).trim().toLowerCase();
            if (!['production', 'distribution', 'pharmacy', 'clinic'].includes(normalizedType)) {
                return res.status(400).json({ error: 'Company type must be production, distribution, pharmacy, or clinic.' });
            }
            const orgsCollection = db.collection('organisations');
            const workersCol = db.collection('workers');
            const existing = await orgsCollection.findOne({ adminUsername });
            if (existing) return res.status(409).json({ error: 'Username already taken.' });
            const workerConflict = await workersCol.findOne({ username: adminUsername });
            if (workerConflict) return res.status(409).json({ error: 'Username already taken.' });
            const orgId = crypto.randomUUID();
            await orgsCollection.insertOne({
                orgId,
                companyName: String(companyName).trim(),
                companyType: normalizedType,
                registrationNumber: String(registrationNumber || '').trim(),
                adminFirstName: String(adminFirstName).trim(),
                adminLastName: String(adminLastName).trim(),
                adminUsername,
                adminEmail: adminEmail ? String(adminEmail).trim().toLowerCase() : '',
                approvalStatus: 'pending',
                createdAt: new Date(),
                approvedAt: null,
            });
            // Return registration options so the browser immediately starts passkey setup
            const { rpID, rpName } = getWebAuthnConfig();
            const options = await generateRegistrationOptions({
                rpName, rpID,
                userID: new TextEncoder().encode(adminUsername),
                userName: adminUsername,
                userDisplayName: `${String(adminFirstName).trim()} ${String(adminLastName).trim()}`.trim(),
                attestationType: 'none',
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
                excludeCredentials: [],
                timeout: 60000,
            });
            await saveChallenge('org', adminUsername, options.challenge, 'registration');
            return res.status(201).json({
                org: { orgId, adminUsername, companyName: String(companyName).trim(), companyType: normalizedType, approvalStatus: 'pending' },
                registrationOptions: options,
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Signup failed.' });
        }
    });

    // ── Organisation Login ───────────────────────────────────────────────────

    app.post('/api/org/login', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Login requires MONGODB_URI.' });
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required.' });
            }
            const org = await db.collection('organisations').findOne({ adminUsername: username });
            if (!org) return res.status(401).json({ error: 'Invalid credentials.' });
            const ok = await bcrypt.compare(password, org.passwordHash);
            if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
            const token = createToken({ sub: username, type: 'org', orgId: org.orgId, jti: crypto.randomUUID() });
            return res.json({
                token,
                org: {
                    orgId: org.orgId,
                    adminUsername: org.adminUsername,
                    companyName: org.companyName,
                    companyType: org.companyType,
                    approvalStatus: org.approvalStatus,
                    adminEmail: org.adminEmail,
                    adminFirstName: org.adminFirstName,
                    adminLastName: org.adminLastName,
                    registrationNumber: org.registrationNumber
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Login failed.' });
        }
    });

    // ── Organisation Profile ─────────────────────────────────────────────────

    app.get('/api/org/me', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const org = await db.collection('organisations').findOne({ adminUsername: req.user.sub });
            if (!org) return res.status(404).json({ error: 'Organisation not found.' });
            return res.json({
                orgId: org.orgId,
                adminUsername: org.adminUsername,
                companyName: org.companyName,
                companyType: org.companyType,
                approvalStatus: org.approvalStatus,
                adminEmail: org.adminEmail,
                adminFirstName: org.adminFirstName,
                adminLastName: org.adminLastName,
                registrationNumber: org.registrationNumber,
                theme: org.theme || 'light'
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load profile.' });
        }
    });

    // ── Worker Login ─────────────────────────────────────────────────────────

    app.post('/api/worker/login', async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Login requires MONGODB_URI.' });
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required.' });
            }
            const worker = await db.collection('workers').findOne({ username });
            if (!worker) return res.status(401).json({ error: 'Invalid credentials.' });
            const ok = await bcrypt.compare(password, worker.passwordHash);
            if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
            const org = await db.collection('organisations').findOne({ orgId: worker.orgId });
            if (!org || org.approvalStatus !== 'approved') {
                return res.status(403).json({ error: 'Your organisation is pending approval.' });
            }
            const token = createToken({ sub: username, type: 'worker', orgId: worker.orgId, jti: crypto.randomUUID() });
            return res.json({
                token,
                worker: {
                    username: worker.username,
                    orgId: worker.orgId,
                    companyName: worker.companyName,
                    companyType: worker.companyType,
                    jobTitle: worker.jobTitle,
                    approvalStatus: 'approved'
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Login failed.' });
        }
    });

    // ── Worker Profile ───────────────────────────────────────────────────────

    app.get('/api/worker/me', authMiddleware, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            if (req.user?.type !== 'worker') {
                return res.status(403).json({ error: 'Worker access required.' });
            }
            const worker = await db.collection('workers').findOne({ username: req.user.sub });
            if (!worker) return res.status(404).json({ error: 'Worker not found.' });
            return res.json({
                username: worker.username,
                orgId: worker.orgId,
                companyName: worker.companyName,
                companyType: worker.companyType,
                jobTitle: worker.jobTitle,
                theme: worker.theme || 'light'
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load profile.' });
        }
    });

    // ── Org Admin — Worker Management ────────────────────────────────────────

    app.get('/api/org/workers', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const workers = await db.collection('workers')
                .find({ orgId: req.user.orgId }, { projection: { _id: 0, passwordHash: 0 } })
                .toArray();
            return res.json({ workers });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load workers.' });
        }
    });

    app.post('/api/org/workers', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { username, jobTitle, companyType } = req.body;
            if (!username) return res.status(400).json({ error: 'Username is required.' });
            if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
            const allowedTypes = ['production', 'distribution', 'pharmacy', 'clinic'];
            if (!companyType || !allowedTypes.includes(companyType.toLowerCase())) {
                return res.status(400).json({ error: 'companyType is required and must be one of: production, distribution, pharmacy, clinic.' });
            }
            const workersCol = db.collection('workers');
            const orgsCol = db.collection('organisations');
            const workerConflict = await workersCol.findOne({ username });
            if (workerConflict) return res.status(409).json({ error: 'Username already taken.' });
            const orgConflict = await orgsCol.findOne({ adminUsername: username });
            if (orgConflict) return res.status(409).json({ error: 'Username already taken.' });
            const org = await orgsCol.findOne({ orgId: req.user.orgId });
            if (!org) return res.status(404).json({ error: 'Organisation not found.' });
            const workerCompanyType = companyType.toLowerCase();
            const workerId = crypto.randomUUID();
            await workersCol.insertOne({
                workerId, username,
                orgId: org.orgId, companyName: org.companyName, companyType: workerCompanyType,
                jobTitle: String(jobTitle || '').trim(),
                createdAt: new Date(), createdBy: req.user.sub,
            });
            const inviteToken = crypto.randomUUID();
            await invitesCollection.insertOne({
                token: inviteToken, workerId, type: 'worker_setup',
                used: false,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                createdAt: new Date(),
            });
            const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
            const inviteUrl = `${appUrl}/invite/${inviteToken}`;
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'org_admin' },
                orgId: org.orgId,
                action: 'worker.created',
                target: { username },
                metadata: { jobTitle: jobTitle || '' }
            }).catch(() => {});
            return res.status(201).json({
                worker: { workerId, username, orgId: org.orgId, companyName: org.companyName, companyType: workerCompanyType, jobTitle: jobTitle || '' },
                inviteUrl,
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to add worker.' });
        }
    });

    app.post('/api/org/workers/bulk', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { workers } = req.body;
            if (!Array.isArray(workers) || workers.length === 0) {
                return res.status(400).json({ error: 'workers must be a non-empty array.' });
            }
            if (workers.length > 200) {
                return res.status(400).json({ error: 'Maximum 200 workers per import.' });
            }
            const workersCollection = db.collection('workers');
            const orgsCollection = db.collection('organisations');
            const org = await orgsCollection.findOne({ orgId: req.user.orgId });
            if (!org) return res.status(404).json({ error: 'Organisation not found.' });
            const succeeded = [];
            const failed = [];
            const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
            const allowedTypes = ['production', 'distribution', 'pharmacy', 'clinic'];
            for (const row of workers) {
                const { username, jobTitle, companyType } = row;
                if (!username || username.length < 3) {
                    failed.push({ username: username || '', error: 'Username must be at least 3 characters.' });
                    continue;
                }
                if (!companyType || !allowedTypes.includes(String(companyType).toLowerCase())) {
                    failed.push({ username, error: 'companyType is required (production, distribution, pharmacy, clinic).' });
                    continue;
                }
                try {
                    const workerConflict = await workersCollection.findOne({ username });
                    if (workerConflict) { failed.push({ username, error: 'Username already taken.' }); continue; }
                    const orgConflict = await orgsCollection.findOne({ adminUsername: username });
                    if (orgConflict) { failed.push({ username, error: 'Username already taken.' }); continue; }
                    const workerCompanyType = String(companyType).toLowerCase();
                    const workerId = crypto.randomUUID();
                    await workersCollection.insertOne({
                        workerId, username,
                        orgId: org.orgId, companyName: org.companyName, companyType: workerCompanyType,
                        jobTitle: String(jobTitle || '').trim(),
                        createdAt: new Date(), createdBy: req.user.sub,
                    });
                    const inviteToken = crypto.randomUUID();
                    await invitesCollection.insertOne({
                        token: inviteToken, workerId, type: 'worker_setup',
                        used: false,
                        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                        createdAt: new Date(),
                    });
                    succeeded.push({ username, inviteUrl: `${appUrl}/invite/${inviteToken}` });
                } catch (rowErr) {
                    failed.push({ username, error: rowErr.message || 'Failed to create worker.' });
                }
            }
            if (succeeded.length > 0) {
                writeAuditLogs(db, {
                    actor: { username: req.user.sub, type: 'org_admin' },
                    orgId: org.orgId,
                    action: 'worker.bulk_created',
                    target: { count: succeeded.length },
                    metadata: { usernames: succeeded.map(s => s.username) }
                }).catch(() => {});
            }
            return res.json({ succeeded, failed });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Bulk import failed.' });
        }
    });

    app.delete('/api/org/workers/:username', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const result = await db.collection('workers').deleteOne({ username: req.params.username, orgId: req.user.orgId });
            if (result.deletedCount === 0) return res.status(404).json({ error: 'Worker not found.' });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'org_admin' },
                orgId: req.user.orgId,
                action: 'worker.removed',
                target: { username: req.params.username },
                metadata: {}
            }).catch(() => {});
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to remove worker.' });
        }
    });

    app.patch('/api/org/workers/:username', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const result = await db.collection('workers').findOneAndUpdate(
                { username: req.params.username, orgId: req.user.orgId },
                { $set: { jobTitle: String(req.body.jobTitle || '').trim() } },
                { returnDocument: 'after' }
            );
            if (!result) return res.status(404).json({ error: 'Worker not found.' });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'org_admin' },
                orgId: req.user.orgId,
                action: 'worker.job_title_updated',
                target: { username: req.params.username },
                metadata: { newTitle: String(req.body.jobTitle || '').trim() }
            }).catch(() => {});
            return res.json({ ok: true, worker: { username: result.username, jobTitle: result.jobTitle } });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update worker.' });
        }
    });

    // ── Platform Admin — Organisation Management ─────────────────────────────

    app.get('/api/admin/orgs', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const orgs = await db.collection('organisations')
                .find({}, { projection: { _id: 0, passwordHash: 0 } })
                .toArray();
            const counts = await db.collection('workers').aggregate([
                { $group: { _id: '$orgId', count: { $sum: 1 } } }
            ]).toArray();
            const countMap = new Map(counts.map((c) => [c._id, c.count]));
            return res.json({ orgs: orgs.map((org) => ({ ...org, workerCount: countMap.get(org.orgId) || 0 })) });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load organisations.' });
        }
    });

    app.get('/api/admin/orgs/:orgId/workers', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const workers = await db.collection('workers')
                .find({ orgId: req.params.orgId }, { projection: { _id: 0, passwordHash: 0 } })
                .toArray();
            return res.json({ workers });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load workers.' });
        }
    });

    // Lightweight company-name autocomplete for medication forms
    app.get('/api/companies', authMiddleware, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const q = String(req.query.q || '').trim().toLowerCase();
            const type = String(req.query.type || '').trim().toLowerCase(); // optional: distribution, pharmacy, clinic, production — comma-separated
            const filter = { approvalStatus: 'approved' };
            if (type) {
                const types = type.split(',').map((t) => t.trim()).filter(Boolean);
                filter.companyType = types.length === 1 ? types[0] : { $in: types };
            }
            const orgs = await db.collection('organisations')
                .find(filter, { projection: { _id: 0, companyName: 1, companyType: 1 } })
                .toArray();
            let results = orgs.map((o) => ({ companyName: o.companyName, companyType: o.companyType }));
            if (q) {
                results = results.filter((r) => r.companyName.toLowerCase().includes(q));
            }
            return res.json(results);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to search companies.' });
        }
    });

    app.post('/api/admin/orgs/:orgId/approve', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const result = await db.collection('organisations').findOneAndUpdate(
                { orgId: req.params.orgId },
                { $set: { approvalStatus: 'approved', approvedAt: new Date(), approvedBy: req.user.sub } },
                { returnDocument: 'after' }
            );
            if (!result) return res.status(404).json({ error: 'Organisation not found.' });
            if (result.adminEmail) {
                const appUrl = getEnv('APP_URL', 'https://ledgrx.duckdns.org');
                await sendEmail({
                    to: result.adminEmail,
                    subject: 'Your LedgRx organisation has been approved',
                    html: `
                        <p>Hello ${result.adminFirstName || result.adminUsername},</p>
                        <p>Your LedgRx organisation <strong>${result.companyName}</strong> has been approved.</p>
                        <p>You can now log in and begin managing your workers and medication records.</p>
                        <p><a href="${appUrl}">Sign in to LedgRx</a></p>
                        <p>The LedgRx Team</p>
                    `
                });
            }
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: req.params.orgId,
                action: 'org.approved',
                target: { orgId: req.params.orgId },
                metadata: { companyName: result.companyName || '' }
            }).catch(() => {});
            return res.json({ ok: true, org: { orgId: result.orgId, approvalStatus: result.approvalStatus } });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to approve organisation.' });
        }
    });

    app.post('/api/admin/orgs/:orgId/reject', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const result = await db.collection('organisations').findOneAndUpdate(
                { orgId: req.params.orgId },
                { $set: { approvalStatus: 'rejected', approvedBy: req.user.sub, approvedAt: new Date() } },
                { returnDocument: 'after' }
            );
            if (!result) return res.status(404).json({ error: 'Organisation not found.' });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: req.params.orgId,
                action: 'org.rejected',
                target: { orgId: req.params.orgId },
                metadata: { companyName: result.companyName || '' }
            }).catch(() => {});
            return res.json({ ok: true, org: { orgId: result.orgId, approvalStatus: result.approvalStatus } });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reject organisation.' });
        }
    });

    app.delete('/api/admin/orgs/:orgId', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const orgResult = await db.collection('organisations').deleteOne({ orgId: req.params.orgId });
            if (orgResult.deletedCount === 0) return res.status(404).json({ error: 'Organisation not found.' });
            const deletedWorkers = await db.collection('workers').deleteMany({ orgId: req.params.orgId });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: req.params.orgId,
                action: 'org.deleted',
                target: { orgId: req.params.orgId },
                metadata: { cascadedWorkers: deletedWorkers.deletedCount || 0 }
            }).catch(() => {});
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to delete organisation.' });
        }
    });

    app.patch('/api/admin/orgs/:orgId', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { companyName, companyType, registrationNumber, adminEmail } = req.body;
            const setFields = {};
            if (companyName !== undefined) setFields.companyName = String(companyName).trim();
            if (companyType !== undefined) setFields.companyType = String(companyType).trim().toLowerCase();
            if (registrationNumber !== undefined) setFields.registrationNumber = String(registrationNumber).trim();
            if (adminEmail !== undefined) setFields.adminEmail = String(adminEmail).trim().toLowerCase();
            const result = await db.collection('organisations').findOneAndUpdate(
                { orgId: req.params.orgId },
                { $set: setFields },
                { returnDocument: 'after' }
            );
            if (!result) return res.status(404).json({ error: 'Organisation not found.' });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: req.params.orgId,
                action: 'org.updated',
                target: { orgId: req.params.orgId },
                metadata: { changedFields: Object.keys(setFields) }
            }).catch(() => {});
            return res.json({ ok: true, org: result });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update organisation.' });
        }
    });

    app.post('/api/admin/orgs/:orgId/reset-password', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }
            const hashed = await bcrypt.hash(newPassword, 10);
            const result = await db.collection('organisations').findOneAndUpdate(
                { orgId: req.params.orgId },
                { $set: { passwordHash: hashed } },
                { returnDocument: 'after' }
            );
            if (!result) return res.status(404).json({ error: 'Organisation not found.' });
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reset password.' });
        }
    });

    app.delete('/api/admin/orgs/:orgId/workers/:username', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { orgId, username } = req.params;
            const result = await db.collection('workers').deleteOne({ username, orgId });
            if (result.deletedCount === 0) return res.status(404).json({ error: 'Worker not found.' });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId,
                action: 'worker.removed',
                target: { username },
                metadata: { initiatedBy: 'platform_admin' }
            }).catch(() => {});
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to delete worker.' });
        }
    });

    // Admin: reassign a single worker's company type (e.g. production worker at a company that also does distribution)
    app.patch('/api/admin/orgs/:orgId/workers/:username/company-type', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { orgId, username } = req.params;
            const { companyType } = req.body;
            const validTypes = ['production', 'distribution', 'pharmacy', 'clinic'];
            if (!companyType || !validTypes.includes(companyType.toLowerCase())) {
                return res.status(400).json({ error: `companyType must be one of: ${validTypes.join(', ')}` });
            }
            const result = await db.collection('workers').findOneAndUpdate(
                { username, orgId },
                { $set: { companyType: companyType.toLowerCase() } },
                { returnDocument: 'after', projection: { _id: 0, passwordHash: 0 } }
            );
            if (!result) return res.status(404).json({ error: 'Worker not found.' });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId,
                action: 'worker.company_type_changed',
                target: { username },
                metadata: { newCompanyType: companyType.toLowerCase() }
            }).catch(() => {});
            return res.json({ ok: true, worker: result });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to update worker company type.' });
        }
    });

    app.post('/api/admin/orgs/:orgId/workers/:username/reset-password', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const { orgId, username } = req.params;
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }
            const hashed = await bcrypt.hash(newPassword, 10);
            const result = await db.collection('workers').findOneAndUpdate(
                { username, orgId },
                { $set: { passwordHash: hashed } },
                { returnDocument: 'after' }
            );
            if (!result) return res.status(404).json({ error: 'Worker not found.' });
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to reset password.' });
        }
    });

    // ── Audit Log Endpoints ──────────────────────────────────────────────────

    const AUDIT_SIZE_LIMIT = 4 * 1024 * 1024 * 1024; // 4 GB

    // Worker activity log
    app.get('/api/worker/activity', authMiddleware, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            if (req.user?.type !== 'worker') return res.status(403).json({ error: 'Workers only.' });
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
            const skip = (page - 1) * limit;
            const col = db.collection('worker_activity_log');
            const [entries, total] = await Promise.all([
                col.find({ username: req.user.sub }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
                col.countDocuments({ username: req.user.sub })
            ]);
            return res.json({ entries, total, page, limit });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load activity.' });
        }
    });

    // Org audit log
    app.get('/api/org/audit', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
            const skip = (page - 1) * limit;
            const filter = { orgId: req.user.orgId };
            if (req.query.action) filter.action = req.query.action;
            if (req.query.worker) filter['actor.username'] = req.query.worker;
            const col = db.collection('org_audit_log');
            const [entries, total] = await Promise.all([
                col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
                col.countDocuments(filter)
            ]);
            return res.json({ entries, total, page, limit });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load audit log.' });
        }
    });

    app.get('/api/org/audit/storage', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const stats = await db.command({ collStats: 'org_audit_log' }).catch(() => ({ storageSize: 0 }));
            return res.json({ storageBytes: stats.storageSize || 0, limitBytes: AUDIT_SIZE_LIMIT });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to check storage.' });
        }
    });

    app.get('/api/org/audit/export', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const col = db.collection('org_audit_log');
            const cursor = col.find({ orgId: req.user.orgId }).sort({ createdAt: 1 });
            const date = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="org-audit-log-${date}.csv"`);
            res.setHeader('Transfer-Encoding', 'chunked');
            res.write('timestamp,actor_username,actor_type,action,target,metadata\n');
            for await (const doc of cursor) {
                const row = [
                    doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
                    doc.actor?.username || '',
                    doc.actor?.type || '',
                    doc.action || '',
                    JSON.stringify(doc.target || {}),
                    JSON.stringify(doc.metadata || {})
                ].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
                res.write(row + '\n');
            }
            res.end();
        } catch (error) {
            if (!res.headersSent) return res.status(500).json({ error: error.message || 'Export failed.' });
            res.end();
        }
    });

    app.post('/api/org/audit/reset', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            await db.collection('org_audit_log').deleteMany({ orgId: req.user.orgId });
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'org_admin' },
                orgId: req.user.orgId,
                action: 'audit.org_reset',
                target: {},
                metadata: {}
            }).catch(() => {});
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Reset failed.' });
        }
    });

    // Org medications (read-only view for org admins)
    app.get('/api/org/medications', authMiddleware, requireOrgAdmin, async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const org = await db.collection('organisations').findOne({ orgId: req.user.orgId });
            if (!org) return res.status(404).json({ error: 'Organisation not found.' });
            const result = await contract.evaluateTransaction('getAllMedications');
            const medications = parseChaincodeJson(result);
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
                    distributionCompany: status.distributionCompany || med.distributionCompany || '',
                    pharmacyCompany: status.pharmacyCompany || med.pharmacyCompany || '',
                    statusUpdatedAt: status.updatedAt,
                    statusUpdatedBy: status.updatedBy,
                    statusUpdatedByCompanyType: status.updatedByCompanyType,
                    statusUpdatedByCompanyName: status.updatedByCompanyName
                };
            });
            const companyLower = (org.companyName || '').toLowerCase();
            const orgRole = (org.companyType || '').toLowerCase();
            const visible = merged.filter((med) => {
                if (orgRole === 'production')
                    return (med.productionCompany || '').toLowerCase() === companyLower;
                if (orgRole === 'distribution')
                    return (med.distributionCompany || '').toLowerCase() === companyLower;
                if (orgRole === 'pharmacy' || orgRole === 'clinic')
                    return (med.pharmacyCompany || '').toLowerCase() === companyLower;
                return false;
            });
            return res.json(visible);
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    // Platform audit log
    app.get('/api/admin/audit', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
            const skip = (page - 1) * limit;
            const filter = {};
            if (req.query.action) filter.action = req.query.action;
            if (req.query.org) filter.orgId = req.query.org;
            const col = db.collection('platform_audit_log');
            const [entries, total] = await Promise.all([
                col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
                col.countDocuments(filter)
            ]);
            return res.json({ entries, total, page, limit });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to load audit log.' });
        }
    });

    app.get('/api/admin/audit/storage', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const [orgStats, platformStats] = await Promise.all([
                db.command({ collStats: 'org_audit_log' }).catch(() => ({ storageSize: 0 })),
                db.command({ collStats: 'platform_audit_log' }).catch(() => ({ storageSize: 0 }))
            ]);
            return res.json({
                orgAuditBytes: orgStats.storageSize || 0,
                platformAuditBytes: platformStats.storageSize || 0,
                limitBytes: AUDIT_SIZE_LIMIT
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to check storage.' });
        }
    });

    app.get('/api/admin/audit/export', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            const col = db.collection('platform_audit_log');
            const cursor = col.find({}).sort({ createdAt: 1 });
            const date = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="platform-audit-log-${date}.csv"`);
            res.setHeader('Transfer-Encoding', 'chunked');
            res.write('timestamp,actor_username,actor_type,org_id,action,target,metadata\n');
            for await (const doc of cursor) {
                const row = [
                    doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
                    doc.actor?.username || '',
                    doc.actor?.type || '',
                    doc.orgId || '',
                    doc.action || '',
                    JSON.stringify(doc.target || {}),
                    JSON.stringify(doc.metadata || {})
                ].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
                res.write(row + '\n');
            }
            res.end();
        } catch (error) {
            if (!res.headersSent) return res.status(500).json({ error: error.message || 'Export failed.' });
            res.end();
        }
    });

    app.post('/api/admin/audit/reset', authMiddleware, requireAdmin(db), async (req, res) => {
        try {
            if (!db) return res.status(501).json({ error: 'Requires MONGODB_URI.' });
            await db.collection('platform_audit_log').drop().catch(() => {});
            db.collection('platform_audit_log').createIndex({ createdAt: -1 }).catch(() => {});
            db.collection('platform_audit_log').createIndex({ orgId: 1, createdAt: -1 }).catch(() => {});
            writeAuditLogs(db, {
                actor: { username: req.user.sub, type: 'platform_admin' },
                orgId: null,
                action: 'audit.platform_reset',
                target: {},
                metadata: {}
            }).catch(() => {});
            return res.json({ ok: true });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Reset failed.' });
        }
    });

    // ── Medication Endpoints ────────────────────────────────────────────────

    app.use('/api/medications', authMiddleware);
    app.use('/api/medications', requireApproved(db));

    app.post('/api/medications/batch/received', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
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
            if (succeeded.length > 0) {
                const actor = buildActor(req, user);
                writeAuditLogs(db, {
                    actor, orgId: user.orgId || null,
                    action: 'medication.batch_received',
                    target: { serialNumbers: succeeded.map(s => s.serialNumber), count: succeeded.length },
                    metadata: {}
                }).catch(() => {});
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
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
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
                    const skipDist = !current.distributionCompany && current.status === 'manufactured';
                    if (current.status !== 'received' && !skipDist) {
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
            if (succeeded.length > 0) {
                const actor = buildActor(req, user);
                writeAuditLogs(db, {
                    actor, orgId: user.orgId || null,
                    action: 'medication.batch_arrived',
                    target: { serialNumbers: succeeded.map(s => s.serialNumber), count: succeeded.length },
                    metadata: {}
                }).catch(() => {});
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
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
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
            const productionCompany = user.companyName;
            const {
                gtin,
                batchNumber,
                expiryDate,
                serialNumber,
                medicationName,
                distributionCompany = '',
                pharmacyCompany = ''
            } = req.body;
            if (
                !gtin ||
                !batchNumber ||
                !expiryDate ||
                !serialNumber ||
                !medicationName
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
                        pharmacyCompany,
                        distributionCompany,
                        updatedAt: now,
                        updatedBy: user.username,
                        updatedByCompanyType: user.companyType || '',
                        updatedByCompanyName: user.companyName || ''
                    }
                },
                { upsert: true }
            );
            await auditCollection.insertOne(buildAuditEntry(serialNumber, 'manufactured', user));
            const actor = buildActor(req, user);
            writeAuditLogs(db, {
                actor, orgId: user.orgId || null,
                action: 'medication.manufactured',
                target: { serialNumber },
                metadata: { medicationName, batchNumber }
            }).catch(() => {});
            res.status(201).json({
                id: serialNumber,
                qrHash
            });
        } catch (error) {
            console.error('[addMedication error]', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.post('/api/medications/bulk', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) return res.status(401).json({ error: 'Invalid user.' });
            const role = getCompanyRole(user);
            if (role !== 'production') {
                return res.status(403).json({ error: 'Only production companies can add medications.' });
            }
            const { medications } = req.body;
            if (!Array.isArray(medications) || medications.length === 0) {
                return res.status(400).json({ error: 'medications must be a non-empty array.' });
            }
            if (medications.length > 100) {
                return res.status(400).json({ error: 'Maximum 100 medications per import.' });
            }
            const productionCompany = user.companyName;
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const results = await Promise.allSettled(medications.map(async (row) => {
                const { serialNumber, medicationName, gtin, batchNumber, expiryDate, distributionCompany = '', pharmacyCompany = '' } = row;
                if (!serialNumber || !medicationName || !gtin || !batchNumber || !expiryDate) {
                    throw new Error('Missing required fields.');
                }
                const qrHashSource = `${batchNumber}${expiryDate}${serialNumber}`;
                const qrHash = crypto.createHash('sha256').update(qrHashSource).digest('hex');
                await contract.submitTransaction('addMedication', serialNumber, medicationName, gtin, batchNumber, expiryDate, productionCompany, distributionCompany, qrHash);
                const now = new Date();
                await statusCollection.updateOne(
                    { serialNumber },
                    { $set: { serialNumber, status: 'manufactured', pharmacyCompany, distributionCompany, updatedAt: now, updatedBy: user.username, updatedByCompanyType: user.companyType || '', updatedByCompanyName: user.companyName || '' } },
                    { upsert: true }
                );
                await auditCollection.insertOne(buildAuditEntry(serialNumber, 'manufactured', user));
                return { serialNumber, qrHash };
            }));
            const succeeded = [];
            const failed = [];
            results.forEach((result, i) => {
                const serialNumber = medications[i]?.serialNumber || '';
                if (result.status === 'fulfilled') {
                    succeeded.push(result.value);
                } else {
                    failed.push({ serialNumber, error: result.reason?.message || 'Failed.' });
                }
            });
            if (succeeded.length > 0) {
                const actor = buildActor(req, user);
                writeAuditLogs(db, {
                    actor, orgId: user.orgId || null,
                    action: 'medication.bulk_manufactured',
                    target: { serialNumbers: succeeded.map(s => s.serialNumber), count: succeeded.length },
                    metadata: {}
                }).catch(() => {});
            }
            return res.json({ succeeded, failed });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Bulk import failed.' });
        }
    });

    app.patch('/api/medications/:id/assign', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
            }
            const user = await loadUserForRequest(db, req);
            if (!user) return res.status(401).json({ error: 'Invalid user.' });
            const role = getCompanyRole(user);
            if (role !== 'production') {
                return res.status(403).json({ error: 'Only production companies can assign supply chain partners.' });
            }
            const serialNumber = req.params.id;
            if (!serialNumber) return res.status(400).json({ error: 'Medication id is required.' });
            const { distributionCompany, pharmacyCompany } = req.body;
            if (distributionCompany === undefined && pharmacyCompany === undefined) {
                return res.status(400).json({ error: 'Provide distributionCompany and/or pharmacyCompany.' });
            }
            const statusCollection = db.collection('medication_status');
            const auditCollection = db.collection('medication_audits');
            const update = {};
            if (distributionCompany !== undefined) update.distributionCompany = distributionCompany;
            if (pharmacyCompany !== undefined) update.pharmacyCompany = pharmacyCompany;
            update.updatedAt = new Date();
            update.updatedBy = user.username;
            update.updatedByCompanyType = user.companyType || '';
            update.updatedByCompanyName = user.companyName || '';
            await statusCollection.updateOne({ serialNumber }, { $set: update }, { upsert: true });
            await auditCollection.insertOne({
                serialNumber,
                action: 'assign',
                createdAt: new Date(),
                actorUsername: user.username,
                actorCompanyType: user.companyType || '',
                actorCompanyName: user.companyName || '',
                metadata: { distributionCompany, pharmacyCompany }
            });
            const actor = buildActor(req, user);
            writeAuditLogs(db, {
                actor, orgId: user.orgId || null,
                action: 'medication.assign',
                target: { serialNumber },
                metadata: { distributionCompany, pharmacyCompany }
            }).catch(() => {});
            return res.json({ ok: true, serialNumber, ...update });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    });

    app.post('/api/medications/:id/received', async (req, res) => {
        try {
            if (!usersCollection) {
                return res.status(501).json({ error: 'Medication actions require MONGODB_URI.' });
            }
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
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
            const actor = buildActor(req, user);
            writeAuditLogs(db, {
                actor, orgId: user.orgId || null,
                action: 'medication.received',
                target: { serialNumber },
                metadata: {}
            }).catch(() => {});
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
            if (req.user?.type === 'org') {
                return res.status(403).json({ error: 'Organisation admins cannot perform medication operations.' });
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
            const skipDist = !current.distributionCompany && current.status === 'manufactured';
            if (current.status !== 'received' && !skipDist) {
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
            const actor = buildActor(req, user);
            writeAuditLogs(db, {
                actor, orgId: user.orgId || null,
                action: 'medication.arrived',
                target: { serialNumber },
                metadata: {}
            }).catch(() => {});
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
                    distributionCompany: status.distributionCompany || med.distributionCompany || '',
                    pharmacyCompany: status.pharmacyCompany || med.pharmacyCompany || '',
                    statusUpdatedAt: status.updatedAt,
                    statusUpdatedBy: status.updatedBy,
                    statusUpdatedByCompanyType: status.updatedByCompanyType,
                    statusUpdatedByCompanyName: status.updatedByCompanyName
                };
            });
            const requestUser = await loadUserForRequest(db, req);
            const requestRole = requestUser ? getCompanyRole(requestUser) : null;
            const companyLower = (requestUser?.companyName || '').toLowerCase();
            const isAdmin = !!(requestUser?.isAdmin || isAdminUser(requestUser?.username || ''));
            const visible = isAdmin ? merged : merged.filter((med) => {
                if (requestRole === 'production')
                    return (med.productionCompany || '').toLowerCase() === companyLower;
                if (requestRole === 'distribution')
                    return (med.distributionCompany || '').toLowerCase() === companyLower;
                if (requestRole === 'pharmacy' || requestRole === 'clinic')
                    return (med.pharmacyCompany || '').toLowerCase() === companyLower;
                return false;
            });
            res.json(visible);
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
            const requestUser = await loadUserForRequest(db, req);
            const requestRole = requestUser ? getCompanyRole(requestUser) : null;
            const companyLower = (requestUser?.companyName || '').toLowerCase();
            const isAdmin = !!(requestUser?.isAdmin || isAdminUser(requestUser?.username || ''));
            if (!isAdmin) {
                const allowed =
                    (requestRole === 'production' && (medication.productionCompany || '').toLowerCase() === companyLower) ||
                    (requestRole === 'distribution' && (medication.distributionCompany || '').toLowerCase() === companyLower) ||
                    ((requestRole === 'pharmacy' || requestRole === 'clinic') && (medication.pharmacyCompany || '').toLowerCase() === companyLower);
                if (!allowed) {
                    return res.status(403).json({ error: 'Access denied.' });
                }
            }
            const statusCollection = db.collection('medication_status');
            const status = await statusCollection.findOne({ serialNumber });
            if (!status) {
                return res.json(medication);
            }
            return res.json({
                ...medication,
                status: status.status,
                distributionCompany: status.distributionCompany || medication.distributionCompany || '',
                pharmacyCompany: status.pharmacyCompany || medication.pharmacyCompany || '',
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

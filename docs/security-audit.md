# Security Audit Report

**Date:** 2026-02-11
**Scope:** Full stack (backend, frontend, chaincode, infrastructure)

---

## Critical (3)

### C1 - Hardcoded Default Credentials in docker-compose.local.yml

**File:** `docker-compose.local.yml:9-10`

The dev compose file ships with `AUTH_JWT_SECRET: "devsecret"` and `AUTH_USERS: '[{"username":"admin","password":"admin"}]'`. If used outside local dev, any attacker can forge valid JWTs and log in immediately.

**Fix:** Remove all credential values from the compose file; require them via `.env` injection only. Never commit plaintext passwords.

---

### C2 - Plaintext Password Fallback in Authentication

**File:** `blockchain/server/server.js:141-143`

Users configured via `AUTH_USERS` env can carry a plain `password` field compared with `===`, bypassing bcrypt entirely. The `.env.backend.example` demonstrates this pattern.

**Fix:** Reject any user record without a `passwordHash` at startup; refuse to fall back to plaintext comparison.

---

### C3 - JWT Secret Validated at Request Time, Not Boot

**File:** `blockchain/server/server.js:148, 171, 307`

`requireEnv('AUTH_JWT_SECRET')` is called inside `createToken` and `createAuthMiddleware` on every request, not at startup. If absent or empty, every request throws a 500 with the env var name leaked in the JSON error body.

**Fix:** Validate `AUTH_JWT_SECRET` once at application startup in `main()` and refuse to start if missing or shorter than 32 characters.

---

## High (7)

### H1 - No Rate Limiting on Login or Signup

**File:** `blockchain/server/server.js:277, 311`

`POST /api/auth/login` and `POST /api/auth/signup` have no brute-force protection. No `express-rate-limit` or equivalent exists anywhere in the codebase.

**Fix:** Add `express-rate-limit` (e.g., 10 attempts/minute per IP) on `/api/auth/login` and `/api/auth/signup`.

---

### H2 - QR Hash Endpoint Returns Full Record to All Roles

**File:** `blockchain/server/server.js:579`

`GET /api/medications/by-hash/:hash` returns full medication details (including company names) without any role-based filtering. The hash is a public value printed on physical packaging.

**Fix:** Add an explicit `authMiddleware` parameter on this route for defence-in-depth; review whether full records should be filtered based on caller role.

---

### H3 - No Security Headers (Missing helmet)

**File:** `blockchain/server/server.js:241`

The Express app has no `helmet` middleware. Responses lack `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, and `X-XSS-Protection`.

**Fix:** Add `const helmet = require('helmet'); app.use(helmet());` after `const app = express();`.

---

### H4 - QR Scanner Raw Decoded Text Not Validated

**File:** `frontend/src/components/QrScanner.tsx:41-44`

The `onScan` callback receives `decodedText` directly from the camera without sanitisation or format validation. Malicious QR codes with excessively long strings pass straight through to the API.

**Fix:** Validate scanned values client-side against the expected serial format (e.g., `/^[A-Za-z0-9\-]{1,50}$/`) before adding to the batch queue.

---

### H5 - Dev CORS Origins Always Injected in Production

**File:** `blockchain/server/server.js:32-39`

`parseAllowedOrigins()` unconditionally appends `localhost:3000`, `127.0.0.1:3000`, `localhost:5173`, and `127.0.0.1:5173` to allowed CORS origins regardless of environment. In production, a developer's local browser can make credentialed requests to the production API.

**Fix:** Only include dev origins when `NODE_ENV !== 'production'`.

---

### H6 - Weak JWT Secret in Example Env File

**File:** `.env.backend.example:4`

`AUTH_JWT_SECRET=change-me` is 9 characters, predictable, and appears in the public repo. Example files are commonly copy-pasted verbatim.

**Fix:** Replace with a comment instructing users to generate a 256-bit random string (e.g., `openssl rand -hex 32`). Add startup validation rejecting secrets shorter than 32 characters.

---

### H7 - Admin Privilege Escalation via Username Match at Signup

**File:** `blockchain/server/server.js:333`

When a new user signs up, `isAdminUser(username)` is called to set `isAdmin`. Any user who registers with a username matching an entry in `ADMIN_USERNAMES` env var automatically becomes an admin. The env var value `admin` is shown in `.env.backend.example`.

**Fix:** Prevent public signup for admin usernames, or require admin accounts to be pre-seeded with `passwordHash` and elevated separately.

---

## Medium (9)

### M1 - No Field Length/Format Validation on Medication Fields

**File:** `blockchain/server/server.js:622-654`

`serialNumber`, `medicationName`, `gtin`, `batchNumber`, `expiryDate`, `productionCompany`, and `distributionCompany` are accepted without format, length, or character-set validation before being passed to chaincode and MongoDB.

**Fix:** Enforce max lengths (e.g., 100 chars) and character whitelists on all medication fields.

---

### M2 - MongoDB Has No Authentication Credentials

**File:** `docker-compose.local.yml:12`

MongoDB is deployed with no username/password. Any compromised container on the `fabric_test` network has full unauthenticated read/write access to the database, including the `users` collection.

**Fix:** Enable MongoDB authentication and include credentials in the URI.

---

### M3 - MongoDB Reachable by All Fabric Network Containers

**File:** `docker-compose.local.yml:51-54`

`fabric_test` is declared `external: true`, meaning all containers in the broader Fabric network (peers, orderers, CAs) can reach MongoDB on port 27017.

**Fix:** Place MongoDB on its own isolated network accessible only to the `api` container.

---

### M4 - TTL Index Re-Created on Every Logout Request

**File:** `blockchain/server/server.js:428`

`createIndex` is called inside the logout handler on every logout request instead of once at startup.

**Fix:** Move the `createIndex` call to application initialisation in `main()`.

---

### M5 - Audit Trail Readable by All Authenticated Roles

**File:** `blockchain/server/server.js:775-793`

Any authenticated user can query the full audit trail of any medication, including `actorUsername`, `actorCompanyType`, and `actorCompanyName` for every operation.

**Fix:** Restrict audit trail access to admin users, or filter returned fields to remove `actorUsername`.

---

### M6 - Batch Endpoints: No Per-Item Type or Length Validation

**File:** `blockchain/server/server.js:478, 542`

Batch handlers cap at 500 items but do not validate individual serial content. A single entry could be an object, array, or 1MB string — all coerced via `String(serial).trim()`.

**Fix:** Reject any element that is not a non-empty string under ~100 characters.

---

### M7 - Raw error.message Returned in All 500 Responses

**File:** `blockchain/server/server.js:307, 413, 511, 575, 679, 725, 770, 820, 853`

Every `catch` block returns `error.message` to the client. Node.js error messages from MongoDB, crypto, and Fabric can contain connection strings, file paths, and key material references.

**Fix:** Log the full error server-side; return a generic message to the client for 500-class errors.

---

### M8 - companyName Has No Max Length or Character Restriction

**File:** `blockchain/server/server.js:377-379`

The only validation on `companyName` is `length < 2`. No upper length limit or character restriction exists. The value is stored and returned in API responses and written into audit logs and chaincode.

**Fix:** Add a maximum length (e.g., 120 chars) and optionally a character-set restriction.

---

### M9 - isAdmin Omitted from Profile Update Response

**File:** `blockchain/server/server.js:394-411`

The `POST /api/auth/profile` response omits `isAdmin`. After a profile save, the frontend updates `profile` state from this response, silently dropping the `isAdmin` flag and hiding admin controls mid-session.

**Fix:** Include `isAdmin` in the profile update response.

---

## Low (8)

### L1 - JWT Stored in localStorage

**File:** `frontend/src/hooks/useAuth.ts:27-31, 148, 202`

The JWT token is stored in `localStorage`. Any XSS vulnerability in any frontend dependency can exfiltrate the token.

**Fix:** Use `HttpOnly` cookies for JWT storage with server-side cookie handling and CSRF protection.

---

### L2 - No CSRF Protection

Since JWTs are sent via `Authorization` header, CSRF is not currently exploitable. However, if tokens are moved to cookies (see L1), no CSRF middleware exists.

**Fix:** When cookies are adopted, add `SameSite=Strict` cookie attribute or `csurf` middleware.

---

### L3 - Chaincode Allows Duplicate Serial Number Overwrite

**File:** `blockchain/chaincode/index.js:29`

`addMedication` writes to ledger state without checking for key existence. Concurrent requests with the same serial number silently overwrite the first record.

**Fix:** Add a `getState(serialNumber)` existence check and throw if the key already exists.

---

### L4 - react-scripts@5.0.1 is EOL

**File:** `frontend/package.json:10`

`react-scripts@5.0.1` (2022) is unmaintained with known dependency vulnerabilities. Build-tool concern, not runtime.

**Fix:** Migrate to Vite or upgrade to a maintained build toolchain.

---

### L5 - No MongoDB Connection Timeouts

**File:** `blockchain/server/server.js:921`

`MongoClient` is created with no `serverSelectionTimeoutMS`, `connectTimeoutMS`, or pool size limits. A MongoDB outage causes all API requests to hang indefinitely.

**Fix:** Pass `{ serverSelectionTimeoutMS: 3000 }` to `MongoClient`.

---

### L6 - Full Medication List Exposed to All Roles Without Pagination

**File:** `blockchain/server/server.js:795`

`GET /api/medications` returns a full dump of all medication records including company names, serial numbers, and QR hashes to any authenticated user.

**Fix:** Add role-based filtering or confirm intentionality; consider pagination.

---

### L7 - No Explicit JSON Body Size Limit

**File:** `blockchain/server/server.js:243`

`express.json()` uses the default 100kb limit. The batch endpoints with 500 serial numbers approach this limit.

**Fix:** Set an explicit limit: `express.json({ limit: '50kb' })` and confirm the batch cap fits within it.

---

### L8 - Committed .env Inside fabric-samples

**File:** `blockchain/fabric-samples/token-sdk/explorer/.env`

This file is committed to the repository. If it contains real credentials, they are exposed.

**Fix:** Audit this file; if it contains real secrets, rotate them and add to `.gitignore`.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 7 |
| Medium | 9 |
| Low | 8 |
| **Total** | **27** |

**Most urgent:** C2 (plaintext password fallback), H7 (admin escalation via signup), H1 (no rate limiting), H5 (dev CORS in production).

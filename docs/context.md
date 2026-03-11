# LedgRX - Project Context

## What is LedgRX?

LedgRX is a **blockchain-based pharmaceutical supply chain tracking system** built as a BSc Computer Science final-year project (COMP 3000) at the University of Plymouth, supervised by Ji-Jian Chin. It provides end-to-end visibility into the manufacturing and distribution of prescription medications, using **Hyperledger Fabric** as its blockchain layer. The goal is to reduce counterfeit medication risk by creating transparency and tamper-proof provenance across the UK pharmaceutical supply chain.

---

## Architecture Overview

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Frontend (Web)  │   │   Mobile App     │   │                  │
│   React + TS      │   │   React Native   │   │   Admin Portal   │
│   Vercel          │   │   QR Scanner     │   │   (in frontend)  │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │ REST API
                      ┌─────────▼─────────┐
                      │   Express.js API   │
                      │   Port 3001        │
                      │   JWT + WebAuthn   │
                      └──┬─────────────┬───┘
                         │             │
              ┌──────────▼──┐    ┌─────▼──────────┐
              │  MongoDB    │    │ Hyperledger     │
              │  (off-chain)│    │ Fabric Network  │
              │  Port 27017 │    │ (on-chain)      │
              └─────────────┘    └─────────────────┘
```

### Hybrid Storage Model
- **On-chain (Fabric)**: Immutable medication records (serial number, GTIN, batch, expiry, QR hash)
- **Off-chain (MongoDB)**: Mutable data — user accounts, organisations, workers, medication status, audit logs, token blacklists, WebAuthn credentials, invite tokens
- This design addresses GDPR "right to be forgotten" concerns: personal/mutable data stays off-chain

---

## Directory Structure

```
comp-3000-repository/
├── blockchain/
│   ├── chaincode/           # Hyperledger Fabric smart contract (JavaScript)
│   │   ├── index.js         # PharmaContract: addMedication, getMedication, getAllMedications
│   │   └── package.json     # fabric-contract-api, fabric-shim
│   ├── server/              # Express.js backend API
│   │   ├── server.js        # Main server (~1700+ lines) - all routes + Fabric gateway
│   │   ├── Dockerfile       # Node 20 Alpine
│   │   ├── __tests__/       # server.test.js
│   │   └── package.json     # express, @simplewebauthn/server, @hyperledger/fabric-gateway, mongodb, jsonwebtoken
│   ├── fabric-samples/      # Hyperledger Fabric test-network (submodule/copy)
│   ├── docker-compose.backend.yml  # API + MongoDB containers
│   ├── up.sh                # Starts Fabric network + deploys chaincode + starts API
│   └── down.sh              # Tears down everything
├── frontend/                # React web application (TypeScript)
│   ├── src/
│   │   ├── App.tsx          # Root component - routing + state orchestration
│   │   ├── types.ts         # Medication, AuditEntry, UserProfile, OrgWorker, Toast, AuthMode
│   │   ├── pages/           # 20+ page components
│   │   ├── hooks/           # Custom hooks (auth, medications, routing, etc.)
│   │   ├── components/      # DashboardLayout, MarketingNav, MarketingFooter, HeroChainBackdrop
│   │   └── utils/api.ts     # API base URL resolution
│   └── package.json         # react 18, @simplewebauthn/browser, qrcode.react, lucide-react, typescript
├── mobile-app/              # React Native QR scanner app
│   ├── App.tsx              # Camera-based QR scanner → API lookup
│   └── package.json         # react-native, react-native-vision-camera
├── architecture/
│   ├── system-design.md     # Detailed architecture document
│   └── system-architecture.png
├── deploy/
│   ├── nginx-ledgrx.conf    # Nginx reverse proxy config
│   └── systemd/             # Systemd service files
├── scripts/
│   ├── vps-up.sh            # VPS deployment script (Fabric + API)
│   ├── vps-down.sh          # VPS teardown
│   ├── vps-setup.sh         # Initial VPS setup
│   └── vps-bootstrap.sh     # Bootstrap dependencies
├── docs/                    # Documentation
├── dev-log/                 # Development journal
├── .env.backend.example     # Environment variable template
├── .github/workflows/ci.yml # CI pipeline (frontend + server tests)
└── README.md                # Project overview + Gantt chart
```

---

## Key Technologies

| Layer           | Technology                              |
|-----------------|-----------------------------------------|
| Blockchain      | Hyperledger Fabric 2.5.14               |
| Chaincode       | JavaScript (fabric-contract-api)        |
| Backend API     | Node.js + Express.js                    |
| Database        | MongoDB 7                               |
| Auth            | FIDO2/WebAuthn (passkeys) + JWT         |
| WebAuthn lib    | @simplewebauthn/server v13 (backend)    |
|                 | @simplewebauthn/browser (frontend)      |
| Frontend        | React 18 + TypeScript                   |
| Mobile          | React Native + Vision Camera            |
| QR Generation   | qrcode.react (frontend)                 |
| Icons           | lucide-react                            |
| Containerisation| Docker + Docker Compose                 |
| CI/CD           | GitHub Actions                          |
| Hosting         | Vercel (frontend), VPS (backend)        |
| Reverse Proxy   | Nginx                                   |

---

## Authentication System (WebAuthn / Passkeys)

All authentication uses **FIDO2 passkeys** — no passwords anywhere in the system.

### Three JWT token types
| Type       | Who             | Token field `type` | Dashboard route |
|------------|-----------------|--------------------|-----------------|
| `platform` | Site admins     | `platform`         | `/app`          |
| `org`      | Org admins      | `org`              | `/org`          |
| `worker`   | Org workers     | `worker`           | `/app`          |

JWT tokens are stored in `localStorage` as `authToken` + `authTokenType`.

### Registration flows
- **Platform admin**: `/setup` → bootstrap endpoint creates user + returns registration options → `startRegistration` in browser → complete endpoint
- **Org admin**: `/signup` → org record created → `startRegistration` → complete endpoint → pending approval
- **Worker**: org admin creates worker → unique invite URL generated → worker opens `/invite/:token` → `startRegistration` → auto-signed in

### Login flows
All three types: enter username → `begin` endpoint returns authentication options → `startAuthentication` in browser → `complete` endpoint verifies + returns JWT

### Passkey reset (admin-initiated)
- **Org admin reset**: Platform admin clicks "Reset passkey" on org → credentials deleted → one-time URL generated → org admin opens `/org/register-passkey?token=...&username=...` → re-registers passkey
- **Worker reset**: Platform admin clicks "Reset passkey" on worker → credentials deleted → same invite URL flow as new worker onboarding

### Backup passkey
Platform admin can register additional passkeys (e.g. USB security key) from the Security section of the admin dashboard. Multiple credentials stored per user; any can be used to authenticate.

---

## Chaincode (Smart Contract)

**File**: `blockchain/chaincode/index.js`

The `PharmaContract` extends Fabric's `Contract` class with three functions:

1. **`addMedication(serialNumber, medicationName, gtin, batchNumber, expiryDate, productionCompany, distributionCompany, qrHash)`**
2. **`getMedication(serialNumber)`**
3. **`getAllMedications()`**

---

## Backend API

**File**: `blockchain/server/server.js` (~1700+ lines, monolithic Express app)

### MongoDB Collections
| Collection            | Purpose                                                   |
|-----------------------|-----------------------------------------------------------|
| `users`               | Platform admin accounts (`isAdmin: true`)                 |
| `organisations`       | Org admin accounts + approval status                      |
| `workers`             | Worker accounts linked to an org                          |
| `webauthn_credentials`| FIDO2 credential storage for all user types               |
| `webauthn_challenges` | Short-lived registration/authentication challenges (5min TTL) |
| `worker_invites`      | Invite + passkey reset tokens (48h TTL)                   |
| `token_blacklist`     | Revoked JWTs (TTL-indexed)                                |
| `medication_status`   | Current supply chain status per medication                |
| `medication_audits`   | Timestamped audit trail entries                           |

### API Endpoints

#### Health
| Method | Path          | Auth | Description  |
|--------|---------------|------|--------------|
| GET    | `/api/health` | No   | Health check |

#### Platform Admin — WebAuthn
| Method | Path                                  | Auth  | Description                        |
|--------|---------------------------------------|-------|------------------------------------|
| POST   | `/api/admin/bootstrap`                | No    | First-time admin setup             |
| POST   | `/api/auth/webauthn/register/begin`   | No    | Begin passkey registration         |
| POST   | `/api/auth/webauthn/register/complete`| No    | Complete passkey registration      |
| POST   | `/api/auth/webauthn/login/begin`      | No    | Begin passkey authentication       |
| POST   | `/api/auth/webauthn/login/complete`   | No    | Complete passkey authentication    |
| GET    | `/api/admin/webauthn/backup`          | Admin | List registered passkeys           |
| POST   | `/api/admin/webauthn/backup/begin`    | Admin | Begin backup passkey registration  |
| POST   | `/api/admin/webauthn/backup/complete` | Admin | Complete backup passkey registration |

#### Org Admin — WebAuthn
| Method | Path                                  | Auth | Description                        |
|--------|---------------------------------------|------|------------------------------------|
| GET    | `/api/org/invite/:token`              | No   | Validate org passkey reset token   |
| POST   | `/api/org/webauthn/register/begin`    | No   | Begin org passkey registration     |
| POST   | `/api/org/webauthn/register/complete` | No   | Complete org passkey registration  |
| POST   | `/api/org/webauthn/login/begin`       | No   | Begin org passkey login            |
| POST   | `/api/org/webauthn/login/complete`    | No   | Complete org passkey login         |

#### Worker — WebAuthn
| Method | Path                                     | Auth | Description                        |
|--------|------------------------------------------|------|------------------------------------|
| GET    | `/api/worker/invite/:token`              | No   | Validate worker invite/reset token |
| POST   | `/api/worker/webauthn/register/begin`    | No   | Begin worker passkey registration  |
| POST   | `/api/worker/webauthn/register/complete` | No   | Complete worker passkey registration |
| POST   | `/api/worker/webauthn/login/begin`       | No   | Begin worker passkey login         |
| POST   | `/api/worker/webauthn/login/complete`    | No   | Complete worker passkey login      |

#### Platform Admin — Org Management
| Method | Path                                              | Auth  | Description                         |
|--------|---------------------------------------------------|-------|-------------------------------------|
| GET    | `/api/admin/orgs`                                 | Admin | List all organisations              |
| POST   | `/api/admin/orgs/:orgId/approve`                  | Admin | Approve organisation                |
| POST   | `/api/admin/orgs/:orgId/reject`                   | Admin | Reject organisation                 |
| DELETE | `/api/admin/orgs/:orgId`                          | Admin | Delete organisation + workers       |
| PATCH  | `/api/admin/orgs/:orgId`                          | Admin | Update org details                  |
| DELETE | `/api/admin/orgs/:orgId/passkeys`                 | Admin | Reset org admin passkey (returns URL) |
| GET    | `/api/admin/orgs/:orgId/workers`                  | Admin | List workers for an org             |
| DELETE | `/api/admin/orgs/:orgId/workers/:username`        | Admin | Remove a worker                     |
| DELETE | `/api/admin/orgs/:orgId/workers/:username/passkeys` | Admin | Reset worker passkey (returns URL)  |

#### Org Admin — Worker Management
| Method | Path                         | Auth | Description                          |
|--------|------------------------------|------|--------------------------------------|
| GET    | `/api/org/workers`           | Org  | List own workers                     |
| POST   | `/api/org/workers`           | Org  | Create worker (returns invite URL)   |
| POST   | `/api/org/workers/bulk`      | Org  | Bulk create workers (returns invite URLs per worker) |
| DELETE | `/api/org/workers/:username` | Org  | Remove worker                        |
| PATCH  | `/api/org/workers/:username` | Org  | Update worker job title              |

#### Profile & Auth (all types)
| Method | Path                     | Auth | Description               |
|--------|--------------------------|------|---------------------------|
| GET    | `/api/auth/me`           | Yes  | Current user profile      |
| POST   | `/api/auth/profile`      | Yes  | Update profile            |
| POST   | `/api/auth/logout`       | Yes  | Blacklist JWT             |

#### Medications (workers)
| Method | Path                            | Auth      | Description                           |
|--------|---------------------------------|-----------|---------------------------------------|
| GET    | `/api/medications`              | Yes       | List all medications                  |
| GET    | `/api/medications/:id`          | Yes       | Single medication                     |
| POST   | `/api/medications`              | Worker+Role | Add medication (production only)    |
| POST   | `/api/medications/:id/received` | Worker+Role | Mark received (distribution only)  |
| POST   | `/api/medications/:id/arrived`  | Worker+Role | Mark arrived (pharmacy/clinic only) |
| GET    | `/api/medications/:id/audit`    | Yes       | Audit trail                           |
| POST   | `/api/medications/bulk`         | Worker+Role | Bulk add medications                |

---

## Frontend (Web)

**Stack**: React 18 + TypeScript, no router library (custom `useRouting` hook using `pushState`)

### Pages
| Page                     | Route                        | Description                                       |
|--------------------------|------------------------------|---------------------------------------------------|
| `HomePage`               | `/`                          | Marketing landing with typewriter animation       |
| `ProductPage`            | `/product`                   | Product info                                      |
| `SolutionsPage`          | `/solutions`                 | Solutions marketing                               |
| `ResourcesPage`          | `/resources`                 | Resources                                         |
| `CustomersPage`          | `/customers`                 | Customers                                         |
| `PricingPage`            | `/pricing`                   | Pricing                                           |
| `PolicyPage`             | `/iso-compliance` etc.       | Reusable policy/legal page                        |
| `OrgLoginPage`           | `/login/org`                 | Org admin passkey login                           |
| `WorkerLoginPage`        | `/login/worker`              | Worker passkey login                              |
| `PlatformLoginPage`      | `/staff-a7f3`                | Platform admin passkey login (hidden URL)         |
| `AdminSetupPage`         | `/setup`                     | First-time admin bootstrap                        |
| `OrgSignupPage`          | `/signup`                    | Org registration + passkey setup                  |
| `WorkerInvitePage`       | `/invite/:token`             | Worker passkey registration via invite link       |
| `OrgRegisterPasskeyPage` | `/org/register-passkey`      | Org admin passkey reset via reset link            |
| `AdminRecoveryPage`      | `/staff-a7f3/recovery`       | Emergency MongoDB recovery steps (hidden)         |
| `DashboardPage`          | `/app`                       | Worker/admin main dashboard                       |
| `AddMedicationPage`      | `/app/add`                   | Add medication form                               |
| `AdminPage`              | `/app/admin`                 | Platform admin — org management                   |
| `AdminSecurityPage`      | `/app/admin/security`        | Platform admin — backup passkey management        |
| `OrgDashboardPage`       | `/org`                       | Org admin — worker management + records           |
| `AccountPage`            | `/account`                   | Profile settings                                  |
| `OnboardingPage`         | (overlay)                    | Profile completion prompt                         |
| `PendingApprovalPage`    | (overlay)                    | Shown to unapproved orgs                          |

### Custom Hooks
- `useAuth` — WebAuthn login/registration for all three user types, JWT management, profile CRUD, admin org/worker management, passkey reset
- `useMedications` — CRUD for medications, search/filter, lookup, mark received/arrived, bulk operations
- `useRouting` — custom SPA routing via `pushState`/`popstate`
- `useDashboardNav` — sidebar navigation state (add/receive/arrived/view/admin/security)
- `useNavigateWithAuthMode` — navigate with auth mode context
- `useQrModal` — QR code display modal state
- `useToast` — toast notification management

### Dashboard Navigation (`DashboardNav` type)
`'add' | 'receive' | 'arrived' | 'view' | 'admin' | 'security'`

- `add` → `/app/add`
- `admin` → `/app/admin`
- `security` → `/app/admin/security`
- others → `/app` with tab state

---

## Org / Worker Multi-Tenant System

### Organisations
- Register at `/signup` → pending approval by platform admin
- Org admin manages their own workers from `/org` dashboard
- Workers inherit `companyType` and `companyName` from org
- `approvalStatus`: `pending` | `approved` | `rejected`

### Workers
- Created by org admin with username + optional job title
- Receive unique 48h invite URL to register their passkey
- Perform all medication operations on behalf of their org
- Can be removed or have their passkey reset by either the org admin or platform admin

---

## Supply Chain Status Flow

```
manufactured → received → arrived
(production)   (distribution)   (pharmacy/clinic)
```

Each transition: validates role, checks current status, updates `medication_status`, creates `medication_audits` entry.

---

## Deployment

### VPS Restart Command
```bash
cd /opt/ledgrx/comp-3000-repository
git pull
docker compose -f blockchain/docker-compose.backend.yml --env-file .env.backend up -d --build --force-recreate
```

### Environment file
Located at `/opt/ledgrx/comp-3000-repository/.env.backend`
Docker Compose requires `--env-file .env.backend` flag — it does **not** auto-load this file.

### Local Development
```bash
./blockchain/up.sh
```

### CI/CD
GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main` — frontend + server tests.

---

## Environment Variables

| Variable                    | Purpose                                              |
|-----------------------------|------------------------------------------------------|
| `PORT`                      | API port (default 3001)                              |
| `CORS_ORIGIN`               | Allowed origins (comma-separated)                    |
| `AUTH_JWT_SECRET`           | JWT signing secret                                   |
| `MONGODB_URI`               | MongoDB connection string                            |
| `ADMIN_USERNAMES`           | Legacy — leave blank, use WebAuthn bootstrap instead |
| `WEBAUTHN_RP_ID`            | Relying party ID = frontend domain (no https://)     |
| `WEBAUTHN_ORIGIN`           | Allowed WebAuthn origin (full URL with https://)     |
| `WEBAUTHN_RP_NAME`          | Human-readable app name shown in passkey prompts     |
| `APP_URL`                   | Base URL for invite/reset link generation            |
| `FABRIC_CHANNEL`            | Fabric channel name (mychannel)                      |
| `FABRIC_CHAINCODE`          | Chaincode name (pharma)                              |
| `FABRIC_MSPID`              | MSP ID (Org1MSP)                                     |
| `FABRIC_PEER_ENDPOINT`      | Peer address                                         |
| `FABRIC_CONNECTION_PROFILE` | Path to Fabric connection profile JSON               |
| `FABRIC_TLS_CERT_PATH`      | Peer TLS CA certificate                              |
| `FABRIC_ID_CERT_PATH`       | User identity certificate                            |
| `FABRIC_ID_KEY_PATH`        | User identity private key                            |

---

## Commit Conventions

- `FEAT:` — new features
- `FIX:` — bug fixes
- `UI:` — UI updates
- `REFACTOR:` — code refactoring
- `CHORE:` — maintenance
- `DEPS:` — dependency updates
- `TEST:` — tests

## Branch Conventions
`feature/`, `bugfix/`, `hotfix/`, `refactor/`, `docs/`, `test/`, `chore/`

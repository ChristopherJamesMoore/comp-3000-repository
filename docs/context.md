# LedgRX - Project Context

## What is LedgRX?

LedgRX is a **blockchain-based pharmaceutical supply chain tracking system** built as a BSc Computer Science final-year project (COMP 3000) at the University of Plymouth, supervised by Ji-Jian Chin. It provides end-to-end visibility into the manufacturing and distribution of prescription medications, using **Hyperledger Fabric** as its blockchain layer. The goal is to reduce counterfeit medication risk by creating transparency and tamper-proof provenance across the UK pharmaceutical supply chain.

---

## Architecture Overview

The system follows a three-tier architecture:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Frontend (Web)  │   │   Mobile App     │   │                  │
│   React + TS      │   │   React Native   │   │   Admin Portal   │
│   Port 3000       │   │   QR Scanner     │   │   (in frontend)  │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │ REST API
                      ┌─────────▼─────────┐
                      │   Express.js API   │
                      │   Port 3001        │
                      │   JWT Auth         │
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
- **Off-chain (MongoDB)**: Mutable data — user accounts, medication status tracking, audit logs, token blacklists
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
│   │   ├── server.js         # Main server (~785 lines) - all routes + Fabric gateway
│   │   ├── Dockerfile        # Node 20 Alpine
│   │   ├── __tests__/        # server.test.js
│   │   └── package.json      # express, @hyperledger/fabric-gateway, mongodb, bcryptjs, jsonwebtoken
│   ├── fabric-samples/      # Hyperledger Fabric test-network (submodule/copy)
│   ├── docker-compose.backend.yml  # API + MongoDB containers
│   ├── up.sh                # Starts Fabric network + deploys chaincode + starts API
│   └── down.sh              # Tears down everything
├── frontend/                # React web application (TypeScript)
│   ├── src/
│   │   ├── App.tsx          # Root component - routing + state orchestration
│   │   ├── types.ts         # Medication, AuditEntry, UserProfile, Toast, AuthMode
│   │   ├── pages/           # 10 page components
│   │   ├── hooks/           # 7 custom hooks (auth, medications, routing, etc.)
│   │   ├── components/      # DashboardLayout, MarketingNav, Topbar
│   │   └── utils/api.ts     # API base URL resolution
│   └── package.json         # react 18, qrcode.react, lucide-react, typescript
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
│   ├── vps-bootstrap.sh     # Bootstrap dependencies
│   └── migrate-users-to-mongo.js  # User migration script
├── docs/                    # VPS deployment documentation
├── dev-log/                 # Development journal
├── learning/                # Learning notes (Fabric, IPFS)
├── project-planning/        # Project initiation document
├── docker-compose.local.yml # Local development compose (API + frontend + mongo)
├── .env.backend.example     # Environment variable template
├── .github/workflows/ci.yml # CI pipeline (frontend + server tests)
└── README.md                # Project overview + Gantt chart
```

---

## Key Technologies

| Layer           | Technology                        |
|-----------------|-----------------------------------|
| Blockchain      | Hyperledger Fabric 2.5.14         |
| Chaincode       | JavaScript (fabric-contract-api)  |
| Backend API     | Node.js + Express.js              |
| Database        | MongoDB 7                         |
| Auth            | JWT (jsonwebtoken) + bcryptjs     |
| Frontend        | React 18 + TypeScript             |
| Mobile          | React Native + Vision Camera      |
| QR Generation   | qrcode.react (frontend)           |
| Icons           | lucide-react                      |
| Containerization| Docker + Docker Compose           |
| CI/CD           | GitHub Actions                    |
| Hosting         | Vercel (frontend), VPS (backend)  |
| Reverse Proxy   | Nginx                             |

---

## Chaincode (Smart Contract)

**File**: `blockchain/chaincode/index.js`

The `PharmaContract` extends Fabric's `Contract` class with three functions:

1. **`addMedication(serialNumber, medicationName, gtin, batchNumber, expiryDate, productionCompany, distributionCompany, qrHash)`**
   - Writes a medication record to the Fabric ledger keyed by `serialNumber`
   - Captures the transaction timestamp as `createdAt`

2. **`getMedication(serialNumber)`**
   - Reads a single medication by serial number from the ledger

3. **`getAllMedications()`**
   - Iterates the full state range and returns all medication records

---

## Backend API

**File**: `blockchain/server/server.js` (~785 lines, monolithic)

### Authentication & Users
- JWT-based auth with 8-hour token expiry
- Signup and login endpoints; passwords hashed with bcrypt
- Token blacklist in MongoDB for logout revocation
- User sources: environment variable (`AUTH_USERS`) OR JSON file OR MongoDB
- Admin detection via `ADMIN_USERNAMES` env var or `isAdmin` field in MongoDB

### Role-Based Access Control (RBAC)
Users set a company profile (locked once saved) with one of four types:
- **production** — can add medications to the blockchain
- **distribution** — can mark medications as "received"
- **pharmacy** / **clinic** — can mark medications as "arrived"

### API Endpoints

| Method | Path                            | Auth     | Description                           |
|--------|---------------------------------|----------|---------------------------------------|
| GET    | `/api/health`                   | No       | Health check                          |
| POST   | `/api/auth/login`               | No       | Login, returns JWT                    |
| POST   | `/api/auth/signup`              | No       | Register new user                     |
| GET    | `/api/auth/me`                  | Yes      | Current user profile                  |
| POST   | `/api/auth/profile`             | Yes      | Set company type/name (one-time)      |
| POST   | `/api/auth/logout`              | Yes      | Blacklist current JWT                 |
| GET    | `/api/admin/users`              | Admin    | List all users                        |
| GET    | `/api/medications`              | Yes      | List all medications (Fabric + status)|
| GET    | `/api/medications/:id`          | Yes      | Single medication by serial           |
| POST   | `/api/medications`              | Yes+Role | Add medication (production only)      |
| POST   | `/api/medications/:id/received` | Yes+Role | Mark received (distribution only)     |
| POST   | `/api/medications/:id/arrived`  | Yes+Role | Mark arrived (pharmacy/clinic only)   |
| GET    | `/api/medications/:id/audit`    | Yes      | Audit trail for a medication          |

### MongoDB Collections
- `users` — user accounts with company profiles
- `token_blacklist` — revoked JWTs (TTL-indexed)
- `medication_status` — current status tracking (manufactured → received → arrived)
- `medication_audits` — timestamped audit trail entries

### QR Hash Generation
- SHA-256 of `batchNumber + expiryDate + serialNumber`
- Stored on-chain as `qrHash`; displayed as scannable QR codes in the frontend

---

## Frontend (Web)

**Stack**: React 18 + TypeScript, no router library (custom `useRouting` hook using `pushState`)

### Pages
| Page                | Route         | Description                                    |
|---------------------|---------------|------------------------------------------------|
| `HomePage`          | `/`           | Marketing landing with typewriter animation     |
| `ProductPage`       | `/product`    | Product info page                              |
| `SolutionsPage`     | `/solutions`  | Solutions marketing                            |
| `ResourcesPage`     | `/resources`  | Resources page                                 |
| `CustomersPage`     | `/customers`  | Customers page                                 |
| `PricingPage`       | `/pricing`    | Pricing page                                   |
| `LoginPage`         | `/login`      | Login/signup form                              |
| `DashboardPage`     | `/app`        | Main dashboard (view records, lookup, receive, arrived) |
| `AddMedicationPage` | `/app/add`    | Add new medication form                        |
| `AccountPage`       | `/account`    | Profile settings + admin user directory        |

### Custom Hooks
- `useAuth` — login/signup/logout, JWT management, profile CRUD, admin user loading
- `useMedications` — CRUD for medications, search/filter, lookup, mark received/arrived
- `useRouting` — custom SPA routing via `pushState`/`popstate`
- `useDashboardNav` — sidebar navigation state (add/receive/arrived/view tabs)
- `useNavigateWithAuthMode` — navigate with auth mode context
- `useQrModal` — QR code display modal state
- `useToast` — toast notification management

### Dashboard Tabs
The dashboard has four nav tabs based on user role:
1. **Add medication** — form to create on-chain records (production companies only)
2. **Mark received** — enter serial to log distribution receipt
3. **Mark arrived** — enter serial to log pharmacy/clinic arrival
4. **View records** — table of all medications with search, QR display, and serial lookup with audit trail

### API URL Resolution
- `REACT_APP_API_BASE_URL` env var OR
- `localhost:3001` for local dev OR
- `https://ledgrx.duckdns.org` for production

---

## Mobile App

**Stack**: React Native + react-native-vision-camera

A lightweight QR scanner app:
1. Opens camera with QR code scanning
2. On scan, calls `GET /api/medications` and matches by `qrHash`
3. Displays medication details (serial, GTIN, batch, expiry, QR hash)
4. No authentication required for the mobile app currently

---

## Supply Chain Status Flow

```
manufactured → received → arrived
(production)   (distribution)   (pharmacy/clinic)
```

Each status transition:
- Validates the user's company role matches the required action
- Checks the current status allows the transition (e.g., must be "manufactured" before "received")
- Updates `medication_status` in MongoDB
- Creates an entry in `medication_audits`

---

## Deployment

### Local Development
```bash
# Start Fabric network + chaincode + API + MongoDB
./blockchain/up.sh

# Or use docker-compose for everything
docker-compose -f docker-compose.local.yml up
```

### VPS (Production)
- Backend + Fabric run on a Linux VPS via `scripts/vps-up.sh`
- Frontend deployed to Vercel
- Nginx reverse proxy (`deploy/nginx-ledgrx.conf`)
- Domain: `ledgrx.duckdns.org`

### CI/CD
GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push to `main`:
- Installs and tests frontend (React test suite)
- Installs and tests server (Jest)

---

## Environment Variables

Key configuration (see `.env.backend.example`):

| Variable                  | Purpose                                    |
|---------------------------|--------------------------------------------|
| `PORT`                    | API port (default 3001)                    |
| `CORS_ORIGIN`             | Allowed origins                            |
| `AUTH_JWT_SECRET`          | JWT signing secret                         |
| `AUTH_USERS`              | Seed users as JSON array                   |
| `AUTH_USERS_FILE`          | Path to users JSON file                    |
| `MONGODB_URI`             | MongoDB connection string                  |
| `ADMIN_USERNAMES`          | Comma-separated admin usernames            |
| `FABRIC_CHANNEL`          | Fabric channel name (mychannel)            |
| `FABRIC_CHAINCODE`        | Chaincode name (pharma)                    |
| `FABRIC_MSPID`            | MSP ID (Org1MSP)                           |
| `FABRIC_PEER_ENDPOINT`    | Peer address                               |
| `FABRIC_CONNECTION_PROFILE`| Path to Fabric connection profile JSON     |
| `FABRIC_TLS_CERT_PATH`    | Peer TLS CA certificate                    |
| `FABRIC_ID_CERT_PATH`     | User identity certificate                  |
| `FABRIC_ID_KEY_PATH`      | User identity private key                  |

---

## Commit Conventions

- `FEAT:` — new features
- `FIX:` — bug fixes
- `UI:` — UI updates
- `REFACTOR:` — code refactoring
- `CHORE:` — maintenance
- `DEPS:` — dependency updates
- `TEST:` — tests
- `IOS:` — iOS/CocoaPods changes

## Branch Conventions
`feature/`, `bugfix/`, `hotfix/`, `refactor/`, `docs/`, `test/`, `chore/`

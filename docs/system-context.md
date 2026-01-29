# System Context (LedgRX)

This document summarizes the LedgRX repository for local LLM context. It describes what the project is, how the system works end-to-end, and where to find the key files/configs.

## Project overview
LedgRX is a proof-of-concept blockchain pharmaceutical management system. It provides end-to-end tracking for medication manufacturing and distribution, aiming to improve traceability and reduce counterfeit risk. The system uses Hyperledger Fabric for immutable audit data and a traditional database for mutable user data.

## High-level architecture
- **Blockchain layer:** Hyperledger Fabric test network + chaincode for medication records.
- **Backend API:** Express server that authenticates users, writes/reads chaincode data, and optionally persists users in MongoDB.
- **Frontend web app:** React (CRA) marketing site + authenticated dashboard to manage medications.
- **Mobile app:** React Native QR scanner to look up medications by QR hash.
- **Infra & deploy:** Docker Compose for local/VPS, scripts for Fabric setup, Nginx + systemd configs for VPS.

## Data model (chaincode)
Stored on-chain in `blockchain/chaincode/index.js`:
- `serialNumber` (state key)
- `medicationName`
- `gtin`
- `batchNumber`
- `expiryDate`
- `productionCompany`
- `distributionCompany`
- `qrHash` (sha256 of batchNumber + expiryDate + serialNumber)
- `createdAt` (ledger tx time)

## Backend API (Express + Fabric Gateway)
**Entry:** `blockchain/server/server.js`
- Connects to Fabric via `@hyperledger/fabric-gateway`.
- Uses JWT auth (`AUTH_JWT_SECRET`) and supports both file-based users (`AUTH_USERS` or `AUTH_USERS_FILE`) and Mongo-backed users (`MONGODB_URI`).
- Optional admin behavior via `ADMIN_USERNAMES` or `users.isAdmin` in Mongo.

### API endpoints
- `GET /api/health` → health check.
- `POST /api/auth/login` → login, returns JWT.
- `POST /api/auth/signup` → signup (requires `AUTH_USERS_FILE` or Mongo).
- `GET /api/auth/me` → current user profile.
- `POST /api/auth/profile` → update company profile (Mongo only).
- `POST /api/auth/logout` → revoke token (Mongo only).
- `GET /api/admin/users` → list users (admin, Mongo only).
- `GET /api/medications` → list all medications (Fabric).
- `POST /api/medications` → add medication (Fabric).
- `GET /api/medications/:id` → fetch a medication by serial number (Fabric).

## Frontend web app (React / CRA)
**Root:** `frontend/`
**Entry:** `frontend/src/App.tsx`
- Client-side routing based on `window.location` (no router library).
- Auth flow stored in `localStorage` (JWT).
- Dashboard views: list, search, lookup, add medication, view QR hash modal.
- Marketing pages: Home/Product/Solutions/Resources/Customers/Pricing.

**API base:** `frontend/src/utils/api.ts`
- Uses `REACT_APP_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`.
- Defaults to `http://localhost:3001` for localhost, otherwise `https://ledgrx.duckdns.org`.

## Mobile app (React Native)
**Root:** `mobile-app/`
**Entry:** `mobile-app/App.tsx`
- Uses `react-native-vision-camera` to scan QR codes.
- Calls `GET /api/medications` and filters by `qrHash`.
- API base defaults to `http://localhost:3001` (iOS) or `http://10.0.2.2:3001` (Android emulator).

## Local dev + deployment
### Local (Docker Compose)
- `docker-compose.local.yml`: runs API + frontend + Mongo.
- Fabric network must exist on the external `fabric_test` network (see `blockchain/up.sh`).

### Fabric + backend bootstrap
- `blockchain/up.sh`: starts Fabric test network, creates channel, deploys chaincode, starts backend API.
- `blockchain/down.sh`: stops backend; optionally tears down Fabric.

### VPS deployment (backend + Fabric)
- `scripts/vps-setup.sh`: creates `.env.backend`, runs `vps-up.sh`.
- `scripts/vps-up.sh`: boots Fabric, deploys chaincode, starts backend stack.
- `scripts/vps-down.sh`: stops backend; optional Fabric shutdown.
- `docs/vps.md`, `docs/vps-setup-detailed.md`, `docs/vps-nginx.md`: guides + Nginx config.
- `deploy/systemd/ledgrx-stack.service`: systemd unit for auto-start.
- `deploy/nginx-ledgrx.conf`: HTTPS reverse proxy template.

## Configuration files
- `.env.backend.example`: environment variables for backend/Fabric.
- `docker-compose.local.yml`: local dev stack.
- `blockchain/docker-compose.backend.yml`: backend + Mongo for VPS/hosted.
- `blockchain/docker-compose.yml`: older/alternate compose for frontend/server.
- `.github/workflows/ci.yml`: GitHub Actions tests.

## Key source locations
- **Chaincode:** `blockchain/chaincode/index.js`
- **API server:** `blockchain/server/server.js`
- **Frontend app:** `frontend/src/App.tsx`
- **Frontend API config:** `frontend/src/utils/api.ts`
- **Mobile app:** `mobile-app/App.tsx`
- **Architecture docs:** `architecture/system-design.md`, `architecture/system-architecture.png`

## File structure (curated)
(Third-party or generated directories like `node_modules/`, `blockchain/fabric-samples/`, and mobile `Pods/` are omitted.)

```
comp-3000-repository
├── README.md
├── .env.backend.example
├── docker-compose.local.yml
├── .github/workflows/ci.yml
├── architecture/
│   ├── system-design.md
│   └── system-architecture.png
├── blockchain/
│   ├── chaincode/
│   │   ├── index.js
│   │   └── package.json
│   ├── server/
│   │   ├── server.js
│   │   ├── registerUser.js
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh
│   │   ├── __tests__/server.test.js
│   │   └── data/ (users.json at runtime)
│   ├── docker-compose.backend.yml
│   ├── docker-compose.yml
│   ├── up.sh
│   └── down.sh
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── App.css
│       ├── pages/
│       ├── components/
│       ├── utils/api.ts
│       └── types.ts
├── mobile-app/
│   ├── App.tsx
│   ├── package.json
│   ├── android/
│   ├── ios/
│   └── __tests__/App.test.tsx
├── docs/
│   ├── vps.md
│   ├── vps-setup-detailed.md
│   ├── vps-nginx.md
│   └── system-context.md
├── deploy/
│   ├── nginx-ledgrx.conf
│   └── systemd/ledgrx-stack.service
├── scripts/
│   ├── vps-setup.sh
│   ├── vps-up.sh
│   ├── vps-down.sh
│   ├── vps-bootstrap.sh
│   └── migrate-users-to-mongo.js
├── learning/
│   ├── hyperledger-fabric.md
│   └── ipfs-storage.md
└── project-planning/
    └── project-initiation-document.md
```

## Notes / caveats
- The repo includes vendor and generated assets (Fabric samples, node_modules, mobile Pods) that are intentionally excluded from the tree above.
- The backend test file in `blockchain/server/__tests__/server.test.js` may be stale relative to the current API behavior; confirm before relying on it.

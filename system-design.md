# Pharmaceutical Tracking System — Hyperledger Fabric + IPFS

> **Goal:** Design and implement a tamper-evident, auditable pharmaceutical supply-chain tracking system using Hyperledger Fabric for business workflow & trust, and IPFS for off-chain large-object storage (product images, certificates, PDFs). This document is a practical design + implementation guide you can use as a blueprint.

---

## Table of contents

1. [High-level goals & constraints](#high-level-goals--constraints)
2. [Key actors & events](#key-actors--events)
3. [System architecture overview](#system-architecture-overview)
4. [Data model & identity design](#data-model--identity-design)
5. [Blockchain design (Fabric)](#blockchain-design-fabric)
6. [IPFS integration pattern](#ipfs-integration-pattern)
7. [Privacy, confidentiality & compliance](#privacy-confidentiality--compliance)
8. [APIs, SDKs & integration points](#apis-sdks--integration-points)
9. [Operational concerns: deployment, monitoring, backup, upgrades](#operational-concerns-deployment-monitoring-backup-upgrades)
10. [Security considerations](#security-considerations)
11. [Testing strategy & CI/CD](#testing-strategy--cicd)
12. [Performance & scaling strategy](#performance--scaling-strategy)
13. [Roadmap & phased implementation plan](#roadmap--phased-implementation-plan)
14. [Appendix: sample chaincode + IPFS examples](#appendix-sample-chaincode--ipfs-examples)

---

## High-level goals & constraints

* Provide end-to-end traceability for pharmaceutical products (manufacture → distribution → pharmacy → patient).
* Prevent counterfeits and provide verifiable provenance and event history.
* Support large binary assets (certificates, lab reports, packaging photos) without placing them on-chain.
* Enforce role-based access and confidentiality for commercially-sensitive data.
* Enable auditability for regulators and recall workflows.
* Integrate with existing ERP/WMS/TMS systems.

Constraints to decide early:

* Legal / regulatory rules (e.g., data retention, privacy). Identify jurisdiction-specific rules (GDPR, HIPAA, local pharma regs).
* On-chain cost/performance: Fabric stores small JSON documents efficiently; large files belong in IPFS.
* Identity model: X.509 certs (Fabric CA) vs. external PKI.

---

## Key actors & events

**Actors (participants / organizations)**

* Manufacturer (MFR)
* Contract Manufacturer (CMO)
* Wholesaler / Distributor (DIST)
* Logistics Provider (3PL)
* Regulator (REG)
* Pharmacy / Hospital (PHARM)
* Consumer (optional read-only verification portal)
* Auditor / Inspector

**Core events (immutable records on ledger)**

* `CreateBatch` — manufacture batch with GTIN, batch number, expiry
* `AssignSerials` — assign unique serial numbers (per-pack)
* `ShipBatch` — ship from A → B with timestamps & transport conditions
* `ReceiveBatch` — receiving confirmation at destination
* `RetailSale` / `Dispense` — final dispensing to patient
* `Recall` — mark items recalled and track remediation
* `CertificateUpload` — attach GMP certificates or COA to a batch (via IPFS CID)

Each event will contain references to: product identifiers, actor identity (cert), timestamp, location, and optional IPFS CID(s).

---

## System architecture overview

```
+----------------+        +-----------------+        +--------------------+
| Manufacturer   | <----> | Hyperledger     | <----> | Wholesaler /       |
| ERP/WMS        |  REST  | Fabric Network  |  REST  | Distributor ERP     |
+----------------+        +-----------------+        +--------------------+
        |                         |                         |
        |                         |                         |
        |                         v                         |
        |                Chaincode (smart contracts)         |
        |                         |                         |
        v                         v                         v
     IPFS Cluster / Pinning Service (store artifacts, return CIDs)

External services: PKI/CA, Identity provider, Monitoring, Off-chain DB caches (materialized views)
```

**Components**

* **Fabric Network**: peers for each org, orderer(s), CAs, channels.
* **Chaincode**: business logic for events, validations, access-checks.
* **IPFS Cluster**: stores large/binary objects; use pinning & replication.
* **Application Layer / APIs**: SDK-based services that sign transactions and handle IPFS uploads.
* **Off-chain DB**: optional (Postgres/Elasticsearch) for query/analytics and UI performance.
* **Portal / UI**: dashboards for each role + public verification endpoint.
* **Monitoring & Logging**: Prometheus, Grafana, ELK, + Fabric metrics.

---

## Data model & identity design

**Identifiers**

* `productId` (GTIN) — product SKU
* `batchId` — manufacturer batch number
* `serialId` — per-pack unique serial (when serialized)
* `cid` — IPFS content identifier

**Sample on-chain asset: `SerializedItem` (ledger JSON)**

```json
{
  "docType": "SerializedItem",
  "serialId": "SN-0001-2025-0000001",
  "productId": "01-01234567890128",
  "batchId": "BATCH-2025-07-1234",
  "status": "MANUFACTURED",
  "owner": "Org1MSP",
  "history": [
    {"event":"Create","actor":"Org1MSP","ts":"2025-07-01T10:00:00Z"}
  ],
  "metadata": {
    "cid_certificate": "Qm...",
    "manufactureLocation": "Plant 7",
    "expiryDate": "2027-06-30"
  }
}
```

**Storage strategy**

* Store small, queryable fields on-chain (JSON) — status, identifiers, short metadata, IPFS CIDs.
* Store bulky and/or sensitive documents in IPFS **encrypted**. Put the CID on the ledger and an access-control envelope (e.g., encrypted symmetric key wrapped with recipients' public keys) off-chain or in a private data collection.

**Identity & authentication**

* Use Fabric X.509 certs provisioned by Fabric CA (or external CA integrated with Fabric). Use MSPs for org identity.
* Map certs to business roles/attributes (manufacturer, regulator, warehouse). Consider attribute-based access control (ABAC) inside chaincode using `GetCreator()`/cid cert attributes.

---

## Blockchain design (Fabric)

**Network topology**

* One MSP per organization (Manufacturer, Distributor, Logistics, Pharmacy, Regulator).
* Each org: at least one peer (endorser + committer) and one org-admin identity.
* Ordering service: Raft-based cluster (3 nodes recommended for production) or hosted ordering service.
* Channels: create a `global` channel for public product provenance and additional private channels for sensitive bilateral workflows if needed. Alternatively, leverage **Private Data Collections (PDC)** instead of channels for granular confidentiality.

**Channel vs PDC guidance**

* Use single shared channel for common provenance data to keep cross-org visibility simpler.
* Use PDCs for commercially-sensitive documents (pricing, certain COAs) and for encrypted storage of keys to access IPFS contents.

**Endorsement policies**

* For critical operations (e.g., `CreateBatch`), require endorsement by Manufacturer peers: `OR('ManufacturerMSP.peer')`.
* For custody transfer (`ShipBatch`), require both sender and receiver endorsements: `AND('SenderMSP.peer','ReceiverMSP.peer')`.

**Chaincode design**

* Implement as modular microservices where chaincode focuses on validation and immutable events, while heavy logic (e.g., complex analytics) runs off-chain.
* Provide functions: `CreateBatch`, `AssignSerials`, `Ship`, `Receive`, `RecordTempCondition`, `CreateRecall`, `AttachCID`, `QueryHistory`.
* Use composite keys for efficient range queries: `stub.CreateCompositeKey('ser', [productId, serialId])`.

**Versioning**

* Keep chaincode versions semantically tagged and enable upgrade procedures: package → install → approve → commit.

---

## IPFS integration pattern

**Why IPFS**

* Decentralized content-addressed storage: files are referenced by immutable CID.
* Efficient for storing large artifacts (COAs, label images, video, logs).

**Primary patterns**

1. **CID on-chain (recommended)**

   * Upload asset to IPFS (or private IPFS cluster) → get CID → store `cid` in ledger record.
2. **Encrypted blobs**

   * Encrypt file with symmetric key `K`; store encrypted blob on IPFS → put CID on ledger. Store `K` encrypted (envelope encryption) such that only authorized parties can unwrap it (wrap `K` with recipients' public keys), and store the wrapped keys in a PDC or a secure Key Management Service (KMS).
3. **Pinning & persistence**

   * Use IPFS cluster or managed pinning service to ensure assets persist (otherwise content may disappear). Maintain your own IPFS nodes or paid pinning providers.

**Example flow**

1. App uploads document to IPFS → receives `cid`.
2. App calls chaincode `AttachCID(serialId, cid, metadata)` signed by participant's certificate.
3. Chaincode validates caller and records `{serialId, cid, ts, actor}`.
4. For sensitive docs: store encrypted symmetric key in PDC keyed by `serialId`.

**IPFS API example (pseudo)**

```bash
# upload
curl -X POST -F file=@coafile.pdf "http://localhost:5001/api/v0/add"
# response contains "Hash": "Qm..."
```

---

## Privacy, confidentiality & compliance

**Privacy patterns**

* Avoid putting PII on ledger. If you must, store encrypted references and keep keys off-chain in KMS.
* Use PDCs for sharing confidential data among a subset of orgs.
* Use attribute-based access control in chaincode to filter reads (although note ledger reads on the channel are visible to all peers on that channel).

**Regulatory**

* Store audit trail on-chain (immutable). Keep copies of critical documents in IPFS and ensure retention policy aligns with local laws.
* For GDPR: Data subject access / right to be forgotten is tricky — consider classic approach: keep personal data off-chain; if on-chain data must be removed, use revocation flags and unlinking rather than attempting to delete ledger history.

---

## APIs, SDKs & integration points

**Application architecture**

* *Backend microservice(s)* using Fabric SDK (Node.js, Java, or Go) to sign and submit transactions on behalf of org's system account.
* *IPFS client* integrated into backend for uploads/downloads. Use authenticated IPFS gateways or run private nodes.
* *Sync service* (optional): listens to block events and updates off-chain DB for fast queries.

**Public verification endpoint**

* Lightweight API or static site where end users can verify product authenticity by entering `serialId` and seeing public provenance data (no sensitive fields).

**Example REST endpoints**

* `POST /api/v1/batch` → creates a batch (invokes `CreateBatch` chaincode function)
* `POST /api/v1/serial/:id/attach` → attach cid to serial (invokes `AttachCID`)
* `POST /api/v1/ship` → create `Ship` event
* `GET /api/v1/serial/:id` → returns merged view (on-chain + off-chain metadata)

**Event-driven integration**

* Use Fabric events or block listeners to trigger asynchronous workflows (notify warehouse, call ERP, persist to analytics DB).

---

## Operational concerns: deployment, monitoring, backup, upgrades

**Deployment**

* Use Kubernetes to run peer/orderer containers for production. Use Helm charts / operator patterns for Fabric components.
* Run IPFS cluster in K8s or managed pinning service.

**Monitoring**

* Expose Fabric metrics via Prometheus; dashboards in Grafana for peer CPU, ledger height, commit latency, endorsement latency.
* Monitor IPFS: node health, pin status, disk usage.

**Backup & disaster recovery**

* Backup peer ledger and state DB (CouchDB snapshots) and MSP material (certs + keys) regularly.
* Backup IPFS data (or rely on pinning provider SLA + replication).
* For orderer nodes, snapshot Raft state and WAL.

**Upgrades**

* Chaincode upgrade lifecycle: package → install → approve → commit. Test upgrades in staging.
* Fabric version upgrades require coordinated rolling upgrades across orgs.

---

## Security considerations

**Key management**

* Protect private keys for org admin and peers. Use HSM or a managed KMS for production.

**Access control**

* Enforce least privilege for enrollments. Issue identities with minimal attributes.

**Data encryption**

* Use TLS across all Fabric components.
* Encrypt IPFS blobs and store wrapped keys securely.

**Supply-chain & software security**

* Reproducible builds for chaincode. Sign chaincode packages.
* Secure CI/CD with pipeline secrets stored in vaults.

**Auditing**

* Keep immutable chain history for regulatory inspections; combine with human-readable reports.

---

## Testing strategy & CI/CD

**Testing types**

* Unit tests for chaincode logic (mock stub frameworks).
* Integration tests against a local Fabric network (testcontainers or Fabric test network).
* End-to-end tests validating full flow: IPFS upload → chaincode attach → query.

**CI/CD**

* Build chaincode artifacts then run test suite; when passing, publish chaincode package and auto-deploy to staging.
* Gate production deployments with manual approvals and run migration scripts.

---

## Performance & scaling strategy

**Ledger size & query**

* Keep ledger documents compact; store heavy objects off-chain.
* Use composite keys and CouchDB indexes for high-performance queries.

**Transaction throughput**

* Tune endorsement policies to balance trust vs throughput.
* Scale peers horizontally per org for read/endorsement load.
* Orderer: scale Raft nodes for availability.

**IPFS**

* Use an IPFS cluster with pinning replication factor tuned to availability requirements.

---

## Roadmap & phased implementation plan

**Phase 0 — Discovery & PoC (4–8 weeks)**

* Confirm regulatory requirements & data classification.
* Build minimal Fabric network (3 orgs) + IPFS node.
* Implement chaincode with `CreateBatch`, `AssignSerials`, `Ship`, `Receive` and simple UI.
* Demonstrate end-to-end proof for a serialized product.

**Phase 1 — MVP (8–16 weeks)**

* Harden identity & CA integration.
* Add IPFS encryption and PDCs for sensitive docs.
* Integrate with one manufacturer's ERP and one distributor.
* Add analytics & audit dashboards.

**Phase 2 — Production rollout (3–6 months)**

* Harden infra (K8s, HSM, multi-region replicas), implement monitoring & DR.
* Onboard multiple partners; run training & audits.
* Implement regulator portal & reporting.

---

## Appendix: sample chaincode + IPFS examples

### Sample chaincode (Node.js) — simplified `AttachCID`

```javascript
// Chaincode method (fabric-shim style, highly simplified)
async function attachCID(stub, args) {
  // args: [serialId, cid, metadataJson]
  const [serialId, cid, metadataJson] = args
  const invoker = getInvokerMSP(stub)

  const itemKey = stub.createCompositeKey('ser', [serialId])
  const itemBytes = await stub.getState(itemKey)
  if (!itemBytes || itemBytes.length === 0) throw new Error('Serial not found')

  const item = JSON.parse(itemBytes.toString())
  // simple ACL: only owner (current custodian) can attach
  if (item.owner !== invoker) throw new Error('Not authorized')

  item.metadata = item.metadata || {}
  item.metadata.cid = cid
  item.history = item.history || []
  item.history.push({event:'AttachCID', actor:invoker, ts: new Date().toISOString()})

  await stub.putState(itemKey, Buffer.from(JSON.stringify(item)))
  return shim.success()
}
```

### IPFS upload + envelope encryption (pseudo)

1. Generate symmetric key `K` (AES-256).
2. Encrypt file with `K` → `file.enc`.
3. Upload `file.enc` to IPFS → get `cid`.
4. For each authorized recipient, encrypt `K` with recipient public key → produce `wrappedKey_recipient`.
5. Store `cid` on ledger and `wrappedKey_*` in PDC or secure KMS.

**Sample Node.js steps to add file**

```javascript
// 1. encrypt -> use crypto
// 2. upload to IPFS using ipfs-http-client
const { create } = require('ipfs-http-client')
const ipfs = create({ url: 'http://ipfs-node:5001' })
const { cid } = await ipfs.add(encryptedBuffer)
// 3. call Fabric chaincode AttachCID(serial, cid)
```

### Useful chaincode query patterns

* `GetStateByPartialCompositeKey('ser', [productId])` → all serials of product.
* `GetHistoryForKey(serialKey)` → full event history (Fabric built-in historical reads).

---

## Operational checklist (quick)

* [ ] Define data classification & decide what stays on-chain.
* [ ] Decide on Fabric network membership and MSP boundaries.
* [ ] Implement CA & identity issuing workflow.
* [ ] Build IPFS cluster & pinning strategy.
* [ ] Implement chaincode + tests.
* [ ] Create API gateway microservices with Fabric SDK and IPFS client.
* [ ] Run integration & security testing (pen tests, key leakage checks).
* [ ] Prepare DR & backup procedures; test restore.

---

## Closing notes

This design blends Fabric's strong endorsement/immutability guarantees with IPFS' efficient handling of large artifacts. The main design choices you must make early are: exact identity model (Fabric CA vs external CA), whether to use channels vs private data collections, and your IPFS persistence/pinning strategy.

If you'd like, I can:

* produce a concrete data schema for chaincode state and CouchDB indexes,
* write a production-ready chaincode module (Go or Node) for the core flows,
* generate an example Kubernetes Helm chart for Fabric + IPFS,
* or draft the API spec (OpenAPI) and example UI wireframes.

---

## Project-specific tailoring (LedgRX)

Based on your project initiation document (supervisor: Ji-Jian Chin, repository: [https://github.com/ChristopherJamesMoore/comp-3000-repository](https://github.com/ChristopherJamesMoore/comp-3000-repository)), I have tailored the design and implementation plan below to fit your 9-month student project timeline, your constraints, and your stated risks.

### Mapping to your risks & mitigations

* **Ambitious scope (Impact: 5)** — Focus the MVP on core flows: `CreateBatch`, `AssignSerials` (or simulate serialisation), `Ship`, `Receive`, and a lightweight public verification UI. Defer advanced features (multi-ERP integrations, multi-region KMS, full PDC encryption) to stretch goals. Use the PoC (Phase 2) to prove Fabric + IPFS integration; in Phase 3 prioritize a single manufacturer's integration.

* **Competing commitments (Impact: 4)** — Adopt two-week sprints with clearly scoped user stories and acceptance criteria. Reserve at least one day per week as "project-only" time in your Gantt. Automate local test network teardown/setup to save time.

* **Limited computing resources (Impact: 3)** — Use the Fabric test-network (lightweight) and `fabric-samples` instead of full production stacks. Use Docker Desktop with limited peers (1 peer per org) and simulate other orgs via multiple identities. For IPFS, run a single local node; for persistence use a free pinning service only for demo assets.

* **Pharma knowledge gap (Impact: 3)** — Add a short stakeholder interview task in Phase 1: contact a local pharmacist or industry contact for 1-hour interview. Document any domain constraints (FMD, MHRA) and include them in requirements.

### Adjusted MVP scope (must-have for submission)

1. Minimal Fabric network: 3 orgs (Manufacturer, Distributor, Pharmacy) with 1 peer each and a single Raft orderer.
2. Chaincode (Node.js or Go) implementing: `CreateBatch`, `AssignSerials` (or simulated), `Ship`, `Receive`, `AttachCID`, `QueryHistory`.
3. IPFS proof: upload encrypted COA/pdf and store CID on ledger. Use envelope encryption but keep key wrapping simple (demo-only RSA wrap using test keys).
4. REST API (Node/Express) that: uploads to IPFS, calls chaincode via Fabric SDK, and exposes `GET /verify/:serialId` for public checks.
5. Simple web UI (React) for Manufacturer and Pharmacy to perform core actions and for a public verification page.
6. Test suite: unit tests for chaincode and an end-to-end Cypress or Playwright test for the verification flow.

### Tech choices (student-focused)

* **Chaincode:** Node.js (faster iteration and integrates well with your repo).
* **Fabric SDK:** Node.js.
* **IPFS client:** `ipfs-http-client` pointing at a local IPFS daemon.
* **Off-chain DB:** CouchDB (use as state DB with CouchDB indexes for queries).
* **Frontend:** React (create-react-app or Vite)
* **Hosting for demo:** Use GitHub Actions to build docker images and deploy to a single small cloud VM (DigitalOcean/Hetzner), or run locally for the demo.

### Concrete deliverables per phase (mapped to your Gantt)

* **Phase 1 (Weeks 1-6):** Requirements doc (include GDPR / FMD notes), interview notes, architecture diagram, and an updated repo README with environment setup.
* **Phase 2 (Weeks 7-12):** Local Fabric network + IPFS PoC scripts, basic chaincode skeleton, short interim report with demo screenshots.
* **Phase 3 (Weeks 15-24):** Complete chaincode, REST API, IPFS encryption workflow, CouchDB indexes, RBAC basics, integration tests.
* **Phase 4 (Weeks 27-30):** Frontend portals, UAT scenarios, performance testing report (light-weight), accessibility checks for verification page.
* **Phase 5 (Weeks 31-36):** Full dissertation sections, final system docs, final demo video + presentation slides.

### Suggested implementation milestones (sprint-size tasks)

1. Setup repo + dev environment scripts (Docker Compose) — 1 week
2. Minimal Fabric network & sample chaincode scaffolding (`CreateBatch`) — 2 weeks
3. IPFS node + file upload + record CID in ledger (`AttachCID`) — 1 week
4. Serial simulation (`AssignSerials`) + `QueryHistory` — 2 weeks
5. REST API + basic UI for Create/Attach/Verify — 2 weeks
6. End-to-end tests + CI pipeline — 2 weeks
7. RBAC, simple PDC/envelope key wrap for encrypted CIDs — 2 weeks
8. Final polish, documentation, dissertation writing — remaining weeks

### Evaluation criteria for demo & dissertation

* Successful transaction submission for each core flow (Create → Ship → Receive) with ledger entries visible.
* IPFS storage: document uploaded, CID persisted, and retrieval demonstrated using wrapped key.
* Tests: unit + integration tests pass in CI; at least one automated end-to-end test for verification.
* Performance: simple benchmark showing average end-to-end transaction latency for `AttachCID` and `Ship` operations (local test network baseline).
* Security considerations: write-up of key management approach and GDPR impact analysis.

### Repository hygiene & CI/CD recommendations

* Use GitHub Actions to run chaincode unit tests and spin up a trimmed local network for integration tests using `fabric-samples` or testcontainers.
* Keep secrets out of repo (use GitHub Secrets for test certs if needed). Store sample MSP certs in `dev-artifacts/` ignored in `.gitignore` in production.
* Tag releases per milestone (e.g., `v0.1-poc`, `v0.2-mvp`).

---

## Small, ready-to-copy checklist for your repo (add to README)

1. `./scripts/dev-setup.sh` — launches docker-compose with Fabric test network + IPFS + CouchDB.
2. `./chaincode/` — chaincode source with `npm test` for unit tests.
3. `./api/` — REST API with env-based Fabric connection profile and IPFS client.
4. `./frontend/` — React app with `yarn start` and demo credentials.
5. `./tests/e2e/` — Playwright or Cypress tests that run in CI.
6. `./docs/requirements.md` — include GDPR/MHRA/FMD notes and interview minutes.
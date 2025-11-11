# Pharmaceutical Tracking System — Hyperledger Fabric + IPFS

> **Goal:** Design and implement a tamper-evident, auditable pharmaceutical supply-chain tracking system using Hyperledger Fabric for business workflow & trust, and IPFS for off-chain large-object storage (product images, certificates, PDFs). This document is a practical design + implementation guide you can use as a blueprint.

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
* 

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


**Components**

* **Fabric Network**: peers for each org, orderer(s), CAs, channels.
* **Chaincode**: business logic for events, validations, access-checks.
* **IPFS Cluster**: stores large/binary objects; use pinning & replication.
* **Application Layer / APIs**: SDK-based services that sign transactions and handle IPFS uploads.
* **Off-chain DB**: optional (Postgres/Elasticsearch) for query/analytics and UI performance.
* **Portal / UI**: dashboards for each role + public verification endpoint.
* **Monitoring & Logging**: Prometheus, Grafana, ELK, + Fabric metrics.

---

## Blockchain design (Fabric)

**Network topology**


**Endorsement policies**


**Chaincode design**

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

## Information stored
GTIN (Global Trafe Item Number)
Batch Number
Expiry Date
Serial Number (UID)
IPFS hash for supporting documents

### Portal
Several user roles for determinening what level of informaiton can be changed and viewed. This will be managed with role-based access control (RBAC).

### Mobile applicaiton
Simple patient login - will allow patients to view their perscriptions history as well as add it to their list of medication.
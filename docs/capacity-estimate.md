# LedgRX VPS Capacity Estimate

## Infrastructure
- **VPS**: 4 cores, 8 GB RAM, 80 GB storage
- **Stack**: Ubuntu, Docker, Hyperledger Fabric 2.5.14, MongoDB 7, Node.js

## Usage Assumptions (per org per quarter)
- 50 workers
- 200 medication operations/day (~80 manufactured, ~60 received, ~60 arrived)
- 90-day quarter

## Storage Breakdown (80 GB total)

### Fixed Costs (~20 GB)
| Component | Size |
|---|---|
| Ubuntu OS | ~6 GB |
| Docker images (Fabric peers, orderer, CAs, CouchDB, MongoDB, Node) | ~10 GB |
| Chaincode containers | ~2 GB |
| Logs, temp, swap | ~2 GB |

### Per Org Per Quarter (~45 MB)
| Collection | Documents | Doc Size | With MongoDB Overhead |
|---|---|---|---|
| `medication_status` | 7,200 | ~500 B | ~7 MB |
| `medication_audits` (per-serial lookup) | 18,000 | ~200 B | ~7 MB |
| `worker_activity_log` | 18,000 | ~250 B | ~9 MB |
| `workers` + `webauthn_credentials` | ~100 | ~2 KB | negligible |
| Blockchain ledger transactions | 7,200 | ~1.5 KB | ~22 MB |

### Shared Capped Collections (8 GB reserved)
- `org_audit_log` — 4 GB cap with export-and-reset
- `platform_audit_log` — 4 GB cap with export-and-reset

### Storage Capacity
- Available for data: ~52 GB (after fixed + audit caps)
- Per org per year: ~180 MB
- **~280 orgs for a full year**

## RAM Breakdown (8 GB) — Primary Bottleneck

| Component | Usage |
|---|---|
| Fabric peer0.org1 | ~1.2 GB |
| Fabric orderer | ~500 MB |
| CouchDB (world state) | ~500 MB |
| MongoDB (WiredTiger cache) | ~2 GB |
| Node.js API server | ~300-500 MB |
| Docker daemon | ~500 MB |
| OS kernel + buffers | ~1.5 GB |
| **Total** | **~7 GB** |

- ~1 GB headroom
- MongoDB comfortably handles ~200-500 concurrent connections with 2 GB cache
- 50 workers/org, ~20% active = 10 concurrent per org
- **Limit: ~40-60 orgs** (2,000-3,000 workers)

## CPU / Throughput (4 cores)
- 200 ops/day/org over 8 hours = ~25 ops/hour/org
- At 50 orgs: ~0.35 ops/second
- Fabric handles 100+ TPS — not a bottleneck
- **Limit: 500+ orgs**

## Summary

| Constraint | Limit |
|---|---|
| Storage (1 year) | ~280 orgs |
| **RAM (concurrent usage)** | **~40-60 orgs** |
| CPU / throughput | 500+ orgs |

**Practical limit: 40-50 orgs comfortably, up to 60-70 if workers aren't all online simultaneously.**

## Scaling Path
- Bump to 16 GB RAM (~$5-10/month more) doubles capacity to ~100+ orgs
- Storage can be expanded independently if needed
- Horizontal scaling (multiple peers/channels) possible but complex

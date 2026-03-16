# Tiered Audit Logging System

## Overview

Three-tier audit logging that provides visibility at each level of the org hierarchy:
1. **Workers** see their own medication actions
2. **Org admins** see all worker activity + org management events
3. **Platform admins** see everything + platform-level events

The existing `medication_audits` collection (per-serial-number lookup for the Scan/Lookup feature) is unchanged.

## Tier 1 — Worker Activity Log

**Collection:** `worker_activity_log`
**Visible to:** The individual worker (dashboard sidebar)

### Events Logged
| Action | Trigger |
|---|---|
| `medication.manufactured` | Worker adds a medication |
| `medication.received` | Worker marks received |
| `medication.arrived` | Worker marks arrived |
| `medication.batch_received` | Worker batch marks received |
| `medication.batch_arrived` | Worker batch marks arrived |
| `medication.bulk_manufactured` | Worker bulk adds medications |

### Schema
```js
{
  _id: ObjectId,
  username: String,          // worker username
  orgId: String,             // parent org
  action: String,            // e.g. 'medication.manufactured'
  serialNumbers: [String],   // affected medications
  metadata: {                // action-specific context
    medicationName: String,
    batchNumber: String,
    count: Number
  },
  createdAt: Date
}
```

### Index
```js
{ username: 1, createdAt: -1 }
```

### API
- `GET /api/worker/activity?page=1&limit=50` — paginated, own activity only

### Retention
Indefinite (small — one entry per action per worker).

---

## Tier 2 — Organisation Audit Log

**Collection:** `org_audit_log`
**Visible to:** Org admin (new "Audit log" tab on org dashboard)

### Events Logged
All Tier 1 events for workers in the org, plus:

| Action | Trigger |
|---|---|
| `worker.created` | Org admin adds a worker |
| `worker.bulk_created` | Org admin bulk imports workers |
| `worker.removed` | Org admin removes a worker |
| `worker.job_title_updated` | Org admin changes worker job title |
| `worker.passkey_reset` | Platform admin resets a worker's passkey |

### Schema
```js
{
  _id: ObjectId,
  orgId: String,
  actor: {
    username: String,
    type: String             // 'worker' | 'org_admin' | 'platform_admin'
  },
  action: String,            // e.g. 'medication.manufactured', 'worker.created'
  target: {
    serialNumber: String,    // for medication actions
    serialNumbers: [String], // for batch actions
    username: String,        // for worker management actions
    count: Number            // for batch/bulk actions
  },
  metadata: Object,          // action-specific details
  createdAt: Date
}
```

### Index
```js
{ orgId: 1, createdAt: -1 }
```

### API
- `GET /api/org/audit?page=1&limit=50&action=&worker=` — paginated, filtered
- `GET /api/org/audit/storage` — returns collection size in bytes
- `GET /api/org/audit/export` — streams CSV download (filtered to own orgId)
- `POST /api/org/audit/reset` — deletes own org's entries after download

### Retention
Size-capped at 4 GB (shared collection). Org admin sees banner when their org's portion is large; platform admin manages the whole collection.

---

## Tier 3 — Platform Audit Log

**Collection:** `platform_audit_log`
**Visible to:** Platform admin (new "Audit log" sidebar item on admin dashboard)

### Events Logged
All Tier 2 events across all orgs, plus:

| Action | Trigger |
|---|---|
| `org.approved` | Platform admin approves an org |
| `org.rejected` | Platform admin rejects an org |
| `org.deleted` | Platform admin deletes an org (+ cascaded workers) |
| `org.updated` | Platform admin edits org details |
| `org.passkey_reset` | Platform admin resets org admin passkey |
| `worker.passkey_reset` | Platform admin resets worker passkey |
| `admin.login` | Platform admin logs in |
| `admin.backup_passkey_registered` | New backup USB key registered |

### Schema
```js
{
  _id: ObjectId,
  actor: {
    username: String,
    type: String             // 'platform_admin' | 'org_admin' | 'worker'
  },
  orgId: String | null,      // null for platform-level actions
  action: String,
  target: {
    orgId: String,
    username: String,
    serialNumber: String,
    serialNumbers: [String],
    count: Number
  },
  metadata: Object,
  createdAt: Date
}
```

### Indexes
```js
{ createdAt: -1 }
{ orgId: 1, createdAt: -1 }
```

### API
- `GET /api/admin/audit?page=1&limit=50&action=&org=` — paginated, filtered
- `GET /api/admin/audit/storage` — returns sizes of org + platform log collections
- `GET /api/admin/audit/export` — streams full CSV download
- `POST /api/admin/audit/reset` — drops and recreates collection after download

### Retention
Size-capped at 4 GB. Platform admin sees warning banner when approaching limit. Must download CSV before reset.

---

## Storage Management (4 GB Cap)

### How It Works
1. Server checks `db.collection('...').stats().storageSize` on dashboard load
2. If collection exceeds 4 GB, a warning banner appears
3. Admin downloads CSV via export endpoint (streamed, chunked transfer)
4. After download, admin clicks "Reset" to clear the collection
5. The reset is logged as the first entry in the fresh collection

### CSV Export Format
```
timestamp,actor_username,actor_type,org_id,action,target,metadata
2026-03-16T10:30:00Z,worker1,worker,org_abc,medication.manufactured,"{""serialNumber"":""RX-001""}","{""medicationName"":""Aspirin""}"
```

### Export Endpoint Implementation
- Uses MongoDB cursor with `stream()` for memory efficiency
- `Transfer-Encoding: chunked` — no buffering the entire collection in RAM
- `Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"`

---

## Server-Side Write Strategy

Each medication or management action dual/triple-writes to the appropriate collections:

| Action by | Writes to |
|---|---|
| Worker medication op | `medication_audits` + `worker_activity_log` + `org_audit_log` + `platform_audit_log` |
| Org admin worker management | `org_audit_log` + `platform_audit_log` |
| Platform admin org management | `platform_audit_log` |
| Platform admin login/passkey | `platform_audit_log` |

### Helper Function
```js
async function writeAuditLogs(db, { actor, orgId, action, target, metadata }) {
    const entry = { actor, orgId, action, target, metadata, createdAt: new Date() };

    const writes = [db.collection('platform_audit_log').insertOne({ ...entry })];

    if (orgId) {
        writes.push(db.collection('org_audit_log').insertOne({ ...entry }));
    }

    if (actor.type === 'worker') {
        writes.push(db.collection('worker_activity_log').insertOne({
            username: actor.username,
            orgId,
            action,
            serialNumbers: target.serialNumbers || (target.serialNumber ? [target.serialNumber] : []),
            metadata,
            createdAt: entry.createdAt
        }));
    }

    await Promise.allSettled(writes);
}
```

Audit writes use `Promise.allSettled` so a logging failure never blocks the primary operation.

---

## Frontend Changes

### Worker Dashboard
- New "Activity" sidebar nav item
- Chronological list of own actions (row-based, matching new list style)
- Fields shown: timestamp, action type, serial number(s), medication name

### Org Dashboard
- New "Audit log" tab alongside Workers and Records
- Filterable by: action type, worker username, date range
- Row-based list with expand for metadata
- Storage banner + download/reset when approaching 4 GB

### Admin Dashboard
- New "Audit log" sidebar nav item
- Filterable by: action type, org, date range
- Row-based list with expand for metadata
- Storage banner showing both org + platform log sizes
- Download/reset controls

### New Types (frontend)
```typescript
export type ActivityEntry = {
    username: string;
    orgId: string;
    action: string;
    serialNumbers: string[];
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type AuditLogEntry = {
    actor: { username: string; type: 'worker' | 'org_admin' | 'platform_admin' };
    orgId: string | null;
    action: string;
    target: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type AuditStorageInfo = {
    orgAuditBytes: number;
    platformAuditBytes: number;
    limitBytes: number;
};
```

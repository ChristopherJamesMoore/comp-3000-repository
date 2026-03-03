# Organisation & User System Rework Plan

## Summary

The current system treats every account as a single flat user. The new model introduces a two-tier structure: **Organisations** (onboarded via signup, managed by a platform admin) and **Workers** (created by the org admin, never self-signup). The supply chain permissions (add/receive/arrive) are determined by the organisation's type, not the individual worker.

---

## New Mental Model

```
Platform Admin (LedgRx staff)
  └── approves/rejects Organisations

Organisation Account (one per company)
  ├── has a type: Production | Distribution | Pharmacy | Clinic
  ├── has an Org Admin (the person who signed up)
  └── can create Workers for their org

Worker Account (many per org)
  ├── username + password, created by Org Admin
  ├── inherits org type for medication permissions
  └── has a job title (display only, e.g. "Distribution Manager")
```

---

## Data Model

### `organisations` collection (new)

```json
{
  "orgId": "uuid",
  "companyName": "Pharma Corp Ltd",
  "companyType": "production | distribution | pharmacy | clinic",
  "registrationNumber": "REG123456",
  "adminFirstName": "Jane",
  "adminLastName": "Smith",
  "adminUsername": "pharmcorp",
  "adminEmail": "jane@pharmcorp.com",
  "passwordHash": "<bcrypt>",
  "approvalStatus": "pending | approved | rejected",
  "createdAt": "ISO date",
  "approvedAt": "ISO date | null"
}
```

### `workers` collection (replaces current `users` for non-platform-admins)

```json
{
  "workerId": "uuid",
  "username": "jane_worker",
  "passwordHash": "<bcrypt>",
  "orgId": "reference to organisation.orgId",
  "orgName": "Pharma Corp Ltd",
  "companyType": "production",
  "jobTitle": "Production Lead",
  "createdAt": "ISO date",
  "createdBy": "pharmcorp"
}
```

### `platform_admins` collection (or keep existing `users` with isAdmin flag)
- Platform admins remain as-is in the existing `users` collection with `isAdmin: true`
- They are bootstrapped the same way as today

---

## Auth Flows

### Flow 1 — Organisation Signup
1. Org fills in signup form (company details + admin credentials)
2. Account created in `organisations` with `approvalStatus: pending`
3. Platform admin logs in → sees org in admin panel → approves/rejects
4. On approval: confirmation email sent to org admin email

### Flow 2 — Organisation Admin Login
- Logs in via the **Org login portal** with their username/password
- JWT contains: `{ type: 'org', orgId, companyType }`
- Redirected to **Org Admin Dashboard**:
  - View and manage workers (add, remove, view job title)
  - View medication records for their org
  - Cannot perform medication operations themselves (optional, can relax later)

### Flow 3 — Worker Login
- Logs in via the **Worker login portal** with username/password
- JWT contains: `{ type: 'worker', orgId, companyType }`
- Redirected to **Worker Dashboard**:
  - Same Add / Receive / Arrive workflow as today
  - Permissions based on `companyType` inherited from org

### Flow 4 — Platform Admin Login
- Unchanged — existing `/setup` bootstrap and login flow
- JWT contains: `{ type: 'platform', isAdmin: true }`
- Sees only the platform admin panel (approve/reject orgs, manage org accounts)

---

## Frontend — Pages & Routing

### New / changed pages

| Route | Page | Who sees it |
|---|---|---|
| `/` | HomePage | Public |
| `/signup` | OrgSignupPage | Public — org registration only |
| `/login/org` | OrgLoginPage | Org admins |
| `/login/worker` | WorkerLoginPage | Workers |
| `/org` | OrgDashboardPage | Org admin (manage workers, view records) |
| `/app` | WorkerDashboardPage | Workers (existing dashboard, unchanged logic) |
| `/app/admin` | PlatformAdminPage | Platform admin only — org rows with expandable worker dropdown |
| `/account` | AccountPage | Org admin or worker |
| `/pending` | PendingApprovalPage | Org awaiting approval |

### OrgSignupPage fields
- First name, Last name (org admin)
- Company name
- Company type (dropdown: Production / Distribution / Pharmacy / Clinic)
- Company registration number
- Work email
- Username (for org admin account)
- Password

### OrgDashboardPage — Worker Management
- Table of workers: username, job title, created date
- "Add worker" inline form: username, password, job title
- "Remove worker" button (with confirm)
- View Records tab (same as current, filtered to their org)

---

## Backend — API Changes

### New endpoints

#### Organisation Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/org/signup` | Register new org (creates pending org) |
| POST | `/api/org/login` | Org admin login → JWT |
| GET | `/api/org/me` | Get org admin profile |
| POST | `/api/org/profile` | Update org profile (email etc.) |

#### Worker Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/worker/login` | Worker login → JWT |
| GET | `/api/worker/me` | Get worker profile |

#### Org Admin — Worker Management
| Method | Path | Description |
|---|---|---|
| GET | `/api/org/workers` | List workers in org |
| POST | `/api/org/workers` | Add worker to org |
| DELETE | `/api/org/workers/:username` | Remove worker |
| PATCH | `/api/org/workers/:username` | Update job title |

#### Platform Admin — Org Management (replaces current user admin)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/orgs` | List all orgs (with worker count) |
| GET | `/api/admin/orgs/:orgId/workers` | List workers for a specific org |
| POST | `/api/admin/orgs/:orgId/approve` | Approve org |
| POST | `/api/admin/orgs/:orgId/reject` | Reject org |
| DELETE | `/api/admin/orgs/:orgId` | Delete org and all its workers |
| PATCH | `/api/admin/orgs/:orgId` | Edit org details |
| POST | `/api/admin/orgs/:orgId/reset-password` | Reset org admin password |
| DELETE | `/api/admin/orgs/:orgId/workers/:username` | Remove a worker (platform admin) |
| POST | `/api/admin/orgs/:orgId/workers/:username/reset-password` | Reset worker password (platform admin) |

#### Medication endpoints
- Unchanged logic — only worker JWTs can perform medication operations
- Org admin JWTs are blocked from Add / Receive / Arrive routes
- Permission check: `companyType` pulled from JWT (inherited from org at worker creation)

### JWT changes
Add a `type` field to distinguish token types:
```json
{ "sub": "username", "type": "org | worker | platform", "orgId": "...", "companyType": "..." }
```
Middleware updated to accept all types for medication routes, restrict org-management routes to `type: org`, restrict platform-admin routes to `type: platform`.

---

## Migration

- Existing non-admin user accounts in `users` collection: treat as org accounts (one-to-one, no workers yet)
- Existing platform admin accounts: untouched
- No data loss — existing medication records remain on-chain and in MongoDB
- A migration script can move existing `users` records into the `organisations` collection if needed

---

## What Stays The Same

- Hyperledger Fabric / chaincode — no changes
- Medication Add / Receive / Arrive logic
- QR code generation and scanning
- Email confirmation flow
- Platform admin bootstrap

---

## Confirmed Decisions

1. **Org admins cannot perform medication operations** — Add / Receive / Arrive is workers only.
2. **Workers are visible to the platform admin** via an expandable dropdown on each org row in the platform admin panel. Platform admin can also remove workers and reset their passwords.
3. **Password reset for workers** — org admin can reset their own workers' passwords; platform admin can reset any worker's password.
4. **One worker belongs to one org only** — no cross-org membership.
5. **Pending approval screen** — same as today; org admin sees the waiting screen after signup until platform admin approves.

---

## Implementation Order (once plan is approved)

1. Backend — new `organisations` and `workers` collections + all new endpoints
2. Backend — update JWT middleware to handle `type` field
3. Backend — update medication endpoints to accept worker + org tokens
4. Frontend — OrgSignupPage
5. Frontend — OrgLoginPage + WorkerLoginPage
6. Frontend — OrgDashboardPage (worker management)
7. Frontend — update routing in App.tsx
8. Frontend — update AdminPage to show orgs instead of users
9. Test end-to-end with fresh accounts
10. VPS redeploy

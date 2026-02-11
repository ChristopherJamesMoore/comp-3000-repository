# Plan: Batch Mark, QR Scanner, and Forced Onboarding

## Context

Distributors and pharmacies/clinics currently have to mark medications as received/arrived one at a time by typing a serial number and clicking a button. This is tedious for large shipments. Additionally, there's no way to scan QR codes from the web dashboard (only the mobile app has scanning). Finally, new accounts can access the dashboard without setting up their company profile, which means they see non-functional UI until they manually visit the account page.

This plan adds three features:
1. **Batch mark received/arrived** — queue multiple serials, submit all at once
2. **QR scanner on receive/arrived tabs** — scan barcodes on a tablet to add serials to the batch
3. **Forced onboarding** — new accounts must set company type + name before accessing the dashboard

---

## Files Modified

| File | Change |
|------|--------|
| `blockchain/server/server.js` | Add 3 new API endpoints (batch received, batch arrived, hash lookup) |
| `frontend/package.json` | Add `html5-qrcode` dependency |
| `frontend/src/types.ts` | Add `BatchResultItem` and `BatchResult` types |
| `frontend/src/components/QrScanner.tsx` | **NEW** — Web QR scanner component wrapping `html5-qrcode` |
| `frontend/src/pages/OnboardingPage.tsx` | **NEW** — Forced profile setup page with "Request" button |
| `frontend/src/hooks/useMedications.ts` | Add batch queue state, batch handlers, QR hash resolver |
| `frontend/src/pages/DashboardPage.tsx` | Redesign receive/arrived tabs with batch UI + QR scanner |
| `frontend/src/App.tsx` | Add onboarding routing guard, pass new batch props, render OnboardingPage |
| `frontend/src/App.css` | Styles for batch chips, QR scanner, select fields |

---

## Backend Changes

### New Endpoints (all under existing auth middleware)

#### `POST /api/medications/batch/received`
- Accepts `{ serialNumbers: string[] }` (max 500)
- Validates user role is `distribution`
- Loops serials: validates status is `manufactured`, updates to `received`, creates audit entry
- Returns `{ ok, processed, succeeded: [{serialNumber, status}], failed: [{serialNumber, error}] }`

#### `POST /api/medications/batch/arrived`
- Same pattern, role must be `pharmacy` or `clinic`, status `received` → `arrived`

#### `GET /api/medications/by-hash/:hash`
- Resolves a QR hash (SHA-256) to a medication record
- Returns medication object with merged MongoDB status, or 404

---

## Frontend Changes

### Onboarding Guard
- Authenticated users with no `companyType` set are forced to the OnboardingPage
- Cannot be skipped — no back/dashboard navigation
- Submit button says "Request"
- On success, profile state updates and routing guard clears

### Batch UI (Receive + Arrived tabs)
- Input field + "Add" button + "Scan QR" toggle
- QR scanner area using `html5-qrcode` (rear camera for tablets)
- Batch queue displayed as removable chips
- "Mark all received/arrived (N)" submit button
- Results section showing per-serial success/failure

---

## Deployment Order
1. Backend first (VPS) — additive endpoints, zero breaking changes
2. Frontend second (Vercel) — auto-deploys, calls new endpoints already live

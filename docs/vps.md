# VPS Quickstart (Hetzner / Linux)

This repo is ready to run the backend API + Hyperledger Fabric on a Linux VPS.
Frontend stays on Vercel and talks to the API over HTTPS.

## 0) DNS check
Ensure `ledgrx.duckdns.org` points to `188.245.67.67`.
You can verify from the VPS:
```
dig +short ledgrx.duckdns.org
```

## 1) Copy repo to VPS
Place the repo anywhere, for example:
`/opt/ledgrx/comp-3000-repository`

## 2) Create `.env.backend`
Copy `.env.backend.example` to `.env.backend` in the repo root and update values:

- `CORS_ORIGIN` should include your Vercel domain(s).
- `AUTH_JWT_SECRET` should be a strong random string.
- `AUTH_USERS` should include your real admin credentials.
- `AUTH_USERS_FILE` enables signup persistence (recommended).
- `ADMIN_USERNAMES` controls access to the admin user list.

Example (Vercel + local dev):
```
CORS_ORIGIN=https://comp-3000-repository.vercel.app,http://localhost:3000
```

## 3) One-line setup (recommended)
From the repo root:
```
./scripts/vps-setup.sh
```

This will:
- Copy `.env.backend` if missing.
- Install Fabric binaries/images if needed.
- Start Fabric test-network (with CA).
- Create channel + deploy chaincode if missing.
- Start the backend API container.

For a step-by-step walkthrough, see `docs/vps-setup-detailed.md`.

## 4) Start the stack (manual)
From the repo root:
```
./scripts/vps-up.sh
```

## 5) Stop the stack
```
./scripts/vps-down.sh
```

To stop Fabric too:
```
./scripts/vps-down.sh --fabric
```

## 6) Expose API for Vercel
The API listens on port `3001` inside the VPS.
You can:
- Reverse proxy `https://ledgrx.duckdns.org` -> `http://127.0.0.1:3001`
  (recommended), or
- Open port `3001` in your firewall and access directly.

Confirm health:
```
curl https://ledgrx.duckdns.org/api/health
```

## 7) Nginx HTTPS setup
See `docs/vps-nginx.md` for a ready-to-use Nginx config and Certbot steps.

## 8) Optional: auto-start on boot (systemd)
Copy the unit file and enable it:
```
sudo mkdir -p /etc/systemd/system
sudo cp deploy/systemd/ledgrx-stack.service /etc/systemd/system/ledgrx-stack.service
sudo systemctl daemon-reload
sudo systemctl enable ledgrx-stack.service
sudo systemctl start ledgrx-stack.service
```

If your repo lives somewhere else, edit `WorkingDirectory` and paths in the unit file.

## 9) Vercel configuration
In Vercel → Settings → Environment Variables, set:
```
NEXT_PUBLIC_API_BASE_URL=https://ledgrx.duckdns.org
```
Redeploy the frontend so the new environment variable is applied.

## 10) Signup support
Signup is enabled when `AUTH_USERS_FILE` is set (default `/data/users.json`).
New users are stored there with a bcrypt hash. Keep `/data` mounted as a
persistent volume (already set in `blockchain/docker-compose.backend.yml`).

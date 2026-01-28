# VPS Setup (Detailed)

This guide expands the quickstart and explains each step in detail for
deploying Fabric + the Node API on your VPS and connecting Vercel.

## Before you start
- VPS DNS: `ledgrx.duckdns.org` must point to `188.245.67.67`
- Docker + Docker Compose v2 installed on the VPS
- Repo copied to VPS (example path: `/opt/ledgrx/comp-3000-repository`)

## Step 1: Copy the repo to the VPS
From your local machine:
```
scp -r comp-3000-repository user@188.245.67.67:/opt/ledgrx/
```

## Step 2: Go to the repo root
```
cd /opt/ledgrx/comp-3000-repository
```

## Step 3: Run the one-line setup (optional)
```
./scripts/vps-setup.sh
```

This will:
- Create `.env.backend` if missing
- Install Fabric binaries/images if missing
- Start Fabric + deploy channel/chaincode
- Start the API + MongoDB containers

## Step 4 (Important): Configure `.env.backend`
This step controls the API auth, CORS, and Fabric settings. You should edit
the `.env.backend` file **before** going to production.

Start by copying the example if it doesn’t exist:
```
cp .env.backend.example .env.backend
```

Open it in an editor:
```
nano .env.backend
```

Update these values:

1) **CORS_ORIGIN**
- Must include your Vercel frontend domain(s).
- Example:
```
CORS_ORIGIN=https://comp-3000-repository.vercel.app
```

2) **AUTH_JWT_SECRET**
- Generate a strong secret (do NOT leave the example).
- Example:
```
AUTH_JWT_SECRET=$(openssl rand -hex 32)
```

3) **AUTH_USERS**
- This creates your initial admin account(s).
- Example:
```
AUTH_USERS=[{"username":"admin","password":"ChangeThis123"}]
```
- You can remove this later if you want only signup-based users.

4) **AUTH_USERS_FILE**
- This file stores all signup users (hashed passwords).
- Default is:
```
AUTH_USERS_FILE=/data/users.json
```
- Leave this as-is unless you want a different location.

5) **MONGODB_URI**
- Required for saving account profile details (company info).
- Default:
```
MONGODB_URI=mongodb://mongo:27017/ledgrx
```

6) **ADMIN_USERNAMES**
- Comma-separated list of usernames that can access the admin user directory.
- Example:
```
ADMIN_USERNAMES=admin
```

## Step 5: Start the stack (manual alternative)
```
./scripts/vps-up.sh
```

## Step 6: HTTPS reverse proxy (Nginx)
Use the ready config + Certbot steps:
- `docs/vps-nginx.md`

## Step 7: Vercel dashboard
Set this environment variable and redeploy:
```
NEXT_PUBLIC_API_BASE_URL=https://ledgrx.duckdns.org
```

## Step 8: Verify everything
Backend health:
```
curl https://ledgrx.duckdns.org/api/health
```

Login or sign up from the frontend and create a medication record.

## Optional: migrate file-based users to MongoDB
If you previously used `AUTH_USERS_FILE`, you can import those users:
```
MONGODB_URI=mongodb://mongo:27017/ledgrx \
AUTH_USERS_FILE=/data/users.json \
ADMIN_USERNAMES=admin \
node scripts/migrate-users-to-mongo.js
```

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.backend"
EXAMPLE_ENV="$ROOT_DIR/.env.backend.example"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$EXAMPLE_ENV" ]; then
    cp "$EXAMPLE_ENV" "$ENV_FILE"
    echo "Created .env.backend from .env.backend.example. Update secrets before production use."
  else
    echo "Missing .env.backend and .env.backend.example. Aborting."
    exit 1
  fi
fi

echo "Starting VPS stack..."
"$ROOT_DIR/scripts/vps-up.sh"

cat <<'EOF'

VPS setup complete.

Next steps:
- Edit .env.backend to set AUTH_JWT_SECRET, AUTH_USERS, CORS_ORIGIN, and AUTH_USERS_FILE.
- Set up HTTPS reverse proxy (see docs/vps-nginx.md).
- Verify: curl https://ledgrx.duckdns.org/api/health
EOF

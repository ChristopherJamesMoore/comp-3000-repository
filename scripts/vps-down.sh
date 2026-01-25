#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLOCKCHAIN_DIR="$ROOT_DIR/blockchain"
FABRIC_DIR="$BLOCKCHAIN_DIR/fabric-samples/test-network"

echo "Stopping backend API..."
(cd "$BLOCKCHAIN_DIR" && docker compose -f docker-compose.backend.yml down)

if [ "${1:-}" = "--fabric" ]; then
  echo "Stopping Hyperledger Fabric network..."
  (cd "$FABRIC_DIR" && ./network.sh down)
fi

echo "VPS stack stopped."

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_SAMPLES_DIR="$ROOT_DIR/blockchain/fabric-samples"
FABRIC_BIN_DIR="$FABRIC_SAMPLES_DIR/bin"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not installed. Install Docker, then rerun."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Install docker compose plugin, then rerun."
  exit 1
fi

if [ "$(uname -s)" != "Linux" ]; then
  echo "VPS bootstrap is intended for Linux hosts. Skipping Fabric binary install."
  exit 0
fi

NEED_INSTALL=0

if [ ! -x "$FABRIC_BIN_DIR/peer" ]; then
  NEED_INSTALL=1
else
  if ! "$FABRIC_BIN_DIR/peer" version >/dev/null 2>&1; then
    NEED_INSTALL=1
  fi
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  echo "Installing Fabric binaries and Docker images for Linux..."
  (
    cd "$FABRIC_SAMPLES_DIR"
    if [ ! -f install-fabric.sh ]; then
      curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
      chmod +x install-fabric.sh
    fi
    FABRIC_VERSION="${FABRIC_VERSION:-2.5.4}" \
    CA_VERSION="${CA_VERSION:-1.5.7}" \
    ./install-fabric.sh docker binary
  )
fi

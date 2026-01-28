#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FABRIC_DIR="$ROOT_DIR/fabric-samples/test-network"

echo "Stopping backend API..."
docker compose -f "$ROOT_DIR/docker-compose.backend.yml" down

read -p "Do you want to shut down the Hyperledger Fabric network? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Shutting down Hyperledger Fabric network..."
  (cd "$FABRIC_DIR" && ./network.sh down)
fi

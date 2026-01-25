#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLOCKCHAIN_DIR="$ROOT_DIR/blockchain"
FABRIC_DIR="$BLOCKCHAIN_DIR/fabric-samples/test-network"

FABRIC_CHANNEL="${FABRIC_CHANNEL:-mychannel}"
FABRIC_CHAINCODE="${FABRIC_CHAINCODE:-pharma}"
CHAINCODE_PATH="${CHAINCODE_PATH:-$BLOCKCHAIN_DIR/chaincode}"
CHAINCODE_LANG="${CHAINCODE_LANG:-javascript}"

echo "Starting Hyperledger Fabric network (with CA)..."
(cd "$FABRIC_DIR" && ./network.sh up -ca)

if [ -z "$(docker ps -aq -f name=ca_org1)" ]; then
  echo "CA containers not found. Starting CA compose stack explicitly..."
  (cd "$FABRIC_DIR" && docker compose -f compose/compose-ca.yaml -f compose/docker/docker-compose-ca.yaml up -d)
fi

USER_KEY_DIR="$FABRIC_DIR/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore"
if [ -d "$USER_KEY_DIR" ]; then
  if [ ! -e "$USER_KEY_DIR/priv_sk" ]; then
    KEY_FILE="$(ls -1 "$USER_KEY_DIR"/*_sk 2>/dev/null | head -n 1 || true)"
    if [ -n "$KEY_FILE" ]; then
      ln -sf "$(basename "$KEY_FILE")" "$USER_KEY_DIR/priv_sk"
    fi
  fi
fi

echo "Ensuring channel exists..."
set +e
(cd "$FABRIC_DIR" && ./network.sh createChannel -c "$FABRIC_CHANNEL")
set -e

echo "Ensuring chaincode is deployed..."
set +e
(cd "$FABRIC_DIR" && ./network.sh deployCC -c "$FABRIC_CHANNEL" -ccn "$FABRIC_CHAINCODE" -ccp "$CHAINCODE_PATH" -ccl "$CHAINCODE_LANG")
set -e

echo "Starting backend API..."
(cd "$BLOCKCHAIN_DIR" && docker compose -f docker-compose.backend.yml up --build -d)

echo "VPS stack ready."

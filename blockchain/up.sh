#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FABRIC_DIR="$ROOT_DIR/fabric-samples/test-network"
ENV_FILE="$ROOT_DIR/../.env.backend"

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

echo "Starting Hyperledger Fabric network (with CA)..."
(cd "$FABRIC_DIR" && ./network.sh up -ca)

if [ -z "$(docker ps -aq -f name=ca_org1)" ]; then
  echo "CA containers not found. Starting CA compose stack explicitly..."
  (cd "$FABRIC_DIR" && docker compose -f compose/compose-ca.yaml -f compose/docker/docker-compose-ca.yaml up -d)
fi

echo "Waiting for Fabric CA to be available..."
ATTEMPTS=0
MAX_ATTEMPTS=30
SLEEP_TIME=5

until [ "$(curl -s -o /dev/null -w "%{http_code}" https://localhost:7054/cainfo --insecure)" = "200" ] || [ "$ATTEMPTS" -eq "$MAX_ATTEMPTS" ]; do
  ATTEMPTS=$((ATTEMPTS+1))
  echo "CA not yet available. Attempt $ATTEMPTS of $MAX_ATTEMPTS. Waiting $SLEEP_TIME seconds..."
  sleep "$SLEEP_TIME"
done

if [ "$ATTEMPTS" -eq "$MAX_ATTEMPTS" ]; then
  echo "Fabric CA did not become available within the expected time. Exiting."
  exit 1
fi

echo "Fabric CA is available. Proceeding."

USER_KEY_DIR="$FABRIC_DIR/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore"
if [ -d "$USER_KEY_DIR" ]; then
  if [ ! -e "$USER_KEY_DIR/priv_sk" ]; then
    KEY_FILE="$(ls -1 "$USER_KEY_DIR"/*_sk 2>/dev/null | head -n 1 || true)"
    if [ -n "$KEY_FILE" ]; then
      ln -sf "$(basename "$KEY_FILE")" "$USER_KEY_DIR/priv_sk"
    fi
  fi
fi

echo "Ensuring channel and chaincode are deployed..."
(cd "$FABRIC_DIR" && ./network.sh createChannel -c mychannel)
(cd "$FABRIC_DIR" && ./network.sh deployCC -c mychannel -ccn pharma -ccp "$ROOT_DIR/chaincode" -ccl javascript)

echo "Starting backend API..."
docker compose -f "$ROOT_DIR/docker-compose.backend.yml" up --build -d

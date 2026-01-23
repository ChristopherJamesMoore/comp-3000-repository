#!/bin/bash

# Ensure the Fabric network (including CA) is running
echo "Starting Hyperledger Fabric network (with CA)..."
(cd fabric-samples/test-network && ./network.sh up -ca)

# Some environments don't bring up the CA containers via network.sh; ensure they exist.
if [ -z "$(docker ps -aq -f name=ca_org1)" ]; then
  echo "CA containers not found. Starting CA compose stack explicitly..."
  (cd fabric-samples/test-network && docker compose -f compose/compose-ca.yaml -f compose/docker/docker-compose-ca.yaml up -d)
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

echo "Ensuring channel and chaincode are deployed..."
(cd fabric-samples/test-network && ./network.sh createChannel -c mychannel)
(cd fabric-samples/test-network && ./network.sh deployCC -c mychannel -ccn pharma -ccp ../../chaincode -ccl javascript)

echo "Starting frontend and server applications..."
docker-compose up --build -d

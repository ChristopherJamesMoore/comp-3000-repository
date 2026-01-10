#!/bin/sh

# Wait for the Fabric CA to be available
echo "Waiting for Fabric CA to be available..."
ATTEMPTS=0
MAX_ATTEMPTS=30
SLEEP_TIME=5

until [ $(curl -s -o /dev/null -w "%{http_code}" https://ca_org1:7054/cainfo --insecure) == "200" ] || [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS+1))
  echo "CA not yet available. Attempt $ATTEMPTS of $MAX_ATTEMPTS. Waiting $SLEEP_TIME seconds..."
  sleep $SLEEP_TIME
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "Fabric CA did not become available within the expected time. Exiting."
  exit 1
fi

echo "Fabric CA is available. Proceeding with user registration."

if [ -z "$(ls -A wallet 2>/dev/null)" ]; then
  echo "Wallet is empty. Running registerUser.js"
  node registerUser.js
fi

npm start

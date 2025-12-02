#!/bin/bash

# Check if the Fabric network is running
if [ -z "$(docker ps -q -f name=ca_org1)" ]; then
  echo "Starting Hyperledger Fabric network..."
  (cd fabric-samples/test-network && ./network.sh up -ca)
fi

echo "Starting frontend and server applications..."
docker-compose up --build -d

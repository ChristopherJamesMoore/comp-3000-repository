#!/bin/bash

# Check if the Fabric network is running
if [ -z "$(docker ps -q -f name=ca_org1)" ]; then
  echo "Starting Hyperledger Fabric network..."
  (cd fabric-samples/test-network && ./network.sh up -ca)
fi

echo "Ensuring channel and chaincode are deployed..."
(cd fabric-samples/test-network && ./network.sh createChannel -c mychannel)
(cd fabric-samples/test-network && ./network.sh deployCC -c mychannel -ccn pharma -ccp ../../chaincode -ccl javascript)

echo "Starting frontend and server applications..."
docker-compose up --build -d

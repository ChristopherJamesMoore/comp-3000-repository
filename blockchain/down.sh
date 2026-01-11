#!/bin/bash

echo "Stopping frontend and server applications..."
docker-compose down

read -p "Do you want to shut down the Hyperledger Fabric network? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Shutting down Hyperledger Fabric network..."
  (cd fabric-samples/test-network && ./network.sh down)
fi

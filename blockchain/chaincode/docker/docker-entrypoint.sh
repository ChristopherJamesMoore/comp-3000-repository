#!/usr/bin/env sh
set -euo pipefail

: "${CORE_PEER_TLS_ENABLED:=false}"
: "${DEBUG:=false}"

if [ -z "${CHAINCODE_ID:-}" ] && [ -n "${CORE_CHAINCODE_ID_NAME:-}" ]; then
  export CHAINCODE_ID="$CORE_CHAINCODE_ID_NAME"
fi

if [ "${DEBUG}" = "true" ] || [ "${DEBUG}" = "TRUE" ]; then
  npm run start:server-debug
elif [ -z "${CHAINCODE_SERVER_ADDRESS:-}" ]; then
  npm start ${CORE_PEER_ADDRESS:+-- --peer.address "$CORE_PEER_ADDRESS"}
elif [ "${CORE_PEER_TLS_ENABLED}" = "true" ] || [ "${CORE_PEER_TLS_ENABLED}" = "TRUE" ]; then
  npm run start:server
else
  npm run start:server-nontls
fi

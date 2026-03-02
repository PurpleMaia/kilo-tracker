#!/bin/bash

# Displays the current database migration version
ENV_FILE=".env"
export $(cat $ENV_FILE | grep -v '^#' | xargs)

ENV_ARG=$1
case $ENV_ARG in
  d|dev)
    ENV="dev"
    echo "Using development environment..."
    ;;
  p|prod)
    ENV="prod"
    echo "Using production environment..."
    ;;
  *)
    echo "No environment specified, defaulting to 'local'."
    ENV="local"
    ;;
esac

case $ENV in
  dev)
    echo ""
    echo "Current migration version:"
    migrate -database "${DEV_URL}" -path src/db/migrations version
    echo ""   
    ;;
  prod)
    echo ""
    echo "Current migration version:"
    migrate -database "${PROD_URL}" -path src/db/migrations version
    echo ""
    ;;
  local|*)
    echo ""
    echo "Current migration version:"
    migrate -database "${DATABASE_URL}" -path src/db/migrations version
    echo ""
    ;;
esac


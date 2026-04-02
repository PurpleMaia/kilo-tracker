#!/bin/bash

# Remove Dokku apps and Postgres containers
APP_NAME=$1
ENV_FILE=".env"
export $(cat $ENV_FILE | grep -v '^#' | xargs)

echo "Removing Dokku apps and Postgres containers for $APP_NAME..."
## DEV
echo "Removing DEV Dokku app & postgres container..."
ssh dokku@$PMF_DOKKU_HOST apps:destroy $APP_NAME-dev --force
ssh dokku@$PMF_DOKKU_HOST postgres:destroy $APP_NAME-dev-db --force
## PROD
echo "Removing PROD Dokku app & postgres container..."
ssh dokku@$PMF_DOKKU_HOST apps:destroy $APP_NAME --force
ssh dokku@$PMF_DOKKU_HOST postgres:destroy $APP_NAME-db --force
echo ""

echo "Dokku apps and Postgres containers removed successfully!"
#!/usr/bin/env bash
set -euo pipefail

# Provision Azure resources for this app (frontend + backend on Azure Web Apps)
# Usage:
#   ./scripts/provision-azure.sh
# Optional overrides:
#   LOCATION=westeurope ENV_NAME=prod BASE_NAME=hospitrain ./scripts/provision-azure.sh
#
# Prerequisites:
# - Azure CLI installed and logged in: az login
# - Subscription selected: az account set --subscription <SUBSCRIPTION_ID_OR_NAME>

LOCATION="${LOCATION:-israelcentral}"
ENV_NAME="${ENV_NAME:-dev}"
BASE_NAME="${BASE_NAME:-hospitrain}"
APP_SERVICE_OS="${APP_SERVICE_OS:-linux}"
APP_SERVICE_SKU="${APP_SERVICE_SKU:-F1}"

# Optional, only if you want script to also create GitHub OIDC app registration for backend deployment
GITHUB_ORG="${GITHUB_ORG:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required but not found."
  exit 1
fi

# Use caller's Azure CLI profile by default (~/.azure).
# If AZURE_CONFIG_DIR is explicitly provided, ensure it exists.
if [[ -n "${AZURE_CONFIG_DIR:-}" ]]; then
  mkdir -p "$AZURE_CONFIG_DIR"
fi

RG="rg-${BASE_NAME}-${ENV_NAME}"
PLAN="asp-${BASE_NAME}-${ENV_NAME}"
BACKEND_APP="app-${BASE_NAME}-be-${ENV_NAME}"
FRONTEND_APP="app-${BASE_NAME}-fe-${ENV_NAME}"
KV_NAME="kv-${BASE_NAME}-${ENV_NAME}"
STORAGE_NAME="st${BASE_NAME}${ENV_NAME}"

# Azure naming constraints
STORAGE_NAME="$(echo "$STORAGE_NAME" | tr -cd 'a-z0-9' | cut -c1-24)"
KV_NAME="$(echo "$KV_NAME" | tr -cd 'a-z0-9-' | cut -c1-24)"

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"

ensure_provider_registered() {
  local namespace="$1"
  local state
  state="$(az provider show --namespace "$namespace" --query registrationState -o tsv 2>/dev/null || true)"
  if [[ "$state" != "Registered" ]]; then
    echo "Registering resource provider: $namespace"
    az provider register --namespace "$namespace" --wait --output none
  fi
}

log_success() {
  echo "SUCCESS: $1"
}

create_webapp() {
  local app_name="$1"
  local rg="$2"
  local plan="$3"
  local os="$4"

  if [[ "$os" == "linux" ]]; then
    az webapp create \
      --name "$app_name" \
      --resource-group "$rg" \
      --plan "$plan" \
      --runtime "NODE:22-lts" \
      --sitecontainers-app false \
      --output none
  else
    az webapp create \
      --name "$app_name" \
      --resource-group "$rg" \
      --plan "$plan" \
      --output none
  fi
}

ensure_provider_registered "Microsoft.Resources"
ensure_provider_registered "Microsoft.Web"
ensure_provider_registered "Microsoft.Storage"
ensure_provider_registered "Microsoft.KeyVault"
ensure_provider_registered "Microsoft.OperationalInsights"
ensure_provider_registered "Microsoft.Authorization"

echo "Using subscription: $SUBSCRIPTION_ID"
echo "Using tenant: $TENANT_ID"
echo "Location: $LOCATION"
echo "App Service OS: $APP_SERVICE_OS"
echo "App Service SKU: $APP_SERVICE_SKU"

# 1) Resource group
if [[ "$(az group exists --name "$RG")" != "true" ]]; then
  az group create \
    --name "$RG" \
    --location "$LOCATION" \
    --output none
  log_success "Resource Group created: $RG"
else
  echo "Resource Group exists: $RG"
fi

# 2) App Service plan + backend Web App (Node)
if ! az appservice plan show --name "$PLAN" --resource-group "$RG" --output none 2>/dev/null; then
  if [[ "$APP_SERVICE_OS" == "linux" ]]; then
    az appservice plan create \
      --name "$PLAN" \
      --resource-group "$RG" \
      --sku "$APP_SERVICE_SKU" \
      --is-linux \
      --output none
  else
    az appservice plan create \
      --name "$PLAN" \
      --resource-group "$RG" \
      --sku "$APP_SERVICE_SKU" \
      --output none
  fi
  log_success "App Service Plan created: $PLAN"
else
  echo "App Service Plan exists: $PLAN"
fi

if ! az webapp show --name "$BACKEND_APP" --resource-group "$RG" --output none 2>/dev/null; then
  create_webapp "$BACKEND_APP" "$RG" "$PLAN" "$APP_SERVICE_OS"
  log_success "Backend Web App created: $BACKEND_APP"
else
  echo "Backend Web App exists: $BACKEND_APP"
fi

if ! az webapp show --name "$FRONTEND_APP" --resource-group "$RG" --output none 2>/dev/null; then
  create_webapp "$FRONTEND_APP" "$RG" "$PLAN" "$APP_SERVICE_OS"
  log_success "Frontend Web App created: $FRONTEND_APP"
else
  echo "Frontend Web App exists: $FRONTEND_APP"
fi

JWT_SECRET="Y95adcMGAjNxOODHgQhQJezKBVpW6UGeB43xY5yZdk7"
log_success "JWT secret generated for backend and Key Vault"

az webapp config appsettings set \
  --name "$BACKEND_APP" \
  --resource-group "$RG" \
  --settings \
    NODE_ENV=production \
    JWT_SECRET="$JWT_SECRET" \
    WEBSITE_NODE_DEFAULT_VERSION="~22" \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  --output none
log_success "Backend app settings configured"

# 3) Storage account (for persistent files / future exports)
if ! az storage account show --name "$STORAGE_NAME" --resource-group "$RG" --output none 2>/dev/null; then
  az storage account create \
    --name "$STORAGE_NAME" \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --output none
  log_success "Storage Account created: $STORAGE_NAME"
else
  echo "Storage Account exists: $STORAGE_NAME"
fi

# 4) Key Vault (for secret management)
if ! az keyvault show --name "$KV_NAME" --resource-group "$RG" --output none 2>/dev/null; then
  az keyvault create \
    --name "$KV_NAME" \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --enable-rbac-authorization true \
    --output none
  log_success "Key Vault created: $KV_NAME"
else
  echo "Key Vault exists: $KV_NAME"
fi

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "jwt-secret" \
  --value "$JWT_SECRET" \
  --output none
log_success "Key Vault secret set: jwt-secret"

# Frontend Web App config
if [[ "$APP_SERVICE_OS" == "linux" ]]; then
  az webapp config set \
    --name "$BACKEND_APP" \
    --resource-group "$RG" \
    --linux-fx-version "NODE|22-lts" \
    --output none
  log_success "Backend Linux runtime configured: NODE|22-lts"

  az webapp config set \
    --name "$FRONTEND_APP" \
    --resource-group "$RG" \
    --linux-fx-version "NODE|22-lts" \
    --output none
  log_success "Frontend Linux runtime configured: NODE|22-lts"

  az webapp config set \
    --name "$FRONTEND_APP" \
    --resource-group "$RG" \
    --startup-file "pm2 serve /home/site/wwwroot --no-daemon --spa" \
    --output none
  log_success "Frontend startup command configured for static SPA serving"
fi

BACKEND_URL="https://${BACKEND_APP}.azurewebsites.net"
FRONTEND_URL="https://${FRONTEND_APP}.azurewebsites.net"

# Backend app configuration relevant to this app:
# - CORS for frontend default domain
# - CORS for local dev frontend
if ! az webapp cors show --name "$BACKEND_APP" --resource-group "$RG" --query "contains(allowedOrigins, '$FRONTEND_URL')" -o tsv | grep -q "true"; then
  az webapp cors add \
    --name "$BACKEND_APP" \
    --resource-group "$RG" \
    --allowed-origins "$FRONTEND_URL" \
    --output none
  log_success "Backend CORS added for frontend origin: $FRONTEND_URL"
fi

if ! az webapp cors show --name "$BACKEND_APP" --resource-group "$RG" --query "contains(allowedOrigins, 'http://localhost:3000')" -o tsv | grep -q "true"; then
  az webapp cors add \
    --name "$BACKEND_APP" \
    --resource-group "$RG" \
    --allowed-origins "http://localhost:3000" \
    --output none
  log_success "Backend CORS added for local origin: http://localhost:3000"
fi

# 7) Optional: GitHub OIDC app registration for backend deploy workflow
AZURE_CLIENT_ID=""
if [[ -n "$GITHUB_ORG" && -n "$GITHUB_REPO" ]]; then
  APP_REG_NAME="gh-${BASE_NAME}-${ENV_NAME}"

  APP_ID="$(az ad app create --display-name "$APP_REG_NAME" --query appId -o tsv)"
  OBJ_ID="$(az ad app show --id "$APP_ID" --query id -o tsv)"

  az ad sp create --id "$APP_ID" --output none

  az role assignment create \
    --assignee "$APP_ID" \
    --role Contributor \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG" \
    --output none

  FEDERATED_FILE="/tmp/federated-cred-${BASE_NAME}-${ENV_NAME}.json"
  cat > "$FEDERATED_FILE" << JSON
{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/${GITHUB_BRANCH}",
  "description": "GitHub Actions OIDC for ${GITHUB_ORG}/${GITHUB_REPO}",
  "audiences": ["api://AzureADTokenExchange"]
}
JSON

  az ad app federated-credential create \
    --id "$OBJ_ID" \
    --parameters "$FEDERATED_FILE" \
    --output none

  AZURE_CLIENT_ID="$APP_ID"
fi

cat <<OUT

Provisioning complete.

Created resources:
- Resource Group: $RG
- App Service Plan: $PLAN
- Backend Web App: $BACKEND_APP
- Frontend Web App: $FRONTEND_APP
- Storage Account: $STORAGE_NAME
- Key Vault: $KV_NAME

Default Azure URLs:
- Backend URL: $BACKEND_URL
- Frontend URL: $FRONTEND_URL

Set these GitHub secrets:
- AZURE_BACKEND_WEBAPP_NAME=$BACKEND_APP
- AZURE_FRONTEND_WEBAPP_NAME=$FRONTEND_APP
- REACT_APP_API_DOMAIN=$BACKEND_URL
- AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
- AZURE_TENANT_ID=$TENANT_ID

If GITHUB_ORG/GITHUB_REPO were provided, also set:
- AZURE_CLIENT_ID=$AZURE_CLIENT_ID

Note:
- Backend currently writes data to local files. App Service file storage is not ideal for multi-instance scaling.
- Since you chose no CosmosDB for now, keep backend scaled to one instance for consistency.

OUT

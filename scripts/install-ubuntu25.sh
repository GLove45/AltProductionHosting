#!/usr/bin/env bash
# Bootstrap Alt Production Hosting on Ubuntu 25.x machines.
#
# This script installs system dependencies, Node.js, MongoDB, project
# dependencies, configures the backend systemd service, and provisions an
# nginx reverse proxy for www.altproductionhosting.com. Run it once on a fresh
# server (preferably with sudo/root) and the platform will be fully deployed.

set -o errexit
set -o nounset
set -o pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "[ERROR] Please run scripts/install-ubuntu25.sh with sudo or as root." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_PREFIX="[install-ubuntu25]"

APP_USER="altproduction"
APP_GROUP="${APP_USER}"
APP_ROOT="/opt/altproductionhosting"
FRONTEND_WEB_ROOT="/var/www/altproductionhosting"
DOMAIN="www.altproductionhosting.com"
SYSTEMD_SERVICE="altproductionhosting.service"
BACKEND_SERVICE_NAME="Alt Production Hosting Backend"

ensure_directory() {
  local dir="$1"
  if [[ ! -d "${dir}" ]]; then
    mkdir -p "${dir}"
  fi
}

run_as_app() {
  local working_dir="$1"
  shift
  runuser -u "${APP_USER}" -- bash -lc "cd '${working_dir}' && export PATH=/usr/local/bin:/usr/bin:/bin && $*"
}

info() {
  echo "${LOG_PREFIX} $*"
}

apt_update_once=false
apt_update() {
  if [[ "${apt_update_once}" = false ]]; then
    info "Updating apt package index"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt_update_once=true
  fi
}

install_packages() {
  local packages=()
  for pkg in "$@"; do
    if ! dpkg -s "${pkg}" >/dev/null 2>&1; then
      packages+=("${pkg}")
    fi
  done
  if [[ ${#packages[@]} -gt 0 ]]; then
    apt_update
    info "Installing packages: ${packages[*]}"
    apt-get install -y "${packages[@]}"
  fi
}

info "Installing prerequisite packages"
install_packages ca-certificates curl gnupg git build-essential unzip lsb-release openssl nginx rsync

if ! command -v node >/dev/null 2>&1; then
  info "Installing Node.js 20 LTS from NodeSource"
  NODE_KEYRING=/usr/share/keyrings/nodesource.gpg
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o "${NODE_KEYRING}"
  echo "deb [signed-by=${NODE_KEYRING}] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt_update_once=false
  apt_update
  apt-get install -y nodejs
else
  info "Node.js already installed (version $(node --version))"
fi

if ! command -v mongod >/dev/null 2>&1; then
  info "Installing MongoDB Community Server 7.0"
  source /etc/os-release
  MONGO_KEYRING=/usr/share/keyrings/mongodb-server-7.0.gpg
  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o "${MONGO_KEYRING}"

  SUPPORTED_MONGO_CODENAMES=("jammy" "noble")
  TARGET_CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
  if [[ -z "${TARGET_CODENAME}" ]]; then
    TARGET_CODENAME="noble"
  fi
  if [[ ! " ${SUPPORTED_MONGO_CODENAMES[*]} " =~ " ${TARGET_CODENAME} " ]]; then
    info "Ubuntu codename '${TARGET_CODENAME}' is not explicitly supported by MongoDB yet; falling back to 'noble'."
    TARGET_CODENAME="noble"
  fi

  echo "deb [ arch=amd64,arm64 signed-by=${MONGO_KEYRING} ] https://repo.mongodb.org/apt/ubuntu ${TARGET_CODENAME}/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt_update_once=false
  apt_update
  apt-get install -y mongodb-org
  systemctl enable --now mongod
else
  info "MongoDB already installed (version $(mongod --version | head -n 1))"
fi

ensure_directory "${APP_ROOT}"

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  info "Creating application user '${APP_USER}'"
  useradd --system --home "${APP_ROOT}" --shell /usr/sbin/nologin --no-create-home "${APP_USER}"
fi

APP_GROUP="$(id -gn "${APP_USER}")"

ensure_directory "${FRONTEND_WEB_ROOT}"

info "Syncing repository to ${APP_ROOT}"
rsync -a --delete \
  --exclude ".git" \
  --exclude "backend/.env" \
  --exclude "backend/node_modules" \
  --exclude "backend/dist" \
  --exclude "frontend/node_modules" \
  --exclude "frontend/dist" \
  "${REPO_ROOT}/" "${APP_ROOT}/"

chown -R "${APP_USER}:${APP_GROUP}" "${APP_ROOT}"

ENV_FILE="${APP_ROOT}/backend/.env"
ENV_TEMPLATE="${APP_ROOT}/backend/.env.example"
if [[ ! -f "${ENV_TEMPLATE}" ]]; then
  echo "${LOG_PREFIX} Missing backend/.env.example inside ${APP_ROOT}." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  info "Creating backend/.env from template"
  cp "${ENV_TEMPLATE}" "${ENV_FILE}"
  RANDOM_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  sed -i "s|JWT_SECRET=change-me|JWT_SECRET=${RANDOM_SECRET}|" "${ENV_FILE}"
  chown "${APP_USER}:${APP_GROUP}" "${ENV_FILE}"
else
  info "backend/.env already exists; leaving in place"
fi

info "Installing Node.js dependencies for backend"
run_as_app "${APP_ROOT}/backend" "npm ci"

info "Installing Node.js dependencies for frontend"
run_as_app "${APP_ROOT}/frontend" "npm ci"

info "Building backend"
run_as_app "${APP_ROOT}/backend" "npm run build"

info "Building frontend"
run_as_app "${APP_ROOT}/frontend" "npm run build"

info "Deploying frontend build to ${FRONTEND_WEB_ROOT}"
rsync -a --delete "${APP_ROOT}/frontend/dist/" "${FRONTEND_WEB_ROOT}/"
chown -R www-data:www-data "${FRONTEND_WEB_ROOT}"

SERVICE_FILE="/etc/systemd/system/${SYSTEMD_SERVICE}"
info "Configuring systemd service at ${SERVICE_FILE}"
cat >"${SERVICE_FILE}" <<SERVICE
[Unit]
Description=${BACKEND_SERVICE_NAME}
After=network.target mongod.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_ROOT}/backend
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

info "Reloading systemd daemon"
systemctl daemon-reload
systemctl enable "${SYSTEMD_SERVICE}"
systemctl restart "${SYSTEMD_SERVICE}"

NGINX_AVAILABLE="/etc/nginx/sites-available/altproductionhosting.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/altproductionhosting.conf"
info "Provisioning nginx configuration for ${DOMAIN}"
cat >"${NGINX_AVAILABLE}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} altproductionhosting.com;

    root ${FRONTEND_WEB_ROOT};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

info "Testing nginx configuration"
nginx -t

info "Reloading nginx"
systemctl reload nginx

cat <<SUMMARY
${LOG_PREFIX} Installation complete!

Services:
  - Backend API: systemd service '${SYSTEMD_SERVICE}' (sudo systemctl status ${SYSTEMD_SERVICE})
  - Frontend: served via nginx at http://${DOMAIN}/
  - MongoDB: systemd service 'mongod'

You can now access the platform at http://${DOMAIN}/
SUMMARY

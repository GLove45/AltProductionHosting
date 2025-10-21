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

warn() {
  echo "${LOG_PREFIX} [WARN] $*" >&2
}

repo_release_exists() {
  local repo_url="$1"
  if curl --silent --head --fail "${repo_url}" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

apt_update_once=false
apt_update() {
  if [[ "${apt_update_once}" = false ]]; then
    info "Updating apt package index"
    export DEBIAN_FRONTEND=noninteractive

    local tmp_log
    tmp_log="$(mktemp)"

    if apt-get update -y 2>&1 | tee "${tmp_log}"; then
      apt_update_once=true
      rm -f "${tmp_log}"
      return 0
    fi

    warn "apt update failed; attempting automated recovery."

    local handled=false
    if grep -q "https://repo.mongodb.org/apt/ubuntu" "${tmp_log}"; then
      warn "Detected broken MongoDB repository; removing /etc/apt/sources.list.d/mongodb-org-7.0.list"
      rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
      handled=true
    fi
    if grep -q "https://deb.nodesource.com/node_20.x" "${tmp_log}"; then
      warn "Detected unsupported NodeSource repository; removing /etc/apt/sources.list.d/nodesource.list"
      rm -f /etc/apt/sources.list.d/nodesource.list
      handled=true
    fi

    rm -f "${tmp_log}"

    if [[ "${handled}" = true ]]; then
      info "Retrying apt package index update"
      if apt-get update -y; then
        apt_update_once=true
        return 0
      fi
    fi

    warn "apt update failed and could not be automatically recovered."
    return 1
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
  info "Installing Node.js 20 LTS"
  NODE_ARCH="$(dpkg --print-architecture)"
  case "${NODE_ARCH}" in
    amd64|arm64)
      NODE_KEYRING=/usr/share/keyrings/nodesource.gpg
      NODE_RELEASE_URL="https://deb.nodesource.com/node_20.x/dists/nodistro/Release"
      if repo_release_exists "${NODE_RELEASE_URL}"; then
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o "${NODE_KEYRING}"
        echo "deb [arch=${NODE_ARCH} signed-by=${NODE_KEYRING}] https://deb.nodesource.com/node_20.x nodistro main" \
          > /etc/apt/sources.list.d/nodesource.list
        apt_update_once=false
        if ! apt_update; then
          warn "apt update failed after adding NodeSource. Falling back to Ubuntu package."
          rm -f /etc/apt/sources.list.d/nodesource.list
        fi
      else
        warn "NodeSource release metadata unavailable; falling back to Ubuntu package."
      fi
      ;;
    *)
      warn "Architecture '${NODE_ARCH}' not supported by NodeSource repository; falling back to Ubuntu package."
      ;;
  esac

  if ! command -v node >/dev/null 2>&1; then
    apt_update
    apt-get install -y nodejs npm
  else
    apt-get install -y nodejs
  fi
else
  info "Node.js already installed (version $(node --version))"
fi

if ! command -v mongod >/dev/null 2>&1; then
  info "Installing MongoDB Community Server 7.0"
  source /etc/os-release
  MONGO_KEYRING=/usr/share/keyrings/mongodb-server-7.0.gpg
  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o "${MONGO_KEYRING}"

  MONGO_LIST_FILE="/etc/apt/sources.list.d/mongodb-org-7.0.list"
  if [[ -f "${MONGO_LIST_FILE}" ]]; then
    warn "Removing stale MongoDB repository configuration before probing releases."
    rm -f "${MONGO_LIST_FILE}"
  fi

  SUPPORTED_MONGO_CODENAMES=("noble" "jammy")
  TARGET_CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
  if [[ -z "${TARGET_CODENAME}" ]]; then
    TARGET_CODENAME="noble"
  fi

  RESOLVED_CODENAME=""
  for CODENAME in "${TARGET_CODENAME}" "${SUPPORTED_MONGO_CODENAMES[@]}"; do
    [[ -n "${CODENAME}" ]] || continue
    RELEASE_URL="https://repo.mongodb.org/apt/ubuntu/dists/${CODENAME}/mongodb-org/7.0/Release"
    if repo_release_exists "${RELEASE_URL}"; then
      RESOLVED_CODENAME="${CODENAME}"
      break
    fi
  done

  if [[ -z "${RESOLVED_CODENAME}" ]]; then
    warn "Unable to find a supported MongoDB repository for Ubuntu '${TARGET_CODENAME}'. Skipping MongoDB installation."
  else
    if [[ "${RESOLVED_CODENAME}" != "${TARGET_CODENAME}" ]]; then
      warn "Using MongoDB repository for '${RESOLVED_CODENAME}' (instead of '${TARGET_CODENAME}')."
    fi
    echo "deb [ arch=amd64,arm64 signed-by=${MONGO_KEYRING} ] https://repo.mongodb.org/apt/ubuntu ${RESOLVED_CODENAME}/mongodb-org/7.0 multiverse" \
      > "${MONGO_LIST_FILE}"
    apt_update_once=false
    if apt_update; then
      apt-get install -y mongodb-org
      systemctl enable --now mongod
    else
      warn "apt update failed after adding MongoDB repository. Removing repository configuration."
      rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
    fi
  fi
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

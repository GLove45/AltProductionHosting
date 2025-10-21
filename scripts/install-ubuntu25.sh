#!/usr/bin/env bash
# Bootstrap Alt Production Hosting on Ubuntu 25.x machines.
#
# This script installs system dependencies, Node.js, MongoDB, and project
# dependencies. Run it once on a fresh server (preferably with sudo/root).

set -o errexit
set -o nounset
set -o pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "[ERROR] Please run scripts/install-ubuntu25.sh with sudo or as root." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_PREFIX="[install-ubuntu25]"

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
install_packages ca-certificates curl gnupg git build-essential unzip lsb-release openssl

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

ENV_FILE="${REPO_ROOT}/backend/.env"
ENV_TEMPLATE="${REPO_ROOT}/backend/.env.example"
if [[ ! -f "${ENV_TEMPLATE}" ]]; then
  echo "${LOG_PREFIX} Missing backend/.env.example. Please add it before running the installer." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  info "Creating backend/.env from template"
  cp "${ENV_TEMPLATE}" "${ENV_FILE}"
  RANDOM_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  sed -i "s|JWT_SECRET=change-me|JWT_SECRET=${RANDOM_SECRET}|" "${ENV_FILE}"
else
  info "backend/.env already exists; leaving in place"
fi

info "Installing Node.js dependencies for backend"
(cd "${REPO_ROOT}/backend" && npm install)

info "Installing Node.js dependencies for frontend"
(cd "${REPO_ROOT}/frontend" && npm install)

info "Building backend"
(cd "${REPO_ROOT}/backend" && npm run build)

info "Building frontend"
(cd "${REPO_ROOT}/frontend" && npm run build)

cat <<SUMMARY
${LOG_PREFIX} Installation complete!

Next steps:
  - Configure reverse proxies or process managers (e.g., systemd, PM2) for backend/dist/server/index.js.
  - Serve frontend/dist as static assets via nginx or another web server.
  - Verify MongoDB is running: sudo systemctl status mongod
SUMMARY

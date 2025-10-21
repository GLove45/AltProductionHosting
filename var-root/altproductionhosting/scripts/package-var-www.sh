#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAR_ROOT="${ROOT_DIR}/var-root"
VAR_PUBLIC="${ROOT_DIR}/var-public"
WEB_ROOT_NAME="altproductionhosting"
PROJECT_DEST="${VAR_ROOT}/${WEB_ROOT_NAME}"
FRONTEND_SRC="${ROOT_DIR}/frontend"
BUILD_DIR="${FRONTEND_SRC}/dist"

info() {
  printf '\n\033[1m[package-var-www]\033[0m %s\n' "$1"
}

warn() {
  printf '\033[33m[package-var-www][warn]\033[0m %s\n' "$1" >&2
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    warn "Required command '$1' is not installed"
    exit 1
  fi
}

run_frontend_build() {
  if [[ "${SKIP_FRONTEND_BUILD:-0}" = "1" ]]; then
    info "Skipping frontend build as requested"
    return
  fi

  if [[ ! -d "${FRONTEND_SRC}" ]]; then
    warn "Frontend source directory not found at ${FRONTEND_SRC}"
    return
  fi

  info "Building frontend production bundle"
  (cd "${FRONTEND_SRC}" && npm run build)
}

sync_project_root() {
  info "Preparing ${PROJECT_DEST}"
  rm -rf "${PROJECT_DEST}"
  mkdir -p "${PROJECT_DEST}"

  local -a excludes=(
    --exclude=".git/"
    --exclude=".github/"
    --exclude="var-root/"
    --exclude="var-public/"
    --exclude="node_modules/"
    --exclude="frontend/dist/"
    --exclude="backend/dist/"
  )

  info "Copying repository files into ${PROJECT_DEST}"
  rsync -a "${excludes[@]}" "${ROOT_DIR}/" "${PROJECT_DEST}/"
}

sync_frontend_public() {
  if [[ ! -d "${BUILD_DIR}" ]]; then
    warn "Frontend build directory ${BUILD_DIR} does not exist; skipping public sync"
    return
  fi

  info "Refreshing ${VAR_PUBLIC}"
  rm -rf "${VAR_PUBLIC}"
  mkdir -p "${VAR_PUBLIC}"
  cp -a "${BUILD_DIR}/". "${VAR_PUBLIC}/"

  cat >"${VAR_PUBLIC}/README.md" <<'README'
# /var/www/altproductionhosting contents

Files in this directory are copied to `/var/www/altproductionhosting`.
They come from the Vite production build under `frontend/dist`.
README
}

create_root_readme() {
  cat >"${VAR_ROOT}/README.md" <<'README'
# /var/www layout package

Copy the contents of this directory to `/var/www` on the target host.
It contains the `altproductionhosting/` project tree prepared for deployment.
README
}

main() {
  mkdir -p "${VAR_ROOT}" "${VAR_PUBLIC}"
  require_cmd rsync
  run_frontend_build
  sync_project_root
  sync_frontend_public
  create_root_readme
  info "Package preparation complete"
}

main "$@"

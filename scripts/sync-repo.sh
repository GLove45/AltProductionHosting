#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${TARGET_DIR:-/var/www/altproductionhosting}"
REPO_URL="${REPO_URL:-}"

info() {
  printf '\n\033[1m%s\033[0m\n' "$1"
}

note() {
  printf '  - %s\n' "$1"
}

warn() {
  printf '\033[33mWarning:\033[0m %s\n' "$1"
}

err() {
  printf '\033[31mError:\033[0m %s\n' "$1" >&2
}

ensure_repo_url() {
  if [[ -n "$REPO_URL" ]]; then
    return
  fi

  if git -C "$ROOT_DIR" rev-parse >/dev/null 2>&1; then
    local origin_url
    origin_url="$(git -C "$ROOT_DIR" config --get remote.origin.url || true)"
    if [[ -n "$origin_url" ]]; then
      REPO_URL="$origin_url"
      note "Detected repository URL from local checkout: $REPO_URL"
      return
    fi
  fi

  err "Unable to determine repository URL. Set the REPO_URL environment variable."
  exit 1
}

ensure_target_dir() {
  if [[ -d "$TARGET_DIR/.git" ]]; then
    note "Existing Git repository found at $TARGET_DIR"
    validate_target_remote
    return
  fi

  if [[ ! -d "$TARGET_DIR" ]]; then
    info "Creating target directory $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
  fi

  note "Initializing repository in $TARGET_DIR"
  git clone "$REPO_URL" "$TARGET_DIR"
}

validate_target_remote() {
  local current_remote
  current_remote="$(git -C "$TARGET_DIR" config --get remote.origin.url || true)"

  if [[ -z "$current_remote" ]]; then
    warn "No origin remote configured in $TARGET_DIR. Skipping remote validation."
    return
  fi

  if [[ "$current_remote" != "$REPO_URL" ]]; then
    err "Target repository origin ($current_remote) does not match expected URL ($REPO_URL)."
    exit 1
  fi
}

pull_repository() {
  info "Fetching latest changes into $TARGET_DIR"
  git -C "$TARGET_DIR" fetch --prune
  git -C "$TARGET_DIR" pull --ff-only
}

main() {
  info "Synchronizing repository to $TARGET_DIR"
  ensure_repo_url
  ensure_target_dir
  pull_repository
  info "Repository synchronized successfully."
}

main "$@"

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${TARGET_DIR:-/var/www/altproductionhosting}"
REPO_URL="${REPO_URL:-}"
TARGET_BRANCH="${TARGET_BRANCH:-}"

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

detect_target_branch() {
  if [[ -n "$TARGET_BRANCH" ]]; then
    note "Using target branch $TARGET_BRANCH"
    return
  fi

  local local_branch
  local_branch="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if [[ -n "$local_branch" && "$local_branch" != "HEAD" ]]; then
    TARGET_BRANCH="$local_branch"
    note "Detected branch from local checkout: $TARGET_BRANCH"
    return
  fi

  local remote_branch
  remote_branch="$(git ls-remote --symref "$REPO_URL" HEAD 2>/dev/null | awk '/^ref:/ {sub("refs/heads/", "", $2); print $2}' | head -n 1)"
  if [[ -n "$remote_branch" ]]; then
    TARGET_BRANCH="$remote_branch"
    note "Detected default branch from remote: $TARGET_BRANCH"
    return
  fi

  TARGET_BRANCH="main"
  warn "Falling back to default branch '$TARGET_BRANCH'"
}

configure_target_remote() {
  local current_remote
  current_remote="$(git -C "$TARGET_DIR" config --get remote.origin.url || true)"

  if [[ -z "$current_remote" ]]; then
    git -C "$TARGET_DIR" remote add origin "$REPO_URL"
    note "Added origin remote pointing to $REPO_URL"
    return
  fi

  if [[ "$current_remote" != "$REPO_URL" ]]; then
    err "Target repository origin ($current_remote) does not match expected URL ($REPO_URL)."
    exit 1
  fi
}

ensure_target_dir() {
  if git -C "$TARGET_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    note "Existing Git repository found at $TARGET_DIR"
    validate_target_remote
    return
  fi

  if [[ ! -d "$TARGET_DIR" ]]; then
    info "Creating target directory $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
  fi

  if [[ -z "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]]; then
    note "Cloning repository into empty directory $TARGET_DIR"
    git clone "$REPO_URL" "$TARGET_DIR"
    return
  fi

  info "Preparing existing directory $TARGET_DIR for Git synchronization"
  initialize_repository_in_place
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

initialize_repository_in_place() {
  detect_target_branch

  if [[ ! -d "$TARGET_DIR/.git" && ! -f "$TARGET_DIR/.git" ]]; then
    note "Initializing Git metadata in $TARGET_DIR"
    git -C "$TARGET_DIR" init
  fi

  configure_target_remote

  info "Fetching branch $TARGET_BRANCH from remote"
  git -C "$TARGET_DIR" fetch origin

  if git -C "$TARGET_DIR" show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    note "Checking out existing local branch $TARGET_BRANCH"
    git -C "$TARGET_DIR" checkout "$TARGET_BRANCH"
  else
    note "Creating local branch $TARGET_BRANCH tracking origin/$TARGET_BRANCH"
    git -C "$TARGET_DIR" checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
  fi

  note "Resetting working tree to origin/$TARGET_BRANCH"
  git -C "$TARGET_DIR" reset --hard "origin/$TARGET_BRANCH"
  git -C "$TARGET_DIR" branch --set-upstream-to="origin/$TARGET_BRANCH" "$TARGET_BRANCH" >/dev/null 2>&1 || true
  note "Removing untracked files from $TARGET_DIR"
  git -C "$TARGET_DIR" clean -fd >/dev/null 2>&1 || true
}

pull_repository() {
  info "Fetching latest changes into $TARGET_DIR"
  git -C "$TARGET_DIR" fetch --prune
  git -C "$TARGET_DIR" pull --ff-only
}

main() {
  info "Synchronizing repository to $TARGET_DIR"
  ensure_repo_url
  detect_target_branch
  ensure_target_dir
  pull_repository
  info "Repository synchronized successfully."
}

main "$@"

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${HOST:-localhost}"
FRONTEND_PORT="${FRONTEND_PORT:-10083}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
BACKEND_HEALTH_PATH="${BACKEND_HEALTH_PATH:-/healthz}"

info() {
  printf '\n\033[1m%s\033[0m\n' "$1"
}

note() {
  printf '  - %s\n' "$1"
}

warn() {
  printf '  ! %s\n' "$1"
}

check_backend_port_config() {
  info "Inspecting backend port configuration"
  local env_file="$ROOT_DIR/backend/.env"
  local source_desc="backend/.env"
  if [[ ! -f "$env_file" ]]; then
    env_file="$ROOT_DIR/backend/.env.example"
    source_desc="backend/.env.example"
    note "${ROOT_DIR#/workspace/}/backend/.env not found. Falling back to template: $source_desc"
  else
    note "Using port configuration from $source_desc"
  fi

  local configured_port
  configured_port="$(grep -E '^PORT=' "$env_file" | tail -n 1 | cut -d'=' -f2 || true)"

  if [[ -z "$configured_port" ]]; then
    warn "Could not determine backend PORT value from $source_desc"
    return
  fi

  note "Backend configured to listen on port $configured_port"
  if [[ "$configured_port" == "80" ]]; then
    warn "Port 80 is already reserved on this host. Update backend PORT to avoid conflicts."
  fi
}

check_listener() {
  local port="$1"
  local label="$2"
  info "Checking listener on port $port (${label})"
  if command -v ss >/dev/null 2>&1; then
    if ss -tulwn | awk '{print $5}' | grep -qE ":${port}$"; then
      note "A service is listening on port $port"
      ss -tulwn | awk -v pattern=":${port}$" '$5 ~ pattern {printf "    %s %s\n", $1, $5}'
    else
      warn "No process is currently bound to port $port"
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | awk '{print $4}' | grep -qE ":${port}$"; then
      note "A service is listening on port $port"
      netstat -tuln | awk -v pattern=":${port}$" '$4 ~ pattern {printf "    %s %s\n", $1, $4}'
    else
      warn "No process is currently bound to port $port"
    fi
  elif command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      note "A service is listening on port $port"
      lsof -nP -iTCP:"$port" -sTCP:LISTEN | awk 'NR==1 || NR>1 {printf "    %s %s\n", $1, $9}'
    else
      warn "No process is currently bound to port $port"
    fi
  else
    warn "Unable to inspect open ports because ss, netstat, and lsof are unavailable"
    note "Install iproute2 (ss) or net-tools (netstat) or lsof to enable port visibility"
  fi
}

check_http() {
  local url="$1"
  local label="$2"
  info "Requesting $label at $url"
  if ! command -v curl >/dev/null 2>&1; then
    warn "curl is required to probe HTTP endpoints"
    return
  fi

  local tmp
  tmp="$(mktemp)"
  local status
  status=$(curl --silent --show-error --location --max-time 5 --output "$tmp" --write-out '%{http_code}' "$url" || true)

  if [[ "$status" == "000" ]]; then
    warn "Unable to connect to $url"
  else
    note "Received HTTP status $status"
    if [[ "$status" -ge 400 ]]; then
      warn "Endpoint responded with an error. Check server logs for additional details."
    fi
  fi

  if [[ -s "$tmp" ]]; then
    head -n 5 "$tmp" | sed 's/^/    /'
    if [[ $(wc -l <"$tmp") -gt 5 ]]; then
      note "Output truncated to first 5 lines"
    fi
  fi
  rm -f "$tmp"
}

main() {
  info "Alt Production Hosting service diagnostic"
  note "Host: $HOST"
  note "Expected frontend port: $FRONTEND_PORT"
  note "Expected backend port: $BACKEND_PORT"

  check_backend_port_config

  info "Scanning known ports"
  check_listener 80 "default HTTP port (should remain free)"
  check_listener "$BACKEND_PORT" "backend API"
  check_listener "$FRONTEND_PORT" "frontend web server"

  check_http "http://$HOST:$BACKEND_PORT$BACKEND_HEALTH_PATH" "backend health endpoint"
  check_http "http://$HOST:$FRONTEND_PORT" "frontend root"
}

main "$@"

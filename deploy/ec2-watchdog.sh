#!/bin/bash
# Every minute: restart API/admin if not responding (OOM recovery).
set -euo pipefail
LOG="${LOG:-/var/log/service360-watchdog.log}"
exec >> "$LOG" 2>&1

check() {
  local url="$1" container="$2"
  if curl -sf --max-time 5 "$url" >/dev/null 2>&1; then
    return 0
  fi
  echo "$(date -Is) RESTART $container ($url failed)"
  docker restart "$container" >/dev/null 2>&1 || true
}

check "http://127.0.0.1:5301/v1/deploy-status" "deploy-api-1"
check "http://127.0.0.1:80/" "deploy-admin-1"

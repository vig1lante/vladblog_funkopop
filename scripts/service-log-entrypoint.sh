#!/usr/bin/env sh
set -e

if [ "$#" -eq 0 ]; then
  echo "service-log-entrypoint: command is required" >&2
  exit 64
fi

if [ -n "${SERVICE_LOG_PATH:-}" ]; then
  log_dir=$(dirname "$SERVICE_LOG_PATH")
  log_pipe="${TMPDIR:-/tmp}/service-log.$$.fifo"

  mkdir -p "$log_dir"
  touch "$SERVICE_LOG_PATH"
  rm -f "$log_pipe"
  mkfifo "$log_pipe"

  tee -a "$SERVICE_LOG_PATH" < "$log_pipe" &
  tee_pid=$!

  "$@" > "$log_pipe" 2>&1 &
  command_pid=$!

  forward_signal() {
    kill -TERM "$command_pid" 2>/dev/null || true
  }

  trap forward_signal INT TERM

  set +e
  wait "$command_pid"
  status=$?
  trap - INT TERM
  wait "$tee_pid"
  tee_status=$?
  set -e

  rm -f "$log_pipe"
  if [ "$status" -ne 0 ]; then
    exit "$status"
  fi
  exit "$tee_status"
fi

exec "$@"

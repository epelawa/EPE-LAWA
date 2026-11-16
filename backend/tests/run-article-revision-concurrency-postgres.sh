#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if ! command -v pg_config >/dev/null 2>&1; then
  echo 'PostgreSQL development tools are required (pg_config, initdb, pg_ctl, psql).' >&2
  exit 2
fi
PG_BINDIR="$(pg_config --bindir)"
for executable in initdb pg_ctl psql; do
  if [[ ! -x "$PG_BINDIR/$executable" ]]; then
    echo "Missing PostgreSQL executable: $PG_BINDIR/$executable" >&2
    exit 2
  fi
done

DB_USER="$(id -un)"
DB_NAME='epe_lawa_pr118_test'
TMP_ROOT="$(mktemp -d /tmp/epe-lawa-pr118-pg.XXXXXX)"
DATA_DIR="$TMP_ROOT/data"
SOCKET_DIR="$TMP_ROOT/socket"
LOG_FILE="$TMP_ROOT/postgres.log"
PORT="$((20000 + ($$ % 40000)))"
mkdir -m 700 "$SOCKET_DIR"

cleanup() {
  status=$?
  trap - EXIT
  if [[ -s "$DATA_DIR/postmaster.pid" ]]; then
    "$PG_BINDIR/pg_ctl" -D "$DATA_DIR" -m fast -w stop >/dev/null 2>&1 || true
  fi
  rm -rf -- "$TMP_ROOT"
  exit "$status"
}
trap cleanup EXIT

"$PG_BINDIR/initdb" \
  --username="$DB_USER" \
  --auth-local=trust \
  --auth-host=reject \
  --no-instructions \
  --no-locale \
  -D "$DATA_DIR"

if ! "$PG_BINDIR/pg_ctl" -D "$DATA_DIR" -l "$LOG_FILE" \
  -o "-h '' -k '$SOCKET_DIR' -p $PORT -c listen_addresses=''" \
  -w start; then
  echo 'Disposable PostgreSQL failed to start; server log follows:' >&2
  cat "$LOG_FILE" >&2 || true
  exit 1
fi

export PGHOST="$SOCKET_DIR"
export PGPORT="$PORT"
export PGUSER="$DB_USER"
export PGDATABASE="$DB_NAME"
export EPE_LAWA_RUN_PG_CONCURRENCY=1

createdb --host="$SOCKET_DIR" --port="$PORT" --username="$DB_USER" "$DB_NAME"
echo "Running PR #118 two-session test on isolated PostgreSQL $("$PG_BINDIR/postgres" --version | sed 's/^postgres (PostgreSQL) //')"
node --test "$ROOT/backend/tests/article-revision-concurrency.postgres.test.mjs"

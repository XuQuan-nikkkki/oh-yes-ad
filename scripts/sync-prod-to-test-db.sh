#!/usr/bin/env bash
set -euo pipefail

SYNC_ENV=".db-sync/sync.env"
DUMP_DIR=".db-sync"
POSTGRES_IMAGE="postgres:17"
CONFIRM_TEXT="SYNC TEST"

case "${1:-}" in
  "")
    ;;
  "--yes")
    ;;
  "-h" | "--help")
    echo "Usage: npm run db:sync-prod-to-test"
    echo "       npm run db:sync-prod-to-test -- --yes"
    exit 0
    ;;
  *)
    echo "Unknown option: $1"
    echo "Run with --help for usage."
    exit 1
    ;;
esac

if [[ ! -f "$SYNC_ENV" ]]; then
  echo "Missing $SYNC_ENV. Copy .db-sync/sync.env.example and fill PROD_URL and TEST_URL first."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run pg_dump and pg_restore."
  exit 1
fi

mkdir -p "$DUMP_DIR"

if [[ "${1:-}" != "--yes" ]]; then
  echo "This will overwrite the test database with data from production."
  echo "A backup of the current test database will be saved in $DUMP_DIR."
  printf "Type '%s' to continue: " "$CONFIRM_TEXT"
  read -r confirmation

  if [[ "$confirmation" != "$CONFIRM_TEXT" ]]; then
    echo "Cancelled."
    exit 1
  fi
fi

timestamp="$(date +%Y%m%d_%H%M%S)"
test_backup_file="local_before_sync_${timestamp}.dump"
prod_dump_file="neon_prod_${timestamp}.dump"

echo "[sync] backup file: $DUMP_DIR/$test_backup_file"
echo "[sync] prod dump:   $DUMP_DIR/$prod_dump_file"

docker run --rm \
  --env-file "$SYNC_ENV" \
  -v "$PWD/$DUMP_DIR:/dump" \
  "$POSTGRES_IMAGE" \
  sh -lc "
    set -eu
    : \"\${PROD_URL:?Missing PROD_URL}\"
    : \"\${TEST_URL:?Missing TEST_URL}\"

    echo '[1/3] backup test db'
    pg_dump \"\$TEST_URL\" -Fc -f '/dump/$test_backup_file'

    echo '[2/3] dump prod db'
    pg_dump \"\$PROD_URL\" -Fc -f '/dump/$prod_dump_file'

    echo '[3/3] restore prod dump to test db'
    pg_restore --clean --if-exists --no-owner --no-privileges -d \"\$TEST_URL\" '/dump/$prod_dump_file'

    echo 'DONE'
  "

#!/usr/bin/env bash
# Backup all 36-0 Supabase data to timestamped files under ./backups/.
#
# Usage:  bash scripts/backup_db.sh
#
# Requires the Supabase CLI (already installed) and a linked project.
# Produces two things per run:
#   1. A full pg_dump (schema + data) — the authoritative restore point.
#   2. Per-table CSV exports of the user data — easy to open/inspect.
#
# Restore the full dump with:  psql "$DB_URL" -f backups/<file>.sql
set -euo pipefail

cd "$(dirname "$0")/.."
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="backups"
mkdir -p "$OUT"

echo "==> Full database dump (schema + data)"
supabase db dump --data-only -f "$OUT/data_${STAMP}.sql"
supabase db dump -f "$OUT/schema_${STAMP}.sql"

# Per-table CSV via the REST API (read-only, uses the anon key from config.js).
ANON=$(grep -o "SUPABASE_ANON_KEY = '[^']*'" js/config.js | cut -d\' -f2)
URL=$(grep -o "SUPABASE_URL = '[^']*'" js/config.js | cut -d\' -f2)

for table in profiles game_results squads user_achievements achievements site_texts; do
  echo "==> CSV export: $table"
  curl -s "$URL/rest/v1/$table?select=*" \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
    -H "Accept: text/csv" -o "$OUT/${table}_${STAMP}.csv"
done

echo "==> Done. Backups written to $OUT/ (timestamp $STAMP)"

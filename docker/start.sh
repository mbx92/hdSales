#!/bin/sh
set -e

# migrate deploy refuses to continue while a migration is recorded as failed.
# This attempt never finished, and the SQL has since been corrected, so mark
# that failed record rolled back and apply the current file.
status=$(npx prisma migrate status 2>&1) || true
printf '%s\n' "$status"

if printf '%s\n' "$status" | grep -q '20260929160000_add_data_ownership' \
  && printf '%s\n' "$status" | grep -q 'failed'; then
  npx prisma migrate resolve --rolled-back 20260929160000_add_data_ownership
fi

npx prisma migrate deploy
exec node .output/server/index.mjs

#!/usr/bin/env bash
set -euo pipefail
DB_URL=${DATABASE_URL:?}
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
REFRESH MATERIALIZED VIEW mv_set_variation_filters;
-- TODO: switch to CONCURRENTLY once a unique index exists on the view
SQL
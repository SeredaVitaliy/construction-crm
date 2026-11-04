#!/usr/bin/env bash
# Прогон миграций и тестов безопасности на локальном Postgres (не Supabase).
# Использование: PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB=crm_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"

run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }

run tests/00_supabase_stub.sql
for f in migrations/*.sql; do run "$f"; done
run tests/10_security_test.sql

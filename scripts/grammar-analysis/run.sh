#!/usr/bin/env bash
# Chạy toàn bộ phân tích log Grammar, CHỈ ĐỌC, trên prod. Kết quả ghi vào scripts/grammar-analysis/out/.
# Dùng: bash scripts/grammar-analysis/run.sh   (đặt REF=<project-ref> để chạy trên project khác)
set -euo pipefail
cd "$(dirname "$0")"
REF="${REF:-sqlhbizpyteatcdvllgv}"
mkdir -p out
for f in [0-9]-*.sql; do
  echo "== $f"
  npx supabase db query --remote="$REF" --read-only -f "$f" | tee "out/${f%.sql}.txt"
done

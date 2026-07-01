#!/usr/bin/env bash
# Keep the Outray tunnel alive. If it drops, this restarts it automatically.
# The fixed subdomain means the public URL is ALWAYS https://hive-ace.outray.app
# so the webhook URL you give Nomba never changes — even after a restart.
#
# Usage (from repo root):  bash scripts/tunnel.sh

cd "$(dirname "$0")/.." || exit 1

while true; do
  echo "[tunnel] starting Outray -> https://hive-ace.outray.app (Ctrl+C to stop)..."
  outray start --config outray.toml
  echo "[tunnel] Outray exited. Restarting in 3s..."
  sleep 3
done

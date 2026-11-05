#!/usr/bin/env bash
# Copies the Backup page, its bridge and 小M (xiaom.js) from a studio-m-backup checkout into vendor/backup.
# Usage: tools/sync_backup.sh ../studio-m-backup
set -euo pipefail
src="${1:?path to studio-m-backup}"
cp "$src/claude/index.html" vendor/backup/index.html
cp "$src/claude/xiaom.js" vendor/backup/xiaom.js
cp "$src/google/bridge.html" vendor/backup/bridge.html
git -C "$src" rev-parse --short HEAD > vendor/backup/SOURCE
echo "synced Backup $(cat vendor/backup/SOURCE)"

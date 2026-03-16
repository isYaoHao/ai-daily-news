#!/usr/bin/env bash
# cron-run.sh — Suitable for OpenClaw cron daily 6:00 AM runs.
# Usage in OpenClaw cron config:
#   command: "bash /Users/yaohao/Developer/ai-daily-news/scripts/cron-run.sh"
#   schedule: "0 6 * * *"
#
# Outputs digest files and share images to ./output/<date>/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Run the pipeline in quiet mode
exec node src/cli.js --lang all --quiet

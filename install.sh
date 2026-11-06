#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! command -v python3 >/dev/null 2>&1; then
    echo 'Python 3.9+ is required. Install python3, then run this script again.' >&2
    exit 1
fi
exec python3 "$SCRIPT_DIR/scripts/install.py" "$@"

#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
sh "$SCRIPT_DIR/install.sh" "$@"
result=$?
printf '\nPress Enter to close... '
read -r answer
exit "$result"

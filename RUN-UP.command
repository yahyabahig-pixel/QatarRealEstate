#!/bin/bash
# Double-click this file in Finder to bring the local stack up.
#
# macOS runs a .command file in Terminal when it is double-clicked. That is the point:
# it is a way to start this without anyone typing a command.
cd "$(dirname "$0")" || exit 1

echo "================================================"
echo "  QatarRealEstate — building and starting"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"
echo

./scripts/up.sh --fresh
STATUS=$?

echo
echo "================================================"
if [ $STATUS -eq 0 ]; then
  echo "  DONE — the site is on http://localhost"
else
  echo "  FAILED — the reason is above, and the full"
  echo "  report is in .cowork-local/up-report.txt"
fi
echo "================================================"
echo
echo "You can close this window."

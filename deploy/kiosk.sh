#!/bin/bash
# Waits for the dashboard server, then launches Chromium fullscreen kiosk pointed at it.
# Targets labwc (Wayland, default on Raspberry Pi OS Bookworm/Trixie) -- no xset/unclutter,
# those are X11-only. Screen blanking is disabled via raspi-config instead (see README),
# and the mouse cursor is hidden with CSS in the page itself.
set -euo pipefail

URL="http://localhost:5000"

LOG_FILE="$HOME/.cache/cmmc-kiosk.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec >> "$LOG_FILE" 2>&1
echo "[$(date -Iseconds)] kiosk.sh starting"

# Wait for the Flask/waitress service to start responding. On a Pi 3B, a cold
# boot can have the desktop session racing the systemd service for slow SD
# card I/O, so keep retrying rather than giving up and opening a dead page --
# a blank Chromium window never recovers on its own since nothing reloads it.
attempt=0
until curl -sf "$URL" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $((attempt % 10)) -eq 0 ]; then
    echo "[$(date -Iseconds)] still waiting for $URL (attempt $attempt) -- check: systemctl status cmmc-dashboard"
  fi
  sleep 1
done
echo "[$(date -Iseconds)] $URL is up after $attempt attempt(s)"

CHROMIUM_BIN=$(command -v chromium || command -v chromium-browser)

exec "$CHROMIUM_BIN" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --incognito \
  --password-store=basic \
  --check-for-update-interval=31536000 \
  --ozone-platform=wayland \
  "$URL"

#!/bin/bash
# Waits for the dashboard server, then launches Chromium fullscreen kiosk pointed at it.
# Targets labwc (Wayland, default on Raspberry Pi OS Bookworm/Trixie) -- no xset/unclutter,
# those are X11-only. Screen blanking is disabled via raspi-config instead (see README),
# and the mouse cursor is hidden with CSS in the page itself.
set -euo pipefail

URL="http://localhost:5000"

# Wait for the Flask/waitress service to start responding.
for i in $(seq 1 30); do
  if curl -sf "$URL" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

CHROMIUM_BIN=$(command -v chromium || command -v chromium-browser)

exec "$CHROMIUM_BIN" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --incognito \
  --check-for-update-interval=31536000 \
  "$URL"

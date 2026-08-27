#!/bin/bash
# Waits for the dashboard server, then launches Chromium fullscreen kiosk pointed at it.
set -euo pipefail

URL="http://localhost:5000"

# Wait for the Flask/waitress service to start responding.
for i in $(seq 1 30); do
  if curl -sf "$URL" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Keep the display awake and the cursor out of the way.
xset s off
xset s noblank
xset -dpms
unclutter -idle 0 &

exec chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --incognito \
  --check-for-update-interval=31536000 \
  "$URL"

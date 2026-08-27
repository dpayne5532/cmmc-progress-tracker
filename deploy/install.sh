#!/bin/bash
# One-time setup on the Raspberry Pi. Run from the repo root with sudo:
#   sudo ./deploy/install.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_USER="${SUDO_USER:-pi}"
USER_HOME=$(getent passwd "$TARGET_USER" | cut -d: -f6)

if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./deploy/install.sh"
  exit 1
fi

echo "==> Installing unclutter (hides idle mouse cursor)"
apt-get update
apt-get install -y unclutter

echo "==> Creating Python virtual environment"
sudo -u "$TARGET_USER" python3 -m venv "$REPO_DIR/venv"
sudo -u "$TARGET_USER" "$REPO_DIR/venv/bin/pip" install -r "$REPO_DIR/requirements.txt"

echo "==> Installing systemd service"
sed "s#/home/pi/cmmc-raspi-app#$REPO_DIR#g; s#User=pi#User=$TARGET_USER#g" \
  "$REPO_DIR/deploy/cmmc-dashboard.service" > /etc/systemd/system/cmmc-dashboard.service
systemctl daemon-reload
systemctl enable --now cmmc-dashboard

echo "==> Installing kiosk autostart entry"
chmod +x "$REPO_DIR/deploy/kiosk.sh"
AUTOSTART_DIR="$USER_HOME/.config/autostart"
sudo -u "$TARGET_USER" mkdir -p "$AUTOSTART_DIR"
sed "s#/home/pi/cmmc-raspi-app#$REPO_DIR#g" \
  "$REPO_DIR/deploy/kiosk-autostart.desktop" > "$AUTOSTART_DIR/kiosk-autostart.desktop"
chown "$TARGET_USER":"$TARGET_USER" "$AUTOSTART_DIR/kiosk-autostart.desktop"

echo "==> Done."
echo "Make sure desktop auto-login is enabled: sudo raspi-config -> System Options -> Boot / Auto Login -> Desktop Autologin"
echo "Reboot to see the kiosk launch automatically."

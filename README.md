# CMMC Compliance Dashboard

A single-purpose kiosk display for a Raspberry Pi 3B showing CMMC Level 2 (NIST SP
800-171) compliance progress: all 110 practices across 14 domains, each shown as a
clickable pill you cycle through **Not Started → In Progress → Complete**, plus a
live percentage-complete bar at the bottom.

## How it works

- `domains.py` — static list of the 14 CMMC L2 domains and their practice IDs.
- `app.py` — Flask app. Serves the dashboard and a tiny JSON API to read/update
  practice status.
- `data/state.json` — persisted status per practice (auto-created on first run,
  all "Not Started"). This is the only thing that changes at runtime.
- `static/` / `templates/` — the page itself (vanilla HTML/CSS/JS, no build step).
- `deploy/` — systemd service + kiosk launch script for running unattended on the Pi.

## Local development (any machine)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000 — click any pill to cycle its status and watch the
bottom progress bar update.

## Deploying to the Raspberry Pi

Target: Raspberry Pi OS (Bookworm/Trixie, desktop image running **labwc**, the
default Wayland compositor) on a Pi 3B connected to a monitor/TV.

1. Copy this repo onto the Pi (e.g. `git clone` or `scp -r`), typically to
   `/home/pi/cmmc-raspi-app` (or `/home/<user>/cmmc-raspi-app`).
2. Enable desktop auto-login so the kiosk comes up with no manual login after
   power-on:
   ```bash
   sudo raspi-config
   # System Options -> Boot / Auto Login -> Desktop Autologin
   ```
   While you're in `raspi-config`, also check Display Options for a "Screen
   Blanking" toggle and disable it, so the display doesn't sleep.
3. Run the installer from the repo root:
   ```bash
   cd cmmc-raspi-app
   sudo ./deploy/install.sh
   ```
   This creates a Python venv, installs dependencies, registers
   `cmmc-dashboard` as a systemd service (auto-starts the Flask app on boot),
   and adds a line to `~/.config/labwc/autostart` that launches Chromium in
   kiosk mode pointed at the dashboard once the desktop session starts.
4. Reboot: `sudo reboot`. The Pi should boot straight to the desktop, launch the
   dashboard service, and open Chromium fullscreen on it.

### Useful commands on the Pi

```bash
# Check the server is running
sudo systemctl status cmmc-dashboard

# Restart it (e.g. after editing state.json by hand)
sudo systemctl restart cmmc-dashboard

# Tail logs
journalctl -u cmmc-dashboard -f
```

### Resetting all statuses

Stop the service, delete (or hand-edit) `data/state.json`, then restart:

```bash
sudo systemctl stop cmmc-dashboard
rm data/state.json
sudo systemctl start cmmc-dashboard
```

A fresh `state.json` is regenerated automatically with every practice set to
Not Started.

## Notes

- Everything is local — no internet dependency once installed, no external
  services or accounts.
- The mouse cursor is left visible on purpose — this dashboard is meant to be
  clicked (to cycle status), unlike a passive display.
- `deploy/kiosk.sh` looks for `chromium` first, falling back to
  `chromium-browser`, so it works whichever binary name your image ships.
- If your Pi image uses X11 instead of labwc/Wayland (older Raspberry Pi OS,
  or LXDE), autostart via `~/.config/labwc/autostart` won't apply — use a
  `~/.config/autostart/*.desktop` entry pointing at `deploy/kiosk.sh` instead.

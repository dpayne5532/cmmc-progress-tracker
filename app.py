import json
import os
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from domains import ALL_PRACTICE_IDS, DOMAINS, TOTAL_PRACTICES

BASE_DIR = Path(__file__).resolve().parent
STATE_PATH = BASE_DIR / "data" / "state.json"

STATUSES = ("not_started", "in_progress", "complete")
NEXT_STATUS = {
    "not_started": "in_progress",
    "in_progress": "complete",
    "complete": "not_started",
}

app = Flask(__name__)


def load_state():
    if not STATE_PATH.exists():
        state = {pid: "not_started" for pid in ALL_PRACTICE_IDS}
        save_state(state)
        return state

    with open(STATE_PATH) as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError:
            # Corrupt state file should never take the whole kiosk down. Preserve
            # the bad file for inspection and start fresh instead of 500ing forever.
            corrupt_path = STATE_PATH.with_suffix(".corrupt.json")
            STATE_PATH.replace(corrupt_path)
            state = {pid: "not_started" for pid in ALL_PRACTICE_IDS}
            save_state(state)
            return state

    # Heal state file if practice list has changed since it was created.
    changed = False
    for pid in ALL_PRACTICE_IDS:
        if pid not in state:
            state[pid] = "not_started"
            changed = True
    if changed:
        save_state(state)

    return state


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = STATE_PATH.with_suffix(".tmp")
    with open(tmp_path, "w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
    os.replace(tmp_path, STATE_PATH)


def percent_complete(state):
    complete = sum(1 for status in state.values() if status == "complete")
    return round(complete / TOTAL_PRACTICES * 100)


@app.route("/")
def index():
    state = load_state()
    return render_template(
        "index.html",
        domains=DOMAINS,
        state=state,
        percent=percent_complete(state),
    )


@app.route("/api/state")
def api_state():
    state = load_state()
    return jsonify(state=state, percent=percent_complete(state))


@app.route("/api/practice/<practice_id>/cycle", methods=["POST"])
def cycle_practice(practice_id):
    if practice_id not in ALL_PRACTICE_IDS:
        return jsonify(error="unknown practice id"), 404

    state = load_state()
    state[practice_id] = NEXT_STATUS[state.get(practice_id, "not_started")]
    save_state(state)

    return jsonify(
        id=practice_id,
        status=state[practice_id],
        percent=percent_complete(state),
    )


@app.route("/api/practice/<practice_id>/set", methods=["POST"])
def set_practice(practice_id):
    if practice_id not in ALL_PRACTICE_IDS:
        return jsonify(error="unknown practice id"), 404

    status = (request.get_json(silent=True) or {}).get("status")
    if status not in STATUSES:
        return jsonify(error="status must be one of " + ", ".join(STATUSES)), 400

    state = load_state()
    state[practice_id] = status
    save_state(state)

    return jsonify(
        id=practice_id,
        status=state[practice_id],
        percent=percent_complete(state),
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

const NEXT_STATUS = {
  not_started: "in_progress",
  in_progress: "complete",
  complete: "not_started",
};

// Shrinks pill/row sizing (via the --fit CSS variable) until the domain list
// fits the available height without scrolling, whatever the screen size.
function fitDomainsToScreen() {
  const domains = document.querySelector(".domains");
  if (!domains) return;
  const root = document.documentElement;
  const MIN_FIT = 0.55;
  let fit = 1;
  root.style.setProperty("--fit", fit);
  while (domains.scrollHeight > domains.clientHeight + 1 && fit > MIN_FIT) {
    fit = Math.max(MIN_FIT, fit - 0.05);
    root.style.setProperty("--fit", fit);
  }
}

window.addEventListener("load", fitDomainsToScreen);
window.addEventListener("resize", fitDomainsToScreen);

const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");
const celebrateSound = document.getElementById("celebrate-sound");
celebrateSound.volume = 1;

// <audio>.volume tops out at 100% of the source recording, which isn't loud
// enough for a kiosk speaker. Route it through the Web Audio API instead so
// we can push the gain well past that ceiling, with a compressor limiting
// the boosted signal so it gets louder without turning into a clipped mess.
const CELEBRATION_GAIN = 6;
let celebrationAudioGraph = null;

function getCelebrationAudioGraph() {
  if (!celebrationAudioGraph) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(celebrateSound);
    const gain = audioCtx.createGain();
    gain.gain.value = CELEBRATION_GAIN;
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    source.connect(gain).connect(compressor).connect(audioCtx.destination);
    celebrationAudioGraph = audioCtx;
  }
  return celebrationAudioGraph;
}

function playCelebration() {
  const audioCtx = getCelebrationAudioGraph();
  if (audioCtx.state === "suspended") audioCtx.resume();
  celebrateSound.currentTime = 0;
  celebrateSound.play().catch((err) => console.error("Failed to play celebration sound:", err));
}

function applyStatus(pill, status) {
  pill.classList.remove("not_started", "in_progress", "complete");
  pill.classList.add(status);
}

function applyPercent(percent) {
  progressFill.style.width = percent + "%";
  progressPercent.textContent = percent;
}

document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", async () => {
    const id = pill.dataset.id;
    const current = ["not_started", "in_progress", "complete"].find((s) =>
      pill.classList.contains(s)
    );
    const optimisticNext = NEXT_STATUS[current];

    applyStatus(pill, optimisticNext);
    if (optimisticNext === "complete") playCelebration();

    try {
      const res = await fetch(`/api/practice/${encodeURIComponent(id)}/cycle`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      applyStatus(pill, data.status);
      applyPercent(data.percent);
    } catch (err) {
      // Revert optimistic update if the request failed.
      applyStatus(pill, current);
      console.error("Failed to update practice status:", err);
    }
  });
});

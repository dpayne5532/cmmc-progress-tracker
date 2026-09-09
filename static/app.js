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

function playCelebration() {
  celebrateSound.currentTime = 0;
  celebrateSound.play().catch((err) => console.error("Failed to play celebration sound:", err));
}

// Confetti + fireworks burst, kept deliberately light (small particle counts,
// short duration) since this runs on a Pi 3B with GPU compositing disabled --
// canvas 2D drawing is the cheapest way to get this effect on that hardware.
const celebrationOverlay = document.getElementById("celebration-overlay");
const celebrationCanvas = document.getElementById("celebration-canvas");
const celebrationBadge = document.getElementById("celebration-badge");
const celebrationIdLabel = document.getElementById("celebration-id");
const celebrationCtx = celebrationCanvas.getContext("2d");

const CONFETTI_COLORS = ["#ff3b3b", "#ffd400", "#00e676", "#00b4ff", "#ff00c8", "#ff8a00", "#7c4dff", "#00ffd0"];
const CELEBRATION_FALLBACK_DURATION_MS = 2400;
let celebrationParticles = [];
let celebrationAnimationId = null;
let celebrationHideTimeout = null;
let celebrationSpawnInterval = null;

function getCelebrationDurationMs() {
  const seconds = celebrateSound.duration;
  return seconds && isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : CELEBRATION_FALLBACK_DURATION_MS;
}

function resizeCelebrationCanvas() {
  celebrationCanvas.width = window.innerWidth;
  celebrationCanvas.height = window.innerHeight;
}
resizeCelebrationCanvas();
window.addEventListener("resize", resizeCelebrationCanvas);

function randomColor() {
  return CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
}

function spawnConfetti(count) {
  const w = celebrationCanvas.width;
  for (let i = 0; i < count; i++) {
    celebrationParticles.push({
      kind: "confetti",
      x: Math.random() * w,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      size: 6 + Math.random() * 6,
      color: randomColor(),
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }
}

function spawnFirework(x, y) {
  const count = 30;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 2 + Math.random() * 3;
    celebrationParticles.push({
      kind: "firework",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 2,
      color: randomColor(),
      life: 1,
      decay: 0.012 + Math.random() * 0.01,
    });
  }
}

function stepCelebration() {
  const ctx = celebrationCtx;
  ctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);

  celebrationParticles.forEach((p) => {
    if (p.kind === "confetti") {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.rotation += p.spin;
      if (p.y > celebrationCanvas.height + 20) p.life = 0;
    } else {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.98;
      p.life -= p.decay;
    }
  });

  celebrationParticles = celebrationParticles.filter((p) => p.life > 0);

  celebrationParticles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.kind === "confetti" ? 6 : 12;
    if (p.kind === "confetti") {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  if (celebrationParticles.length > 0) {
    celebrationAnimationId = requestAnimationFrame(stepCelebration);
  } else {
    celebrationAnimationId = null;
  }
}

function playCelebrationAnimation(practiceId) {
  celebrationIdLabel.textContent = practiceId;
  celebrationOverlay.classList.add("active");

  // Restart the pop-in animation even if it's already mid-run.
  celebrationBadge.classList.remove("pop");
  void celebrationBadge.offsetWidth;
  celebrationBadge.classList.add("pop");

  celebrationParticles = [];
  const w = celebrationCanvas.width;
  const h = celebrationCanvas.height;
  spawnConfetti(70);
  spawnFirework(w * 0.25, h * 0.35);
  setTimeout(() => spawnFirework(w * 0.75, h * 0.3), 250);
  setTimeout(() => spawnFirework(w * 0.5, h * 0.45), 500);

  if (celebrationAnimationId === null) {
    celebrationAnimationId = requestAnimationFrame(stepCelebration);
  }

  // Keep confetti/fireworks going for as long as the celebration sound
  // plays, instead of a single burst that fizzles out early and leaves the
  // badge sitting there in silence for the rest of the clip.
  const durationMs = getCelebrationDurationMs();
  const spawnWaveMs = 900;
  const stopSpawningAt = Math.max(durationMs - 1000, spawnWaveMs);

  clearInterval(celebrationSpawnInterval);
  let elapsed = spawnWaveMs;
  celebrationSpawnInterval = setInterval(() => {
    if (elapsed >= stopSpawningAt) {
      clearInterval(celebrationSpawnInterval);
      return;
    }
    spawnConfetti(25);
    spawnFirework(w * (0.2 + Math.random() * 0.6), h * (0.25 + Math.random() * 0.25));
    elapsed += spawnWaveMs;
  }, spawnWaveMs);

  clearTimeout(celebrationHideTimeout);
  celebrationHideTimeout = setTimeout(() => {
    celebrationOverlay.classList.remove("active");
    clearInterval(celebrationSpawnInterval);
  }, durationMs);
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
    if (optimisticNext === "complete") {
      playCelebration();
      playCelebrationAnimation(id);
    }

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

const NEXT_STATUS = {
  not_started: "in_progress",
  in_progress: "complete",
  complete: "not_started",
};

const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");

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

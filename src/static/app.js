document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const pullStringButton = document.getElementById("pull-string");
  const lamp = document.getElementById("lamp");
  const pullHandle = pullStringButton.querySelector(".pull-handle");
  let isDarkMode = false;
  let isDragging = false;
  let dragStartY = 0;
  let pullOffset = 0;

  function applyDarkModeState() {
    document.body.classList.toggle("dark-mode", isDarkMode);
    lamp.classList.toggle("lamp-off", isDarkMode);
    pullStringButton.setAttribute("aria-pressed", String(isDarkMode));
  }

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    applyDarkModeState();
  }

  function updatePullVisual() {
    const maxPull = 20;
    const clampedPull = Math.max(-maxPull, Math.min(maxPull, pullOffset));
    pullHandle.style.transform = `translateY(${clampedPull}px)`;
    pullStringButton.style.transform = `translateY(${clampedPull * 0.5}px)`;
  }

  pullStringButton.addEventListener("pointerdown", (event) => {
    isDragging = true;
    dragStartY = event.clientY;
    pullStringButton.setPointerCapture(event.pointerId);
  });

  pullStringButton.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    const deltaY = event.clientY - dragStartY;
    pullOffset = Math.max(0, Math.min(deltaY, 30));
    updatePullVisual();
  });

  function releasePull() {
    if (!isDragging) {
      return;
    }

    isDragging = false;

    if (pullOffset > 12) {
      toggleDarkMode();
    }

    pullOffset = 0;
    updatePullVisual();
  }

  pullStringButton.addEventListener("pointerup", releasePull);
  pullStringButton.addEventListener("pointerleave", releasePull);
  pullStringButton.addEventListener("pointercancel", releasePull);
  pullStringButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDarkMode();
    }
  });

  applyDarkModeState();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participants = details.participants || [];
        const participantList = participants.length
          ? `<div class="participants-list">${participants
              .map(
                (email) => `
                  <div class="participant-row">
                    <span class="participant-email">${email}</span>
                    <button
                      type="button"
                      class="delete-participant-btn"
                      data-activity="${name}"
                      data-email="${email}"
                      aria-label="Remove ${email} from ${name}"
                      title="Remove participant"
                    >
                      🗑️
                    </button>
                  </div>
                `
              )
              .join("")}</div>`
          : `<p class="no-participants">No students signed up yet.</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants:</strong>
            ${participantList}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants/${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to remove participant");
      }

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);

      await fetchActivities();
    } catch (error) {
      messageDiv.textContent = error.message || "Failed to remove participant.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);

      await fetchActivities();
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  document.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".delete-participant-btn");
    if (!deleteButton) {
      return;
    }

    const activity = deleteButton.dataset.activity;
    const email = deleteButton.dataset.email;
    await unregisterParticipant(activity, email);
  });

  // Initialize app
  fetchActivities();
});

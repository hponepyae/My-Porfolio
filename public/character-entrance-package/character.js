(() => {
  const stage = document.querySelector("#character-stage");
  const svg = document.querySelector("#character-svg");
  const character = document.querySelector("#character");
  const leftPupil = document.querySelector("#leftPupil");
  const rightPupil = document.querySelector("#rightPupil");
  const leftCatchlight = document.querySelector("#leftCatchlight");
  const rightCatchlight = document.querySelector("#rightCatchlight");
  const hitArea = document.querySelector("#headHitArea");

  if (!stage || !svg || !character) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Original pupil centers in SVG coordinates.
  const EYES = {
    left:  { x: 255, y: 452 },
    right: { x: 555, y: 460 }
  };

  let target = { x: 0, y: 0, active: false };
  let current = { x: 0, y: 0 };
  let tiltTarget = 0;
  let tiltCurrent = 0;
  let locked = false;

  // Change these to tune sensitivity.
  const MAX_PUPIL_X = 20;
  const MAX_PUPIL_Y = 16;
  const MAX_HEAD_TILT = 7;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setTargetFromClient(clientX, clientY) {
    const rect = svg.getBoundingClientRect();

    // Convert pointer position to a normalized -1..1 range relative to the character.
    const nx = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

    target.x = nx;
    target.y = ny;
    target.active = true;
  }

  function handlePointer(e) {
    if (locked) return;
    setTargetFromClient(e.clientX, e.clientY);
  }

  stage.addEventListener("pointermove", handlePointer, { passive: true });

  stage.addEventListener("pointerleave", () => {
    target.active = false;
  });

  // Optional full-page mouse tracking, useful when the cursor is outside the character.
  window.addEventListener("pointermove", (e) => {
    if (locked || e.pointerType === "touch") return;
    setTargetFromClient(e.clientX, e.clientY);
  }, { passive: true });

  // Mobile fallback: use touch position.
  stage.addEventListener("touchmove", (e) => {
    if (locked || !e.touches[0]) return;
    const t = e.touches[0];
    setTargetFromClient(t.clientX, t.clientY);
  }, { passive: true });

  // iPhone/iPad motion support.
  let motionEnabled = false;

  function useOrientation(beta, gamma) {
    if (locked) return;
    // gamma: left/right tilt, beta: front/back tilt.
    const nx = clamp(gamma / 28, -1, 1);
    const ny = clamp((beta - 45) / 28, -1, 1);
    target.x = nx;
    target.y = ny;
    target.active = true;
  }

  async function enableMotion() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") return;
      }

      window.addEventListener("deviceorientation", (e) => {
        if (e.gamma == null || e.beta == null) return;
        useOrientation(e.beta, e.gamma);
      }, { passive: true });

      motionEnabled = true;
    } catch (_) {
      // Touch/pointer fallback remains active.
    }
  }

  // iOS requires a user gesture before motion permission can be requested.
  stage.addEventListener("pointerdown", () => {
    if (!motionEnabled) enableMotion();
  }, { passive: true });

  function render() {
    if (!reduceMotion && !locked) {
      const tx = target.active ? target.x : 0;
      const ty = target.active ? target.y : 0;

      // Smooth interpolation (lerp).
      current.x += (tx - current.x) * 0.075;
      current.y += (ty - current.y) * 0.075;

      tiltTarget = current.x * MAX_HEAD_TILT;
      tiltCurrent += (tiltTarget - tiltCurrent) * 0.06;

      const px = current.x * MAX_PUPIL_X;
      const py = current.y * MAX_PUPIL_Y;

      leftPupil.setAttribute("transform", `translate(${px} ${py})`);
      rightPupil.setAttribute("transform", `translate(${px} ${py})`);
      leftCatchlight.setAttribute("transform", `translate(${px} ${py})`);
      rightCatchlight.setAttribute("transform", `translate(${px} ${py})`);

      // Slight vertical head movement makes the character feel alive.
      const bob = Math.sin(performance.now() / 850) * 2.5;
      character.setAttribute(
        "transform",
        `translate(0 ${bob.toFixed(2)}) rotate(${tiltCurrent.toFixed(2)} 425 430)`
      );
    }

    requestAnimationFrame(render);
  }

  render();

  function enterHome() {
    if (locked) return;
    locked = true;

    stage.classList.add("is-reacting");

    setTimeout(() => {
      stage.classList.remove("is-reacting");
      stage.classList.add("is-leaving");

      // If data-home-url exists, navigate there after the transition.
      const homeUrl = stage.dataset.homeUrl;

      setTimeout(() => {
        if (homeUrl) {
          window.location.href = homeUrl;
        } else {
          // SPA-friendly fallback: tell the app to reveal its home page.
          document.dispatchEvent(new CustomEvent("character:enter-home"));
        }
      }, 720);
    }, 430);
  }

  hitArea.addEventListener("pointerup", (e) => {
    e.preventDefault();
    enterHome();
  });

  hitArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      enterHome();
    }
  });

  // Allow the whole head to be tapped even if the invisible ellipse isn't hit.
  stage.addEventListener("click", (e) => {
    if (e.target.closest("#headHitArea")) return;
    // Keep the entrance forgiving: clicking/tapping the character stage activates it.
    if (e.clientX !== 0 || e.clientY !== 0) enterHome();
  });
})();

let cursorStarted = false;
let cursorFrame = null;
let starFrame = null;
let resizeBound = false;
let starfieldCanvas = null;
let starfieldContext = null;
let stars = [];
let trailCanvas = null;
let trailContext = null;
let trailPoints = [];
let ambientReady = false;
let pointer = {
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
  y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  moved: false,
  visible: false
};
let ring = { x: pointer.x, y: pointer.y };
let magneticTarget = null;
let lastMoveAt = 0;

function media(query) {
  return typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query) : { matches: false };
}

function reducedMotion() {
  return media("(prefers-reduced-motion: reduce)").matches;
}

function cursorAllowed() {
  if (typeof window === "undefined") return false;
  const finePointer = media("(hover: hover) and (pointer: fine)").matches;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  return finePointer && !touch && !reducedMotion() && window.innerWidth > 760;
}

function setCursorClass(name, enabled) {
  const cursor = document.getElementById("cursor");
  cursor?.classList.toggle(name, enabled);
}

function resetMagnetic() {
  if (!magneticTarget) return;
  magneticTarget.classList.remove("is-magnetic");
  magneticTarget.style.removeProperty("--mx");
  magneticTarget.style.removeProperty("--my");
  magneticTarget = null;
}

function applyMagnetic(target, x, y) {
  if (!target) {
    resetMagnetic();
    return;
  }
  if (magneticTarget && magneticTarget !== target) resetMagnetic();
  magneticTarget = target;
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dx = (x - (rect.left + rect.width / 2)) / rect.width;
  const dy = (y - (rect.top + rect.height / 2)) / rect.height;
  target.style.setProperty("--mx", `${(dx * 7).toFixed(2)}px`);
  target.style.setProperty("--my", `${(dy * 5).toFixed(2)}px`);
  target.classList.add("is-magnetic");
}

function handleMove(event) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.moved = true;
  pointer.visible = true;
  lastMoveAt = performance.now();

  const cursor = document.getElementById("cursor");
  if (cursor) {
    cursor.classList.add("is-visible");
    const target = event.target instanceof Element ? event.target.closest("a, button, input, textarea, select, label, summary, [role='button']") : null;
    cursor.classList.toggle("is-hover", Boolean(target));
    const magnetic = event.target instanceof Element ? event.target.closest(".btn, .filter-button, .magnetic") : null;
    applyMagnetic(magnetic, event.clientX, event.clientY);
  }
}

function handleDown() {
  const cursor = document.getElementById("cursor");
  if (!cursor) return;
  cursor.classList.add("is-down", "is-clicking");
  window.setTimeout(() => cursor.classList.remove("is-down"), 180);
  window.setTimeout(() => cursor.classList.remove("is-clicking"), 420);
}

function handleLeave() {
  pointer.visible = false;
  document.getElementById("cursor")?.classList.remove("is-visible");
  resetMagnetic();
}

function drawTrail(now) {
  if (!trailCanvas || !trailContext) return;
  const rect = trailCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  trailContext.clearRect(0, 0, rect.width, rect.height);
  if (!pointer.visible) {
    trailPoints = [];
    return;
  }
  trailPoints = trailPoints.filter((point) => now - point.at < 380);
  if (trailPoints.length < 2) return;
  trailContext.save();
  trailContext.lineCap = "round";
  trailContext.lineJoin = "round";
  trailContext.shadowBlur = 10;
  trailContext.shadowColor = "rgba(91, 231, 255, 0.55)";
  for (let index = 1; index < trailPoints.length; index += 1) {
    const previous = trailPoints[index - 1];
    const point = trailPoints[index];
    const alpha = Math.max(0, 1 - (now - point.at) / 380);
    trailContext.beginPath();
    trailContext.strokeStyle = `rgba(91, 231, 255, ${(alpha * 0.42).toFixed(3)})`;
    trailContext.lineWidth = Math.max(0.6, 1.9 * alpha);
    trailContext.moveTo(previous.x, previous.y);
    trailContext.lineTo(point.x, point.y);
    trailContext.stroke();
  }
  trailContext.restore();
  if (dpr > 1) {
    // The context is already scaled through setTransform during resize.
  }
}

function cursorLoop(now) {
  const cursor = document.getElementById("cursor");
  const ringElement = document.querySelector(".cursor-ring");
  if (cursor) {
    if (pointer.moved) {
      cursor.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      pointer.moved = false;
    }
    const ease = 0.18;
    ring.x += (pointer.x - ring.x) * ease;
    ring.y += (pointer.y - ring.y) * ease;
    if (ringElement) {
      ringElement.style.left = `${ring.x - pointer.x}px`;
      ringElement.style.top = `${ring.y - pointer.y}px`;
    }
    if (pointer.visible && now - lastMoveAt > 1800) {
      cursor.classList.add("is-idle");
    } else {
      cursor.classList.remove("is-idle");
    }
    if (trailCanvas) {
      trailPoints.push({ x: pointer.x, y: pointer.y, at: now });
      if (trailPoints.length > 36) trailPoints.shift();
      drawTrail(now);
    }
  }
  cursorFrame = window.requestAnimationFrame(cursorLoop);
}

function ensureCursor() {
  const allowed = cursorAllowed();
  document.documentElement.classList.toggle("has-custom-cursor", allowed);
  if (!allowed) {
    resetMagnetic();
    return;
  }
  if (cursorStarted) return;
  cursorStarted = true;
  trailCanvas = document.getElementById("cursor-trail");
  if (trailCanvas) {
    trailContext = trailCanvas.getContext("2d");
  }
  window.addEventListener("pointermove", handleMove, { passive: true });
  window.addEventListener("pointerdown", handleDown, { passive: true });
  window.addEventListener("pointerup", () => {
    const cursor = document.getElementById("cursor");
    cursor?.classList.remove("is-down");
  }, { passive: true });
  document.addEventListener("pointerleave", handleLeave, { passive: true });
  window.addEventListener("blur", handleLeave);
  cursorFrame = window.requestAnimationFrame(cursorLoop);
}

function sizeTrailCanvas() {
  const canvas = document.getElementById("cursor-trail");
  if (!canvas) return null;
  trailCanvas = canvas;
  trailContext = canvas.getContext("2d");
  if (!trailContext) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  trailContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function makeStars(width, height) {
  const count = Math.max(70, Math.min(230, Math.round((width * height) / 12000)));
  stars = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.35 + 0.35,
    alpha: Math.random() * 0.55 + 0.18,
    speed: Math.random() * 0.018 + 0.004,
    phase: Math.random() * Math.PI * 2,
    tint: index % 7 === 0 ? "rgba(126, 166, 255," : index % 5 === 0 ? "rgba(134, 255, 246," : "rgba(220, 244, 255,"
  }));
}

function startStarfield(force = false) {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  if (!force && starfieldCanvas === canvas && starfieldContext) return;
  if (starFrame) window.cancelAnimationFrame(starFrame);
  starfieldCanvas = canvas;
  starfieldContext = canvas.getContext("2d");
  if (!starfieldContext) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  starfieldContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  makeStars(width, height);

  const draw = (now) => {
    const ctx = starfieldContext;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const reduced = reducedMotion();
    const parallaxX = (pointer.x / width - 0.5) * 10;
    const parallaxY = (pointer.y / height - 0.5) * 8;
    for (const star of stars) {
      const twinkle = reduced ? 0.8 : 0.65 + Math.sin(now * 0.001 * (0.5 + star.speed * 20) + star.phase) * 0.35;
      ctx.beginPath();
      ctx.fillStyle = `${star.tint}${Math.max(0.08, star.alpha * twinkle).toFixed(3)})`;
      ctx.arc(star.x + parallaxX * star.radius, star.y + parallaxY * star.radius, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!reduced) {
      starFrame = window.requestAnimationFrame(draw);
    }
  };

  if (reducedMotion()) {
    draw(performance.now());
  } else {
    starFrame = window.requestAnimationFrame(draw);
  }
}

function handleResize() {
  ensureCursor();
  sizeTrailCanvas();
  startStarfield(true);
}

export function initAmbient() {
  ensureCursor();
  if (!ambientReady) {
    sizeTrailCanvas();
    startStarfield();
    ambientReady = true;
  }
  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => {
      window.clearTimeout(handleResize._timer);
      handleResize._timer = window.setTimeout(handleResize, 150);
    });
  }
  if (!cursorStarted) {
    document.documentElement.classList.remove("has-custom-cursor");
  }
}

export function stopAmbient() {
  if (cursorFrame) window.cancelAnimationFrame(cursorFrame);
  if (starFrame) window.cancelAnimationFrame(starFrame);
  cursorFrame = null;
  starFrame = null;
  cursorStarted = false;
  ambientReady = false;
  starfieldCanvas = null;
  starfieldContext = null;
  document.documentElement.classList.remove("has-custom-cursor");
}

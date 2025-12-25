// Animations for Feature 2
let STYLE = { hoverDuration: 500 };
let hoverAnim = { start: 0, from: 1, to: 1, duration: STYLE.hoverDuration };

export function setStyle(style) {
  STYLE = style || STYLE;
}

export function startHoverAnim(to, current) {
  const now = performance.now();
  hoverAnim = { start: now, from: current ?? 1, to, duration: STYLE.hoverDuration || 500 };
}

export function currentHoverScale(t = performance.now()) {
  const { start, from, to, duration } = hoverAnim;
  if (t <= start) return from;
  const p = Math.min(1, (t - start) / duration);
  const e = 1 - (1 - p) * (1 - p);
  return from + (to - from) * e;
}

export function currentAnimProgress(t = performance.now()) {
  const { start, duration } = hoverAnim;
  if (t <= start) return 0;
  const p = Math.min(1, (t - start) / duration);
  return 1 - (1 - p) * (1 - p);
}

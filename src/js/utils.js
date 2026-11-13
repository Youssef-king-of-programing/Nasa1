export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function attr(value) {
  return esc(value);
}

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function percent(part, total) {
  if (!total) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

export function wordCount(text) {
  const trimmed = String(text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function formatDate(value, withTime = false) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

export function formatShort(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

export function timeAgo(value) {
  if (!value) return "No activity yet";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "No activity yet";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function uid(prefix = "id") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function statusLabel(status) {
  return { nominal: "Nominal", watch: "Watch", degraded: "Degraded", critical: "Critical" }[status] || "Unknown";
}

export function statusTone(status) {
  return `status-${status || "watch"}`;
}

export function qualityLabel(quality) {
  return { optimal: "Strong decision", acceptable: "Acceptable decision", high_risk: "High-risk decision" }[quality] || "Decision";
}

export function qualityTone(quality) {
  return { optimal: "quality-optimal", acceptable: "quality-acceptable", high_risk: "quality-risk" }[quality] || "";
}

export function directionLabel(direction) {
  return { improve: "Improved", hold: "Held", worsen: "Declined" }[direction] || "Updated";
}

export function directionTone(direction) {
  return { improve: "effect-improve", hold: "effect-hold", worsen: "effect-worsen" }[direction] || "";
}

export function truncate(text, length = 140) {
  const value = String(text || "");
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
}

export function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/home";
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path: `/${segments.join("/")}`, segments, query, raw };
}

export function buildQuery(params) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export function navigate(path, { replace = false } = {}) {
  const target = path.startsWith("#") ? path : `#${path}`;
  if (replace) {
    history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (location.hash === target) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = target;
  }
}

export function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsText(file);
  });
}

export function escapeMarkdown(value) {
  return String(value ?? "").replace(/([\\`*_{}[\]()#+.!|>~-])/g, "\\$1");
}

export function noop() {}

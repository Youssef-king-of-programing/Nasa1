import { icon } from "./icons.js";
import { clamp, esc } from "../utils.js";

export function pageHead({ eyebrow = "", title, subtitle = "", actions = "", meta = "" }) {
  return `
    <header class="page-head">
      <div class="page-head-copy">
        ${eyebrow ? `<div class="eyebrow"><span class="eyebrow-dot"></span>${esc(eyebrow)}</div>` : ""}
        <h1 class="display-title">${title}</h1>
        ${subtitle ? `<p class="lede">${subtitle}</p>` : ""}
        ${meta ? `<div class="page-meta">${meta}</div>` : ""}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </header>`;
}

export function sectionHead({ kicker = "", title, subtitle = "", action = "" }) {
  return `
    <div class="section-head">
      <div>
        ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ""}
        <h2>${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      ${action ? `<div class="section-action">${action}</div>` : ""}
    </div>`;
}

export function ring(value = 0, size = 92, stroke = 7, label = "") {
  const valueSafe = clamp(Math.round(value), 0, 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (valueSafe / 100) * circumference;
  return `
    <div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${valueSafe}%${label ? ` ${esc(label)}` : ""}">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${stroke}"></circle>
        <circle class="ring-value" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${stroke}"
          stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
          transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
      </svg>
      <div class="ring-label"><strong>${valueSafe}<span>%</span></strong>${label ? `<small>${esc(label)}</small>` : ""}</div>
    </div>`;
}

export function progressBar(value = 0, tone = "") {
  const safe = clamp(Math.round(value), 0, 100);
  return `<div class="progress ${tone ? `progress-${tone}` : ""}" role="progressbar" aria-valuenow="${safe}" aria-valuemin="0" aria-valuemax="100"><span style="width:${safe}%"></span></div>`;
}

export function chip(label, tone = "", iconName = "") {
  return `<span class="chip ${tone ? `chip-${tone}` : ""}">${iconName ? icon(iconName, 14) : ""}${esc(label)}</span>`;
}

export function statusBadge(status) {
  const label = { nominal: "Nominal", watch: "Watch", degraded: "Degraded", critical: "Critical" }[status] || "Unknown";
  return `<span class="status-chip status-${esc(status)}"><i></i>${label}</span>`;
}

export function statCard({ label, value, detail = "", icon: iconName = "activity", tone = "cyan", href = "" }) {
  const inner = `
    <div class="stat-icon tone-${tone}">${icon(iconName, 20)}</div>
    <div class="stat-copy">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${value}</div>
      ${detail ? `<div class="stat-detail">${detail}</div>` : ""}
    </div>`;
  return href
    ? `<a class="stat-card panel-link" href="${href}">${inner}</a>`
    : `<div class="stat-card">${inner}</div>`;
}

export function emptyState({ icon: iconName = "orbit", title, body, action = "" }) {
  return `
    <div class="empty-state">
      <div class="empty-orbit">${icon(iconName, 34)}</div>
      <h3>${esc(title)}</h3>
      <p>${body}</p>
      ${action ? `<div class="empty-action">${action}</div>` : ""}
    </div>`;
}

export function disclaimer(text, label = "Educational simulation") {
  return `<div class="disclaimer"><span class="disclaimer-icon">${icon("info", 16)}</span><div><strong>${esc(label)}</strong><p>${text}</p></div></div>`;
}

export function medal(achievement, earned = false, size = "md") {
  return `
    <div class="medal medal-${size} tone-${achievement.accent || "cyan"} ${earned ? "is-earned" : "is-locked"}">
      <div class="medal-glow"></div>
      <div class="medal-core">${icon(achievement.icon || "award", size === "lg" ? 36 : 24)}</div>
      <span class="medal-tier">${esc(achievement.tier || "Achievement")}</span>
    </div>`;
}

let toastCounter = 0;

export function toast(message, type = "info", title = "") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const id = `toast-${++toastCounter}`;
  const titles = {
    success: "Achievement unlocked",
    info: "Update",
    warning: "Heads up",
    error: "Something needs attention"
  };
  const iconName = { success: "award", info: "info", warning: "alert", error: "x-circle" }[type] || "info";
  const element = document.createElement("div");
  element.className = `toast toast-${type}`;
  element.id = id;
  element.setAttribute("role", "status");
  element.innerHTML = `
    <div class="toast-icon">${icon(iconName, 20)}</div>
    <div class="toast-copy">
      <strong>${esc(title || titles[type] || "Update")}</strong>
      <p>${esc(message)}</p>
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss notification" data-toast-close="${id}">${icon("close", 16)}</button>`;
  root.appendChild(element);
  requestAnimationFrame(() => element.classList.add("is-visible"));
  const remove = () => {
    element.classList.remove("is-visible");
    setTimeout(() => element.remove(), 260);
  };
  element.querySelector("[data-toast-close]")?.addEventListener("click", remove);
  setTimeout(remove, type === "success" ? 6000 : 4500);
}

function modalRoot() {
  return document.getElementById("modal-root");
}

export function closeModal() {
  const root = modalRoot();
  if (!root) return;
  root.innerHTML = "";
  document.body.classList.remove("modal-open");
  document.querySelectorAll("[data-modal-return]").forEach((element) => element.focus());
}

export function openModal({ title, body, footer = "", size = "md", onMount = null, label = "Dialog" }) {
  const root = modalRoot();
  if (!root) return;
  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal="true">
      <section class="modal modal-${size}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">
        <header class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="btn btn-icon btn-ghost" type="button" data-close-modal="true" aria-label="Close dialog">${icon("close", 18)}</button>
        </header>
        <div class="modal-body">${body}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ""}
      </section>
    </div>`;
  document.body.classList.add("modal-open");
  const modal = root.querySelector(".modal");
  modal?.focus();
  root.querySelectorAll(".modal [data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });
  root.querySelectorAll(".modal-foot [data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });
  root.querySelector(".modal-backdrop")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
  onMount?.(root);
  return root;
}

export function confirmModal({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  requireText = "",
  onConfirm
}) {
  const id = `confirm-${Date.now()}`;
  const footer = `
    <button class="btn btn-ghost" type="button" data-close-modal="true">${esc(cancelLabel)}</button>
    <button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-confirm-modal="${id}" ${requireText ? "disabled" : ""}>${esc(confirmLabel)}</button>`;
  openModal({
    title,
    body: `
      <div class="confirm-body">${body}</div>
      ${requireText ? `<label class="field-label" for="${id}-text">Type <strong>${esc(requireText)}</strong> to confirm</label><input class="input" id="${id}-text" data-confirm-text autocomplete="off" />` : ""}
    `,
    footer,
    size: "sm",
    onMount(root) {
      const input = root.querySelector("[data-confirm-text]");
      const button = root.querySelector(`[data-confirm-modal="${id}"]`);
      if (input && button) {
        input.addEventListener("input", () => {
          button.disabled = input.value.trim() !== requireText;
        });
        setTimeout(() => input.focus(), 50);
      }
      button?.addEventListener("click", () => {
        if (requireText && input?.value.trim() !== requireText) return;
        closeModal();
        onConfirm?.();
      });
    }
  });
}

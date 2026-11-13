import { academyStats } from "../academy-engine.js";
import { achievementStats } from "../achievements.js";
import { icon } from "./icons.js";
import { esc, percent } from "../utils.js";

export const NAV_ITEMS = [
  { id: "home", path: "/home", label: "Home", icon: "home", short: "Command Center" },
  { id: "academy", path: "/academy", label: "Astronaut Academy", icon: "academy", short: "Academy" },
  { id: "mission", path: "/mission", label: "Space Mission Simulator", icon: "mission", short: "Mission" },
  { id: "mars", path: "/mars", label: "Mars Exploration", icon: "mars", short: "Mars" },
  { id: "library", path: "/library", label: "Science Library", icon: "library", short: "Library" },
  { id: "progress", path: "/progress", label: "My Progress", icon: "progress", short: "Progress" },
  { id: "achievements", path: "/achievements", label: "Achievements", icon: "achievements", short: "Achievements" },
  { id: "reports", path: "/reports", label: "Mission Reports", icon: "reports", short: "Reports" }
];

export function activeNav(route) {
  if (!route) return "home";
  if (route.segments[0] === "academy") return "academy";
  if (route.segments[0] === "mission") return "mission";
  if (route.segments[0] === "mars") return "mars";
  if (route.segments[0] === "library") return "library";
  if (route.segments[0] === "progress") return "progress";
  if (route.segments[0] === "achievements") return "achievements";
  if (route.segments[0] === "reports") return "reports";
  return "home";
}

function missionReadout(state, mission) {
  const stats = state.mission;
  if (!stats.started) return { label: "Briefing room", detail: "Mission not started", tone: "idle", icon: "clock" };
  if (stats.status === "complete") return { label: "Mission complete", detail: `Final score ${stats.finalReport?.score ?? "—"}%`, tone: "complete", icon: "check-circle" };
  return {
    label: `Day ${stats.currentDay} of ${mission.days.length}`,
    detail: `${stats.decisions.length} decisions logged`,
    tone: "active",
    icon: "orbit"
  };
}

export function renderLayout({ content, data, store, route, pageTitle = "Command Center" }) {
  const state = store.get();
  const academy = academyStats(state, data.academy);
  const badges = achievementStats(state);
  const readout = missionReadout(state, data.mission);
  const active = activeNav(route);
  const missionPercent = state.mission.started
    ? state.mission.status === "complete"
      ? 100
      : percent(state.mission.decisions.length, data.mission.days.reduce((sum, day) => sum + day.events.length, 0))
    : 0;

  return `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Primary navigation">
        <div class="sidebar-brand">
          <a class="brand" href="#/home" aria-label="Junior Astronaut Training Platform home">
            <span class="brand-mark">
              <span class="brand-orbit"></span>
              ${icon("rocket", 22)}
            </span>
            <span class="brand-copy">
              <strong>JUNIOR ASTRONAUT</strong>
              <small>TRAINING PLATFORM</small>
            </span>
          </a>
          <button class="btn btn-icon btn-ghost sidebar-close" type="button" data-action="close-nav" aria-label="Close navigation">${icon("close", 19)}</button>
        </div>

        <div class="sidebar-status">
          <div class="status-orb ${readout.tone}"></div>
          <div>
            <span>${esc(readout.label)}</span>
            <small>${esc(readout.detail)}</small>
          </div>
          ${state.mission.started && state.mission.status === "active" ? `<span class="live-pill">LIVE</span>` : ""}
        </div>

        <nav class="side-nav">
          <div class="nav-label">Platform</div>
          ${NAV_ITEMS.map((item) => `
            <a class="nav-link ${active === item.id ? "is-active" : ""}" href="#${item.path}" ${active === item.id ? 'aria-current="page"' : ""}>
              <span class="nav-icon">${icon(item.icon, 19)}</span>
              <span class="nav-text">${esc(item.label)}</span>
              ${item.id === "achievements" ? `<span class="nav-count">${badges.earned}</span>` : ""}
              ${item.id === "mission" && state.mission.started && state.mission.status === "active" ? `<span class="nav-dot"></span>` : ""}
            </a>`).join("")}
        </nav>

        <div class="sidebar-progress">
          <div class="sidebar-progress-head">
            <span>Training progress</span>
            <strong>${academy.average}%</strong>
          </div>
          <div class="progress"><span style="width:${academy.average}%"></span></div>
          <div class="sidebar-progress-meta">
            <span>${academy.completed} / ${academy.totalCourses} courses</span>
            <span>${badges.earned} / ${badges.total} badges</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <a class="crew-chip" href="#/progress">
            <span class="crew-avatar">JA</span>
            <span>
              <strong>Junior Astronaut</strong>
              <small>Crew Operations Support</small>
            </span>
            ${icon("chevron-right", 16)}
          </a>
          <p class="sidebar-disclaimer">Independent educational simulation. Not an official NASA product.</p>
        </div>
      </aside>

      <div class="sidebar-scrim" data-action="close-nav" aria-hidden="true"></div>

      <div class="main-shell">
        <header class="topbar">
          <div class="topbar-left">
            <button class="btn btn-icon btn-ghost mobile-nav-toggle" type="button" data-action="open-nav" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu", 20)}</button>
            <div class="topbar-title">
              <span class="topbar-context">JATA / ${esc(active === "home" ? "COMMAND" : active.toUpperCase())}</span>
              <strong>${esc(pageTitle)}</strong>
            </div>
          </div>
          <div class="topbar-right">
            <a class="topbar-mission ${readout.tone}" href="#/mission">
              <span class="topbar-mission-icon">${icon(readout.icon, 17)}</span>
              <span>
                <strong>${esc(readout.label)}</strong>
                <small>${esc(readout.detail)}</small>
              </span>
              <span class="topbar-orbit" style="--value:${missionPercent}"></span>
            </a>
            <a class="btn btn-icon btn-ghost topbar-help" href="#/library" aria-label="Open Science Library">${icon("library", 19)}</a>
            <button class="btn btn-icon btn-ghost" type="button" data-action="toggle-fullscreen" aria-label="Toggle full screen">${icon("target", 19)}</button>
          </div>
        </header>

        <main class="content" id="main-content" tabindex="-1">
          <div class="page page-enter">
            ${content}
          </div>
          <footer class="site-footer">
            <div class="footer-brand">
              <span class="footer-mark">${icon("orbit", 16)}</span>
              <span>Junior Astronaut Training Platform</span>
            </div>
            <div class="footer-copy">
              <span>Educational simulation. Not an official NASA product.</span>
              <a href="#/library">Science Library</a>
              <a href="#/progress">Data & progress</a>
            </div>
          </footer>
        </main>
      </div>
    </div>`;
}

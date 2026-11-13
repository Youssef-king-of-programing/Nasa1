import {
  carryForwardNotes,
  completedTasks,
  dayComplete,
  decisionForEvent,
  decisionsForDay,
  eventsForDay,
  getSystemMeta,
  missionComplete,
  missionOutcomeTone,
  missionStats,
  overdueTasks,
  pendingTasks
} from "../mission-engine.js";
import { icon } from "../components/icons.js";
import {
  chip,
  disclaimer,
  emptyState,
  pageHead,
  progressBar,
  ring,
  sectionHead,
  statCard,
  statusBadge
} from "../components/ui.js";
import {
  directionLabel,
  directionTone,
  esc,
  formatDate,
  percent,
  plural,
  qualityLabel,
  qualityTone,
  timeAgo
} from "../utils.js";

function systemCard(key, status, mission, compact = false) {
  const meta = getSystemMeta(mission, key);
  if (compact) {
    return `
      <div class="system-mini status-line-${status}" title="${esc(mission.meta.status_meaning?.[status] || "")}">
        <span class="mini-status ${status}"></span>
        <span>${esc(meta.label)}</span>
        <small>${esc(status)}</small>
      </div>`;
  }
  return `
    <article class="system-card status-line-${status}">
      <div class="system-card-top">
        <span class="system-icon">${icon(meta.icon, 20)}</span>
        ${statusBadge(status)}
      </div>
      <h3>${esc(meta.label)}</h3>
      <p>${esc(meta.description)}</p>
      <div class="system-card-foot">
        <span class="system-key">${esc(key.replaceAll("_", " "))}</span>
        <span class="system-meaning">${esc(mission.meta.status_meaning?.[status] || "")}</span>
      </div>
    </article>`;
}

function systemsGrid(missionState, mission) {
  return `<div class="system-grid">${Object.entries(missionState.systems)
    .map(([key, status]) => systemCard(key, status, mission))
    .join("")}</div>`;
}

function taskItem(task, missionState, { actionable = true } = {}) {
  const isDone = task.status === "completed";
  const overdue = !isDone && task.dueDay && missionState.currentDay > task.dueDay;
  return `
    <div class="task-row ${isDone ? "is-complete" : ""} ${overdue ? "is-overdue" : ""}">
      <span class="task-check">${isDone ? icon("check", 14) : icon("clock", 14)}</span>
      <div class="task-copy">
        <strong>${esc(task.label)}</strong>
        <span>${esc(task.category || "Mission")} · due Day ${task.dueDay || "—"}${isDone ? ` · completed Day ${task.completedDay ?? "—"}` : overdue ? " · overdue" : ""}</span>
        ${task.detail ? `<small>${esc(task.detail)}</small>` : ""}
      </div>
      ${isDone
        ? `<span class="task-state">${icon("check-circle", 15)} Done</span>`
        : actionable
          ? `<button class="btn btn-sm btn-secondary task-action" type="button" data-action="complete-task" data-task="${esc(task.id)}">${icon("check", 14)} Complete</button>`
          : `<span class="task-state is-open">Open</span>`}
    </div>`;
}

function taskList(tasks, missionState, { actionable = true, empty = "No tasks in this list." } = {}) {
  if (!tasks.length) return `<div class="mini-empty">${esc(empty)}</div>`;
  return `<div class="task-list">${tasks.map((task) => taskItem(task, missionState, { actionable })).join("")}</div>`;
}

function decisionHistory(missionState, limit = null) {
  const decisions = [...missionState.decisions].reverse().slice(0, limit || missionState.decisions.length);
  if (!decisions.length) {
    return `<div class="mini-empty">No mission decisions recorded yet.</div>`;
  }
  return `
    <div class="decision-history">
      ${decisions.map((decision) => `
        <a class="history-row" href="#/mission/day/${decision.day}">
          <span class="history-day">D${String(decision.day).padStart(2, "0")}</span>
          <span class="history-copy">
            <strong>${esc(decision.eventTitle)}</strong>
            <small>${esc(decision.optionLabel)}</small>
          </span>
          <span class="quality-dot ${qualityTone(decision.quality)}" title="${esc(qualityLabel(decision.quality))}"></span>
        </a>`).join("")}
    </div>`;
}

function clockPanel(missionState, mission) {
  const ms = missionStats(missionState, mission);
  return `
    <div class="clock-panel">
      <div class="clock-head">
        <span class="clock-label">${esc(mission.meta.clock_label || "SIMULATION MET")}</span>
        <span class="live-pill ${missionState.status === "complete" ? "is-complete" : ""}">${missionState.status === "complete" ? "CLOSED" : "LIVE"}</span>
      </div>
      <div class="clock-time">
        <strong>DAY ${String(missionState.currentDay).padStart(2, "0")}</strong>
        <span>${esc(missionState.phase)}</span>
      </div>
      <div class="clock-track">
        ${mission.days.map((day) => `<span class="clock-segment ${day.day < missionState.currentDay || missionState.status === "complete" ? "is-past" : ""} ${day.day === missionState.currentDay && missionState.status === "active" ? "is-now" : ""}"></span>`).join("")}
      </div>
      <div class="clock-meta">
        <span>${ms.decided} / ${ms.totalEvents} decisions</span>
        <span>${ms.taskPending} open tasks</span>
      </div>
    </div>`;
}

function dayStatus(day, missionState) {
  if (missionState.status === "complete") return "complete";
  if (!missionState.started) return "locked";
  if (day.day < missionState.currentDay) return "complete";
  if (day.day === missionState.currentDay) return "current";
  return "locked";
}

function dayTimeline(missionState, mission) {
  return `
    <div class="day-timeline">
      ${mission.days.map((day) => {
        const status = dayStatus(day, missionState);
        const report = missionState.reports?.[day.day];
        const unlocked = status !== "locked";
        const inner = `
          <span class="timeline-index">${String(day.day).padStart(2, "0")}</span>
          <span class="timeline-copy">
            <small>${esc(day.codename)}</small>
            <strong>${esc(day.title)}</strong>
            <span>${report ? "Report filed" : status === "current" ? "In progress" : status === "complete" ? "Decisions recorded" : "Locked"}</span>
          </span>
          <span class="timeline-state">${report ? icon("check-circle", 16) : unlocked ? icon("chevron-right", 16) : icon("lock", 15)}</span>`;
        return unlocked
          ? `<a class="timeline-row is-${status}" href="#/mission/day/${day.day}">${inner}</a>`
          : `<button class="timeline-row is-locked" type="button" data-action="locked-day" data-day="${day.day}">${inner}</button>`;
      }).join("")}
    </div>`;
}

function missionActions(missionState, mission) {
  if (missionState.status === "complete") {
    return `
      <a class="btn btn-secondary" href="#/reports/final">${icon("reports", 16)} Final report</a>
      <button class="btn btn-ghost" type="button" data-action="restart-mission">${icon("rotate", 16)} Restart mission</button>`;
  }
  return `
    <a class="btn btn-primary" href="#/mission/day/${missionState.currentDay}">${icon("play", 16)} ${missionState.decisions.length ? "Continue" : "Open"} Day ${missionState.currentDay}</a>
    <button class="btn btn-ghost" type="button" data-action="restart-mission">${icon("rotate", 16)} Restart</button>`;
}

function briefingHero(data, store) {
  const mission = data.mission;
  return `
    <section class="mission-brief-hero">
      <div class="mission-brief-art" aria-hidden="true">
        <div class="station-orbit orbit-one"></div>
        <div class="station-orbit orbit-two"></div>
        <div class="station-core">${icon("mission", 44)}</div>
        <span class="station-node node-one"></span>
        <span class="station-node node-two"></span>
        <span class="station-node node-three"></span>
      </div>
      <div class="mission-brief-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>FIVE-DAY INTEGRATED SIMULATION</div>
        <h1>${esc(mission.meta.title)}</h1>
        <p>${esc(mission.meta.subtitle)}. You serve as ${esc(mission.meta.role)}, making the human-systems decisions that shape crew readiness across five connected mission days.</p>
        <div class="mission-fact-row">
          <span>${icon("clock", 15)} ${mission.meta.duration_days} mission days</span>
          <span>${icon("activity", 15)} Qualitative system status</span>
          <span>${icon("target", 15)} 15 decision points</span>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" type="button" data-action="start-mission">${icon("play", 19)} Start mission simulation</button>
          <a class="btn btn-secondary btn-lg" href="#/academy">${icon("academy", 19)} Prepare in the Academy</a>
        </div>
        <p class="micro-note">The simulation follows a fixed five-day structure. Events are not randomized, and no numeric crew or resource measurements are invented.</p>
      </div>
    </section>`;
}

function missionBriefing({ data }) {
  const mission = data.mission;
  return `
    ${pageHead({
      eyebrow: "Section B · Space Mission Simulator",
      title: "Mission Briefing",
      subtitle: "A connected five-day station scenario that tests how you apply human-science knowledge under operational pressure.",
      actions: `<a class="btn btn-ghost" href="#/academy">${icon("academy", 17)} Academy preparation</a>`
    })}

    ${briefingHero(data)}

    <section class="mission-facts">
      ${statCard({ label: "Your role", value: "Ops Support", detail: "Crew Operations Support Officer", icon: "user", tone: "cyan" })}
      ${statCard({ label: "Scenario length", value: `${mission.meta.duration_days}<span class="stat-of"> days</span>`, detail: "15 fixed events · 45 decisions", icon: "calendar", tone: "blue" })}
      ${statCard({ label: "Status model", value: "4 levels", detail: "Nominal · Watch · Degraded · Critical", icon: "activity", tone: "violet" })}
      ${statCard({ label: "Assessment", value: "Simulation", detail: "Decision quality, tasks, readiness", icon: "target", tone: "amber" })}
    </section>

    <section class="mission-brief-grid">
      <article class="panel">
        <div class="panel-kicker">${icon("orbit", 15)} Mission narrative</div>
        <h2>Station operations under changing conditions</h2>
        <p>The scenario begins with station preparation and resource management, then moves through a solar particle event, an exercise equipment fault, crew fatigue and schedule pressure, and a final crew and station assessment.</p>
        <p>Each decision immediately changes the qualitative mission state and may add or close tasks. Every recorded decision carries into the final report.</p>
        <div class="brief-points">
          <div><span>01</span><strong>Read the situation</strong><p>Review the daily briefing, science brief, and next event before committing.</p></div>
          <div><span>02</span><strong>Make the call</strong><p>Choose one option per event. Decisions cannot be changed during the current run.</p></div>
          <div><span>03</span><strong>Close the day</strong><p>Complete tasks, review consequences, and generate the daily report.</p></div>
          <div><span>04</span><strong>Debrief</strong><p>Use the final report to compare decision quality and readiness with the learning resources.</p></div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-kicker">${icon("shield-check", 15)} Baseline conditions</div>
        <h2>Every system starts with a qualitative status</h2>
        ${systemsGrid(storeBaseline(mission), mission)}
        <p class="micro-note">Initial states are scenario-defined. The platform does not invent oxygen, water, food, power, or radiation quantities.</p>
      </article>
    </section>

    <section class="home-section">
      ${sectionHead({
        kicker: "Five-day structure",
        title: "The mission timeline",
        subtitle: "Days unlock in order. Each day contains three decision events and a daily report."
      })}
      <div class="brief-day-grid">
        ${mission.days.map((day) => `
          <article class="brief-day-card">
            <span class="brief-day-code">${esc(day.codename)}</span>
            <strong>${String(day.day).padStart(2, "0")}</strong>
            <h3>${esc(day.title)}</h3>
            <p>${esc(day.situation)}</p>
            <span class="brief-day-events">${day.events.length} events · ${day.report_prompts.length} report prompts</span>
          </article>`).join("")}
      </div>
    </section>

    <section class="panel mission-rules-panel">
      <div class="panel-kicker">${icon("info", 15)} Scenario rules</div>
      <h2>How the simulation works</h2>
      <div class="rule-columns">
        <div>
          <h3>Decision quality</h3>
          <p>After a decision is recorded, the scenario identifies it as the strongest available option, an acceptable option, or a high-risk option. Quality is hidden until the decision is committed.</p>
        </div>
        <div>
          <h3>Task completion</h3>
          <p>Tasks can be completed directly in the mission console or by a decision that resolves them. Open and overdue tasks stay visible in the final report.</p>
        </div>
        <div>
          <h3>Crew readiness</h3>
          <p>Nine systems are tracked with qualitative statuses only. The final assessment is a local learning model, not a real NASA evaluation.</p>
        </div>
      </div>
      <p class="micro-note">${esc(mission.assessment_rules.model_note)}</p>
    </section>

    ${disclaimer(esc(mission.meta.disclaimer), "Fictional educational simulation")}
  `;
}

function storeBaseline(mission) {
  const systems = {};
  for (const [key, value] of Object.entries(mission.initial_state.systems)) systems[key] = value.status;
  return { systems };
}

function renderMissionDashboard({ data, store }) {
  const mission = data.mission;
  const state = store.get();
  const missionState = state.mission;
  const ms = missionStats(missionState, mission);
  const currentDay = mission.days.find((day) => day.day === missionState.currentDay);
  const openTasks = pendingTasks(missionState);
  const doneTasks = completedTasks(missionState);
  const overdue = overdueTasks(missionState);
  const recent = [...missionState.decisions].slice(-4).reverse();
  const atRisk = Object.values(missionState.systems).filter((status) => status !== "nominal").length;
  const missionDone = missionComplete(missionState);

  return `
    ${pageHead({
      eyebrow: "Mission Control · Live dashboard",
      title: missionDone ? "Mission complete" : `Day ${missionState.currentDay}: ${currentDay?.title || "Operations"}`,
      subtitle: missionDone
        ? "The five-day simulation is closed. Review the final report, decision record, and learning recommendations."
        : "Monitor all nine qualitative systems, close tasks, review decision history, and move through the fixed five-day scenario.",
      actions: missionActions(missionState, mission)
    })}

    ${missionDone && missionState.finalReport
      ? `<a class="final-outcome-banner ${missionOutcomeTone(missionState.finalReport.outcome.status)}" href="#/reports/final">
          <span class="outcome-score">${missionState.finalReport.score}<small>%</small></span>
          <span class="outcome-copy"><small>FINAL OUTCOME</small><strong>${esc(missionState.finalReport.outcome.label)}</strong><span>${esc(missionState.finalReport.outcome.summary)}</span></span>
          <span class="outcome-link">Open final report ${icon("arrow-right", 16)}</span>
        </a>`
      : ""}

    <section class="mission-console-banner">
      <div class="console-banner-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>${esc(mission.meta.clock_label || "SIMULATION MET")} · ${esc(missionState.phase).toUpperCase()}</div>
        <h2>${esc(currentDay?.codename || "ORBIT")} · ${esc(currentDay?.title || "Mission operations")}</h2>
        <p>${esc(currentDay?.briefing?.[0] || "Mission operations are in progress.")}</p>
        <div class="console-tags">
          ${chip(`${ms.decided} of ${ms.totalEvents} decisions`, "subtle", "list")}
          ${chip(`${openTasks.length} open tasks`, openTasks.length ? "warning" : "success", "task")}
          ${chip(`${atRisk} systems off nominal`, atRisk ? "warning" : "success", "activity")}
          ${missionState.finalReport ? chip(`Final ${missionState.finalReport.score}%`, "subtle", "target") : ""}
        </div>
      </div>
      <div class="console-banner-side">
        ${ring(ms.progressPercent, 108, 8, "mission")}
        <a class="btn btn-secondary" href="#/mission/day/${missionState.currentDay}">${icon("play", 15)} Open day workspace</a>
      </div>
    </section>

    <section class="stat-row">
      ${statCard({ label: "Mission day", value: `${missionState.currentDay}<span class="stat-of">/ 5</span>`, detail: `${esc(missionState.phase)} phase`, icon: "calendar", tone: "cyan" })}
      ${statCard({ label: "Decisions", value: `${ms.decided}<span class="stat-of">/ ${ms.totalEvents}</span>`, detail: `${ms.remaining} events remaining`, icon: "compass", tone: "blue" })}
      ${statCard({ label: "Tasks", value: `${ms.taskCompleted}<span class="stat-of">/ ${ms.taskTotal}</span>`, detail: overdue.length ? `${overdue.length} overdue` : `${openTasks.length} open`, icon: "task", tone: overdue.length ? "rose" : "teal" })}
      ${statCard({ label: "Systems", value: `${9 - atRisk}<span class="stat-of">/ 9</span>`, detail: atRisk ? `${atRisk} need attention` : "All nominal", icon: "activity", tone: atRisk ? "amber" : "teal" })}
    </section>

    <section class="dashboard-layout">
      <div class="dashboard-main">
        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("activity", 15)} Station systems</div>
              <h2>Qualitative readiness board</h2>
            </div>
            ${chip("No invented quantities", "subtle", "info")}
          </div>
          ${systemsGrid(missionState, mission)}
        </article>

        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("task", 15)} Pending tasks</div>
              <h2>${openTasks.length ? `${plural(openTasks.length, "task")} need attention` : "All tracked tasks closed"}</h2>
            </div>
            <a class="btn btn-sm btn-ghost" href="#/mission/day/${missionState.currentDay}">Open workspace ${icon("arrow-right", 14)}</a>
          </div>
          ${taskList(openTasks, missionState, { actionable: missionState.status === "active", empty: "No open tasks. Every tracked task is complete." })}
          ${doneTasks.length ? `<details class="inline-details"><summary>${icon("check-circle", 15)} View ${doneTasks.length} completed task${doneTasks.length === 1 ? "" : "s"}</summary>${taskList(doneTasks, missionState, { actionable: false })}</details>` : ""}
        </article>

        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("list", 15)} Decision history</div>
              <h2>${missionState.decisions.length ? "Latest recorded decisions" : "No decisions recorded"}</h2>
            </div>
            ${missionState.decisions.length ? `<a class="btn btn-sm btn-ghost" href="#/reports">Full record ${icon("arrow-right", 14)}</a>` : ""}
          </div>
          ${recent.length ? `<div class="decision-table">${recent.map((decision) => `
            <div class="decision-table-row">
              <span class="decision-table-day">D${String(decision.day).padStart(2, "0")}</span>
              <div class="decision-table-copy">
                <strong>${esc(decision.eventTitle)}</strong>
                <span>${esc(decision.optionLabel)}</span>
              </div>
              <span class="quality-chip ${qualityTone(decision.quality)}">${esc(qualityLabel(decision.quality))}</span>
              <span class="decision-table-time">${timeAgo(decision.at)}</span>
            </div>`).join("")}</div>` : `<div class="mini-empty">The first decision will appear here after you open Day 1.</div>`}
        </article>
      </div>

      <aside class="dashboard-rail">
        ${clockPanel(missionState, mission)}
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("calendar", 15)} Mission timeline</div>
          ${dayTimeline(missionState, mission)}
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("orbit", 15)} Current status</div>
          <div class="status-summary-list">
            ${mission.days.map((day) => {
              const report = missionState.reports?.[day.day];
              const status = dayStatus(day, missionState);
              return `<div class="status-summary-row">
                <span class="status-summary-day">DAY ${day.day}</span>
                <span>${esc(day.title)}</span>
                ${report ? icon("check-circle", 15) : status === "current" ? `<span class="live-pill">LIVE</span>` : icon("lock", 13)}
              </div>`;
            }).join("")}
          </div>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("shield-check", 15)} Run controls</div>
          <p class="micro-note">Restarting resets all mission decisions, tasks, reports, and system statuses. Academy progress and achievements are kept.</p>
          <button class="btn btn-ghost btn-block" type="button" data-action="restart-mission">${icon("rotate", 15)} Restart mission</button>
        </article>
      </aside>
    </section>

    ${disclaimer(esc(mission.meta.disclaimer), "Fictional educational simulation")}
  `;
}

export function renderMission({ data, store }) {
  const state = store.get();
  if (!state.mission.started) return missionBriefing({ data, store });
  return renderMissionDashboard({ data, store, state });
}

function lockedMissionPage({ title, body, action = "" }) {
  return `
    ${pageHead({ eyebrow: "Mission Control", title })}
    <section class="panel locked-assessment">
      <div class="locked-assessment-icon">${icon("lock", 34)}</div>
      <h2>${esc(title)}</h2>
      <p>${body}</p>
      <div class="overview-actions">${action || `<a class="btn btn-primary" href="#/mission">${icon("arrow-left", 16)} Return to mission</a>`}</div>
    </section>`;
}

function eventTypeLabel(type) {
  return String(type || "mission_event").replaceAll("_", " ");
}

function academyLinkList(links) {
  if (!links?.length) return "";
  return `
    <div class="event-learning">
      <div class="panel-kicker">${icon("academy", 14)} Recommended Academy learning</div>
      <div class="event-learning-links">
        ${links.map((link) => `
          <a class="event-learning-link" href="#/academy/${link.course_id}/module/${link.module_id}">
            <span class="mini-course-icon tone-cyan">${icon("book-open", 15)}</span>
            <span><strong>${esc(link.module_title)}</strong><small>${esc(link.course_title)}</small></span>
            ${icon("arrow-up-right", 14)}
          </a>`).join("")}
      </div>
    </div>`;
}

function effectRow(effect) {
  return `
    <div class="effect-row ${directionTone(effect.direction)}">
      <span class="effect-icon">${icon(effect.direction === "improve" ? "arrow-up" : effect.direction === "worsen" ? "arrow-down" : "minus", 14)}</span>
      <span class="effect-copy">
        <strong>${esc(effect.systemLabel || effect.system)}</strong>
        <small>${effect.from ? `${esc(effect.from.toUpperCase())} → ${esc(effect.to.toUpperCase())}` : esc(directionLabel(effect.direction))}${effect.note ? ` · ${esc(effect.note)}` : ""}</small>
      </span>
      ${effect.from ? `<span class="effect-state">${statusBadge(effect.to)}</span>` : ""}
    </div>`;
}

function decidedEvent(event, decision, missionState, mission) {
  const report = missionState.reports?.[decision.day];
  return `
    <article class="event-card is-decided" id="event-${esc(event.id)}">
      <header class="event-head">
        <div class="event-head-main">
          <div class="event-kicker">${esc(eventTypeLabel(event.event_type))} · DECISION RECORDED</div>
          <h2>${esc(event.title)}</h2>
          <p>${esc(event.prompt)}</p>
        </div>
        <span class="quality-chip ${qualityTone(decision.quality)}">${icon(decision.quality === "optimal" ? "check-circle" : decision.quality === "acceptable" ? "info" : "alert", 14)} ${esc(qualityLabel(decision.quality))}</span>
      </header>
      <div class="decision-record">
        <span class="decision-record-label">${icon("compass", 14)} Your decision</span>
        <strong>${esc(decision.optionLabel)}</strong>
        <p>${esc(decision.summary)}</p>
      </div>
      <div class="event-consequence">
        <div class="consequence-head">${icon("orbit", 16)} Consequence</div>
        <p>${esc(decision.narrative)}</p>
        ${decision.immediateResults?.length ? `<ul class="result-list">${decision.immediateResults.map((result) => `<li>${icon("chevron-right", 13)}<span>${esc(result)}</span></li>`).join("")}</ul>` : ""}
      </div>
      ${decision.effects?.length ? `<div class="effect-list">${decision.effects.map(effectRow).join("")}</div>` : ""}
      ${decision.tasksCompleted?.length || decision.tasksAdded?.length ? `
        <div class="task-delta-grid">
          ${decision.tasksCompleted?.length ? `<div class="task-delta is-done"><span>${icon("check-circle", 15)} Closed</span>${decision.tasksCompleted.map((task) => `<small>${esc(task)}</small>`).join("")}</div>` : ""}
          ${decision.tasksAdded?.length ? `<div class="task-delta is-added"><span>${icon("plus", 15)} Added</span>${decision.tasksAdded.map((task) => `<small>${esc(task)}</small>`).join("")}</div>` : ""}
        </div>` : ""}
      ${academyLinkList(event.academy_links)}
      <div class="event-foot">
        <span>Recorded ${formatDate(decision.at, true)}</span>
        ${report ? `<a class="text-link" href="#/reports/day/${decision.day}">View Day ${decision.day} report ${icon("arrow-right", 14)}</a>` : ""}
      </div>
    </article>`;
}

function openEvent(event, dayNumber) {
  return `
    <article class="event-card is-open" id="event-${esc(event.id)}">
      <header class="event-head">
        <div class="event-head-main">
          <div class="event-kicker">${esc(eventTypeLabel(event.event_type))} · DECISION REQUIRED</div>
          <h2>${esc(event.title)}</h2>
          <div class="event-narrative">${event.narrative.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}</div>
          <p class="event-prompt">${esc(event.prompt)}</p>
        </div>
      </header>
      ${academyLinkList(event.academy_links)}
      <form class="decision-form" data-form="mission-decision" data-event="${esc(event.id)}" data-day="${dayNumber}">
        <div class="decision-options">
          ${event.options.map((option, index) => `
            <label class="decision-option">
              <input type="radio" name="option" value="${esc(option.id)}" />
              <span class="decision-control">${String.fromCharCode(65 + index)}</span>
              <span class="decision-copy">
                <strong>${esc(option.label)}</strong>
                <small>${esc(option.summary)}</small>
              </span>
              <span class="decision-select">${icon("arrow-right", 16)}</span>
            </label>`).join("")}
        </div>
        <div class="decision-actions">
          <p class="form-note">${icon("info", 14)} Decision quality and consequences are revealed only after you record your choice.</p>
          <button class="btn btn-primary" type="submit">${icon("compass", 16)} Record decision</button>
        </div>
      </form>
    </article>`;
}

function lockedEvent(event, position, unlockedCount) {
  return `
    <article class="event-card is-locked" id="event-${esc(event.id)}">
      <header class="event-head">
        <div class="event-head-main">
          <div class="event-kicker">${esc(eventTypeLabel(event.event_type))} · ${unlockedCount ? "SEQUENCE LOCKED" : "AVAILABLE AFTER EARLIER EVENTS"}</div>
          <h2>${icon("lock", 18)} ${esc(event.title)}</h2>
          <p>${esc(event.prompt)}</p>
        </div>
        <span class="event-position">EVENT ${position}</span>
      </header>
      <div class="locked-event-note">${icon("info", 15)} Record the earlier event decisions to unlock this one. The simulator preserves the scenario order so consequences carry forward correctly.</div>
    </article>`;
}

function dayReportSummaryCard(report, missionState) {
  return `
    <article class="panel report-ready-panel">
      <div class="report-ready-icon">${icon("reports", 30)}</div>
      <div>
        <div class="kicker">Daily report filed</div>
        <h2>${esc(report.title)}</h2>
        <p>${esc(report.summary[0])} ${esc(report.summary[2])}</p>
        <div class="overview-actions">
          <a class="btn btn-primary" href="#/reports/day/${report.day}">${icon("file-text", 16)} Open Day ${report.day} report</a>
          ${report.day < 5 && missionState.currentDay > report.day ? `<a class="btn btn-secondary" href="#/mission/day/${missionState.currentDay}">Continue mission ${icon("arrow-right", 15)}</a>` : ""}
        </div>
      </div>
    </article>`;
}

function dayClosePanel({ missionState, day, events, data }) {
  const complete = dayComplete(missionState, data.mission, day.day);
  const open = pendingTasks(missionState);
  const overdue = overdueTasks(missionState);
  if (!complete) {
    return `
      <div class="day-close-pending">
        ${icon("clock", 18)}
        <div>
          <strong>${events.length - decisionsForDay(missionState, day.day).length} decision${events.length - decisionsForDay(missionState, day.day).length === 1 ? "" : "s"} still required</strong>
          <p>Record every scheduled event decision before closing the day. The final event depends on the decisions that come before it.</p>
        </div>
      </div>`;
  }
  return `
    <article class="panel day-close-panel">
      <div class="day-close-head">
        <div>
          <div class="kicker">${icon("check-circle", 14)} All scheduled events decided</div>
          <h2>${day.day < 5 ? `Close Day ${day.day} and generate the daily report` : "Close the mission and generate the final report"}</h2>
          <p>${open.length ? `${plural(open.length, "task")} remain open and will carry forward into ${day.day < 5 ? "the next day" : "the final report"}.` : "All tracked tasks are complete."} ${overdue.length ? `${plural(overdue.length, "task")} ${overdue.length === 1 ? "is" : "are"} overdue.` : ""}</p>
        </div>
        ${ring(100, 76, 6, "ready")}
      </div>
      <div class="day-close-actions">
        <p class="form-note">${icon("info", 14)} Daily reports are generated from the recorded mission state and cannot be regenerated differently in this run.</p>
        <button class="btn btn-primary btn-lg" type="button" data-action="end-day" data-day="${day.day}">${icon(day.day < 5 ? "arrow-right" : "flag", 17)} ${day.day < 5 ? `Generate Day ${day.day} report & continue` : "Generate final mission report"}</button>
      </div>
    </article>`;
}

export function renderMissionDay({ data, store, dayNumber }) {
  const state = store.get();
  const mission = data.mission;
  const missionState = state.mission;
  const dayNum = Number(dayNumber);
  const day = mission.days.find((item) => item.day === dayNum);

  if (!day) {
    return emptyState({
      title: "Mission day not found",
      body: "The five-day scenario does not contain this day.",
      action: `<a class="btn btn-primary" href="#/mission">${icon("arrow-left", 16)} Return to mission</a>`
    });
  }
  if (!missionState.started) {
    return lockedMissionPage({
      title: "Mission not started",
      body: "Start the mission simulation before opening a day workspace. The scenario begins with a briefing and baseline systems.",
      action: `<button class="btn btn-primary" type="button" data-action="start-mission">${icon("play", 16)} Start mission</button><a class="btn btn-secondary" href="#/mission">Mission briefing</a>`
    });
  }
  if (missionState.status !== "complete" && dayNum > missionState.currentDay) {
    return lockedMissionPage({
      title: `Day ${dayNum} is locked`,
      body: `Complete Day ${missionState.currentDay} first. The scenario unlocks days in order so every consequence carries forward.`,
      action: `<a class="btn btn-primary" href="#/mission/day/${missionState.currentDay}">${icon("play", 16)} Open Day ${missionState.currentDay}</a><a class="btn btn-secondary" href="#/mission">Mission console</a>`
    });
  }

  const events = eventsForDay(mission, dayNum);
  const dayDecisions = decisionsForDay(missionState, dayNum);
  const decidedCount = dayDecisions.length;
  const report = missionState.reports?.[dayNum];
  const isReview = missionState.status === "complete" || dayNum < missionState.currentDay;
  const carry = carryForwardNotes(missionState, dayNum);
  const openTasks = pendingTasks(missionState);
  const doneToday = completedTasks(missionState).filter((task) => task.completedDay === dayNum);

  return `
    <div class="breadcrumb"><a href="#/mission">${icon("arrow-left", 14)} Mission Control</a><span>/</span><span>Day ${dayNum}</span></div>

    <section class="mission-day-hero">
      <div class="mission-day-hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>${esc(day.codename)} · DAY ${String(dayNum).padStart(2, "0")} OF 05</div>
        <h1>${esc(day.title)}</h1>
        <p>${esc(day.briefing[0])}</p>
        <div class="mission-day-tags">
          ${chip(`${decidedCount}/${events.length} decisions`, decidedCount === events.length ? "success" : "subtle", "compass")}
          ${chip(report ? "Day report filed" : isReview ? "Review mode" : "In progress", report ? "success" : "subtle", "reports")}
          ${missionState.status === "complete" ? chip("Mission complete", "success", "check-circle") : chip(`Mission clock · Day ${missionState.currentDay}`, "subtle", "clock")}
        </div>
      </div>
      <div class="mission-day-hero-side">
        ${ring(percent(decidedCount, events.length), 108, 8, "day")}
        <div class="day-hero-side-meta">
          <span>${events.length} events</span>
          <span>${openTasks.length} open tasks</span>
        </div>
      </div>
    </section>

    <section class="day-brief-grid">
      <article class="panel">
        <div class="panel-kicker">${icon("info", 15)} Daily briefing</div>
        ${day.briefing.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
      </article>
      <article class="panel situation-panel">
        <div class="panel-kicker">${icon("activity", 15)} Situation report</div>
        <p>${esc(day.situation)}</p>
        ${carry.length ? `<div class="carry-forward"><span>${icon("rotate", 14)} Carried forward</span>${carry.map((note) => `<small>Day ${note.day}: ${esc(note.title)} — ${esc(note.note)}</small>`).join("")}</div>` : `<p class="micro-note">No prior decisions have been carried into this day.</p>`}
      </article>
    </section>

    <section class="science-brief-section">
      ${sectionHead({
        kicker: "Science uplink",
        title: "What the Academy says about today",
        subtitle: "These short briefs connect the day's events to the relevant course modules. Every card links to the full lesson."
      })}
      <div class="science-brief-grid">
        ${day.science_brief.map((brief) => `
          <a class="science-brief-card" href="#/academy/${brief.course_id}/module/${brief.module_id}">
            <span class="science-brief-icon">${icon("lightbulb", 18)}</span>
            <strong>${esc(brief.title)}</strong>
            <p>${esc(brief.text)}</p>
            <span class="text-link">Open module ${icon("arrow-up-right", 13)}</span>
          </a>`).join("")}
      </div>
    </section>

    <section class="event-section">
      ${sectionHead({
        kicker: "Decision sequence",
        title: `${events.length} events scheduled`,
        subtitle: "Events unlock in order. Each choice immediately updates the mission state and may add tasks.",
        action: `<span class="badge-count">${decidedCount}/${events.length} recorded</span>`
      })}
      <div class="event-list">
        ${events.map((event, index) => {
          const decision = decisionForEvent(missionState, event.id);
          if (decision) return decidedEvent(event, decision, missionState, mission);
          const priorDecided = events.slice(0, index).every((item) => Boolean(decisionForEvent(missionState, item.id)));
          if (priorDecided && !isReview) return openEvent(event, dayNum);
          return lockedEvent(event, index + 1, priorDecided && isReview);
        }).join("")}
      </div>
    </section>

    ${decidedCount === events.length
      ? report
        ? dayReportSummaryCard(report, missionState)
        : dayClosePanel({ missionState, day, events, data })
      : `<div class="panel day-progress-panel">
          <div class="panel-kicker">${icon("orbit", 15)} Day progress</div>
          <h2>${events.length - decidedCount} decision${events.length - decidedCount === 1 ? "" : "s"} remaining</h2>
          <p>Read each situation carefully, review the linked Academy module, and record one decision per event. The day report unlocks after the final decision.</p>
          ${progressBar(percent(decidedCount, events.length))}
          <div class="day-progress-meta"><span>Decision sequence</span><strong>${decidedCount} / ${events.length}</strong></div>
        </div>`}

    <section class="mission-day-lower">
      <div class="panel">
        <div class="panel-head-row">
          <div>
            <div class="panel-kicker">${icon("task", 15)} Open tasks</div>
            <h2>${openTasks.length ? `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} in the mission record` : "No open tasks"}</h2>
          </div>
          <span class="badge-count">${doneToday.length} closed today</span>
        </div>
        ${taskList(openTasks, missionState, { actionable: missionState.status === "active" && !isReview, empty: "Every tracked task is complete." })}
        ${doneToday.length ? `<details class="inline-details"><summary>${icon("check-circle", 15)} ${doneToday.length} task${doneToday.length === 1 ? "" : "s"} closed today</summary>${taskList(doneToday, missionState, { actionable: false })}</details>` : ""}
      </div>
      <aside class="day-rail">
        ${clockPanel(missionState, mission)}
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("list", 15)} Day decisions</div>
          ${dayDecisions.length
            ? `<div class="day-decision-list">${dayDecisions.map((decision) => `
                <a class="day-decision-row" href="#event-${esc(decision.eventId)}" data-scroll="event-${esc(decision.eventId)}">
                  <span class="quality-dot ${qualityTone(decision.quality)}"></span>
                  <span><strong>${esc(decision.eventTitle)}</strong><small>${esc(decision.optionLabel)}</small></span>
                </a>`).join("")}</div>`
            : `<div class="mini-empty">No decisions recorded on this day yet.</div>`}
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("orbit", 15)} Timeline</div>
          ${dayTimeline(missionState, mission)}
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("shield-check", 15)} Run controls</div>
          <p class="micro-note">Restarting resets the entire mission record while preserving Academy progress and achievements.</p>
          <button class="btn btn-ghost btn-block" type="button" data-action="restart-mission">${icon("rotate", 15)} Restart mission</button>
        </article>
      </aside>
    </section>

    ${disclaimer(esc(mission.meta.disclaimer), "Fictional educational simulation")}
  `;
}

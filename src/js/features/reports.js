import {
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
  qualityLabel,
  qualityTone,
  statusLabel
} from "../utils.js";

function qualitySummary(quality) {
  return qualityLabel(quality);
}

function dueLabel(dueDay) {
  return dueDay ? `Due Day ${dueDay}` : "No due day";
}

function decisionCard(decision) {
  return `
    <article class="report-decision">
      <div class="report-decision-head">
        <div>
          <span class="report-decision-day">DAY ${String(decision.day).padStart(2, "0")}</span>
          <h3>${esc(decision.eventTitle)}</h3>
        </div>
        <span class="quality-chip ${qualityTone(decision.quality)}">${esc(qualitySummary(decision.quality))}</span>
      </div>
      <div class="report-decision-choice">${icon("compass", 15)} <strong>${esc(decision.optionLabel)}</strong></div>
      <p class="report-decision-summary">${esc(decision.summary)}</p>
      <p class="report-decision-note">${esc(decision.narrative)}</p>
      ${decision.effects?.length ? `<div class="report-effect-list">${decision.effects.map((effect) => `
        <div class="report-effect ${directionTone(effect.direction)}">
          <span>${icon(effect.direction === "improve" ? "arrow-up" : effect.direction === "worsen" ? "arrow-down" : "minus", 13)}</span>
          <strong>${esc(effect.systemLabel || effect.system)}</strong>
          <small>${effect.from ? `${esc(effect.from)} → ${esc(effect.to)}` : esc(directionLabel(effect.direction))}${effect.note ? ` · ${esc(effect.note)}` : ""}</small>
        </div>`).join("")}</div>` : ""}
      <div class="report-decision-foot">
        <span>${esc(decision.reportNote || "")}</span>
        <span>${formatDate(decision.at, true)}</span>
      </div>
    </article>`;
}

function reportSystems(statuses, mission) {
  return `
    <div class="report-system-grid">
      ${Object.entries(statuses).map(([key, status]) => {
        const meta = mission.initial_state.systems[key] || { label: key, icon: "activity" };
        return `<div class="report-system status-line-${status}">
          <span class="system-icon">${icon(meta.icon, 17)}</span>
          <span><strong>${esc(meta.label)}</strong><small>${esc(statusLabel(status))}</small></span>
          ${statusBadge(status)}
        </div>`;
      }).join("")}
    </div>`;
}

function reportTaskBlock(report) {
  return `
    <div class="report-task-columns">
      <div class="report-task-block">
        <h3>${icon("check-circle", 16)} Completed tasks</h3>
        ${report.completedTasks?.length
          ? `<ul class="report-task-list is-done">${report.completedTasks.map((task) => `<li>${icon("check", 13)}<span>${esc(task.label)}</span></li>`).join("")}</ul>`
          : `<div class="mini-empty">No tasks were closed on this day.</div>`}
      </div>
      <div class="report-task-block">
        <h3>${icon("clock", 16)} Pending at close</h3>
        ${report.pendingTasks?.length
          ? `<ul class="report-task-list">${report.pendingTasks.map((task) => `<li class="${task.overdue ? "is-overdue" : ""}">${icon("clock", 13)}<span>${esc(task.label)}</span><small>${dueLabel(task.dueDay)}${task.overdue ? " · overdue" : ""}</small></li>`).join("")}</ul>`
          : `<div class="mini-empty">No pending tasks at the time of this report.</div>`}
      </div>
    </div>
    ${report.overdueTasks?.length ? `<div class="report-overdue">${icon("alert", 15)} <strong>${report.overdueTasks.length} overdue:</strong> ${report.overdueTasks.map((task) => esc(task.label)).join("; ")}</div>` : ""}`;
}

function dayReportMarkdown(report) {
  const lines = [
    `# Day ${report.day} Mission Report — ${report.title}`,
    "",
    `Codename: ${report.codename}`,
    `Generated: ${formatDate(report.generatedAt, true)}`,
    "",
    "## Summary",
    ...report.summary.map((line) => `- ${line}`),
    "",
    "## Systems at close",
    ...Object.entries(report.systems).map(([key, status]) => `- ${key.replaceAll("_", " ")}: ${status}`),
    "",
    "## Decisions",
    ...report.decisions.flatMap((decision) => [
      `### ${decision.eventTitle}`,
      `- Choice: ${decision.optionLabel}`,
      `- Quality: ${qualityLabel(decision.quality)}`,
      `- Report note: ${decision.reportNote || "—"}`,
      ""
    ]),
    "## Completed tasks",
    ...(report.completedTasks.length ? report.completedTasks.map((task) => `- ${task.label}`) : ["- None recorded."]),
    "",
    "## Pending tasks",
    ...(report.pendingTasks.length ? report.pendingTasks.map((task) => `- ${task.label} (${dueLabel(task.dueDay)}${task.overdue ? ", overdue" : ""})`) : ["- None."]),
    "",
    ...(report.overdueTasks.length ? ["## Overdue at close", ...report.overdueTasks.map((task) => `- ${task.label} (${dueLabel(task.dueDay)})`), ""] : []),
    "## Reflection prompts",
    ...report.reportPrompts.map((prompt) => `- ${prompt}`),
    "",
    "> Educational simulation. Not an official NASA product or operational record."
  ];
  return lines.join("\n");
}

function finalReportMarkdown(report) {
  const lines = [
    "# Final Mission Report",
    "",
    `Generated: ${formatDate(report.generatedAt, true)}`,
    `Outcome: ${report.outcome.label}`,
    `Score: ${report.score}%`,
    report.capped ? "Outcome capped at Conditional Mission because a monitored system ended CRITICAL." : "",
    "",
    "## Outcome summary",
    report.outcome.summary,
    "",
    "## Assessment breakdown",
    `- Decision quality: ${report.breakdown.decisionScore}% (weight ${report.breakdown.weights.decision_quality}%)`,
    `- Task completion: ${report.breakdown.taskScore}% (weight ${report.breakdown.weights.task_completion}%)`,
    `- Crew readiness: ${report.breakdown.readinessScore}% (weight ${report.breakdown.weights.crew_readiness}%)`,
    "",
    "## System readiness at close",
    ...Object.entries(report.statuses).map(([key, status]) => `- ${key.replaceAll("_", " ")}: ${status}`),
    "",
    "## Five-day timeline",
    ...report.daySummaries.flatMap((day) => [
      `### Day ${day.day} — ${day.title}`,
      `- Decisions recorded: ${day.decisions}`,
      `- Optimal decisions: ${day.optimal}`,
      `- High-risk decisions: ${day.highRisk}`,
      ...day.notes.map((note) => `- ${note}`),
      ""
    ]),
    "## Decision history",
    ...report.decisions.flatMap((decision) => [
      `### Day ${decision.day}: ${decision.eventTitle}`,
      `- Choice: ${decision.optionLabel}`,
      `- Quality: ${qualityLabel(decision.quality)}`,
      ...decision.effects.map((effect) => `- ${effect.systemLabel}: ${effect.from} → ${effect.to}${effect.note ? ` (${effect.note})` : ""}`),
      `- Report note: ${decision.reportNote || "—"}`,
      ""
    ]),
    "## Tasks",
    `- Total tracked: ${report.tasks.total}`,
    `- Completed: ${report.tasks.completed}`,
    ...(report.tasks.completedItems?.length ? ["- Completed items:", ...report.tasks.completedItems.map((task) => `  - ${task.label}${task.completedDay ? ` (closed Day ${task.completedDay})` : ""}`)] : []),
    ...(report.tasks.pending.length ? ["- Pending:", ...report.tasks.pending.map((task) => `  - ${task.label} (${dueLabel(task.dueDay)}${task.overdue ? ", overdue" : ""})`)] : ["- Pending: none"]),
    ...(report.tasks.overdue?.length ? ["- Overdue at close:", ...report.tasks.overdue.map((task) => `  - ${task.label} (${dueLabel(task.dueDay)})`)] : []),
    "",
    "## Strengths",
    ...report.strengths.map((item) => `- ${item}`),
    "",
    "## Improvements",
    ...report.improvements.map((item) => `- ${item}`),
    "",
    "## Learning recommendations",
    ...report.recommendations.map((item) => `- ${item.label}`),
    "",
    "## Assessment model",
    report.modelNote,
    "",
    "> Educational simulation. Not an official NASA product, not a real operational record, and not medical advice."
  ];
  return lines.join("\n");
}

export function renderReports({ data, store }) {
  const state = store.get();
  const missionState = state.mission;
  const mission = data.mission;
  if (!missionState.started) {
    return `
      ${pageHead({
        eyebrow: "Section H · Mission Reports",
        title: "Mission Reports",
        subtitle: "Daily and final mission records are generated from the fixed five-day simulation."
      })}
      ${emptyState({
        icon: "reports",
        title: "No mission record yet",
        body: "Start the mission simulation to generate daily reports and a final assessment. Reports are based on the decisions and tasks you actually record.",
        action: `<a class="btn btn-primary" href="#/mission">${icon("play", 16)} Open mission briefing</a>`
      })}
      ${disclaimer("Mission reports are educational simulation records. They are not official NASA documents or operational handovers.", "Simulation records")}`;
  }

  const ms = missionStats(missionState, mission);
  const finalReport = missionState.finalReport;
  const reports = mission.days.map((day) => ({ day, report: missionState.reports?.[day.day] || null }));
  const openTasks = pendingTasks(missionState);
  const overdue = overdueTasks(missionState);

  return `
    ${pageHead({
      eyebrow: "Section H · Mission Reports",
      title: "Mission Reports",
      subtitle: "A complete record of daily decisions, system status, tasks, and the final simulation assessment.",
      actions: `${finalReport ? `<button class="btn btn-secondary" type="button" data-action="download-final-report">${icon("download", 16)} Export final report</button>` : ""}`
    })}

    ${finalReport
      ? `<a class="final-outcome-banner ${missionOutcomeTone(finalReport.outcome.status)}" href="#/reports/final">
          <span class="outcome-score">${finalReport.score}<small>%</small></span>
          <span class="outcome-copy"><small>FINAL OUTCOME</small><strong>${esc(finalReport.outcome.label)}</strong><span>${esc(finalReport.outcome.summary)}</span></span>
          <span class="outcome-link">Open full report ${icon("arrow-right", 16)}</span>
        </a>`
      : `<div class="report-in-progress">
          <span class="report-progress-icon">${icon("orbit", 24)}</span>
          <div>
            <strong>Mission in progress · Day ${missionState.currentDay} of 5</strong>
            <p>${ms.decided} of ${ms.totalEvents} decisions are recorded. Daily reports are filed when you close each day. The final report unlocks after Day 5.</p>
          </div>
          <a class="btn btn-secondary btn-sm" href="#/mission/day/${missionState.currentDay}">Open current day ${icon("arrow-right", 14)}</a>
        </div>`}

    <section class="stat-row">
      ${statCard({ label: "Decisions recorded", value: `${ms.decided}<span class="stat-of">/ ${ms.totalEvents}</span>`, detail: `${ms.remaining} events remaining`, icon: "compass", tone: "cyan" })}
      ${statCard({ label: "Daily reports", value: `${reports.filter((item) => item.report).length}<span class="stat-of">/ 5</span>`, detail: "Generated at each day close", icon: "reports", tone: "blue" })}
      ${statCard({ label: "Open tasks", value: `${openTasks.length}`, detail: overdue.length ? `${overdue.length} overdue` : "None overdue", icon: "task", tone: overdue.length ? "rose" : "teal" })}
      ${statCard({ label: "Final report", value: finalReport ? `${finalReport.score}%` : "Locked", detail: finalReport ? finalReport.outcome.label : "Complete Day 5 to generate", icon: "target", tone: "amber" })}
    </section>

    <section class="reports-layout">
      <div class="reports-main">
        <article class="panel final-report-entry ${finalReport ? "is-ready" : "is-locked"}">
          <div class="final-entry-icon">${icon(finalReport ? "shield-check" : "lock", 30)}</div>
          <div class="final-entry-copy">
            <div class="panel-kicker">Final mission report</div>
            <h2>${finalReport ? esc(finalReport.outcome.label) : "Available after the final day"}</h2>
            <p>${finalReport ? esc(finalReport.outcome.summary) : "Close all five mission days to generate the integrated report, assessment breakdown, and learning recommendations."}</p>
            ${finalReport ? `<div class="final-entry-meta">${chip(`${finalReport.decisionCount} decisions`, "subtle", "compass")}${chip(`${finalReport.optimalCount} strongest options`, "subtle", "check-circle")}${chip(`${finalReport.highRiskCount} high-risk`, finalReport.highRiskCount ? "warning" : "success", "alert")}</div>` : ""}
          </div>
          ${finalReport
            ? `<a class="btn btn-primary" href="#/reports/final">${icon("file-text", 16)} Open report</a>`
            : `<a class="btn btn-ghost" href="#/mission">${icon("mission", 16)} Mission console</a>`}
        </article>

        <section>
          ${sectionHead({
            kicker: "Daily records",
            title: "Five-day report ledger",
            subtitle: "Each filed report is a snapshot of the mission state at the close of that day."
          })}
          <div class="report-ledger">
            ${reports.map(({ day, report }) => `
              ${report
                ? `<a class="report-ledger-row is-filed" href="#/reports/day/${day.day}">
                    <span class="report-ledger-day">DAY ${String(day.day).padStart(2, "0")}</span>
                    <span class="report-ledger-copy">
                      <small>${esc(day.codename)}</small>
                      <strong>${esc(day.title)}</strong>
                      <span>Filed ${formatDate(report.generatedAt, true)} · ${report.decisions.length} decisions · ${report.completedTasks.length} tasks closed</span>
                    </span>
                    <span class="report-ledger-state">${icon("check-circle", 18)} Filed</span>
                  </a>`
                : `<div class="report-ledger-row ${day.day === missionState.currentDay && missionState.status === "active" ? "is-current" : "is-locked"}">
                    <span class="report-ledger-day">DAY ${String(day.day).padStart(2, "0")}</span>
                    <span class="report-ledger-copy">
                      <small>${esc(day.codename)}</small>
                      <strong>${esc(day.title)}</strong>
                      <span>${missionState.status === "complete" ? "No report filed." : day.day === missionState.currentDay ? "In progress — complete the day to file the report." : "Locked until the mission reaches this day."}</span>
                    </span>
                    <span class="report-ledger-state">${missionState.status === "complete" ? icon("minus", 16) : icon("lock", 15)}</span>
                  </div>`}`).join("")}
          </div>
        </section>

        <section class="panel">
          ${sectionHead({
            kicker: "Mission record",
            title: "Decision ledger",
            subtitle: "The complete decision history available in this run."
          })}
          ${missionState.decisions.length
            ? `<div class="ledger-table">
                ${missionState.decisions.map((decision) => `
                  <a class="ledger-row" href="#/mission/day/${decision.day}">
                    <span class="ledger-day">D${String(decision.day).padStart(2, "0")}</span>
                    <span class="ledger-copy"><strong>${esc(decision.eventTitle)}</strong><small>${esc(decision.optionLabel)}</small></span>
                    <span class="quality-chip ${qualityTone(decision.quality)}">${esc(qualityLabel(decision.quality))}</span>
                  </a>`).join("")}
              </div>`
            : `<div class="mini-empty">No decisions have been recorded yet.</div>`}
        </section>
      </div>

      <aside class="reports-rail">
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("activity", 15)} Mission status</div>
          ${ring(ms.progressPercent, 104, 8, "recorded")}
          <div class="rail-stat-list">
            <div><span>Day</span><strong>${missionState.currentDay} / 5</strong></div>
            <div><span>Decisions</span><strong>${ms.decided} / ${ms.totalEvents}</strong></div>
            <div><span>Tasks completed</span><strong>${ms.taskCompleted} / ${ms.taskTotal}</strong></div>
            <div><span>Final score</span><strong>${finalReport ? `${finalReport.score}%` : "—"}</strong></div>
          </div>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("task", 15)} Open task summary</div>
          ${openTasks.length
            ? `<ul class="rail-task-list">${openTasks.slice(0, 6).map((task) => `<li><span>${esc(task.label)}</span><small>Due Day ${task.dueDay || "—"}</small></li>`).join("")}</ul>
               ${openTasks.length > 6 ? `<p class="micro-note">+${openTasks.length - 6} more open tasks.</p>` : ""}`
            : `<div class="mini-empty">No open tasks.</div>`}
          <a class="btn btn-sm btn-secondary btn-block" href="#/mission/day/${missionState.currentDay}">${icon("task", 14)} Manage tasks</a>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("info", 15)} Report status</div>
          <p class="micro-note">Reports are generated locally from your saved mission state. Export copies before resetting your progress if you want to keep a record.</p>
          ${finalReport ? `<button class="btn btn-ghost btn-block" type="button" data-action="download-final-report">${icon("download", 15)} Download final report</button>` : ""}
        </article>
      </aside>
    </section>

    ${disclaimer("Reports reflect a fictional educational simulation. They are not official NASA documents, operational handovers, or clinical records.", "Simulation records")}
  `;
}

export function renderDayReport({ data, store, dayNumber }) {
  const state = store.get();
  const dayNum = Number(dayNumber);
  const day = data.mission.days.find((item) => item.day === dayNum);
  const report = state.mission.reports?.[dayNum];
  if (!day) {
    return emptyState({
      title: "Report not found",
      body: "This day is not part of the mission scenario.",
      action: `<a class="btn btn-primary" href="#/reports">${icon("arrow-left", 16)} Back to reports</a>`
    });
  }
  if (!report) {
    return `
      <div class="breadcrumb"><a href="#/reports">${icon("arrow-left", 14)} Mission Reports</a><span>/</span><span>Day ${dayNum}</span></div>
      ${pageHead({ eyebrow: `Day ${dayNum} report`, title: day.title, subtitle: day.codename })}
      ${emptyState({
        icon: "reports",
        title: "Report not filed yet",
        body: state.mission.status === "complete"
          ? "No daily report was generated for this day."
          : "Close this mission day in the simulator to generate its report. Every scheduled decision must be recorded first.",
        action: `<a class="btn btn-primary" href="#/mission/day/${dayNum}">${icon("play", 16)} Open Day ${dayNum}</a><a class="btn btn-secondary" href="#/reports">All reports</a>`
      })}`;
  }

  const prev = dayNum > 1 ? dayNum - 1 : null;
  const next = dayNum < 5 ? dayNum + 1 : null;
  const nextReport = next && state.mission.reports?.[next];
  const tone = report.decisions.some((decision) => decision.quality === "high_risk") ? "warning" : "success";

  return `
    <div class="breadcrumb"><a href="#/reports">${icon("arrow-left", 14)} Mission Reports</a><span>/</span><span>Day ${dayNum} report</span></div>

    ${pageHead({
      eyebrow: `Daily report · ${day.codename}`,
      title: `Day ${dayNum}: ${day.title}`,
      subtitle: `Filed ${formatDate(report.generatedAt, true)}. This report is a snapshot of the mission state at the close of the day.`,
      actions: `
        <button class="btn btn-secondary" type="button" data-action="print-report">${icon("print", 16)} Print</button>
        <button class="btn btn-ghost" type="button" data-action="download-day-report" data-day="${dayNum}">${icon("download", 16)} Download</button>`
    })}

    <section class="report-hero">
      <div class="report-hero-main">
        <div class="eyebrow"><span class="eyebrow-dot"></span>DAILY MISSION REPORT</div>
        <h2>${esc(day.title)}</h2>
        <p>${esc(report.summary[0])}</p>
        <div class="report-hero-chips">
          ${chip(`${report.decisions.length} decisions`, "subtle", "compass")}
          ${chip(`${report.completedTasks.length} tasks closed`, "success", "check-circle")}
          ${chip(`${report.pendingTasks.length} pending`, report.pendingTasks.length ? "warning" : "subtle", "task")}
          ${chip(report.overdueTasks.length ? `${report.overdueTasks.length} overdue` : "No overdue tasks", report.overdueTasks.length ? "danger" : "success", "alert")}
        </div>
      </div>
      <div class="report-hero-side">
        ${ring(100, 94, 7, "filed")}
        <span class="report-seal">${icon("reports", 18)} Day ${dayNum} record</span>
      </div>
    </section>

    <section class="report-layout">
      <div class="report-main">
        <article class="panel">
          <div class="panel-kicker">${icon("file-text", 15)} Executive summary</div>
          <ul class="report-summary-list">${report.summary.map((line) => `<li>${icon("chevron-right", 13)}<span>${esc(line)}</span></li>`).join("")}</ul>
          <div class="report-prompt-box">
            <div class="panel-kicker">${icon("lightbulb", 14)} Reflection prompts</div>
            <ul>${report.reportPrompts.map((prompt) => `<li>${esc(prompt)}</li>`).join("")}</ul>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("compass", 15)} Decision history</div>
              <h2>${report.decisions.length} decisions recorded</h2>
            </div>
            <span class="badge-count">Day ${dayNum}</span>
          </div>
          <div class="report-decisions">
            ${report.decisions.map(decisionCard).join("")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-kicker">${icon("activity", 15)} System status at close</div>
          <h2>Qualitative readiness snapshot</h2>
          ${reportSystems(report.systems, data.mission)}
        </article>

        <article class="panel">
          <div class="panel-kicker">${icon("task", 15)} Task record</div>
          <h2>Work closed and carried forward</h2>
          ${reportTaskBlock(report)}
        </article>
      </div>

      <aside class="report-rail">
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("calendar", 15)} Report navigation</div>
          <div class="report-nav-links">
            ${prev ? `<a href="#/reports/day/${prev}">${icon("arrow-left", 14)} Day ${prev} report</a>` : ""}
            ${nextReport ? `<a href="#/reports/day/${next}">Day ${next} report ${icon("arrow-right", 14)}</a>` : next ? `<span class="is-muted">Day ${next} report not filed</span>` : `<a href="#/reports/final">Final report ${icon("arrow-right", 14)}</a>`}
            <a href="#/reports">${icon("list", 14)} All reports</a>
          </div>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("info", 15)} Assessment note</div>
          <p class="micro-note">Decision quality labels are revealed after each decision. The daily report does not produce a separate score; the final assessment uses decision quality, task completion, and qualitative readiness.</p>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("flag", 15)} Mission status</div>
          <div class="rail-stat-list">
            <div><span>Report day</span><strong>${dayNum} / 5</strong></div>
            <div><span>Quality signal</span><strong>${tone === "success" ? "No high-risk calls" : "High-risk call recorded"}</strong></div>
            <div><span>Filed</span><strong>${formatDate(report.generatedAt)}</strong></div>
          </div>
        </article>
      </aside>
    </section>

    ${disclaimer("This daily report is a fictional educational record. It is not an operational mission report and does not contain real crew or station data.", "Simulation record")}
  `;
}

export function renderFinalReport({ data, store }) {
  const state = store.get();
  const missionState = state.mission;
  const report = missionState.finalReport;
  if (!report) {
    return `
      ${pageHead({
        eyebrow: "Final report · Locked",
        title: "Final Mission Report",
        subtitle: "The integrated report is generated after all five mission days are complete."
      })}
      ${emptyState({
        icon: "lock",
        title: missionState.started ? `Day ${missionState.currentDay} of 5 in progress` : "Mission not started",
        body: missionState.started
          ? "Record every decision, close each day, and generate the final report from Day 5. The report will include the assessment, decision history, tasks, and learning recommendations."
          : "Start the five-day simulation to build a mission record.",
        action: missionState.started
          ? `<a class="btn btn-primary" href="#/mission/day/${missionState.currentDay}">${icon("play", 16)} Open current day</a><a class="btn btn-secondary" href="#/reports">All reports</a>`
          : `<a class="btn btn-primary" href="#/mission">${icon("play", 16)} Open mission briefing</a>`
      })}`;
  }

  const headerActions = `
    <button class="btn btn-secondary" type="button" data-action="print-report">${icon("print", 16)} Print</button>
    <button class="btn btn-secondary" type="button" data-action="download-final-report">${icon("download", 16)} Download</button>
    <button class="btn btn-ghost" type="button" data-action="restart-mission">${icon("rotate", 16)} Restart</button>`;

  return `
    <div class="breadcrumb"><a href="#/reports">${icon("arrow-left", 14)} Mission Reports</a><span>/</span><span>Final report</span></div>
    ${pageHead({
      eyebrow: "Section H · Final mission report",
      title: data.mission.final_report?.title || "Final Mission Report",
      subtitle: `Generated ${formatDate(report.generatedAt, true)} · ${report.decisions.length} decisions · ${report.tasks.completed}/${report.tasks.total} tasks complete`,
      actions: headerActions
    })}

    <section class="final-hero ${missionOutcomeTone(report.outcome.status)}">
      <div class="final-hero-score">
        <span class="final-score-value">${report.score}<small>%</small></span>
        <span class="final-score-label">Simulation assessment</span>
      </div>
      <div class="final-hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>FINAL OUTCOME</div>
        <h2>${esc(report.outcome.label)}</h2>
        <p>${esc(report.outcome.summary)}</p>
        <div class="final-hero-chips">
          ${chip(`${report.optimalCount} strongest options`, "success", "check-circle")}
          ${chip(`${report.highRiskCount} high-risk decisions`, report.highRiskCount ? "warning" : "subtle", "alert")}
          ${chip(`${report.tasks.completed} tasks closed`, "subtle", "task")}
          ${report.capped ? chip("Outcome capped · critical system", "danger", "shield") : chip("No cap applied", "success", "shield-check")}
        </div>
      </div>
      <div class="final-hero-medal tone-${report.outcome.status === "excellent" ? "amber" : report.outcome.status === "success" ? "cyan" : report.outcome.status === "conditional" ? "violet" : "rose"}">
        <div class="medal-glow"></div>
        <div class="medal-core">${icon(report.outcome.status === "review" ? "alert" : "award", 38)}</div>
        <span class="medal-tier">Mission outcome</span>
      </div>
    </section>

    ${report.capped ? `<div class="cap-warning">${icon("alert", 17)} <div><strong>Outcome cap applied.</strong> A monitored system ended CRITICAL, so the final outcome is limited to Conditional Mission under the scenario's proposed assessment model.</div></div>` : ""}

    <section class="stat-row">
      ${statCard({ label: "Decision quality", value: `${report.breakdown.decisionScore}%`, detail: `${report.breakdown.weights.decision_quality}% assessment weight`, icon: "compass", tone: "cyan" })}
      ${statCard({ label: "Task completion", value: `${report.breakdown.taskScore}%`, detail: `${report.tasks.completed} of ${report.tasks.total} tasks`, icon: "task", tone: "teal" })}
      ${statCard({ label: "Crew readiness", value: `${report.breakdown.readinessScore}%`, detail: `${report.breakdown.weights.crew_readiness}% assessment weight`, icon: "activity", tone: "violet" })}
      ${statCard({ label: "High-risk decisions", value: `${report.highRiskCount}`, detail: report.highRiskCount ? "Review the decision notes" : "None recorded", icon: "alert", tone: report.highRiskCount ? "rose" : "amber" })}
    </section>

    <section class="final-review-grid">
      <div class="final-review-main">
        <article class="panel">
          <div class="panel-kicker">${icon("activity", 15)} Assessment breakdown</div>
          <h2>How the simulation score was built</h2>
          <div class="score-breakdown">
            <div class="score-row">
              <span>Decision quality <small>${report.breakdown.weights.decision_quality}% weight</small></span>
              <div class="score-bar">${progressBar(report.breakdown.decisionScore)}</div>
              <strong>${report.breakdown.decisionScore}%</strong>
            </div>
            <div class="score-row">
              <span>Task completion <small>${report.breakdown.weights.task_completion}% weight</small></span>
              <div class="score-bar">${progressBar(report.breakdown.taskScore)}</div>
              <strong>${report.breakdown.taskScore}%</strong>
            </div>
            <div class="score-row">
              <span>Crew readiness <small>${report.breakdown.weights.crew_readiness}% weight</small></span>
              <div class="score-bar">${progressBar(report.breakdown.readinessScore)}</div>
              <strong>${report.breakdown.readinessScore}%</strong>
            </div>
          </div>
          <div class="model-note">${icon("info", 15)} <p>${esc(report.modelNote)}</p></div>
        </article>

        <article class="panel">
          <div class="panel-kicker">${icon("activity", 15)} System readiness at close</div>
          <h2>Final qualitative status</h2>
          ${reportSystems(report.statuses, data.mission)}
          ${report.criticalSystems.length ? `<div class="cap-warning compact">${icon("alert", 15)} Critical at close: ${report.criticalSystems.map((item) => esc(item)).join(", ")}.</div>` : ""}
        </article>

        <article class="panel">
          ${sectionHead({
            kicker: "Five-day timeline",
            title: "Mission summary by day",
            subtitle: "A compact view of decisions, strongest options, and high-risk calls across the scenario."
          })}
          <div class="final-days">
            ${report.daySummaries.map((day) => `
              <div class="final-day-row">
                <span class="final-day-index">${String(day.day).padStart(2, "0")}</span>
                <div class="final-day-copy">
                  <strong>${esc(day.title)}</strong>
                  <span>${day.decisions} decisions · ${day.optimal} strongest · ${day.highRisk} high-risk</span>
                  ${day.notes.length ? `<ul>${day.notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>` : ""}
                </div>
                <a class="btn btn-sm btn-ghost" href="#/reports/day/${day.day}">${icon("reports", 14)} Report</a>
              </div>`).join("")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-kicker">${icon("list", 15)} Full decision history</div>
          <h2>Every recorded decision</h2>
          <div class="report-decisions">
            ${report.decisions.map(decisionCard).join("")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-kicker">${icon("task", 15)} Task ledger</div>
          <h2>${report.tasks.completed} of ${report.tasks.total} tracked tasks completed</h2>
          <div class="report-task-columns">
            <div class="report-task-block">
              <h3>${icon("check-circle", 16)} Completed</h3>
              ${report.tasks.completedItems?.length
                ? `<ul class="report-task-list is-done">${report.tasks.completedItems.map((task) => `<li>${icon("check", 13)}<span>${esc(task.label)}</span><small>${task.completedDay ? `Day ${task.completedDay}` : "Closed"}</small></li>`).join("")}</ul>`
                : `<div class="mini-empty">No tasks were completed in this run.</div>`}
            </div>
            <div class="report-task-block">
              <h3>${icon("clock", 16)} Open at close</h3>
              ${report.tasks.pending.length
                ? `<ul class="report-task-list">${report.tasks.pending.map((task) => `<li class="${task.overdue ? "is-overdue" : ""}">${icon(task.overdue ? "alert" : "clock", 13)}<span>${esc(task.label)}</span><small>${dueLabel(task.dueDay)}${task.overdue ? " · overdue" : ""}</small></li>`).join("")}</ul>`
                : `<div class="mini-empty">No pending tasks remain in the final record.</div>`}
            </div>
          </div>
          ${report.tasks.overdue?.length ? `<div class="report-overdue">${icon("alert", 15)} <strong>${report.tasks.overdue.length} overdue at close:</strong> ${report.tasks.overdue.map((task) => `${esc(task.label)} (${dueLabel(task.dueDay)})`).join("; ")}</div>` : ""}
          ${report.tasks.pending.length === 0 && report.tasks.total > 0 ? `<div class="completion-note">${icon("check-circle", 18)}<div><strong>All tracked tasks were completed.</strong><span>No pending or overdue items remain in the final record.</span></div></div>` : ""}
        </article>
      </div>

      <aside class="final-review-rail">
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("shield-check", 15)} Strengths</div>
          <ul class="review-list">${report.strengths.map((item) => `<li>${icon("check-circle", 14)}<span>${esc(item)}</span></li>`).join("")}</ul>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("target", 15)} Improvement areas</div>
          <ul class="review-list is-warning">${report.improvements.map((item) => `<li>${icon("alert", 14)}<span>${esc(item)}</span></li>`).join("")}</ul>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("academy", 15)} Learning recommendations</div>
          <div class="recommendation-list">
            ${report.recommendations.map((item) => `
              <a class="recommendation-row" href="#/academy/${item.courseId}">
                <span class="mini-course-icon tone-cyan">${icon("book-open", 16)}</span>
                <span><strong>${esc(item.label)}</strong><small>Review the Academy course</small></span>
                ${icon("arrow-right", 14)}
              </a>`).join("")}
          </div>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("flag", 15)} Report controls</div>
          <div class="rail-action-stack">
            <button class="btn btn-secondary btn-block" type="button" data-action="download-final-report">${icon("download", 15)} Download Markdown</button>
            <button class="btn btn-ghost btn-block" type="button" data-action="print-report">${icon("print", 15)} Print report</button>
            <button class="btn btn-ghost btn-block" type="button" data-action="restart-mission">${icon("rotate", 15)} Restart mission</button>
          </div>
          <p class="micro-note">Restarting preserves Academy progress, achievements, library reads, and Mars exploration steps. Mission decisions and reports are reset.</p>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("info", 15)} Report coverage</div>
          <ul class="coverage-list">
            ${(data.mission.final_report?.sections || []).map((section) => `<li>${icon("check", 13)} ${esc(section)}</li>`).join("")}
          </ul>
        </article>
      </aside>
    </section>

    ${disclaimer(esc(data.mission.meta.disclaimer), "Fictional educational simulation")}
  `;
}

export function getDayReportMarkdown(data, store, dayNumber) {
  const report = store.get().mission.reports?.[Number(dayNumber)];
  return report ? dayReportMarkdown(report) : null;
}

export function getFinalReportMarkdown(store) {
  const report = store.get().mission.finalReport;
  return report ? finalReportMarkdown(report) : null;
}

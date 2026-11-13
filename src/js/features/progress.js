import { academyStats, challengeUnlocked, courseProgress, nextAcademyAction } from "../academy-engine.js";
import { achievementStats } from "../achievements.js";
import { courseMiniRow } from "../components/cards.js";
import { icon } from "../components/icons.js";
import {
  chip,
  disclaimer,
  pageHead,
  progressBar,
  ring,
  statCard
} from "../components/ui.js";
import { missionOutcomeTone, missionStats, pendingTasks } from "../mission-engine.js";
import { esc, formatDate, percent, timeAgo } from "../utils.js";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function activityIcon(type) {
  return {
    lesson: "book-open",
    quiz: "target",
    activity: "flask",
    practical: "flask",
    assessment: "award",
    challenge: "award",
    course: "academy",
    library: "library",
    mars: "mars",
    "mars-check": "mars",
    mission: "rocket",
    "mission-decision": "compass",
    "mission-day": "reports",
    task: "task"
  }[type] || "activity";
}

function activityRow(item) {
  const inner = `
    <span class="activity-icon">${icon(activityIcon(item.type), 16)}</span>
    <span class="activity-copy"><strong>${esc(item.label)}</strong><small>${timeAgo(item.at)}</small></span>
    ${item.href ? icon("arrow-right", 14) : ""}`;
  return item.href
    ? `<a class="activity-row" href="${esc(item.href)}">${inner}</a>`
    : `<div class="activity-row">${inner}</div>`;
}

export function renderProgress({ data, store }) {
  const state = store.get();
  const academy = academyStats(state, data.academy);
  const badges = achievementStats(state);
  const mStats = missionStats(state.mission, data.mission);
  const finalReport = state.mission.finalReport;
  const totalArticles = data.library.categories.reduce((sum, category) => sum + category.articles.length, 0);
  const readCount = Object.keys(state.libraryRead || {}).length;
  const libraryPercent = percent(readCount, totalArticles);
  const challengePercent = state.academy.challenge.passed ? 100 : 0;
  const missionPercent = state.mission.status === "complete" ? 100 : state.mission.started ? mStats.progressPercent : 0;
  const overall = Math.round((academy.average + challengePercent + missionPercent + badges.percent + libraryPercent) / 5);
  const next = nextAcademyAction(state, data.academy);
  const storage = store.getStorageInfo();
  const openTasks = pendingTasks(state.mission);
  const atRisk = Object.values(state.mission.systems).filter((status) => status !== "nominal").length;
  const challengeReady = challengeUnlocked(state, data.academy);
  const completedReports = Object.keys(state.mission.reports || {}).length;

  const components = [
    { label: "Academy course progress", value: academy.average, tone: "cyan", detail: `${academy.completed}/${academy.totalCourses} courses complete` },
    { label: "Final Training Challenge", value: challengePercent, tone: "amber", detail: state.academy.challenge.passed ? `Passed with ${state.academy.challenge.bestScore}%` : challengeReady ? "Unlocked · not yet passed" : "Locked until six courses complete" },
    { label: "Mission decisions", value: missionPercent, tone: "blue", detail: state.mission.started ? `${mStats.decided}/${mStats.totalEvents} decisions` : "Mission not started" },
    { label: "Achievements", value: badges.percent, tone: "violet", detail: `${badges.earned}/${badges.total} earned` },
    { label: "Library reading", value: libraryPercent, tone: "teal", detail: `${readCount}/${totalArticles} briefs read` }
  ];

  return `
    ${pageHead({
      eyebrow: "Section F · My Progress",
      title: "My Progress",
      subtitle: "A transparent record of your Academy training, mission decisions, reading, and achievements. All progress is stored locally in this browser.",
      actions: `
        <button class="btn btn-secondary" type="button" data-action="export-progress">${icon("download", 16)} Export progress</button>
        <button class="btn btn-ghost" type="button" data-action="reset-progress">${icon("trash", 16)} Reset all</button>`
    })}

    <section class="progress-hero">
      <div class="progress-hero-main">
        ${ring(overall, 142, 9, "overall")}
        <div class="progress-hero-copy">
          <div class="kicker">Platform completion index</div>
          <h2>${overall === 100 ? "Every tracked pathway is complete." : overall >= 60 ? "You are building a full training record." : overall > 0 ? "Your journey has started." : "Begin with the Academy or the mission briefing."}</h2>
          <p>This index averages five local progress signals so the dashboard has one orientation number. It is a platform progress indicator, not an official readiness score or astronaut qualification.</p>
          <div class="progress-components">
            ${components.map((component) => `
              <div class="progress-component">
                <div class="progress-component-head"><span>${esc(component.label)}</span><strong>${component.value}%</strong></div>
                ${progressBar(component.value, component.tone)}
                <small>${esc(component.detail)}</small>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <section class="stat-row">
      ${statCard({ label: "Courses complete", value: `${academy.completed}<span class="stat-of">/ ${academy.totalCourses}</span>`, detail: `${academy.modulesComplete}/${academy.totalModules} modules`, icon: "academy", tone: "cyan", href: "#/academy" })}
      ${statCard({ label: "Mission record", value: state.mission.started ? `${mStats.decided}<span class="stat-of">/ ${mStats.totalEvents}</span>` : "—", detail: finalReport ? finalReport.outcome.label : state.mission.started ? `Day ${state.mission.currentDay} · ${openTasks.length} open tasks` : "Not started", icon: "mission", tone: "blue", href: "#/mission" })}
      ${statCard({ label: "Achievements", value: `${badges.earned}<span class="stat-of">/ ${badges.total}</span>`, detail: `${badges.percent}% of badge cabinet`, icon: "achievements", tone: "amber", href: "#/achievements" })}
      ${statCard({ label: "Library read", value: `${readCount}<span class="stat-of">/ ${totalArticles}</span>`, detail: `${data.library.categories.length} categories`, icon: "library", tone: "teal", href: "#/library" })}
    </section>

    <section class="progress-layout">
      <div class="progress-main">
        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("academy", 15)} Academy pathway</div>
              <h2>Six courses · ${academy.completed} complete</h2>
            </div>
            <a class="btn btn-sm btn-secondary" href="${next.href}">${esc(next.label)} ${icon("arrow-right", 14)}</a>
          </div>
          <div class="course-mini-list">
            ${data.academy.courses.map((course) => courseMiniRow(course, state)).join("")}
          </div>
          <div class="progress-note-row">
            <span>${icon("info", 14)} Course completion requires all five modules, a submitted practical, and a passing final assessment.</span>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("mission", 15)} Mission simulator</div>
              <h2>${state.mission.started ? `Day ${state.mission.currentDay} of 5` : "Mission not started"}</h2>
            </div>
            <a class="btn btn-sm btn-secondary" href="${finalReport ? "#/reports/final" : "#/mission"}">${finalReport ? "Final report" : "Open mission"} ${icon("arrow-right", 14)}</a>
          </div>
          ${state.mission.started ? `
            <div class="mission-progress-banner">
              <div>
                <span class="kicker">${finalReport ? "Final outcome" : "Current phase"}</span>
                <strong>${esc(finalReport ? finalReport.outcome.label : state.mission.phase)}</strong>
                <small>${finalReport ? `Score ${finalReport.score}% · ${completedReports} daily reports filed` : `${mStats.decided} of ${mStats.totalEvents} decisions recorded`}</small>
              </div>
              ${finalReport
                ? `<span class="outcome-chip ${missionOutcomeTone(finalReport.outcome.status)}">${esc(finalReport.outcome.label)}</span>`
                : `<span class="badge-count">${mStats.remaining} events remaining</span>`}
            </div>
            <div class="mission-day-progress">
              ${data.mission.days.map((day) => {
                const report = state.mission.reports?.[day.day];
                const isCurrent = day.day === state.mission.currentDay && state.mission.status === "active";
                return `<a class="mission-progress-day ${report ? "is-complete" : ""} ${isCurrent ? "is-current" : ""}" href="#/mission/day/${day.day}">
                  <span>${String(day.day).padStart(2, "0")}</span>
                  <strong>${esc(day.codename)}</strong>
                  <small>${report ? "Report filed" : isCurrent ? "In progress" : state.mission.status === "complete" ? "Complete" : "Locked"}</small>
                </a>`;
              }).join("")}
            </div>
            <div class="progress-metric-row">
              <div><span>Decisions</span><strong>${mStats.decided} / ${mStats.totalEvents}</strong></div>
              <div><span>Tasks closed</span><strong>${mStats.taskCompleted} / ${mStats.taskTotal}</strong></div>
              <div><span>Open tasks</span><strong>${openTasks.length}</strong></div>
              <div><span>Systems off nominal</span><strong>${atRisk} / 9</strong></div>
            </div>` : `
            <div class="mini-empty">Start the five-day mission to build a decision record. Mission progress is tracked separately from the Academy.</div>`}
        </article>

        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("award", 15)} Capstone challenge</div>
              <h2>${state.academy.challenge.passed ? "Junior Astronaut badge earned" : challengeReady ? "Final Training Challenge unlocked" : "Final Training Challenge locked"}</h2>
            </div>
            <a class="btn btn-sm btn-ghost" href="#/academy/challenge">${state.academy.challenge.passed ? "Review challenge" : "Open challenge"} ${icon("arrow-right", 14)}</a>
          </div>
          <div class="challenge-progress-row">
            <div>
              <p>${state.academy.challenge.passed ? `Your best integrated challenge score is ${state.academy.challenge.bestScore}%. The Crew Readiness Brief is saved with your record.` : "All six courses, including practicals and final assessments, must be complete before this capstone unlocks."}</p>
              <div class="challenge-meta">
                ${chip(`${academy.completed}/6 courses`, academy.completed === 6 ? "success" : "subtle", academy.completed === 6 ? "check-circle" : "lock")}
                ${chip(state.academy.challenge.attempts ? `${state.academy.challenge.attempts} attempt${state.academy.challenge.attempts === 1 ? "" : "s"}` : "No attempts", "subtle", "rotate")}
                ${state.academy.challenge.bestScore !== null ? chip(`Best ${state.academy.challenge.bestScore}%`, "subtle", "target") : ""}
              </div>
            </div>
            ${progressBar(state.academy.challenge.passed ? 100 : challengePercent, "amber")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-head-row">
            <div>
              <div class="panel-kicker">${icon("activity", 15)} Activity log</div>
              <h2>Recent training activity</h2>
            </div>
            <span class="badge-count">${state.activity.length} recent events</span>
          </div>
          ${state.activity.length
            ? `<div class="activity-list">${state.activity.slice(0, 18).map(activityRow).join("")}</div>`
            : `<div class="mini-empty">No activity recorded yet. Complete a lesson, submit a quiz, or open the mission to start the log.</div>`}
        </article>
      </div>

      <aside class="progress-rail">
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("database", 15)} Data & progress</div>
          <p class="micro-note">Educational content is loaded from the JSON data files. Your progress is stored separately in this browser under <code>${esc(storage.key)}</code>.</p>
          <div class="storage-meter">
            <div><span>Local storage</span><strong>${formatBytes(storage.bytes)}</strong></div>
            ${progressBar(Math.min(100, Math.round((storage.bytes / 5_000_000) * 100)))}
            <small>${storage.available ? "Persistence available" : "Persistence unavailable — progress may not survive a reload."}</small>
          </div>
          <div class="rail-action-stack">
            <button class="btn btn-secondary btn-block" type="button" data-action="export-progress">${icon("download", 15)} Export progress JSON</button>
            <button class="btn btn-ghost btn-block" type="button" data-action="import-progress">${icon("upload", 15)} Import progress</button>
            <button class="btn btn-danger-ghost btn-block" type="button" data-action="reset-progress">${icon("trash", 15)} Reset all progress</button>
          </div>
        </article>

        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("target", 15)} Learning snapshot</div>
          <div class="rail-stat-list">
            <div><span>Lessons complete</span><strong>${academy.lessons} / ${academy.totalLessons}</strong></div>
            <div><span>Modules complete</span><strong>${academy.modulesComplete} / ${academy.totalModules}</strong></div>
            <div><span>Practical submissions</span><strong>${data.academy.courses.filter((course) => courseProgress(state, course).practicalDone).length} / 6</strong></div>
            <div><span>Final assessments passed</span><strong>${data.academy.courses.filter((course) => courseProgress(state, course).finalPassed).length} / 6</strong></div>
            <div><span>Mission reports filed</span><strong>${completedReports} / 5</strong></div>
          </div>
        </article>

        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("shield-check", 15)} Saved record</div>
          <div class="rail-stat-list">
            <div><span>Record created</span><strong>${formatDate(state.createdAt)}</strong></div>
            <div><span>Last updated</span><strong>${formatDate(state.updatedAt, true)}</strong></div>
            <div><span>Badges recorded</span><strong>${badges.earned} / ${badges.total}</strong></div>
            <div><span>Progress version</span><strong>v${state.version}</strong></div>
          </div>
          <a class="btn btn-sm btn-ghost btn-block" href="#/achievements">${icon("achievements", 14)} Open badge cabinet</a>
        </article>

        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("info", 15)} Content provenance</div>
          <p class="micro-note">The Academy, mission, and Science Library are separate content datasets. Their platform-edition status is documented below.</p>
          <details class="source-details">
            <summary>View dataset notes</summary>
            <div><strong>Academy</strong><p>${esc(data.academy.meta.content_status)}</p></div>
            <div><strong>Mission</strong><p>${esc(data.mission.meta.content_status)}</p></div>
            <div><strong>Science Library</strong><p>${esc(data.library.meta.content_status)}</p></div>
          </details>
        </article>
      </aside>
    </section>

    ${disclaimer("Progress is stored only in this browser unless you export it. The platform is not an official NASA product and does not confer a real qualification or readiness certification.", "Local progress record")}
  `;
}

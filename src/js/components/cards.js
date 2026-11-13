import { courseProgress, coursePhase } from "../academy-engine.js";
import { icon } from "./icons.js";
import { chip, progressBar, ring } from "./ui.js";
import { esc } from "../utils.js";

export function courseCard(course, state) {
  const progress = courseProgress(state, course);
  const phase = coursePhase(state, course);
  const earnedBadge = Boolean(state.badges?.[course.badge.id]);
  return `
    <a class="course-card accent-${esc(course.accent)} ${progress.complete ? "is-complete" : ""}" href="#/academy/${course.id}">
      <div class="course-glow"></div>
      <div class="course-top">
        <div class="course-icon">${icon(course.icon, 24)}</div>
        <div class="course-code">COURSE ${String(course.number).padStart(2, "0")}</div>
        ${earnedBadge ? `<span class="course-badge-mark" title="Course badge earned">${icon("award", 16)}</span>` : ""}
      </div>
      <h3>${esc(course.title)}</h3>
      <p>${esc(course.tagline)}</p>
      <div class="course-tags">
        ${course.modules.slice(0, 3).map((module) => chip(module.title.split(" ").slice(0, 2).join(" "), "subtle")).join("")}
        <span class="chip chip-subtle">+${course.modules.length - 3} modules</span>
      </div>
      <div class="course-progress">
        <div class="course-progress-head">
          <span>${esc(phase)}</span>
          <strong>${progress.percent}%</strong>
        </div>
        ${progressBar(progress.percent)}
        <div class="course-progress-meta">
          <span>${progress.modulesComplete}/${progress.totalModules} modules</span>
          <span>${progress.finalPassed ? "Final passed" : progress.practicalDone ? "Practical submitted" : "Practical pending"}</span>
        </div>
      </div>
      <div class="course-cta">
        <span>${progress.complete ? "Review course" : progress.percent ? "Continue training" : "Begin course"}</span>
        ${icon("arrow-right", 16)}
      </div>
    </a>`;
}

export function missionDayCard(day, state, mission) {
  const unlocked = state.mission.started && (day.day <= state.mission.currentDay || state.mission.status === "complete");
  const report = state.mission.reports?.[day.day];
  const isCurrent = state.mission.started && state.mission.status === "active" && day.day === state.mission.currentDay;
  const complete = Boolean(report);
  const inner = `
    <span class="day-card-index">${String(day.day).padStart(2, "0")}</span>
    <div class="day-card-copy">
      <span class="day-card-code">${esc(day.codename)}</span>
      <h4>${esc(day.title)}</h4>
      <span class="day-card-meta">${day.events.length} events ${complete ? "· report filed" : isCurrent ? "· in progress" : unlocked ? "· available" : "· locked"}</span>
    </div>
    <span class="day-card-status">${complete ? icon("check-circle", 18) : unlocked ? icon("chevron-right", 18) : icon("lock", 18)}</span>`;
  if (unlocked) {
    return `<a class="day-card ${complete ? "is-complete" : ""} ${isCurrent ? "is-current" : ""}" href="#/mission/day/${day.day}">${inner}</a>`;
  }
  return `<button class="day-card is-locked" type="button" data-action="locked-day" data-day="${day.day}">${inner}</button>`;
}

export function compactBadge(achievement, earned, earnedAt = null) {
  return `
    <button class="achievement-compact ${earned ? "is-earned" : "is-locked"}" type="button" data-action="open-achievement" data-achievement="${achievement.id}" aria-label="${esc(achievement.name)} ${earned ? "earned" : "locked"}">
      <span class="achievement-medal tone-${achievement.accent}">${icon(achievement.icon, 20)}</span>
      <span>
        <strong>${esc(achievement.name)}</strong>
        <small>${earned ? (earnedAt ? `Earned ${new Date(earnedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : "Earned") : esc(achievement.criteria)}</small>
      </span>
      ${earned ? icon("check-circle", 17) : icon("lock", 15)}
    </button>`;
}

export function courseMiniRow(course, state) {
  const progress = courseProgress(state, course);
  return `
    <a class="mini-course-row" href="#/academy/${course.id}">
      <span class="mini-course-icon tone-${course.accent}">${icon(course.icon, 18)}</span>
      <span class="mini-course-copy">
        <strong>${esc(course.short_title)}</strong>
        <small>${progress.modulesComplete}/${progress.totalModules} modules · ${progress.finalPassed ? "assessment passed" : "assessment pending"}</small>
      </span>
      ${ring(progress.percent, 42, 4)}
    </a>`;
}

import { ACHIEVEMENTS } from "./achievements.js";
import { initAmbient } from "./cursor.js";
import { loadPlatformData } from "./data.js";
import { renderLayout } from "./components/layout.js";
import { icon } from "./components/icons.js";
import { closeModal, confirmModal, openModal, toast } from "./components/ui.js";
import { renderHome } from "./features/home.js";
import { renderAcademy, renderAssessment, renderChallenge, renderCourse, renderModule } from "./features/academy.js";
import { renderMission, renderMissionDay } from "./features/mission.js";
import { renderMars } from "./features/mars.js";
import { renderLibrary, renderLibraryArticle } from "./features/library.js";
import { renderProgress } from "./features/progress.js";
import { achievementDestination, renderAchievements } from "./features/achievements.js";
import { getDayReportMarkdown, getFinalReportMarkdown, renderDayReport, renderFinalReport, renderReports } from "./features/reports.js";
import { createStore } from "./store.js";
import { dayComplete, eventsForDay, pendingTasks } from "./mission-engine.js";
import {
  downloadFile,
  esc,
  formatDate,
  navigate,
  parseHash,
  readFileAsText,
  wordCount
} from "./utils.js";

const app = document.getElementById("app");
let data = null;
let store = null;
let currentRouteKey = "";
let autoReadTimer = null;
let libraryQuery = "";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ensureGlobalRoots() {
  if (!document.getElementById("toast-root")) {
    const toastRoot = document.createElement("div");
    toastRoot.id = "toast-root";
    toastRoot.className = "toast-root";
    toastRoot.setAttribute("aria-live", "polite");
    toastRoot.setAttribute("aria-atomic", "false");
    document.body.appendChild(toastRoot);
  }
  if (!document.getElementById("modal-root")) {
    const modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  }
  if (!document.getElementById("starfield")) {
    const starfield = document.createElement("canvas");
    starfield.id = "starfield";
    starfield.setAttribute("aria-hidden", "true");
    document.body.appendChild(starfield);
  }
  if (!document.getElementById("cursor")) {
    const cursor = document.createElement("div");
    cursor.id = "cursor";
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="cursor-ring"></span><span class="cursor-dot"></span>';
    document.body.appendChild(cursor);
  }
  if (!document.getElementById("cursor-trail")) {
    const trail = document.createElement("canvas");
    trail.id = "cursor-trail";
    trail.className = "cursor-trail";
    trail.setAttribute("aria-hidden", "true");
    document.body.appendChild(trail);
  }
}

function findArticle(articleId) {
  if (!data) return null;
  for (const category of data.library.categories) {
    const article = category.articles.find((item) => item.id === articleId);
    if (article) return article;
  }
  return null;
}

function notFound() {
  return `
    <header class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>Navigation</div>
        <h1 class="display-title">Page not found</h1>
        <p class="lede">The requested route does not exist in the Junior Astronaut Training Platform.</p>
      </div>
    </header>
    <div class="empty-state">
      <div class="empty-orbit">${icon("orbit", 34)}</div>
      <h3>Lost in orbit</h3>
      <p>Use the navigation to return to a working section of the platform.</p>
      <div class="empty-action"><a class="btn btn-primary" href="#/home">${icon("home", 16)} Return to Command Center</a></div>
    </div>`;
}

function resolveRoute(route) {
  const [section, a, b, c] = route.segments;
  const state = store.get();

  if (!section || section === "home") {
    return { content: renderHome({ data, store }), title: "Command Center" };
  }

  if (section === "academy") {
    if (!a) return { content: renderAcademy({ data, store }), title: "Astronaut Academy" };
    if (a === "challenge") return { content: renderChallenge({ data, store, query: route.query }), title: "Final Training Challenge" };
    if (b === "assessment") {
      const course = data.academy.courses.find((item) => item.id === a);
      return { content: renderAssessment({ data, store, courseId: a, query: route.query }), title: course ? `${course.short_title} · Final Assessment` : "Final Assessment" };
    }
    if (b === "module" && c) {
      const course = data.academy.courses.find((item) => item.id === a);
      const module = course?.modules.find((item) => item.id === c);
      return {
        content: renderModule({ data, store, courseId: a, moduleId: c, query: route.query }),
        title: course && module ? `${course.short_title} · ${module.title}` : "Academy Module"
      };
    }
    const course = data.academy.courses.find((item) => item.id === a);
    return { content: renderCourse({ data, store, courseId: a }), title: course ? course.title : "Academy Course" };
  }

  if (section === "mission") {
    if (a === "day" && b) {
      const dayNum = Number(b);
      const day = data.mission.days.find((item) => item.day === dayNum);
      return { content: renderMissionDay({ data, store, dayNumber: dayNum }), title: day ? `Day ${dayNum} · ${day.title}` : "Mission Day" };
    }
    const title = state.mission.status === "complete" ? "Mission Complete" : state.mission.started ? `Mission Day ${state.mission.currentDay}` : "Mission Briefing";
    return { content: renderMission({ data, store }), title };
  }

  if (section === "mars") {
    return { content: renderMars({ data, store }), title: "Mars Exploration Center" };
  }

  if (section === "library") {
    if (a) {
      const article = findArticle(a);
      return { content: renderLibraryArticle({ data, store, articleId: a }), title: article ? article.title : "Science Library" };
    }
    return { content: renderLibrary({ data, store, query: route.query }), title: "Science Library" };
  }

  if (section === "progress") {
    return { content: renderProgress({ data, store }), title: "My Progress" };
  }

  if (section === "achievements") {
    return { content: renderAchievements({ data, store }), title: "Achievement Cabinet" };
  }

  if (section === "reports") {
    if (a === "day" && b) {
      const dayNum = Number(b);
      const day = data.mission.days.find((item) => item.day === dayNum);
      return { content: renderDayReport({ data, store, dayNumber: dayNum }), title: day ? `Day ${dayNum} Report` : "Mission Report" };
    }
    if (a === "final") {
      return { content: renderFinalReport({ data, store }), title: "Final Mission Report" };
    }
    return { content: renderReports({ data, store }), title: "Mission Reports" };
  }

  return { content: notFound(), title: "Page Not Found" };
}

function updateQuizProgress(form) {
  if (!form) return;
  const cards = [...form.querySelectorAll(".question-card")];
  if (!cards.length) return;
  const answered = cards.filter((card) => card.querySelector('input[type="radio"]:checked')).length;
  const target = form.querySelector("[data-quiz-progress]");
  if (target) target.textContent = `${answered} / ${cards.length} answered`;
}

function updateWordCounter(field) {
  const form = field.closest("form");
  const container = field.closest(".challenge-brief") || form || field.parentElement;
  const counter = container?.querySelector("[data-word-counter]");
  if (!counter) return;
  const minimum = Number(field.dataset.minWords || form?.dataset.minWords || 0);
  const count = wordCount(field.value);
  counter.textContent = minimum ? `${count} / ${minimum} words` : `${count} words`;
  counter.classList.toggle("is-short", Boolean(minimum) && count < minimum);
  counter.classList.toggle("is-valid", Boolean(minimum) && count >= minimum);
}

function scrollToTarget(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

function renderRoute({ preserveScroll = false } = {}) {
  if (!data || !store) return;
  const route = parseHash();
  const routeKey = route.raw;
  const changed = routeKey !== currentRouteKey;
  const scrollY = window.scrollY;
  const resolved = resolveRoute(route);
  const state = store.get();
  const missionReadout = state.mission.started ? `Day ${state.mission.currentDay}` : "Briefing";
  const pageTitle = resolved.title;

  if (app) {
    app.innerHTML = renderLayout({
      content: resolved.content,
      data,
      store,
      route,
      pageTitle
    });
  }
  document.title = `${pageTitle} · Junior Astronaut Training Platform`;
  document.documentElement.dataset.missionClock = missionReadout;
  if (changed && !preserveScroll) window.scrollTo({ top: 0, behavior: "auto" });
  else if (!changed) window.scrollTo({ top: scrollY, behavior: "auto" });

  currentRouteKey = routeKey;

  document.querySelectorAll("form[data-form]").forEach(updateQuizProgress);
  document.querySelectorAll("[data-word-count]").forEach(updateWordCounter);
  if (route.segments[0] === "library" && !route.segments[1]) {
    const searchInput = document.querySelector("[data-library-search]");
    if (searchInput) {
      searchInput.value = libraryQuery;
      applyLibrarySearch(libraryQuery);
    }
  } else if (route.segments[0] !== "library") {
    libraryQuery = "";
  }

  clearTimeout(autoReadTimer);
  if (route.segments[0] === "library" && route.segments[1]) {
    const article = findArticle(route.segments[1]);
    if (article && !store.get().libraryRead?.[article.id]) {
      const articleId = article.id;
      autoReadTimer = setTimeout(() => {
        const current = parseHash();
        if (current.segments[0] === "library" && current.segments[1] === articleId && !store.get().libraryRead?.[articleId]) {
          store.markLibraryRead(articleId, article.title);
        }
      }, 1100);
    }
  }

  initAmbient();

  if (route.query.scroll) {
    const targetId = route.query.scroll;
    window.setTimeout(() => {
      if (document.getElementById(targetId)) scrollToTarget(targetId);
    }, 60);
  }
}

function openNav() {
  const sidebar = document.getElementById("sidebar");
  const scrim = document.querySelector(".sidebar-scrim");
  sidebar?.classList.add("is-open");
  scrim?.classList.add("is-visible");
  document.body.classList.add("nav-open");
  document.querySelector('[data-action="open-nav"]')?.setAttribute("aria-expanded", "true");
}

function closeNav() {
  const sidebar = document.getElementById("sidebar");
  const scrim = document.querySelector(".sidebar-scrim");
  sidebar?.classList.remove("is-open");
  scrim?.classList.remove("is-visible");
  document.body.classList.remove("nav-open");
  document.querySelector('[data-action="open-nav"]')?.setAttribute("aria-expanded", "false");
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      toast("Full screen enabled. Press Esc to exit.", "info", "Display mode");
    } else {
      await document.exitFullscreen();
    }
  } catch {
    toast("Full screen is not available in this browser context.", "warning", "Display mode");
  }
}

function filterAchievements(filter) {
  const cards = [...document.querySelectorAll("[data-achievement-card]")];
  let visible = 0;
  for (const card of cards) {
    const isEarned = card.dataset.earned === "true";
    const show = filter === "all" || (filter === "earned" && isEarned) || (filter === "locked" && !isEarned);
    card.hidden = !show;
    if (show) visible += 1;
  }
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
  const empty = document.querySelector("[data-achievement-empty]");
  if (empty) empty.hidden = visible > 0;
}

function applyLibrarySearch(value) {
  const query = String(value || "").trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll("[data-library-category]").forEach((category) => {
    let categoryVisible = 0;
    category.querySelectorAll("[data-article-search]").forEach((link) => {
      const show = !query || link.dataset.articleSearch.includes(query);
      link.hidden = !show;
      if (show) categoryVisible += 1;
    });
    category.hidden = categoryVisible === 0;
    visible += categoryVisible;
  });
  const empty = document.querySelector("[data-library-empty]");
  if (empty) empty.hidden = visible > 0;
}

function collectAnswers(form) {
  return [...form.querySelectorAll(".question-card")].map((card) => {
    const checked = card.querySelector('input[type="radio"]:checked');
    return checked ? Number(checked.value) : null;
  });
}

function requireAnswers(form) {
  const answers = collectAnswers(form);
  const missing = answers.findIndex((answer) => !Number.isInteger(answer));
  if (missing >= 0) {
    toast(`Answer question ${missing + 1} before submitting.`, "warning", "Incomplete submission");
    const card = form.querySelectorAll(".question-card")[missing];
    card?.classList.add("needs-attention");
    card?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    setTimeout(() => card?.classList.remove("needs-attention"), 1800);
    return null;
  }
  return answers;
}

function showAchievement(achievementId) {
  const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
  if (!achievement) return;
  const earnedAt = store.get().badges?.[achievement.id]?.earnedAt;
  const destination = achievementDestination(achievement);
  openModal({
    title: achievement.name,
    label: "Achievement details",
    size: "sm",
    body: `
      <div class="achievement-modal tone-${esc(achievement.accent)}">
        <div class="achievement-modal-medal">${icon(achievement.icon, 38)}</div>
        <div class="achievement-modal-tier">${esc(achievement.tier)}</div>
        <p class="achievement-modal-description">${esc(achievement.description)}</p>
        <div class="achievement-modal-criteria">
          <span>How to earn it</span>
          <p>${esc(achievement.criteria)}</p>
        </div>
        <div class="achievement-modal-status ${earnedAt ? "is-earned" : "is-locked"}">
          ${earnedAt ? `${icon("check-circle", 16)} Earned ${formatDate(earnedAt, true)}` : `${icon("lock", 15)} Not yet earned`}
        </div>
      </div>`,
    footer: `
      <button class="btn btn-ghost" type="button" data-close-modal="true">Close</button>
      <a class="btn btn-primary" href="${destination.href}" data-close-modal="true">${esc(destination.label)} ${icon("arrow-right", 15)}</a>`
  });
}

function startMission() {
  if (!store.get().mission.started) {
    store.startMission();
    toast("Mission started. Day 1 is now open.", "success", "Mission clock running");
  }
  navigate("#/mission/day/1");
}

function restartMission() {
  confirmModal({
    title: "Restart the mission simulation?",
    body: `
      <p>This resets all mission decisions, system statuses, tasks, daily reports, and the final report.</p>
      <p>Academy progress, achievements, library reads, and Mars exploration steps are kept.</p>`,
    confirmLabel: "Restart mission",
    danger: true,
    requireText: "RESTART",
    onConfirm() {
      store.restartMission();
      closeNav();
      toast("Mission record reset. The briefing is ready.", "info", "Simulation restarted");
      navigate("#/mission");
    }
  });
}

function resetAllProgress() {
  confirmModal({
    title: "Reset all platform progress?",
    body: `
      <p>This permanently deletes Academy lesson records, quizzes, practical submissions, final assessments, the challenge, mission decisions, reports, achievements, library reads, and Mars checklist progress from this browser.</p>
      <p>Educational content and the JSON datasets are not affected.</p>`,
    confirmLabel: "Delete all progress",
    danger: true,
    requireText: "RESET",
    onConfirm() {
      store.resetAll();
      toast("All local progress was reset.", "info", "Progress cleared");
      navigate("#/home");
    }
  });
}

function exportProgress() {
  const text = store.exportProgress();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`jata-progress-${stamp}.json`, text, "application/json;charset=utf-8");
  toast("Progress export downloaded as JSON.", "success", "Export complete");
}

function importProgress() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      input.remove();
      return;
    }
    try {
      const text = await readFileAsText(file);
      const result = store.importProgress(text);
      if (result.ok) {
        toast(result.message, "success", "Progress imported");
        navigate("#/progress");
      } else {
        toast(result.message, "error", "Import failed");
      }
    } catch (error) {
      toast(error.message || "The selected file could not be read.", "error", "Import failed");
    } finally {
      input.remove();
    }
  });
  input.click();
}

function closeDay(dayNumber) {
  const state = store.get();
  const missionState = state.mission;
  if (!missionState.started || missionState.status !== "active") {
    toast("This mission day cannot be closed in the current state.", "warning", "Day not available");
    return;
  }
  if (Number(dayNumber) !== missionState.currentDay) {
    toast(`Only Day ${missionState.currentDay} can be closed right now.`, "warning", "Mission sequence");
    return;
  }
  const mission = data.mission;
  if (!dayComplete(missionState, mission, missionState.currentDay)) {
    toast("Record every scheduled event decision before closing the day.", "warning", "Decisions required");
    return;
  }
  const events = eventsForDay(mission, missionState.currentDay).length;
  const open = pendingTasks(missionState);
  const isFinal = missionState.currentDay === 5;
  confirmModal({
    title: isFinal ? "Close the mission and generate the final report?" : `Close Day ${missionState.currentDay}?`,
    body: `
      <p>${events} event decisions are recorded. ${open.length ? `${open.length} tracked task${open.length === 1 ? "" : "s"} will carry forward.` : "Every tracked task is complete."}</p>
      <p>${isFinal ? "The mission assessment and final report will be generated and the simulation will close." : `A Day ${missionState.currentDay} report will be filed and Day ${missionState.currentDay + 1} will unlock.`} Daily reports cannot be regenerated differently in this run.</p>`,
    confirmLabel: isFinal ? "Generate final report" : `Generate Day ${missionState.currentDay} report`,
    onConfirm() {
      const result = store.endMissionDay();
      if (!result) {
        toast("The day could not be closed. Check that every decision is recorded.", "error", "Day close failed");
        return;
      }
      if (result.nextDay) {
        toast(`Day ${missionState.currentDay} report filed. Day ${result.nextDay} is open.`, "success", "Mission day complete");
        navigate(`#/mission/day/${result.nextDay}`);
      } else {
        toast("Five-day mission complete. The final report is ready.", "success", "Mission complete");
        navigate("#/reports/final");
      }
    }
  });
}

function handleMissionDecision(form) {
  const eventId = form.dataset.event;
  const dayNumber = Number(form.dataset.day);
  const checked = form.querySelector('input[name="option"]:checked');
  if (!checked) {
    toast("Select one option before recording the decision.", "warning", "Decision required");
    form.querySelector(".decision-option")?.classList.add("needs-attention");
    setTimeout(() => form.querySelector(".decision-option")?.classList.remove("needs-attention"), 1800);
    return;
  }
  const day = data.mission.days.find((item) => item.day === dayNumber);
  const event = day?.events.find((item) => item.id === eventId);
  const option = event?.options.find((item) => item.id === checked.value);
  if (!event || !option) {
    toast("This decision could not be matched to the scenario data.", "error", "Decision unavailable");
    return;
  }
  confirmModal({
    title: "Record this mission decision?",
    body: `
      <div class="decision-confirm">
        <span class="decision-confirm-day">DAY ${dayNumber} · ${esc(event.title)}</span>
        <strong>${esc(option.label)}</strong>
        <p>${esc(option.summary)}</p>
        <div class="micro-note">${icon("info", 14)} The consequence and decision quality will be revealed after you record it. Decisions cannot be changed during the current run.</div>
      </div>`,
    confirmLabel: "Record decision",
    onConfirm() {
      const decision = store.recordDecision(eventId, checked.value);
      if (!decision) {
        toast("This decision could not be recorded. It may already exist or be out of sequence.", "error", "Decision not recorded");
        return;
      }
      const quality = decision.quality === "optimal" ? "Strong decision" : decision.quality === "acceptable" ? "Acceptable decision" : "High-risk decision";
      toast(
        decision.quality === "optimal"
          ? "Your choice used the strongest available option."
          : decision.quality === "acceptable"
            ? "The choice was workable but left some risk or opportunity open."
            : "This choice carries elevated risk. Review the consequence and follow-up tasks.",
        decision.quality === "high_risk" ? "warning" : "success",
        quality
      );
    }
  });
}

function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  if (!data || !store) return;
  const type = form.dataset.form;

  if (type === "practice" || type === "practical") {
    const courseId = form.dataset.course;
    const field = form.querySelector('textarea[name="practical"]');
    const minimum = Number(field?.dataset.minWords || form.dataset.minWords || 0);
    const count = wordCount(field?.value || "");
    if (minimum && count < minimum) {
      toast(`Write at least ${minimum} words in the practical submission. Current count: ${count}.`, "warning", "Submission too short");
      field?.focus();
      return;
    }
    const saved = store.submitPractical(courseId, field?.value || "");
    if (saved) toast("Practical activity saved to your local course record.", "success", "Submission saved");
    else toast("Add a written response before saving the practical activity.", "warning", "Submission required");
    return;
  }

  if (type === "module-quiz") {
    const answers = requireAnswers(form);
    if (!answers) return;
    const attempt = store.submitModuleQuiz(form.dataset.course, form.dataset.module, answers);
    if (!attempt) {
      toast("This quiz could not be scored.", "error", "Quiz unavailable");
      return;
    }
    toast(`${attempt.score}% · ${attempt.correct} of ${attempt.total} correct. ${attempt.passed ? "Module quiz passed." : "Review the explanations and try again."}`, attempt.passed ? "success" : "warning", attempt.passed ? "Quiz passed" : "Quiz attempt saved");
    navigate(`#/academy/${form.dataset.course}/module/${form.dataset.module}`);
    return;
  }

  if (type === "final-assessment") {
    const answers = requireAnswers(form);
    if (!answers) return;
    const attempt = store.submitFinalAssessment(form.dataset.course, answers);
    if (!attempt) {
      toast("This assessment could not be scored.", "error", "Assessment unavailable");
      return;
    }
    toast(`${attempt.score}% · ${attempt.passed ? "Final assessment passed." : "The 70% pass mark was not reached. Review and retake when ready."}`, attempt.passed ? "success" : "warning", attempt.passed ? "Assessment passed" : "Assessment attempt saved");
    navigate(`#/academy/${form.dataset.course}/assessment`);
    return;
  }

  if (type === "challenge") {
    const answers = requireAnswers(form);
    if (!answers) return;
    const challenge = data.academy.final_training_challenge;
    const practical = form.querySelector('textarea[name="practical"]');
    const minimum = Number(practical?.dataset.minWords || challenge.practical_activity.minimum_words || 0);
    const count = wordCount(practical?.value || "");
    if (count < minimum) {
      toast(`The Crew Readiness Brief requires at least ${minimum} words. Current count: ${count}.`, "warning", "Brief too short");
      practical?.focus();
      return;
    }
    const result = store.submitChallenge(answers, practical.value);
    if (result.error) {
      toast(result.error, "warning", "Challenge not scored");
      return;
    }
    const attempt = result.attempt;
    toast(`${attempt.score}% · ${attempt.passed ? "Final Training Challenge passed." : "The challenge pass mark was not reached."}`, attempt.passed ? "success" : "warning", attempt.passed ? "Junior Astronaut" : "Challenge attempt saved");
    navigate("#/academy/challenge");
    return;
  }

  if (type === "mission-decision") {
    handleMissionDecision(form);
  }
}

function handleAction(element, event) {
  const action = element.dataset.action;
  if (!action) return;

  switch (action) {
    case "reload":
      event.preventDefault();
      location.reload();
      return;

    case "open-nav":
      event.preventDefault();
      openNav();
      return;

    case "close-nav":
      event.preventDefault();
      closeNav();
      return;

    case "scroll-to":
      event.preventDefault();
      scrollToTarget(element.dataset.target);
      return;

    case "toggle-fullscreen":
      event.preventDefault();
      toggleFullscreen();
      return;

    case "locked-day":
      event.preventDefault();
      toast("That mission day is locked. Complete the current day first.", "warning", "Mission sequence");
      return;

    case "complete-lesson":
      event.preventDefault();
      if (store.markLesson(element.dataset.course, element.dataset.module, element.dataset.lesson)) {
        toast("Lesson marked complete and saved locally.", "success", "Lesson progress");
      }
      return;

    case "mark-activity":
      event.preventDefault();
      if (store.markActivity(element.dataset.course, element.dataset.module)) {
        toast("Practical activity recorded for this module.", "success", "Activity complete");
      }
      return;

    case "start-mission":
      event.preventDefault();
      startMission();
      return;

    case "complete-task":
      event.preventDefault();
      if (store.completeTask(element.dataset.task)) {
        toast("Task marked complete.", "success", "Task updated");
      } else {
        toast("The task could not be updated.", "warning", "Task unavailable");
      }
      return;

    case "end-day":
      event.preventDefault();
      closeDay(Number(element.dataset.day));
      return;

    case "restart-mission":
      event.preventDefault();
      restartMission();
      return;

    case "open-achievement":
      event.preventDefault();
      showAchievement(element.dataset.achievement);
      return;

    case "filter-achievements":
      event.preventDefault();
      filterAchievements(element.dataset.filter);
      return;

    case "mars-launch": {
      event.preventDefault();
      const url = element.getAttribute("href");
      if (!url) return;
      const win = window.open(url, "_blank");
      if (win) win.opener = null;
      else window.location.href = url;
      if (!store.get().mars.launched) store.markMarsLaunched();
      toast("NASA Mars Trek opened in a new tab. NASA content is separate from the station simulation.", "info", "Official NASA resource");
      return;
    }

    case "mars-check":
      event.preventDefault();
      store.toggleMarsCheck(element.dataset.item, element.dataset.label);
      toast(element.getAttribute("aria-pressed") === "true" ? "Exploration step cleared." : "Exploration step recorded.", "info", "Mars checklist");
      return;

    case "library-mark-read":
      event.preventDefault();
      store.markLibraryRead(element.dataset.article, element.dataset.title);
      toast("Brief marked as read in your local progress.", "success", "Reading record");
      return;

    case "export-progress":
      event.preventDefault();
      exportProgress();
      return;

    case "import-progress":
      event.preventDefault();
      importProgress();
      return;

    case "reset-progress":
      event.preventDefault();
      resetAllProgress();
      return;

    case "print-report":
      event.preventDefault();
      window.print();
      return;

    case "download-final-report": {
      event.preventDefault();
      const markdown = getFinalReportMarkdown(store);
      if (!markdown) {
        toast("The final report is not available yet.", "warning", "No report");
        return;
      }
      downloadFile(`jata-final-mission-report-${new Date().toISOString().slice(0, 10)}.md`, markdown, "text/markdown;charset=utf-8");
      toast("Final report downloaded as Markdown.", "success", "Report exported");
      return;
    }

    case "download-day-report": {
      event.preventDefault();
      const markdown = getDayReportMarkdown(data, store, element.dataset.day);
      if (!markdown) {
        toast("That daily report is not available yet.", "warning", "No report");
        return;
      }
      downloadFile(`jata-day-${element.dataset.day}-report.md`, markdown, "text/markdown;charset=utf-8");
      toast("Daily report downloaded as Markdown.", "success", "Report exported");
      return;
    }

    default:
      return;
  }
}

document.addEventListener("click", (event) => {
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) {
    handleAction(actionElement, event);
  }
  const scrollElement = event.target.closest("[data-scroll]");
  if (scrollElement) {
    event.preventDefault();
    scrollToTarget(scrollElement.dataset.scroll);
  }
  if (event.target.closest(".nav-link")) closeNav();
});

document.addEventListener("submit", handleSubmit);

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-library-search]")) {
    libraryQuery = target.value;
    applyLibrarySearch(target.value);
  }
  if (target.matches("[data-word-count]")) updateWordCounter(target);
  if (target.matches('input[type="radio"][data-question]')) {
    updateQuizProgress(target.closest("form"));
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeNav();
  }
});

window.addEventListener("jata:storage-error", () => {
  toast("Progress could not be saved to local storage. Export your record before leaving.", "warning", "Storage unavailable");
});

window.addEventListener("hashchange", () => {
  if (data && store) renderRoute();
});

async function bootstrap() {
  ensureGlobalRoots();
  try {
    data = await loadPlatformData();
    store = createStore(data);
    store.subscribe((state, meta) => {
      renderRoute({ preserveScroll: true });
      for (const badge of meta.newBadges || []) {
        toast(`${badge.name} — ${badge.description}`, "success", "Achievement unlocked");
      }
      if (meta.reason === "mission-restart") {
        // The initiating action provides the user-facing toast.
      }
    });
    renderRoute();
  } catch (error) {
    console.error(error);
    if (app) {
      app.innerHTML = `
        <main class="boot-error">
          <div class="boot-error-card">
            <div class="boot-error-mark">${icon("alert", 36)}</div>
            <div class="eyebrow"><span class="eyebrow-dot"></span>Platform load error</div>
            <h1>The training platform could not start.</h1>
            <p>${esc(error.message || "An unknown error occurred while loading the platform datasets.")}</p>
            <div class="boot-error-actions">
              <button class="btn btn-primary" type="button" data-action="reload">${icon("rotate", 16)} Reload platform</button>
              <a class="btn btn-secondary" href="README.md" target="_blank">${icon("file-text", 16)} Open setup guide</a>
            </div>
            <div class="boot-error-note">
              <strong>Run through a local server</strong>
              <span>Open a terminal in the project folder and run <code>start.bat</code>, <code>python -m http.server 5173</code>, or <code>npx serve .</code>. Opening <code>index.html</code> directly will block the JSON data files.</span>
            </div>
          </div>
        </main>`;
    }
  }
}

bootstrap();

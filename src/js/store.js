import { allCoursesComplete, courseProgress, ensureCourseState, getCourse, getModule } from "./academy-engine.js";
import { evaluateAchievements } from "./achievements.js";
import {
  applyDecision,
  buildDailyReport,
  completeTask as completeTaskEngine,
  createMissionState,
  decisionForEvent,
  dayComplete,
  evaluateMission,
  eventsForDay,
  finishMission,
  startMission as startMissionEngine
} from "./mission-engine.js";
import { uid } from "./utils.js";

export const STORAGE_KEY = "jata.progress.v2";
const STATE_VERSION = 2;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultChallengeState() {
  return {
    attempts: 0,
    bestScore: null,
    passed: false,
    lastAttempt: null,
    lastAt: null,
    practical: { text: "", submittedAt: null },
    completedAt: null
  };
}

export function createDefaultState(data) {
  return {
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    academy: {
      courses: {},
      challenge: defaultChallengeState()
    },
    mission: createMissionState(data.mission),
    activity: [],
    badges: {},
    libraryRead: {},
    mars: {
      launched: false,
      launchedAt: null,
      checked: []
    }
  };
}

function normaliseState(raw, data) {
  const base = createDefaultState(data);
  if (!raw || typeof raw !== "object") return base;
  const next = {
    ...base,
    ...raw,
    version: STATE_VERSION,
    academy: {
      ...base.academy,
      ...(raw.academy || {}),
      challenge: { ...base.academy.challenge, ...(raw.academy?.challenge || {}) }
    },
    mission: { ...base.mission, ...(raw.mission || {}) },
    badges: raw.badges && typeof raw.badges === "object" ? raw.badges : {},
    libraryRead: raw.libraryRead && typeof raw.libraryRead === "object" ? raw.libraryRead : {},
    mars: { ...base.mars, ...(raw.mars || {}) },
    activity: Array.isArray(raw.activity) ? raw.activity.slice(0, 80) : []
  };
  next.academy.courses = next.academy.courses && typeof next.academy.courses === "object" ? next.academy.courses : {};
  for (const course of data.academy.courses) ensureCourseState(next, course.id);
  if (!Array.isArray(next.mission.decisions)) next.mission.decisions = [];
  if (!Array.isArray(next.mission.pendingTasks)) next.mission.pendingTasks = [];
  next.mission.pendingTasks = next.mission.pendingTasks.map((task) => ({
    ...task,
    dueDay: task.dueDay ?? task.due_day ?? null,
    addedDay: task.addedDay ?? task.added_day ?? null
  }));
  if (!next.mission.systems || typeof next.mission.systems !== "object") {
    next.mission = createMissionState(data.mission);
  } else {
    for (const [key, system] of Object.entries(data.mission.initial_state.systems)) {
      if (!next.mission.systems[key]) next.mission.systems[key] = system.status;
    }
  }
  next.mission.currentDay = Math.min(5, Math.max(1, Number(next.mission.currentDay) || 1));
  if (!next.mission.reports || typeof next.mission.reports !== "object") next.mission.reports = {};
  if (!next.academy.challenge.practical || typeof next.academy.challenge.practical !== "object") {
    next.academy.challenge.practical = { text: "", submittedAt: null };
  }
  return next;
}

function pushActivity(state, type, label, href = "") {
  state.activity.unshift({ id: uid("activity"), type, label, href, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 80);
}

function autoCompleteCourses(state, data) {
  const completedNow = [];
  for (const course of data.academy.courses) {
    const courseState = ensureCourseState(state, course.id);
    if (courseState.completed) continue;
    const progress = courseProgress(state, course);
    if (progress.modulesComplete === progress.totalModules && progress.practicalDone && progress.finalPassed) {
      courseState.completed = true;
      courseState.completedAt = new Date().toISOString();
      completedNow.push(course);
      pushActivity(state, "course", `Completed ${course.title}`, `#/academy/${course.id}`);
    }
  }
  return completedNow;
}

export function createStore(data) {
  let state = createDefaultState(data);
  const listeners = new Set();
  let storageError = false;

  try {
    const probeKey = `${STORAGE_KEY}.probe`;
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
  } catch (error) {
    storageError = true;
    console.warn("Local storage is not available.", error);
  }

  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Saved progress could not be read.", error);
      return null;
    }
  })();
  if (saved) state = normaliseState(saved, data);

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageError = false;
    } catch (error) {
      storageError = true;
      console.warn("Progress could not be saved.", error);
      window.dispatchEvent(new CustomEvent("jata:storage-error", { detail: error }));
    }
  }

  function emit(meta = {}) {
    for (const listener of listeners) {
      try {
        listener(state, meta);
      } catch (error) {
        console.error("State listener failed.", error);
      }
    }
  }

  function commit(mutator, meta = {}) {
    const next = deepClone(state);
    mutator(next);
    next.updatedAt = new Date().toISOString();
    const completedCourses = autoCompleteCourses(next, data);
    const newBadges = evaluateAchievements(next, data);
    state = next;
    persist();
    emit({ ...meta, newBadges, completedCourses, storageError });
    return { state, newBadges, completedCourses };
  }

  function get() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getCourseState(courseId) {
    return state.academy.courses[courseId] || null;
  }

  function markLesson(courseId, moduleId, lessonId) {
    const course = getCourse(data.academy, courseId);
    const module = getModule(course, moduleId);
    if (!course || !module) return false;
    const key = `${moduleId}:${lessonId}`;
    if (state.academy.courses[courseId]?.lessons?.[key]) return true;
    commit((next) => {
      const courseState = ensureCourseState(next, courseId);
      courseState.lessons[key] = true;
      pushActivity(next, "lesson", `${module.title}: ${module.lessons.find((lesson) => lesson.id === lessonId)?.title || "Lesson"}`, `#/academy/${courseId}/module/${moduleId}?lesson=${lessonId}`);
    }, { reason: "lesson" });
    return true;
  }

  function submitModuleQuiz(courseId, moduleId, answers) {
    const course = getCourse(data.academy, courseId);
    const module = getModule(course, moduleId);
    if (!course || !module) return null;
    const results = module.quiz.questions.map((question, index) => {
      const selected = Number.isInteger(answers?.[index]) ? answers[index] : null;
      return {
        questionId: question.id,
        selected,
        correct: question.correct_index,
        isCorrect: selected === question.correct_index
      };
    });
    const correct = results.filter((result) => result.isCorrect).length;
    const score = Math.round((correct / module.quiz.questions.length) * 100);
    const passed = score >= (module.quiz.passing_score ?? 70);
    let attempt;
    commit((next) => {
      const courseState = ensureCourseState(next, courseId);
      const previous = courseState.moduleQuizzes[moduleId] || { attempts: 0, bestScore: null, passed: false };
      attempt = {
        answers: [...answers],
        score,
        passed,
        correct,
        total: module.quiz.questions.length,
        at: new Date().toISOString(),
        results
      };
      courseState.moduleQuizzes[moduleId] = {
        attempts: (previous.attempts || 0) + 1,
        bestScore: Math.max(previous.bestScore ?? 0, score),
        lastScore: score,
        passed: Boolean(previous.passed || passed),
        lastAttempt: attempt,
        lastAt: attempt.at
      };
      pushActivity(next, "quiz", `${passed ? "Passed" : "Attempted"} ${module.title} quiz (${score}%)`, `#/academy/${courseId}/module/${moduleId}?retake=1`);
    }, { reason: "quiz" });
    return attempt;
  }

  function markActivity(courseId, moduleId) {
    const course = getCourse(data.academy, courseId);
    const module = getModule(course, moduleId);
    if (!course || !module) return false;
    if (state.academy.courses[courseId]?.activities?.[moduleId]) return true;
    commit((next) => {
      const courseState = ensureCourseState(next, courseId);
      courseState.activities[moduleId] = new Date().toISOString();
      pushActivity(next, "activity", `Recorded activity: ${module.practical_activity.title}`, `#/academy/${courseId}/module/${moduleId}?scroll=module-activity`);
    }, { reason: "activity" });
    return true;
  }

  function submitPractical(courseId, text) {
    const course = getCourse(data.academy, courseId);
    if (!course) return false;
    const clean = String(text || "").trim();
    if (!clean) return false;
    commit((next) => {
      const courseState = ensureCourseState(next, courseId);
      courseState.practical = { text: clean, submittedAt: new Date().toISOString() };
      pushActivity(next, "practical", `Submitted ${course.practical_activity.title}`, `#/academy/${courseId}?scroll=practical`);
    }, { reason: "practical" });
    return true;
  }

  function submitFinalAssessment(courseId, answers) {
    const course = getCourse(data.academy, courseId);
    if (!course) return null;
    const results = course.final_assessment.questions.map((question, index) => {
      const selected = Number.isInteger(answers?.[index]) ? answers[index] : null;
      return {
        questionId: question.id,
        selected,
        correct: question.correct_index,
        isCorrect: selected === question.correct_index
      };
    });
    const correct = results.filter((result) => result.isCorrect).length;
    const score = Math.round((correct / course.final_assessment.questions.length) * 100);
    const passed = score >= (course.final_assessment.passing_score ?? 70);
    let attempt;
    commit((next) => {
      const courseState = ensureCourseState(next, courseId);
      const previous = courseState.finalAssessment || { attempts: 0, bestScore: null, passed: false };
      attempt = {
        answers: [...answers],
        score,
        passed,
        correct,
        total: course.final_assessment.questions.length,
        at: new Date().toISOString(),
        results
      };
      courseState.finalAssessment = {
        attempts: (previous.attempts || 0) + 1,
        bestScore: Math.max(previous.bestScore ?? 0, score),
        lastScore: score,
        passed: Boolean(previous.passed || passed),
        lastAttempt: attempt,
        lastAt: attempt.at
      };
      pushActivity(next, "assessment", `${passed ? "Passed" : "Attempted"} ${course.title} final assessment (${score}%)`, `#/academy/${courseId}/assessment`);
    }, { reason: "assessment" });
    return attempt;
  }

  function submitChallenge(answers, practicalText) {
    if (!allCoursesComplete(state, data.academy)) return { error: "Complete all six courses before taking the Final Training Challenge." };
    const challenge = data.academy.final_training_challenge;
    const clean = String(practicalText || "").trim();
    if (!clean) return { error: "Submit the Crew Readiness Brief before scoring the challenge." };
    const results = challenge.questions.map((question, index) => {
      const selected = Number.isInteger(answers?.[index]) ? answers[index] : null;
      return {
        questionId: question.id,
        selected,
        correct: question.correct_index,
        isCorrect: selected === question.correct_index
      };
    });
    const correct = results.filter((result) => result.isCorrect).length;
    const score = Math.round((correct / challenge.questions.length) * 100);
    const passed = score >= (challenge.passing_score ?? 70);
    let attempt;
    commit((next) => {
      const previous = next.academy.challenge;
      attempt = {
        answers: [...answers],
        score,
        passed,
        correct,
        total: challenge.questions.length,
        at: new Date().toISOString(),
        results
      };
      next.academy.challenge = {
        attempts: (previous.attempts || 0) + 1,
        bestScore: Math.max(previous.bestScore ?? 0, score),
        lastScore: score,
        passed: Boolean(previous.passed || passed),
        lastAttempt: attempt,
        lastAt: attempt.at,
        practical: { text: clean, submittedAt: new Date().toISOString() },
        completedAt: passed ? new Date().toISOString() : previous.completedAt || null
      };
      pushActivity(next, "challenge", `${passed ? "Passed" : "Attempted"} Final Training Challenge (${score}%)`, "#/academy/challenge");
    }, { reason: "challenge" });
    return { attempt };
  }

  function markLibraryRead(articleId, title) {
    if (state.libraryRead[articleId]) return;
    commit((next) => {
      next.libraryRead[articleId] = new Date().toISOString();
      pushActivity(next, "library", `Read ${title}`, `#/library/${articleId}`);
    }, { reason: "library" });
  }

  function markMarsLaunched() {
    if (state.mars.launched) return;
    commit((next) => {
      next.mars.launched = true;
      next.mars.launchedAt = new Date().toISOString();
      pushActivity(next, "mars", "Opened the official NASA Mars Trek resource", "#/mars");
    }, { reason: "mars" });
  }

  function toggleMarsCheck(itemId, label) {
    commit((next) => {
      const set = new Set(next.mars.checked || []);
      if (set.has(itemId)) set.delete(itemId);
      else {
        set.add(itemId);
        pushActivity(next, "mars", `Mars exploration step: ${label}`, "#/mars");
      }
      next.mars.checked = [...set];
    }, { reason: "mars-check" });
  }

  function startMission() {
    if (state.mission.started) return false;
    commit((next) => {
      startMissionEngine(next.mission, data.mission);
      pushActivity(next, "mission", "Started the five-day mission simulation", "#/mission");
    }, { reason: "mission-start" });
    return true;
  }

  function recordDecision(eventId, optionId) {
    if (!state.mission.started || state.mission.status !== "active") return null;
    const day = state.mission.currentDay;
    const events = eventsForDay(data.mission, day);
    const eventIndex = events.findIndex((item) => item.id === eventId);
    if (eventIndex < 0) return null;
    const event = events[eventIndex];
    const option = event.options.find((item) => item.id === optionId);
    if (!option || decisionForEvent(state.mission, eventId)) return null;
    const priorDecided = events.slice(0, eventIndex).every((item) => Boolean(decisionForEvent(state.mission, item.id)));
    if (!priorDecided) return null;
    let decision;
    commit((next) => {
      decision = applyDecision(next.mission, data.mission, day, event, option);
      pushActivity(next, "mission-decision", `Day ${day}: ${event.title}`, `#/mission/day/${day}`);
    }, { reason: "mission-decision" });
    return decision;
  }

  function completeTask(taskId) {
    if (!state.mission.started || state.mission.status !== "active") return false;
    const task = state.mission.pendingTasks.find((item) => item.id === taskId);
    if (!task || task.status === "completed") return false;
    commit((next) => {
      const result = completeTaskEngine(next.mission, taskId, next.mission.currentDay);
      if (result) pushActivity(next, "task", `Completed task: ${result.label}`, "#/mission");
    }, { reason: "task" });
    return true;
  }

  function endMissionDay() {
    const day = state.mission.currentDay;
    if (!state.mission.started || state.mission.status !== "active") return null;
    if (!dayComplete(state.mission, data.mission, day)) return null;
    let report;
    let finalReport = null;
    let nextDay = null;
    commit((next) => {
      report = buildDailyReport(next.mission, data.mission, day);
      next.mission.reports[day] = report;
      if (day < 5) {
        next.mission.currentDay = day + 1;
        next.mission.phase = "Operations";
        nextDay = day + 1;
        pushActivity(next, "mission-day", `Completed Day ${day}: ${report.title}`, `#/reports/day/${day}`);
      } else {
        finalReport = evaluateMission(next.mission, data.mission);
        finishMission(next.mission, data.mission, finalReport);
        pushActivity(next, "mission", "Completed the five-day mission and generated the final report", "#/reports/final");
      }
    }, { reason: "mission-day-complete" });
    return { report, finalReport, nextDay };
  }

  function restartMission() {
    commit((next) => {
      next.mission = createMissionState(data.mission);
      pushActivity(next, "mission", "Reset the mission simulation", "#/mission");
    }, { reason: "mission-restart" });
  }

  function resetAll() {
    state = createDefaultState(data);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory reset still applies.
    }
    persist();
    emit({ reason: "reset-all", newBadges: [], reset: true });
  }

  function exportProgress() {
    return JSON.stringify(state, null, 2);
  }

  function importProgress(text) {
    if (String(text || "").length > 2_000_000) return { ok: false, message: "The import file is too large." };
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, message: "The selected file is not valid JSON." };
    }
    if (!parsed || typeof parsed !== "object" || !parsed.academy || !parsed.mission) {
      return { ok: false, message: "This does not look like a Junior Astronaut progress export." };
    }
    const imported = normaliseState(parsed, data);
    const newBadges = evaluateAchievements(imported, data);
    state = imported;
    persist();
    emit({ reason: "import", newBadges, imported: true });
    return { ok: true, message: "Progress imported successfully." };
  }

  function getStorageInfo() {
    return {
      key: STORAGE_KEY,
      available: !storageError,
      bytes: (() => {
        try {
          return new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
        } catch {
          return 0;
        }
      })()
    };
  }

  // Ensure defaults exist for direct state consumers.
  for (const course of data.academy.courses) ensureCourseState(state, course.id);

  return {
    get,
    subscribe,
    getCourseState,
    markLesson,
    submitModuleQuiz,
    markActivity,
    submitPractical,
    submitFinalAssessment,
    submitChallenge,
    markLibraryRead,
    markMarsLaunched,
    toggleMarsCheck,
    startMission,
    recordDecision,
    completeTask,
    endMissionDay,
    restartMission,
    resetAll,
    exportProgress,
    importProgress,
    getStorageInfo
  };
}

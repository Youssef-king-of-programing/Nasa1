import { clamp } from "./utils.js";

const SCALE = ["nominal", "watch", "degraded", "critical"];

export function createMissionState(mission) {
  const systems = {};
  for (const [key, value] of Object.entries(mission.initial_state.systems)) {
    systems[key] = value.status;
  }
  return {
    started: false,
    startedAt: null,
    status: "not_started",
    phase: "Briefing",
    currentDay: 1,
    systems,
    pendingTasks: (mission.initial_state.pending_tasks || []).map((task) => ({
      ...task,
      dueDay: task.due_day ?? task.dueDay ?? null,
      addedDay: task.added_day ?? task.addedDay ?? null,
      status: "pending",
      addedBy: "Mission baseline",
      completedAt: null,
      completedDay: null
    })),
    decisions: [],
    reports: {},
    finalReport: null,
    completedAt: null
  };
}

export function startMission(missionState, mission) {
  const fresh = createMissionState(mission);
  Object.assign(missionState, fresh, {
    started: true,
    startedAt: new Date().toISOString(),
    status: "active",
    phase: "Operations"
  });
  return missionState;
}

export function getSystemMeta(mission, systemKey) {
  return mission.initial_state.systems[systemKey] || { label: systemKey, icon: "activity", description: "" };
}

export function allEvents(mission) {
  return mission.days.flatMap((day) => day.events.map((event) => ({ ...event, day: day.day, dayTitle: day.title })));
}

export function eventsForDay(mission, dayNumber) {
  return mission.days.find((day) => day.day === dayNumber)?.events || [];
}

export function decisionsForDay(missionState, dayNumber) {
  return missionState.decisions.filter((decision) => decision.day === dayNumber);
}

export function decisionForEvent(missionState, eventId) {
  return missionState.decisions.find((decision) => decision.eventId === eventId) || null;
}

export function dayComplete(missionState, mission, dayNumber) {
  const events = eventsForDay(mission, dayNumber);
  return events.length > 0 && events.every((event) => Boolean(decisionForEvent(missionState, event.id)));
}

export function missionComplete(missionState) {
  return missionState.status === "complete" && Boolean(missionState.finalReport);
}

export function applyStatusEffect(missionState, effect) {
  const current = missionState.systems[effect.system] || "nominal";
  const index = Math.max(0, SCALE.indexOf(current));
  let nextIndex = index;
  if (effect.direction === "improve") nextIndex = Math.max(0, index - 1);
  if (effect.direction === "worsen") nextIndex = Math.min(SCALE.length - 1, index + 1);
  const next = SCALE[nextIndex];
  missionState.systems[effect.system] = next;
  return { from: current, to: next };
}

export function applyDecision(missionState, mission, dayNumber, event, option) {
  if (decisionForEvent(missionState, event.id)) {
    throw new Error("This mission decision has already been recorded.");
  }
  const consequence = option.consequences;
  const effects = (consequence.effects || []).map((effect) => {
    const change = applyStatusEffect(missionState, effect);
    return {
      ...effect,
      from: change.from,
      to: change.to,
      systemLabel: getSystemMeta(mission, effect.system).label
    };
  });

  const completedTasks = [];
  const completedIds = new Set(consequence.tasks_complete || []);
  for (const task of missionState.pendingTasks) {
    if (completedIds.has(task.id) && task.status === "pending") {
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.completedDay = dayNumber;
      task.completedBy = event.id;
      completedTasks.push(task.label);
    }
  }

  const addedTasks = [];
  for (const task of consequence.tasks_add || []) {
    const exists = missionState.pendingTasks.some((existing) => existing.id === task.id);
    if (!exists) {
      missionState.pendingTasks.push({
        ...task,
        dueDay: task.due_day ?? task.dueDay ?? null,
        addedDay: task.added_day ?? task.addedDay ?? null,
        status: "pending",
        addedBy: event.id,
        completedAt: null,
        completedDay: null
      });
      addedTasks.push(task.label);
    }
  }

  const decision = {
    id: `${dayNumber}:${event.id}`,
    day: dayNumber,
    eventId: event.id,
    eventTitle: event.title,
    optionId: option.id,
    optionLabel: option.label,
    summary: option.summary,
    quality: option.quality,
    narrative: consequence.narrative,
    immediateResults: consequence.immediate_results || [],
    effects,
    tasksAdded: addedTasks,
    tasksCompleted: completedTasks,
    reportNote: consequence.report_note,
    academyLinks: event.academy_links || [],
    at: new Date().toISOString(),
    systemsAfter: { ...missionState.systems }
  };
  missionState.decisions.push(decision);
  return decision;
}

export function completeTask(missionState, taskId, dayNumber) {
  const task = missionState.pendingTasks.find((item) => item.id === taskId);
  if (!task || task.status === "completed") return null;
  task.status = "completed";
  task.completedAt = new Date().toISOString();
  task.completedDay = dayNumber;
  task.completedBy = "Crew Operations Support Officer";
  return task;
}

export function pendingTasks(missionState) {
  return missionState.pendingTasks.filter((task) => task.status === "pending");
}

export function completedTasks(missionState) {
  return missionState.pendingTasks.filter((task) => task.status === "completed");
}

export function overdueTasks(missionState) {
  return pendingTasks(missionState).filter((task) => task.dueDay && missionState.currentDay > task.dueDay);
}

export function missionStats(missionState, mission) {
  const events = allEvents(mission);
  const totalEvents = events.length;
  const decided = missionState.decisions.length;
  const tasks = missionState.pendingTasks;
  const completed = tasks.filter((task) => task.status === "completed").length;
  const statusCounts = SCALE.reduce((acc, status) => {
    acc[status] = Object.values(missionState.systems).filter((value) => value === status).length;
    return acc;
  }, {});
  return {
    totalEvents,
    decided,
    remaining: Math.max(0, totalEvents - decided),
    decisionPercent: totalEvents ? Math.round((decided / totalEvents) * 100) : 0,
    taskTotal: tasks.length,
    taskCompleted: completed,
    taskPending: tasks.length - completed,
    statusCounts,
    day: missionState.currentDay,
    progressPercent: totalEvents ? Math.round((decided / totalEvents) * 100) : 0
  };
}

export function buildDailyReport(missionState, mission, dayNumber) {
  const day = mission.days.find((item) => item.day === dayNumber);
  if (!day) throw new Error("Unknown mission day.");
  const dayDecisions = decisionsForDay(missionState, dayNumber);
  const completedToday = missionState.pendingTasks.filter((task) => task.completedDay === dayNumber);
  const pendingNow = pendingTasks(missionState);
  const overdueNow = overdueTasks(missionState);
  const decisionQuality = dayDecisions.filter((decision) => decision.quality === "optimal").length;
  const highRisk = dayDecisions.filter((decision) => decision.quality === "high_risk").length;
  const summary = [
    `${dayDecisions.length} of ${day.events.length} scheduled events were decided.`,
    decisionQuality === dayDecisions.length
      ? "Every recorded decision used the strongest available option."
      : `${decisionQuality} of ${dayDecisions.length} decisions used the strongest available option.`,
    highRisk > 0 ? `${highRisk} high-risk decision${highRisk === 1 ? " was" : "s were"} recorded and remain part of the handover.` : "No high-risk decisions were recorded today.",
    `${completedToday.length} task${completedToday.length === 1 ? " was" : "s were"} completed; ${pendingNow.length} task${pendingNow.length === 1 ? " remains" : "s remain"} open.`
  ];
  return {
    day: dayNumber,
    codename: day.codename,
    title: day.title,
    generatedAt: new Date().toISOString(),
    decisions: dayDecisions,
    systems: { ...missionState.systems },
    completedTasks: completedToday.map((task) => ({ id: task.id, label: task.label, category: task.category })),
    pendingTasks: pendingNow.map((task) => ({
      id: task.id,
      label: task.label,
      dueDay: task.dueDay,
      category: task.category,
      overdue: Boolean(task.dueDay && missionState.currentDay > task.dueDay)
    })),
    overdueTasks: overdueNow.map((task) => ({ id: task.id, label: task.label, dueDay: task.dueDay })),
    summary,
    decisionNotes: dayDecisions.map((decision) => ({ title: decision.eventTitle, note: decision.reportNote, quality: decision.quality })),
    reportPrompts: day.report_prompts || []
  };
}

function pointForQuality(quality, rules) {
  return rules.option_points?.[quality] ?? 0;
}

export function evaluateMission(missionState, mission) {
  const rules = mission.assessment_rules;
  const weights = rules.weights;
  const all = allEvents(mission);
  const decisions = all.map((event) => decisionForEvent(missionState, event.id)).filter(Boolean);
  const decisionPoints = decisions.reduce((sum, decision) => sum + pointForQuality(decision.quality, rules), 0);
  const decisionScore = all.length ? (decisionPoints / all.length) * 100 : 0;
  const tasks = missionState.pendingTasks;
  const taskScore = tasks.length ? (tasks.filter((task) => task.status === "completed").length / tasks.length) * 100 : 100;
  const systemEntries = Object.entries(missionState.systems);
  const readinessPoints = systemEntries.reduce((sum, [, status]) => sum + (rules.readiness_points[status] ?? 0), 0);
  const readinessScore = systemEntries.length ? (readinessPoints / systemEntries.length) * 100 : 0;
  const weighted = (decisionScore * weights.decision_quality + taskScore * weights.task_completion + readinessScore * weights.crew_readiness) / 100;
  let score = Math.round(weighted);
  const criticalSystems = systemEntries.filter(([, status]) => status === "critical").map(([key]) => key);
  let threshold = [...rules.thresholds].sort((a, b) => b.min - a.min).find((item) => score >= item.min) || rules.thresholds[rules.thresholds.length - 1];
  const capped = criticalSystems.length > 0 && threshold.min > 55;
  if (capped) {
    threshold = [...rules.thresholds].sort((a, b) => b.min - a.min).find((item) => item.min <= 55) || threshold;
  }
  const nominalSystems = systemEntries.filter(([, status]) => status === "nominal").map(([key]) => getSystemMeta(mission, key).label);
  const atRiskSystems = systemEntries.filter(([, status]) => status !== "nominal").map(([key, status]) => ({ label: getSystemMeta(mission, key).label, status }));
  const optimal = decisions.filter((decision) => decision.quality === "optimal");
  const highRisk = decisions.filter((decision) => decision.quality === "high_risk");
  const pending = tasks.filter((task) => task.status === "pending");
  const completedEntries = tasks.filter((task) => task.status === "completed");
  const overduePending = pending.filter((task) => task.dueDay && missionState.currentDay > task.dueDay);
  const strengths = [];
  if (nominalSystems.length) strengths.push(`${nominalSystems.length} of ${systemEntries.length} monitored systems end NOMINAL: ${nominalSystems.join(", ")}.`);
  if (optimal.length) strengths.push(`${optimal.length} of ${decisions.length} recorded decisions used the strongest available option.`);
  const completedTaskCount = completedEntries.length;
  if (completedTaskCount) strengths.push(`${completedTaskCount} of ${tasks.length} tracked tasks were completed.`);
  if (!strengths.length) strengths.push("The mission record is complete and ready for review.");

  const improvements = [];
  if (atRiskSystems.length) improvements.push(`Review ${atRiskSystems.map((item) => `${item.label} (${item.status})`).join(", ")}.`);
  if (highRisk.length) improvements.push(`Revisit high-risk decisions: ${highRisk.map((decision) => decision.eventTitle).join("; ")}.`);
  if (pending.length) improvements.push(`${pending.length} task${pending.length === 1 ? " remains" : "s remain"} open, including ${pending.slice(0, 3).map((task) => task.label).join("; ")}${pending.length > 3 ? "; and more" : ""}.`);
  if (!improvements.length) improvements.push("No major readiness gap was recorded. Continue to practice evidence-based decision-making.");

  const recommendationMap = {
    crew_health: { courseId: "mental-health-psychology", label: "Mental Health & Psychology" },
    sleep_fatigue: { courseId: "sleep-circadian-rhythm", label: "Sleep & Circadian Rhythm" },
    nutrition: { courseId: "nutrition-diet", label: "Nutrition & Diet" },
    radiation: { courseId: "human-body-microgravity", label: "Human Body in Microgravity" },
    atmosphere: { courseId: "hygiene-personal-care", label: "Hygiene & Personal Care" },
    water: { courseId: "hygiene-personal-care", label: "Hygiene & Personal Care" },
    food: { courseId: "nutrition-diet", label: "Nutrition & Diet" },
    equipment: { courseId: "physical-health-exercise", label: "Physical Health & Exercise" }
  };
  const recommendations = [];
  for (const item of atRiskSystems) {
    const key = Object.entries(mission.initial_state.systems).find(([, value]) => value.label === item.label)?.[0];
    const recommendation = recommendationMap[key];
    if (recommendation && !recommendations.some((entry) => entry.courseId === recommendation.courseId)) {
      recommendations.push(recommendation);
    }
  }
  if (!recommendations.length) {
    recommendations.push({ courseId: "sleep-circadian-rhythm", label: "Sleep & Circadian Rhythm" });
    recommendations.push({ courseId: "physical-health-exercise", label: "Physical Health & Exercise" });
  }

  const daySummaries = mission.days.map((day) => {
    const dayDecisions = decisions.filter((decision) => decision.day === day.day);
    return {
      day: day.day,
      title: day.title,
      decisions: dayDecisions.length,
      notes: dayDecisions.map((decision) => decision.reportNote),
      optimal: dayDecisions.filter((decision) => decision.quality === "optimal").length,
      highRisk: dayDecisions.filter((decision) => decision.quality === "high_risk").length
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    score,
    rawScore: Math.round(weighted),
    capped,
    breakdown: {
      decisionScore: Math.round(decisionScore),
      taskScore: Math.round(taskScore),
      readinessScore: Math.round(readinessScore),
      weights
    },
    outcome: {
      label: threshold.label,
      status: threshold.status,
      summary: capped
        ? `${threshold.summary} The outcome was capped because a monitored system ended CRITICAL.`
        : threshold.summary
    },
    criticalSystems: criticalSystems.map((key) => getSystemMeta(mission, key).label),
    statuses: { ...missionState.systems },
    decisions,
    tasks: {
      total: tasks.length,
      completed: completedTaskCount,
      completedItems: completedEntries.map((task) => ({
        label: task.label,
        completedDay: task.completedDay,
        category: task.category
      })),
      pending: pending.map((task) => ({
        label: task.label,
        dueDay: task.dueDay,
        category: task.category,
        overdue: Boolean(task.dueDay && missionState.currentDay > task.dueDay)
      })),
      overdue: overduePending.map((task) => ({ label: task.label, dueDay: task.dueDay })),
      overdueCount: overduePending.length
    },
    strengths,
    improvements,
    recommendations,
    daySummaries,
    modelNote: rules.model_note,
    decisionCount: decisions.length,
    optimalCount: optimal.length,
    highRiskCount: highRisk.length
  };
}

export function finishMission(missionState, mission, report) {
  missionState.finalReport = report;
  missionState.status = "complete";
  missionState.phase = "Complete";
  missionState.currentDay = 5;
  missionState.completedAt = new Date().toISOString();
  return report;
}

export function carryForwardNotes(missionState, dayNumber) {
  const notes = missionState.decisions
    .filter((decision) => decision.day < dayNumber)
    .slice(-4)
    .map((decision) => ({
      day: decision.day,
      title: decision.eventTitle,
      note: decision.reportNote,
      quality: decision.quality
    }));
  return notes;
}

export function missionOutcomeTone(status) {
  return {
    excellent: "outcome-excellent",
    success: "outcome-success",
    conditional: "outcome-conditional",
    review: "outcome-review"
  }[status] || "outcome-conditional";
}

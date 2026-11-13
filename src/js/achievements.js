import { allCoursesComplete, courseProgress } from "./academy-engine.js";

export const ACHIEVEMENTS = [
  {
    id: "first-lesson",
    name: "First Contact",
    description: "Complete your first Academy lesson.",
    criteria: "Open a course and mark one lesson complete.",
    icon: "book-open",
    tier: "Academy",
    accent: "cyan",
    check: (state) => Object.values(state.academy.courses).some((course) => Object.values(course.lessons || {}).some(Boolean))
  },
  {
    id: "first-quiz",
    name: "Quiz Cadet",
    description: "Submit your first module quiz.",
    criteria: "Complete a module quiz attempt.",
    icon: "target",
    tier: "Academy",
    accent: "blue",
    check: (state) => Object.values(state.academy.courses).some((course) => Object.values(course.moduleQuizzes || {}).some((quiz) => quiz.attempts > 0))
  },
  {
    id: "perfect-quiz",
    name: "Precision Thinker",
    description: "Score 100% on any module quiz.",
    criteria: "Achieve a perfect module quiz score.",
    icon: "spark",
    tier: "Academy",
    accent: "amber",
    check: (state) => Object.values(state.academy.courses).some((course) => Object.values(course.moduleQuizzes || {}).some((quiz) => quiz.bestScore === 100))
  },
  {
    id: "perfect-final",
    name: "Flawless Final",
    description: "Score 100% on a course final assessment.",
    criteria: "Pass any final assessment with every question correct.",
    icon: "spark",
    tier: "Academy",
    accent: "violet",
    check: (state) => Object.values(state.academy.courses).some((course) => course.finalAssessment?.bestScore === 100)
  },
  {
    id: "first-practical",
    name: "Hands-On Scientist",
    description: "Submit your first course practical activity.",
    criteria: "Save a practical activity submission.",
    icon: "flask",
    tier: "Academy",
    accent: "teal",
    check: (state) => Object.values(state.academy.courses).some((course) => Boolean(course.practical?.submittedAt))
  },
  {
    id: "badge-sleep",
    name: "Circadian Guardian",
    description: "Complete Sleep & Circadian Rhythm.",
    criteria: "Finish all five modules, submit the practical, and score at least 70% on the final assessment.",
    icon: "moon",
    tier: "Course badge",
    accent: "blue",
    check: (state, data) => {
      const course = data.academy.courses.find((item) => item.id === "sleep-circadian-rhythm");
      return course ? courseProgress(state, course).complete : false;
    }
  },
  {
    id: "badge-fitness",
    name: "Fitness Officer",
    description: "Complete Physical Health & Exercise.",
    criteria: "Finish all five modules, submit the practical, and score at least 70% on the final assessment.",
    icon: "dumbbell",
    tier: "Course badge",
    accent: "teal",
    check: (state, data) => {
      const course = data.academy.courses.find((item) => item.id === "physical-health-exercise");
      return course ? courseProgress(state, course).complete : false;
    }
  },
  {
    id: "badge-nutrition",
    name: "Nutrition Officer",
    description: "Complete Nutrition & Diet.",
    criteria: "Finish all five modules, submit the practical, and score at least 70% on the final assessment.",
    icon: "nutrition",
    tier: "Course badge",
    accent: "amber",
    check: (state, data) => {
      const course = data.academy.courses.find((item) => item.id === "nutrition-diet");
      return course ? courseProgress(state, course).complete : false;
    }
  },
  {
    id: "badge-mind",
    name: "Mind & Crew",
    description: "Complete Mental Health & Psychology.",
    criteria: "Finish all five modules, submit the practical, and score at least 70% on the final assessment.",
    icon: "mind",
    tier: "Course badge",
    accent: "violet",
    check: (state, data) => {
      const course = data.academy.courses.find((item) => item.id === "mental-health-psychology");
      return course ? courseProgress(state, course).complete : false;
    }
  },
  {
    id: "badge-hygiene",
    name: "Hygiene Officer",
    description: "Complete Hygiene & Personal Care.",
    criteria: "Finish all five modules, submit the practical, and score at least 70% on the final assessment.",
    icon: "hygiene",
    tier: "Course badge",
    accent: "teal",
    check: (state, data) => {
      const course = data.academy.courses.find((item) => item.id === "hygiene-personal-care");
      return course ? courseProgress(state, course).complete : false;
    }
  },
  {
    id: "badge-body",
    name: "Microgravity Expert",
    description: "Complete Human Body in Microgravity.",
    criteria: "Finish all five modules, submit the practical, and score at least 70% on the final assessment.",
    icon: "body",
    tier: "Course badge",
    accent: "rose",
    check: (state, data) => {
      const course = data.academy.courses.find((item) => item.id === "human-body-microgravity");
      return course ? courseProgress(state, course).complete : false;
    }
  },
  {
    id: "academy-graduate",
    name: "Academy Graduate",
    description: "Complete all six Academy courses.",
    criteria: "Finish every course, including practical activities and final assessments.",
    icon: "academy",
    tier: "Milestone",
    accent: "cyan",
    check: (state, data) => allCoursesComplete(state, data.academy)
  },
  {
    id: "challenge-complete",
    name: "Junior Astronaut",
    description: "Pass the Final Training Challenge.",
    criteria: "Complete the Crew Readiness Brief and score at least 70% on the integrated challenge.",
    icon: "award",
    tier: "Milestone",
    accent: "amber",
    check: (state) => Boolean(state.academy.challenge?.passed)
  },
  {
    id: "decision-maker",
    name: "Decision Maker",
    description: "Record your first mission decision.",
    criteria: "Start the simulation and commit a decision.",
    icon: "compass",
    tier: "Mission",
    accent: "blue",
    check: (state) => state.mission.decisions.length >= 1
  },
  {
    id: "mission-halfway",
    name: "Deep Orbit",
    description: "Reach Day 4 of the mission simulation.",
    criteria: "Complete the first three mission days.",
    icon: "orbit",
    tier: "Mission",
    accent: "violet",
    check: (state) => state.mission.currentDay >= 4 || state.mission.status === "complete"
  },
  {
    id: "mission-complete",
    name: "Mission Commander",
    description: "Complete all five mission days.",
    criteria: "Generate the final mission report.",
    icon: "rocket",
    tier: "Mission",
    accent: "cyan",
    check: (state) => state.mission.status === "complete"
  },
  {
    id: "distinguished",
    name: "Distinguished Service",
    description: "Earn a Distinguished Mission outcome.",
    criteria: "Finish the simulation with the Distinguished Mission outcome; a critical system cap prevents this award.",
    icon: "shield-check",
    tier: "Mission",
    accent: "amber",
    check: (state) => state.mission.finalReport?.outcome?.status === "excellent"
  },
  {
    id: "task-master",
    name: "Task Master",
    description: "Close every tracked mission task.",
    criteria: "Complete the mission with no pending tasks.",
    icon: "task",
    tier: "Mission",
    accent: "teal",
    check: (state) => state.mission.status === "complete" && state.mission.pendingTasks.length > 0 && state.mission.pendingTasks.every((task) => task.status === "completed")
  },
  {
    id: "mars-explorer",
    name: "Mars Explorer",
    description: "Use NASA Mars Trek and complete the exploration checklist.",
    criteria: "Launch the official NASA resource and mark at least three exploration steps complete.",
    icon: "mars",
    tier: "Exploration",
    accent: "orange",
    check: (state) => Boolean(state.mars?.launched) && (state.mars?.checked?.length || 0) >= 3
  },
  {
    id: "library-researcher",
    name: "Library Researcher",
    description: "Read six Science Library articles.",
    criteria: "Open at least six different Science Library articles.",
    icon: "library",
    tier: "Exploration",
    accent: "violet",
    check: (state) => Object.keys(state.libraryRead || {}).length >= 6
  }
];

export function achievementById(id) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id) || null;
}

export function evaluateAchievements(state, data) {
  state.badges ||= {};
  const earned = [];
  for (const achievement of ACHIEVEMENTS) {
    if (state.badges[achievement.id]) continue;
    let earnedNow = false;
    try {
      earnedNow = Boolean(achievement.check(state, data));
    } catch {
      earnedNow = false;
    }
    if (earnedNow) {
      state.badges[achievement.id] = { earnedAt: new Date().toISOString() };
      earned.push(achievement);
    }
  }
  return earned;
}

export function achievementStats(state) {
  const earned = ACHIEVEMENTS.filter((achievement) => state.badges?.[achievement.id]).length;
  return { earned, total: ACHIEVEMENTS.length, percent: Math.round((earned / ACHIEVEMENTS.length) * 100) };
}

import { percent } from "./utils.js";

export function getCourse(academy, courseId) {
  return academy?.courses?.find((course) => course.id === courseId) || null;
}

export function getModule(course, moduleId) {
  return course?.modules?.find((module) => module.id === moduleId) || null;
}

export function getLesson(module, lessonId) {
  return module?.lessons?.find((lesson) => lesson.id === lessonId) || null;
}

export function emptyCourseState() {
  return {
    lessons: {},
    activities: {},
    moduleQuizzes: {},
    practical: { text: "", submittedAt: null },
    finalAssessment: { bestScore: null, attempts: 0, passed: false, lastAttempt: null, lastAt: null },
    completed: false,
    completedAt: null
  };
}

export function ensureCourseState(state, courseId) {
  if (!state.academy.courses[courseId]) state.academy.courses[courseId] = emptyCourseState();
  const courseState = state.academy.courses[courseId];
  courseState.lessons ||= {};
  courseState.activities ||= {};
  courseState.moduleQuizzes ||= {};
  courseState.practical ||= { text: "", submittedAt: null };
  courseState.finalAssessment ||= { bestScore: null, attempts: 0, passed: false, lastAttempt: null, lastAt: null };
  return courseState;
}

export function lessonComplete(state, courseId, moduleId, lessonId) {
  return Boolean(state.academy.courses?.[courseId]?.lessons?.[`${moduleId}:${lessonId}`]);
}

export function quizState(state, courseId, moduleId) {
  return state.academy.courses?.[courseId]?.moduleQuizzes?.[moduleId] || null;
}

export function isModuleComplete(state, module, courseId = module.courseId) {
  const courseState = state.academy.courses?.[courseId];
  if (!courseState) return false;
  const lessonsDone = module.lessons.every((lesson) => courseState.lessons?.[`${module.id}:${lesson.id}`]);
  const quiz = courseState.moduleQuizzes?.[module.id];
  return lessonsDone && Boolean(quiz?.passed);
}

export function moduleProgress(state, module, courseId = module.courseId) {
  const courseState = state.academy.courses?.[courseId];
  const lessonsDone = courseState ? module.lessons.filter((lesson) => courseState.lessons?.[`${module.id}:${lesson.id}`]).length : 0;
  const quiz = courseState?.moduleQuizzes?.[module.id];
  const total = module.lessons.length + 1;
  const done = lessonsDone + (quiz?.passed ? 1 : 0);
  return {
    lessonsDone,
    totalLessons: module.lessons.length,
    quizPassed: Boolean(quiz?.passed),
    quizBest: quiz?.bestScore ?? null,
    percent: percent(done, total),
    complete: lessonsDone === module.lessons.length && Boolean(quiz?.passed)
  };
}

export function courseProgress(state, course) {
  const courseState = state.academy.courses?.[course.id] || emptyCourseState();
  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const lessonsDone = course.modules.reduce((sum, module) => {
    return sum + module.lessons.filter((lesson) => courseState.lessons?.[`${module.id}:${lesson.id}`]).length;
  }, 0);
  const modulesComplete = course.modules.filter((module) => {
    const lessons = module.lessons.every((lesson) => courseState.lessons?.[`${module.id}:${lesson.id}`]);
    return lessons && Boolean(courseState.moduleQuizzes?.[module.id]?.passed);
  }).length;
  const quizzesPassed = course.modules.filter((module) => courseState.moduleQuizzes?.[module.id]?.passed).length;
  const practicalDone = Boolean(courseState.practical?.submittedAt && courseState.practical?.text?.trim());
  const finalScore = courseState.finalAssessment?.bestScore ?? null;
  const finalPassed = Boolean(courseState.finalAssessment?.passed);
  const totalUnits = totalLessons + course.modules.length + 2;
  const doneUnits = lessonsDone + quizzesPassed + (practicalDone ? 1 : 0) + (finalPassed ? 1 : 0);
  const complete = modulesComplete === course.modules.length && practicalDone && finalPassed;
  return {
    lessonsDone,
    totalLessons,
    modulesComplete,
    totalModules: course.modules.length,
    quizzesPassed,
    practicalDone,
    finalScore,
    finalPassed,
    complete,
    percent: complete ? 100 : percent(doneUnits, totalUnits),
    courseState,
    firstIncompleteModule: course.modules.find((module) => !isModuleComplete(state, module, course.id)) || null
  };
}

export function courseRequirements(state, course) {
  const progress = courseProgress(state, course);
  return [
    {
      id: "modules",
      label: "Complete all five learning modules",
      detail: `${progress.modulesComplete} of ${progress.totalModules} modules complete`,
      done: progress.modulesComplete === progress.totalModules
    },
    {
      id: "practical",
      label: "Submit the course practical activity",
      detail: progress.practicalDone ? "Practical activity submitted" : "Submission required",
      done: progress.practicalDone
    },
    {
      id: "final",
      label: `Achieve at least ${course.final_assessment.passing_score}% in the final assessment`,
      detail: progress.finalScore === null ? "Final assessment not attempted" : `Best score: ${progress.finalScore}%`,
      done: progress.finalPassed
    }
  ];
}

export function missingCourseRequirements(state, course) {
  return courseRequirements(state, course).filter((requirement) => !requirement.done);
}

export function allCoursesComplete(state, academy) {
  return academy.courses.every((course) => courseProgress(state, course).complete);
}

export function challengeUnlocked(state, academy) {
  return allCoursesComplete(state, academy);
}

export function coursePhase(state, course) {
  const progress = courseProgress(state, course);
  if (progress.complete) return "Completed";
  if (progress.modulesComplete === progress.totalModules && progress.practicalDone && !progress.finalPassed) return "Final assessment ready";
  if (progress.lessonsDone === 0 && !progress.practicalDone && progress.finalScore === null) return "Not started";
  return "In progress";
}

export function nextCourseAction(state, course) {
  const progress = courseProgress(state, course);
  if (progress.complete) return { label: "Review course", href: `#/academy/${course.id}` };
  if (progress.modulesComplete < progress.totalModules) {
    const module = progress.firstIncompleteModule;
    return { label: "Continue module", href: `#/academy/${course.id}/module/${module.id}` };
  }
  if (!progress.practicalDone) return { label: "Submit practical", href: `#/academy/${course.id}?scroll=practical` };
  if (!progress.finalPassed) return { label: "Take final assessment", href: `#/academy/${course.id}/assessment` };
  return { label: "Open course", href: `#/academy/${course.id}` };
}

export function nextAcademyAction(state, academy) {
  for (const course of academy.courses) {
    const progress = courseProgress(state, course);
    if (!progress.complete) {
      if (progress.modulesComplete < progress.totalModules) {
        const module = progress.firstIncompleteModule;
        return {
          label: `Continue ${course.short_title}`,
          detail: module ? module.title : course.title,
          href: `#/academy/${course.id}/module/${module.id}`,
          courseId: course.id
        };
      }
      if (!progress.practicalDone) {
        return { label: `Submit ${course.short_title} practical`, detail: course.practical_activity.title, href: `#/academy/${course.id}?scroll=practical`, courseId: course.id };
      }
      return { label: `Take ${course.short_title} assessment`, detail: "You are ready for the final assessment.", href: `#/academy/${course.id}/assessment`, courseId: course.id };
    }
  }
  if (!state.academy.challenge.passed) {
    return { label: "Final Training Challenge", detail: "All six courses complete. One integrated challenge remains.", href: "#/academy/challenge" };
  }
  if (state.mission.status === "complete") {
    return { label: "Review the final mission report", detail: "The five-day simulation is complete. Review the assessment and decision record.", href: "#/reports/final" };
  }
  if (state.mission.started) {
    return { label: `Continue mission · Day ${state.mission.currentDay}`, detail: "Return to Mission Control and continue the fixed five-day scenario.", href: `#/mission/day/${state.mission.currentDay}` };
  }
  return { label: "Start the mission simulation", detail: "Apply your Academy knowledge as Crew Operations Support Officer.", href: "#/mission" };
}

export function academyStats(state, academy) {
  const courses = academy.courses.map((course) => courseProgress(state, course));
  const completed = courses.filter((course) => course.complete).length;
  const totalModules = courses.reduce((sum, progress) => sum + progress.totalModules, 0);
  const modulesComplete = courses.reduce((sum, progress) => sum + progress.modulesComplete, 0);
  const lessons = courses.reduce((sum, progress) => sum + progress.lessonsDone, 0);
  const totalLessons = courses.reduce((sum, progress) => sum + progress.totalLessons, 0);
  const average = Math.round(courses.reduce((sum, progress) => sum + progress.percent, 0) / courses.length);
  return { courses, completed, totalCourses: academy.courses.length, totalModules, modulesComplete, lessons, totalLessons, average };
}

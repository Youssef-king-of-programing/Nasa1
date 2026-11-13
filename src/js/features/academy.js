import {
  allCoursesComplete,
  challengeUnlocked,
  courseProgress,
  courseRequirements,
  getCourse,
  getModule,
  moduleProgress
} from "../academy-engine.js";
import { icon } from "../components/icons.js";
import { renderQuiz } from "../components/quiz.js";
import { chip, disclaimer, emptyState, pageHead, progressBar, ring, sectionHead } from "../components/ui.js";
import { esc, formatDate, percent, wordCount } from "../utils.js";

function missingList(missing) {
  return `<ul class="requirement-list">${missing.map((item) => `
    <li class="is-missing">
      <span class="requirement-mark">${icon("lock", 14)}</span>
      <span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></span>
    </li>`).join("")}</ul>`;
}

function requirementList(requirements) {
  return `<ul class="requirement-list">${requirements.map((item) => `
    <li class="${item.done ? "is-done" : "is-missing"}">
      <span class="requirement-mark">${icon(item.done ? "check" : "minus", 14)}</span>
      <span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></span>
    </li>`).join("")}</ul>`;
}

export function renderAcademy({ data, store }) {
  const state = store.get();
  const courseStats = data.academy.courses.map((course) => ({ course, progress: courseProgress(state, course) }));
  const completed = courseStats.filter((item) => item.progress.complete).length;
  const average = Math.round(courseStats.reduce((sum, item) => sum + item.progress.percent, 0) / courseStats.length);
  const totalModules = courseStats.reduce((sum, item) => sum + item.progress.totalModules, 0);
  const modulesComplete = courseStats.reduce((sum, item) => sum + item.progress.modulesComplete, 0);
  const ready = challengeUnlocked(state, data.academy);

  return `
    ${pageHead({
      eyebrow: "Section A · Astronaut Academy",
      title: "Astronaut Academy",
      subtitle: "Six integrated courses covering the human science behind safe, effective spaceflight. Study the modules, complete the practical work, and prove your knowledge in each final assessment.",
      actions: `<a class="btn btn-secondary" href="#/academy/challenge">${icon("award", 17)} Final Training Challenge</a>`
    })}

    <section class="academy-overview">
      <div class="panel academy-progress-card">
        <div class="academy-progress-main">
          ${ring(average, 132, 9, "academy")}
          <div>
            <div class="kicker">Training pathway</div>
            <h2>${completed === 6 ? "Academy complete" : completed === 0 ? "Begin your astronaut training" : "Keep building your crew knowledge"}</h2>
            <p>${completed} of ${data.academy.courses.length} courses complete. ${modulesComplete} of ${totalModules} modules are signed off. A course badge requires all five modules, the practical activity, and at least 70% on the final assessment.</p>
            <div class="overview-actions">
              <a class="btn btn-primary" href="#/progress">${icon("progress", 16)} View progress</a>
              <a class="btn btn-ghost" href="#/achievements">${icon("achievements", 16)} Badge cabinet</a>
            </div>
          </div>
        </div>
      </div>
      <div class="academy-rules-grid">
        <div class="rule-card"><span>${icon("book-open", 20)}</span><strong>01 · Study</strong><p>Work through all five modules and mark every lesson complete.</p></div>
        <div class="rule-card"><span>${icon("target", 20)}</span><strong>02 · Check</strong><p>Pass each module quiz at 70% or higher. Explanations are provided after every attempt.</p></div>
        <div class="rule-card"><span>${icon("flask", 20)}</span><strong>03 · Practise</strong><p>Submit the course practical activity as a written plan or briefing.</p></div>
        <div class="rule-card"><span>${icon("award", 20)}</span><strong>04 · Certify</strong><p>Score at least 70% on the final assessment to unlock the course badge.</p></div>
      </div>
    </section>

    <section class="home-section">
      ${sectionHead({
        kicker: "Course catalogue",
        title: "The complete six-course curriculum",
        subtitle: "Open any course. Module quizzes, practical activities, and final assessments are all tracked automatically.",
        action: `<span class="badge-count">${completed}/6 complete</span>`
      })}
      <div class="course-grid course-grid-wide">
        ${courseStats.map(({ course, progress }) => `
          <a class="course-card accent-${course.accent} ${progress.complete ? "is-complete" : ""}" href="#/academy/${course.id}">
            <div class="course-glow"></div>
            <div class="course-top">
              <div class="course-icon">${icon(course.icon, 24)}</div>
              <div class="course-code">COURSE ${String(course.number).padStart(2, "0")}</div>
              ${progress.complete ? `<span class="course-badge-mark">${icon("award", 16)}</span>` : ""}
            </div>
            <h3>${esc(course.title)}</h3>
            <p>${esc(course.tagline)}</p>
            <div class="course-tags">
              ${course.modules.slice(0, 3).map((module) => chip(module.title.split(" ").slice(0, 2).join(" "), "subtle")).join("")}
              <span class="chip chip-subtle">+${course.modules.length - 3}</span>
            </div>
            <div class="course-progress">
              <div class="course-progress-head"><span>${progress.complete ? "Course complete" : progress.modulesComplete === 5 ? "Final assessment pending" : "In progress"}</span><strong>${progress.percent}%</strong></div>
              ${progressBar(progress.percent)}
              <div class="course-progress-meta"><span>${progress.modulesComplete}/${progress.totalModules} modules</span><span>${progress.finalPassed ? `Final ${progress.finalScore}%` : "Final assessment pending"}</span></div>
            </div>
            <div class="course-cta"><span>${progress.percent ? "Open course" : "Begin course"}</span>${icon("arrow-right", 16)}</div>
          </a>`).join("")}
      </div>
    </section>

    <section class="challenge-banner ${ready ? "is-ready" : "is-locked"}">
      <div class="challenge-banner-art">${icon("award", 46)}</div>
      <div class="challenge-banner-copy">
        <div class="kicker">Capstone · All six disciplines</div>
        <h2>Final Training Challenge</h2>
        <p>${esc(data.academy.final_training_challenge.description)}</p>
        <div class="challenge-meta">
          ${chip(ready ? "Unlocked" : "Locked", ready ? "success" : "warning", ready ? "check" : "lock")}
          ${chip(`${data.academy.final_training_challenge.passing_score}% pass mark`, "subtle", "target")}
          ${chip(`${data.academy.final_training_challenge.questions.length} integrated questions`, "subtle", "list")}
        </div>
        ${ready
          ? `<a class="btn btn-primary" href="#/academy/challenge">${icon("play", 16)} Enter Final Challenge</a>`
          : `<div class="challenge-lock-note">${icon("lock", 15)} Complete all six courses to unlock. ${completed}/6 done.</div>`}
      </div>
    </section>

    ${disclaimer("The Academy is an educational programme. It does not provide medical advice or operational spaceflight training. Always consult qualified professionals for real health and mission questions.", "Educational curriculum")}
  `;
}

export function renderCourse({ data, store, courseId }) {
  const state = store.get();
  const course = getCourse(data.academy, courseId);
  if (!course) {
    return emptyState({
      title: "Course not found",
      body: "The course you requested is not part of the Academy catalogue.",
      action: `<a class="btn btn-primary" href="#/academy">${icon("arrow-left", 16)} Back to Academy</a>`
    });
  }
  const progress = courseProgress(state, course);
  const requirements = courseRequirements(state, course);
  const missing = requirements.filter((item) => !item.done);
  const courseState = progress.courseState;
  const finalReady = progress.modulesComplete === progress.totalModules && progress.practicalDone;
  const practicalWords = wordCount(courseState.practical?.text || "");
  const minWords = course.practical_activity.minimum_words || 0;
  const finalAttempt = courseState.finalAssessment?.lastAttempt;
  const heroHref = progress.firstIncompleteModule
    ? `#/academy/${course.id}/module/${progress.firstIncompleteModule.id}`
    : !progress.practicalDone
      ? `#/academy/${course.id}`
      : `#/academy/${course.id}/assessment`;
  const heroScroll = !progress.firstIncompleteModule && !progress.practicalDone ? 'data-scroll="practical"' : "";

  return `
    <div class="breadcrumb"><a href="#/academy">${icon("arrow-left", 14)} Astronaut Academy</a><span>/</span><span>Course ${String(course.number).padStart(2, "0")}</span></div>

    <section class="course-hero accent-${course.accent} ${progress.complete ? "is-complete" : ""}">
      <div class="course-hero-glow"></div>
      <div class="course-hero-icon">${icon(course.icon, 38)}</div>
      <div class="course-hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>COURSE ${String(course.number).padStart(2, "0")} · ${progress.complete ? "COMPLETED" : "IN TRAINING"}</div>
        <h1>${esc(course.title)}</h1>
        <p>${esc(course.tagline)}</p>
        <div class="course-hero-tags">
          ${chip(`${course.estimated_minutes} min`, "subtle", "clock")}
          ${chip(`${course.modules.length} modules`, "subtle", "layers")}
          ${chip(`${course.final_assessment.questions.length} final questions`, "subtle", "target")}
          ${progress.complete ? chip("Badge earned", "success", "award") : chip("Badge locked", "subtle", "lock")}
        </div>
      </div>
      <div class="course-hero-progress">
        ${ring(progress.percent, 116, 8, "course")}
        <div class="course-hero-actions">
          <a class="btn btn-primary" href="${heroHref}" ${heroScroll}>${icon(progress.percent ? "play" : "arrow-right", 16)} ${progress.percent ? "Continue" : "Start course"}</a>
          <button class="btn btn-ghost btn-sm" type="button" data-action="scroll-to" data-target="course-outline">Course outline ${icon("chevron-down", 14)}</button>
        </div>
      </div>
    </section>

    <section class="course-layout">
      <div class="course-main">
        <article class="panel prose-panel">
          <div class="kicker">Course introduction</div>
          <h2>Why this course matters</h2>
          ${course.introduction.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
          <div class="objective-block">
            <h3>${icon("target", 18)} Learning objectives</h3>
            <ul class="objective-list">
              ${course.objectives.map((objective) => `<li>${icon("check", 14)}<span>${esc(objective)}</span></li>`).join("")}
            </ul>
          </div>
        </article>

        <div class="panel course-checklist" id="course-requirements">
          <div class="panel-kicker">${icon("shield-check", 15)} Completion requirements</div>
          <h2>${progress.complete ? "Course requirements satisfied" : "Finish all three requirements"}</h2>
          ${requirementList(requirements)}
          ${progress.complete ? `<div class="completion-note">${icon("check-circle", 18)} <div><strong>Course badge earned: ${esc(course.badge.name)}</strong><span>Completed ${formatDate(courseState.completedAt, true)}</span></div></div>` : `<p class="form-note">${icon("info", 14)} The final assessment unlocks after all five modules and the practical activity are complete.</p>`}
        </div>

        <section id="course-outline">
          ${sectionHead({
            kicker: "Curriculum",
            title: "Five learning modules",
            subtitle: "Each module includes lessons, key learning points, a practical prompt, and a four-question quiz.",
            action: `<span class="badge-count">${progress.modulesComplete}/5 complete</span>`
          })}
          <div class="module-list">
            ${course.modules.map((module) => {
              const mp = moduleProgress(state, module, course.id);
              return `
                <a class="module-card ${mp.complete ? "is-complete" : ""}" href="#/academy/${course.id}/module/${module.id}">
                  <div class="module-index">${mp.complete ? icon("check", 18) : String(module.number).padStart(2, "0")}</div>
                  <div class="module-body">
                    <div class="module-heading">
                      <div>
                        <span class="module-kicker">MODULE ${String(module.number).padStart(2, "0")} · ${mp.complete ? "COMPLETE" : `${mp.lessonsDone}/${mp.totalLessons} lessons`}</span>
                        <h3>${esc(module.title)}</h3>
                        <p>${esc(module.summary)}</p>
                      </div>
                      <div class="module-progress">${ring(mp.percent, 58, 5)}</div>
                    </div>
                    <div class="module-lessons">
                      ${module.lessons.map((lesson) => {
                        const done = Boolean(courseState.lessons?.[`${module.id}:${lesson.id}`]);
                        return `<span class="lesson-pill ${done ? "is-done" : ""}">${icon(done ? "check-circle" : "play", 13)} ${esc(lesson.title)}</span>`;
                      }).join("")}
                      <span class="lesson-pill ${mp.quizPassed ? "is-done" : ""}">${icon(mp.quizPassed ? "check-circle" : "target", 13)} Module quiz ${mp.quizBest !== null ? `· ${mp.quizBest}%` : ""}</span>
                    </div>
                  </div>
                  <div class="module-action">${mp.complete ? "Review" : "Open"} ${icon("chevron-right", 16)}</div>
                </a>`;
            }).join("")}
          </div>
        </section>

        <section class="panel practical-panel" id="practical">
          <div class="practical-head">
            <div>
              <div class="kicker">${icon("flask", 14)} Practical activity</div>
              <h2>${esc(course.practical_activity.title)}</h2>
              <p>${esc(course.practical_activity.description)}</p>
            </div>
            ${courseState.practical?.submittedAt ? `<span class="submission-status">${icon("check-circle", 16)} Submitted ${formatDate(courseState.practical.submittedAt, true)}</span>` : `<span class="submission-status is-pending">${icon("clock", 16)} Not submitted</span>`}
          </div>
          <div class="practical-grid">
            <div class="practical-steps">
              <h3>Your task</h3>
              <ol>${course.practical_activity.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
              <p class="micro-note">Minimum ${minWords} words. Your submission is stored in this browser and can be updated.</p>
            </div>
            <form class="practical-form" data-form="practical" data-course="${course.id}" data-min-words="${minWords}">
              <label class="field-label" for="practical-${course.id}">${esc(course.practical_activity.submission_prompt)}</label>
              <textarea class="textarea" id="practical-${course.id}" name="practical" data-word-count rows="7" placeholder="Write your plan, briefing, or explanation here...">${esc(courseState.practical?.text || "")}</textarea>
              <div class="form-line">
                <span class="word-counter" data-word-counter>${practicalWords} / ${minWords} words</span>
                <button class="btn btn-primary" type="submit">${icon("save", 16)} ${courseState.practical?.submittedAt ? "Update submission" : "Save submission"}</button>
              </div>
            </form>
          </div>
        </section>

        <section class="panel assessment-panel" id="final-assessment">
          <div class="assessment-head">
            <div>
              <div class="kicker">${icon("target", 14)} Final assessment</div>
              <h2>${esc(course.final_assessment.title)}</h2>
              <p>${course.final_assessment.questions.length} questions · ${course.final_assessment.passing_score}% pass mark · automatic scoring · retakes allowed</p>
            </div>
            ${progress.finalPassed ? `<span class="submission-status">${icon("check-circle", 16)} Passed · ${progress.finalScore}%</span>` : finalReady ? `<a class="btn btn-primary" href="#/academy/${course.id}/assessment">${icon("play", 16)} ${finalAttempt ? "Review result" : "Start assessment"}</a>` : `<span class="submission-status is-pending">${icon("lock", 16)} Locked</span>`}
          </div>
          ${finalReady
            ? `<div class="assessment-ready">
                <div class="assessment-score-block">
                  <strong>${progress.finalScore !== null ? `${progress.finalScore}%` : "—"}</strong>
                  <span>Best score</span>
                </div>
                <div>
                  <h3>${progress.finalPassed ? "Final assessment complete" : "You are ready to test your knowledge"}</h3>
                  <p>${progress.finalPassed ? "Your best passing score is saved. You can review explanations or retake the assessment to improve your result." : "The assessment covers the whole course. Answers are scored automatically, and each question includes an explanation after submission."}</p>
                  <div class="overview-actions">
                    <a class="btn btn-secondary" href="#/academy/${course.id}/assessment${finalAttempt ? "?retake=1" : ""}">${icon(finalAttempt ? "rotate" : "play", 16)} ${finalAttempt ? "Retake assessment" : "Open assessment"}</a>
                    ${finalAttempt ? `<a class="btn btn-ghost" href="#/academy/${course.id}/assessment">View last result ${icon("arrow-right", 14)}</a>` : ""}
                  </div>
                </div>
              </div>`
            : `<div class="locked-panel">${icon("lock", 20)}<div><strong>The final assessment is locked.</strong><p>Complete all five modules and submit the practical activity first.</p>${missingList(missing.filter((item) => item.id !== "final"))}</div></div>`}
        </section>

        <section class="course-connections">
          ${sectionHead({
            kicker: "Academy → Simulator",
            title: "Apply this course in the mission",
            subtitle: "The simulator surfaces these modules when a related event occurs."
          })}
          <div class="connection-cards">
            ${course.mission_links.map((link) => `
              <a class="connection-card" href="#/mission/day/${link.day}">
                <span class="connection-day">DAY ${String(link.day).padStart(2, "0")}</span>
                <strong>${esc(link.label.replace(/^Day \d+ - /, ""))}</strong>
                <span>Open mission context ${icon("arrow-up-right", 13)}</span>
              </a>`).join("")}
          </div>
        </section>
      </div>

      <aside class="course-rail">
        <div class="panel rail-panel">
          <div class="panel-kicker">${icon("award", 15)} Course badge</div>
          <div class="rail-medal tone-${course.accent} ${progress.complete ? "is-earned" : "is-locked"}">
            <div class="rail-medal-inner">${icon(course.badge.icon, 30)}</div>
            <span>${progress.complete ? "EARNED" : "LOCKED"}</span>
          </div>
          <h3>${esc(course.badge.name)}</h3>
          <p>${esc(course.badge.description)}</p>
          ${progress.complete ? `<div class="rail-earned">${icon("check-circle", 15)} Earned ${formatDate(courseState.completedAt)}</div>` : `<div class="rail-progress">${progressBar(progress.percent)}<span>${progress.percent}% complete</span></div>`}
        </div>

        <div class="panel rail-panel">
          <div class="panel-kicker">${icon("orbit", 15)} Course at a glance</div>
          <dl class="rail-stats">
            <div><dt>Lessons</dt><dd>${progress.lessonsDone}/${progress.totalLessons}</dd></div>
            <div><dt>Modules</dt><dd>${progress.modulesComplete}/${progress.totalModules}</dd></div>
            <div><dt>Practical</dt><dd>${progress.practicalDone ? "Submitted" : "Pending"}</dd></div>
            <div><dt>Final score</dt><dd>${progress.finalScore !== null ? `${progress.finalScore}%` : "—"}</dd></div>
          </dl>
        </div>

        <div class="panel rail-panel">
          <div class="panel-kicker">${icon("external", 15)} NASA resources</div>
          <div class="resource-links">
            ${course.nasa_resources.map((resource) => `<a href="${resource.url}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ${icon("external", 14)}</a>`).join("")}
          </div>
          <p class="micro-note">External links open official NASA pages. Always verify current information at the source.</p>
        </div>
      </aside>
    </section>

    ${disclaimer("This course is educational. It does not replace medical advice or operational training. Practical submissions are stored only in this browser.", "Educational course")}
  `;
}

export function renderModule({ data, store, courseId, moduleId, query }) {
  const state = store.get();
  const course = getCourse(data.academy, courseId);
  const module = getModule(course, moduleId);
  if (!course || !module) {
    return emptyState({
      title: "Module not found",
      body: "This module does not exist in the selected course.",
      action: `<a class="btn btn-primary" href="#/academy">${icon("arrow-left", 16)} Back to Academy</a>`
    });
  }
  const progress = courseProgress(state, course);
  const mp = moduleProgress(state, module, course.id);
  const courseState = progress.courseState;
  const currentLessonId = query.lesson || module.lessons.find((lesson) => !courseState.lessons?.[`${module.id}:${lesson.id}`])?.id || module.lessons[0].id;
  const lesson = module.lessons.find((item) => item.id === currentLessonId) || module.lessons[0];
  const lessonIndex = module.lessons.findIndex((item) => item.id === lesson.id);
  const lessonDone = Boolean(courseState.lessons?.[`${module.id}:${lesson.id}`]);
  const nextLesson = module.lessons[lessonIndex + 1];
  const prevLesson = module.lessons[lessonIndex - 1];
  const quizAttempt = courseState.moduleQuizzes?.[module.id]?.lastAttempt || null;
  const showQuizForm = query.retake === "1" || !quizAttempt;
  const lessonHref = (lessonId) => `#/academy/${course.id}/module/${module.id}?lesson=${lessonId}`;
  const currentModuleIndex = course.modules.findIndex((item) => item.id === module.id);
  const nextModule = course.modules[currentModuleIndex + 1];
  const prevModule = course.modules[currentModuleIndex - 1];
  const activityDone = Boolean(courseState.activities?.[module.id]);

  return `
    <div class="breadcrumb"><a href="#/academy">${icon("arrow-left", 14)} Astronaut Academy</a><span>/</span><a href="#/academy/${course.id}">${esc(course.short_title)}</a><span>/</span><span>Module ${String(module.number).padStart(2, "0")}</span></div>

    <section class="module-topbar">
      <div class="module-topbar-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>MODULE ${String(module.number).padStart(2, "0")} OF ${String(course.modules.length).padStart(2, "0")}</div>
        <h1>${esc(module.title)}</h1>
        <p>${esc(module.summary)}</p>
      </div>
      <div class="module-topbar-progress">
        ${ring(mp.percent, 82, 6)}
        <div><strong>${mp.complete ? "Module complete" : `${mp.lessonsDone}/${mp.totalLessons} lessons`}</strong><span>${mp.quizPassed ? `Quiz passed · ${mp.quizBest}%` : "Quiz pending"}</span></div>
      </div>
    </section>

    <div class="lesson-layout">
      <aside class="lesson-nav-panel" aria-label="Module lessons">
        <div class="lesson-nav-head">
          <span class="panel-kicker">${icon("list", 14)} Module contents</span>
          <span>${mp.lessonsDone}/${mp.totalLessons} done</span>
        </div>
        <nav class="lesson-nav">
          ${module.lessons.map((item, index) => {
            const done = Boolean(courseState.lessons?.[`${module.id}:${item.id}`]);
            return `<a class="lesson-nav-item ${item.id === lesson.id ? "is-active" : ""} ${done ? "is-done" : ""}" href="${lessonHref(item.id)}">
              <span class="lesson-nav-index">${done ? icon("check", 13) : String(index + 1).padStart(2, "0")}</span>
              <span>${esc(item.title)}</span>
            </a>`;
          }).join("")}
          <button class="lesson-nav-item ${mp.quizPassed ? "is-done" : ""}" type="button" data-action="scroll-to" data-target="module-quiz">
            <span class="lesson-nav-index">${mp.quizPassed ? icon("check", 13) : icon("target", 13)}</span>
            <span>Module quiz</span>
          </button>
        </nav>
        <div class="lesson-nav-progress">${progressBar(mp.percent)}<span>${mp.percent}% module progress</span></div>
        <a class="lesson-nav-back" href="#/academy/${course.id}">${icon("arrow-left", 14)} Back to course</a>
      </aside>

      <main class="lesson-main">
        <article class="lesson-content panel">
          <div class="lesson-content-head">
            <span class="kicker">Lesson ${String(lessonIndex + 1).padStart(2, "0")} · ${course.short_title}</span>
            ${lessonDone ? `<span class="submission-status">${icon("check-circle", 15)} Lesson complete</span>` : `<span class="submission-status is-pending">${icon("clock", 15)} In progress</span>`}
          </div>
          <h2>${esc(lesson.title)}</h2>
          ${lesson.content.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
          <div class="key-takeaway">${icon("lightbulb", 20)}<div><span>Key takeaway</span><p>${esc(lesson.key_takeaway)}</p></div></div>
          <div class="lesson-actions">
            ${lessonDone
              ? `<span class="lesson-done-label">${icon("check-circle", 17)} Completed</span>`
              : `<button class="btn btn-primary" type="button" data-action="complete-lesson" data-course="${course.id}" data-module="${module.id}" data-lesson="${lesson.id}">${icon("check", 17)} Mark lesson complete</button>`}
            ${nextLesson ? `<a class="btn btn-secondary" href="${lessonHref(nextLesson.id)}">Next lesson ${icon("arrow-right", 16)}</a>` : `<button class="btn btn-secondary" type="button" data-action="scroll-to" data-target="module-quiz">Go to module quiz ${icon("arrow-down", 16)}</button>`}
          </div>
          <div class="lesson-pager">
            ${prevLesson ? `<a href="${lessonHref(prevLesson.id)}">${icon("arrow-left", 14)} ${esc(prevLesson.title)}</a>` : `<span></span>`}
            <span>${lessonIndex + 1} / ${module.lessons.length}</span>
            ${nextLesson ? `<a href="${lessonHref(nextLesson.id)}">${esc(nextLesson.title)} ${icon("arrow-right", 14)}</a>` : `<span></span>`}
          </div>
        </article>

        <article class="panel keypoints-panel">
          <div class="panel-kicker">${icon("spark", 15)} Key learning points</div>
          <ul>${module.key_points.map((point) => `<li>${icon("check", 14)}<span>${esc(point)}</span></li>`).join("")}</ul>
        </article>

        <article class="panel module-activity-panel" id="module-activity">
          <div class="panel-kicker">${icon("flask", 15)} Practical activity</div>
          <div class="module-activity-head">
            <div>
              <h2>${esc(module.practical_activity.title)}</h2>
              <p>${esc(module.practical_activity.prompt)}</p>
            </div>
            <button class="btn ${activityDone ? "btn-secondary" : "btn-primary"}" type="button" data-action="mark-activity" data-course="${course.id}" data-module="${module.id}">
              ${icon(activityDone ? "check-circle" : "check", 16)} ${activityDone ? "Activity recorded" : "Activity complete"}
            </button>
          </div>
          <ol class="activity-steps">${module.practical_activity.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
          <p class="micro-note">This prompt supports the course practical activity. It is not separately graded, but recording it helps you track your training.</p>
        </article>

        <div id="module-quiz">
          ${renderQuiz({
            formType: "module-quiz",
            courseId: course.id,
            moduleId: module.id,
            questions: module.quiz.questions,
            attempt: quizAttempt,
            passingScore: module.quiz.passing_score ?? 70,
            showForm: showQuizForm,
            retakeHref: `#/academy/${course.id}/module/${module.id}?lesson=${lesson.id}&retake=1`,
            title: `${module.title} quiz`,
            kicker: "Knowledge check",
            description: "Four questions. Pass with 70% or higher to complete the quiz requirement for this module.",
            submitLabel: "Score my quiz",
            id: "module-quiz"
          })}
        </div>

        <div class="module-complete-banner ${mp.complete ? "is-complete" : ""}">
          ${icon(mp.complete ? "check-circle" : "info", 20)}
          <div>
            <strong>${mp.complete ? "Module complete" : "Module requirements"}</strong>
            <p>${mp.complete ? "All lessons and the quiz are complete. Continue to the next module or return to the course overview." : `Complete ${mp.totalLessons - mp.lessonsDone} remaining lesson${mp.totalLessons - mp.lessonsDone === 1 ? "" : "s"} and pass the quiz at 70% to sign off this module.`}</p>
          </div>
        </div>

        <div class="module-nav-actions">
          ${prevModule ? `<a class="btn btn-ghost" href="#/academy/${course.id}/module/${prevModule.id}">${icon("arrow-left", 15)} Previous module</a>` : `<a class="btn btn-ghost" href="#/academy/${course.id}">${icon("arrow-left", 15)} Course overview</a>`}
          ${nextModule ? `<a class="btn btn-primary" href="#/academy/${course.id}/module/${nextModule.id}">Next module ${icon("arrow-right", 15)}</a>` : `<a class="btn btn-primary" href="#/academy/${course.id}?scroll=practical">Course practical ${icon("arrow-right", 15)}</a>`}
        </div>
      </main>
    </div>

    ${disclaimer("This module is educational. It does not provide medical advice or operational procedures.", "Educational lesson")}
  `;
}

export function renderAssessment({ data, store, courseId, query }) {
  const state = store.get();
  const course = getCourse(data.academy, courseId);
  if (!course) {
    return emptyState({ title: "Assessment not found", body: "The requested course assessment does not exist.", action: `<a class="btn btn-primary" href="#/academy">Back to Academy</a>` });
  }
  const progress = courseProgress(state, course);
  const courseState = progress.courseState;
  const ready = progress.modulesComplete === progress.totalModules && progress.practicalDone;
  const attempt = courseState.finalAssessment?.lastAttempt || null;
  const showForm = query.retake === "1" || !attempt;

  if (!ready) {
    return `
      <div class="breadcrumb"><a href="#/academy">${icon("arrow-left", 14)} Astronaut Academy</a><span>/</span><a href="#/academy/${course.id}">${esc(course.short_title)}</a><span>/</span><span>Final assessment</span></div>
      ${pageHead({ eyebrow: "Final assessment", title: course.final_assessment.title, subtitle: "This assessment is locked until the course requirements are complete." })}
      <section class="panel locked-assessment">
        <div class="locked-assessment-icon">${icon("lock", 34)}</div>
        <h2>Complete the training first</h2>
        <p>The final assessment unlocks after all five modules are complete and the practical activity has been submitted.</p>
        ${requirementList(courseRequirements(state, course))}
        <div class="overview-actions">
          <a class="btn btn-primary" href="#/academy/${course.id}">${icon("arrow-left", 16)} Back to course</a>
          ${progress.firstIncompleteModule ? `<a class="btn btn-secondary" href="#/academy/${course.id}/module/${progress.firstIncompleteModule.id}">Continue training</a>` : ""}
        </div>
      </section>`;
  }

  return `
    <div class="breadcrumb"><a href="#/academy">${icon("arrow-left", 14)} Astronaut Academy</a><span>/</span><a href="#/academy/${course.id}">${esc(course.short_title)}</a><span>/</span><span>Final assessment</span></div>
    <section class="assessment-hero accent-${course.accent}">
      <div>
        <div class="eyebrow"><span class="eyebrow-dot"></span>FINAL ASSESSMENT · COURSE ${String(course.number).padStart(2, "0")}</div>
        <h1>${esc(course.final_assessment.title)}</h1>
        <p>${course.final_assessment.questions.length} questions · ${course.final_assessment.passing_score}% pass mark · unlimited retakes · automatic scoring</p>
      </div>
      ${ring(progress.percent, 96, 7, "course")}
    </section>
    ${attempt && !showForm && attempt.passed ? `<div class="passed-banner">${icon("award", 26)}<div><strong>Final assessment passed with ${attempt.score}%</strong><span>${progress.complete ? `Course complete. Badge awarded: ${esc(course.badge.name)}.` : "Complete any remaining requirements to earn the course badge."}</span></div><a class="btn btn-secondary" href="#/academy/${course.id}">Back to course</a></div>` : ""}
    ${renderQuiz({
      formType: "final-assessment",
      courseId: course.id,
      questions: course.final_assessment.questions,
      attempt,
      passingScore: course.final_assessment.passing_score ?? 70,
      showForm,
      retakeHref: `#/academy/${course.id}/assessment?retake=1`,
      title: "Assessment questions",
      kicker: "Automatic scoring",
      description: "Read each question carefully. You will see the correct answers and explanations after submission.",
      submitLabel: "Submit final assessment",
      id: "final-assessment"
    })}
    ${disclaimer("Final assessment results are stored locally and are for education only. They do not confer a real qualification.", "Assessment record")}
  `;
}

export function renderChallenge({ data, store, query }) {
  const state = store.get();
  const challenge = data.academy.final_training_challenge;
  const ready = challengeUnlocked(state, data.academy);
  const challengeState = state.academy.challenge;
  const attempt = challengeState?.lastAttempt || null;
  const showForm = query.retake === "1" || !attempt;
  const completedCourses = data.academy.courses.filter((course) => courseProgress(state, course).complete);

  if (!ready) {
    return `
      ${pageHead({ eyebrow: "Capstone challenge", title: "Final Training Challenge", subtitle: challenge.subtitle })}
      <section class="panel locked-assessment">
        <div class="locked-assessment-icon">${icon("award", 36)}</div>
        <h2>All six courses are required</h2>
        <p>${esc(challenge.prerequisite)} This capstone combines sleep, exercise, nutrition, mental health, hygiene, and human adaptation.</p>
        <div class="challenge-course-progress">
          ${data.academy.courses.map((course) => {
            const progress = courseProgress(state, course);
            return `<a href="#/academy/${course.id}" class="challenge-course-row">
              <span class="mini-course-icon tone-${course.accent}">${icon(course.icon, 17)}</span>
              <span><strong>${esc(course.short_title)}</strong><small>${progress.complete ? "Complete" : `${progress.percent}% complete`}</small></span>
              ${progress.complete ? icon("check-circle", 17) : icon("lock", 15)}
            </a>`;
          }).join("")}
        </div>
        <div class="overview-actions">
          <a class="btn btn-primary" href="#/academy">${icon("academy", 16)} Back to Academy</a>
          <span class="badge-count">${completedCourses.length} / 6 courses complete</span>
        </div>
      </section>`;
  }

  return `
    ${pageHead({
      eyebrow: "Capstone challenge · Unlocked",
      title: challenge.title,
      subtitle: challenge.subtitle,
      actions: `<span class="status-chip status-nominal"><i></i>All six courses complete</span>`
    })}
    <section class="panel challenge-intro">
      <div class="challenge-intro-icon">${icon("award", 36)}</div>
      <div>
        <h2>One integrated crew readiness decision set</h2>
        <p>${esc(challenge.description)}</p>
        <div class="challenge-meta">
          ${chip(`${challenge.questions.length} questions`, "subtle", "list")}
          ${chip(`${challenge.passing_score}% pass mark`, "subtle", "target")}
          ${chip("Practical brief required", "subtle", "flask")}
          ${challengeState?.passed ? chip("Challenge passed", "success", "check-circle") : chip("Not yet passed", "warning", "clock")}
        </div>
      </div>
    </section>
    ${attempt && !showForm && attempt.passed ? `<div class="passed-banner">${icon("award", 26)}<div><strong>Final Training Challenge passed with ${attempt.score}%</strong><span>You earned the Junior Astronaut badge. Your Crew Readiness Brief is saved.</span></div><a class="btn btn-secondary" href="#/achievements">View achievement</a></div>` : ""}
    ${renderQuiz({
      formType: "challenge",
      questions: challenge.questions,
      attempt,
      passingScore: challenge.passing_score,
      showForm,
      retakeHref: "#/academy/challenge?retake=1",
      title: "Integrated scenario questions",
      kicker: "Final Training Challenge",
      description: "Answer all ten questions. Your Crew Readiness Brief is required as part of the submission.",
      submitLabel: "Submit final challenge",
      id: "challenge",
      extra: `
        <div class="challenge-brief">
          <div class="challenge-brief-head">
            <div><span class="kicker">Required practical</span><h3>${esc(challenge.practical_activity.title)}</h3></div>
            <span class="badge-count">${challenge.practical_activity.minimum_words}+ words</span>
          </div>
          <p>${esc(challenge.practical_activity.prompt)}</p>
          <textarea class="textarea" name="practical" data-word-count data-min-words="${challenge.practical_activity.minimum_words}" rows="8" placeholder="Write your crew readiness brief...">${esc(challengeState?.practical?.text || "")}</textarea>
          <div class="word-counter" data-word-counter>${wordCount(challengeState?.practical?.text || "")} / ${challenge.practical_activity.minimum_words} words</div>
        </div>`
    })}
    ${disclaimer("The Final Training Challenge is an educational capstone. It is not a real certification or operational assessment.", "Capstone challenge")}
  `;
}

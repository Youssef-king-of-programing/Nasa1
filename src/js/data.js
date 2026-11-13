const DATA_FILES = {
  academy: new URL("../data/astronaut_academy.json", import.meta.url),
  mission: new URL("../data/integrated_space_station_mission_scenario.json", import.meta.url),
  library: new URL("../data/science_library.json", import.meta.url)
};

async function fetchJSON(label, url) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(`${label} could not be loaded. If you opened index.html directly, run a local server instead. (${error.message})`);
  }
  if (!response.ok) {
    throw new Error(`${label} failed to load (HTTP ${response.status}). Run the site through a local web server.`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${label} contains invalid JSON: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Data validation failed: ${message}`);
}

function validateAcademy(academy) {
  assert(academy && Array.isArray(academy.courses), "astronaut_academy.json must contain a courses array.");
  assert(academy.courses.length === 6, `expected 6 Academy courses, found ${academy.courses.length}.`);
  const ids = new Set();
  for (const course of academy.courses) {
    assert(course.id && !ids.has(course.id), `duplicate or missing course id: ${course.id}`);
    ids.add(course.id);
    assert(Array.isArray(course.modules) && course.modules.length === 5, `course ${course.id} must contain 5 modules.`);
    assert(Array.isArray(course.objectives) && course.objectives.length > 0, `course ${course.id} is missing objectives.`);
    assert(Array.isArray(course.introduction) && course.introduction.length > 0, `course ${course.id} is missing an introduction.`);
    assert(course.practical_activity?.submission_prompt, `course ${course.id} is missing a practical activity.`);
    assert(course.final_assessment?.questions?.length >= 2, `course ${course.id} is missing a final assessment.`);
    validateQuestions(course.final_assessment.questions, `${course.id} final assessment`);
    for (const module of course.modules) {
      assert(module.id && module.title, `course ${course.id} has a module without id/title.`);
      assert(Array.isArray(module.lessons) && module.lessons.length >= 1, `module ${module.id} has no lessons.`);
      assert(Array.isArray(module.key_points) && module.key_points.length >= 1, `module ${module.id} has no key learning points.`);
      assert(module.practical_activity?.prompt, `module ${module.id} has no practical activity.`);
      assert(module.quiz?.questions?.length >= 1, `module ${module.id} has no quiz.`);
      validateQuestions(module.quiz.questions, module.id);
    }
  }
  const challenge = academy.final_training_challenge;
  assert(challenge?.questions?.length >= 1, "Final Training Challenge is missing questions.");
  validateQuestions(challenge.questions, "Final Training Challenge");
  assert(challenge.practical_activity?.prompt, "Final Training Challenge is missing its practical activity.");
}

function validateQuestions(questions, label) {
  const ids = new Set();
  for (const question of questions) {
    assert(question.id && !ids.has(question.id), `${label} has a duplicate or missing question id.`);
    ids.add(question.id);
    assert(typeof question.question === "string", `${question.id} is missing question text.`);
    assert(Array.isArray(question.options) && question.options.length >= 2, `${question.id} needs at least two options.`);
    assert(Number.isInteger(question.correct_index) && question.correct_index >= 0 && question.correct_index < question.options.length, `${question.id} has an invalid correct_index.`);
    assert(typeof question.explanation === "string", `${question.id} is missing an explanation.`);
  }
}

function validateMission(mission) {
  assert(mission && Array.isArray(mission.days), "integrated_space_station_mission_scenario.json must contain a days array.");
  assert(mission.days.length === 5, `expected 5 mission days, found ${mission.days.length}.`);
  assert(mission.initial_state?.systems, "mission is missing initial systems.");
  const systems = Object.keys(mission.initial_state.systems);
  const eventIds = new Set();
  const taskIds = new Set();
  for (const task of mission.initial_state.pending_tasks || []) taskIds.add(task.id);
  for (const day of mission.days) {
    assert(day.day >= 1 && day.title, "mission day is missing a number or title.");
    assert(Array.isArray(day.events) && day.events.length >= 1, `Day ${day.day} has no events.`);
    for (const event of day.events) {
      assert(event.id && !eventIds.has(event.id), `duplicate or missing event id: ${event.id}`);
      eventIds.add(event.id);
      assert(event.prompt, `event ${event.id} has no decision prompt.`);
      assert(Array.isArray(event.options) && event.options.length >= 2, `event ${event.id} needs at least two options.`);
      for (const option of event.options) {
        assert(option.id && option.label, `event ${event.id} has an option without id/label.`);
        assert(option.consequences?.narrative, `option ${option.id} has no consequence narrative.`);
        assert(["optimal", "acceptable", "high_risk"].includes(option.quality), `option ${option.id} has an invalid quality.`);
        for (const effect of option.consequences.effects || []) {
          assert(systems.includes(effect.system), `option ${option.id} references unknown system ${effect.system}.`);
          assert(["improve", "hold", "worsen"].includes(effect.direction), `option ${option.id} has an invalid effect direction.`);
        }
        for (const task of option.consequences.tasks_add || []) {
          assert(task.id && task.label, `option ${option.id} adds an invalid task.`);
          taskIds.add(task.id);
        }
      }
    }
  }
  assert(mission.assessment_rules?.weights, "mission assessment rules are missing.");
}

function validateLibrary(library) {
  assert(library && Array.isArray(library.categories), "science_library.json must contain categories.");
  assert(library.categories.length === 12, `expected 12 Science Library categories, found ${library.categories.length}.`);
  const ids = new Set();
  for (const category of library.categories) {
    assert(category.id && category.name, "library category is missing id/name.");
    assert(Array.isArray(category.articles) && category.articles.length >= 1, `category ${category.id} has no articles.`);
    for (const article of category.articles) {
      assert(article.id && !ids.has(article.id), `duplicate or missing article id: ${article.id}`);
      ids.add(article.id);
      assert(Array.isArray(article.sections) && article.sections.length > 0, `article ${article.id} has no sections.`);
    }
  }
}

export async function loadPlatformData() {
  const [academy, mission, library] = await Promise.all([
    fetchJSON("Astronaut Academy", DATA_FILES.academy),
    fetchJSON("Mission Scenario", DATA_FILES.mission),
    fetchJSON("Science Library", DATA_FILES.library)
  ]);
  validateAcademy(academy);
  validateMission(mission);
  validateLibrary(library);
  return { academy, mission, library, meta: { loadedAt: new Date().toISOString() } };
}

export const dataFiles = DATA_FILES;

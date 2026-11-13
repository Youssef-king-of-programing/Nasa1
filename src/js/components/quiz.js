import { icon } from "./icons.js";
import { esc } from "../utils.js";

function attemptSummary(attempt, passingScore) {
  const passed = attempt.passed;
  return `
    <div class="quiz-result ${passed ? "is-passed" : "is-failed"}">
      <div class="quiz-result-score">
        <strong>${attempt.score}<span>%</span></strong>
        <small>${attempt.correct} of ${attempt.total} correct</small>
      </div>
      <div class="quiz-result-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>${passed ? "Requirement met" : "Keep training"}</div>
        <h3>${passed ? "Assessment passed." : `A score of ${passingScore}% is required.`}</h3>
        <p>${passed ? "Your result has been saved. Review the explanations below, then continue your training path." : "Review the explanations, revisit the lesson material, and try again when you are ready."}</p>
      </div>
      <div class="quiz-result-icon">${icon(passed ? "check-circle" : "rotate", 34)}</div>
    </div>`;
}

function review(questions, attempt) {
  return `
    <details class="quiz-review">
      <summary>${icon("list", 16)} Review all ${questions.length} questions and explanations <span class="details-chevron">${icon("chevron-down", 16)}</span></summary>
      <div class="review-list">
        ${questions.map((question, index) => {
          const result = attempt.results.find((item) => item.questionId === question.id) || {};
          const selectedText = Number.isInteger(result.selected) ? question.options[result.selected] : "No answer";
          return `
            <article class="review-item ${result.isCorrect ? "is-correct" : "is-wrong"}">
              <div class="review-number">${String(index + 1).padStart(2, "0")}</div>
              <div class="review-copy">
                <h4>${esc(question.question)}</h4>
                <div class="review-answer">
                  <span class="${result.isCorrect ? "answer-correct" : "answer-wrong"}">${icon(result.isCorrect ? "check" : "close", 14)} Your answer: ${esc(selectedText)}</span>
                  ${!result.isCorrect ? `<span class="answer-correct">${icon("check", 14)} Correct: ${esc(question.options[question.correct_index])}</span>` : ""}
                </div>
                <p class="review-explanation">${esc(question.explanation)}</p>
              </div>
            </article>`;
        }).join("")}
      </div>
    </details>`;
}

export function renderQuiz({
  formType,
  courseId = "",
  moduleId = "",
  questions,
  attempt = null,
  passingScore = 70,
  showForm = false,
  retakeHref = "",
  title = "Knowledge check",
  kicker = "Quiz",
  description = "",
  submitLabel = "Submit answers",
  extra = "",
  id = "quiz"
}) {
  const hasAttempt = Boolean(attempt);
  const displayForm = showForm || !hasAttempt;
  return `
    <section class="quiz-panel" id="${esc(id)}">
      <div class="quiz-head">
        <div>
          <div class="kicker">${esc(kicker)}</div>
          <h2>${esc(title)}</h2>
          ${description ? `<p>${esc(description)}</p>` : ""}
        </div>
        <div class="quiz-pass-mark">${icon("target", 18)} Pass mark <strong>${passingScore}%</strong></div>
      </div>
      ${hasAttempt && !displayForm ? attemptSummary(attempt, passingScore) : ""}
      ${displayForm ? `
        <form class="quiz-form" data-form="${esc(formType)}" data-course="${esc(courseId)}" data-module="${esc(moduleId)}" data-question-count="${questions.length}" novalidate>
          ${extra}
          <div class="quiz-progress-line">
            <span>Answer all ${questions.length} questions</span>
            <span data-quiz-progress>0 / ${questions.length} answered</span>
          </div>
          <div class="question-list">
            ${questions.map((question, index) => `
              <fieldset class="question-card">
                <legend>
                  <span class="question-index">Q${String(index + 1).padStart(2, "0")}</span>
                  <span>${esc(question.question)}</span>
                </legend>
                <div class="option-list">
                  ${question.options.map((option, optionIndex) => `
                    <label class="option">
                      <input type="radio" name="q-${esc(question.id)}" value="${optionIndex}" data-question="${esc(question.id)}" />
                      <span class="option-control">${icon("check", 13)}</span>
                      <span class="option-text">${esc(option)}</span>
                    </label>`).join("")}
                </div>
              </fieldset>`).join("")}
          </div>
          <div class="quiz-actions">
            <p class="form-note">${icon("info", 14)} Answers are scored automatically when you submit. You can retake a quiz.</p>
            <button class="btn btn-primary" type="submit">${icon("send", 17)} ${esc(submitLabel)}</button>
          </div>
        </form>` : ""}
      ${hasAttempt && !displayForm ? `
        <div class="quiz-result-actions">
          ${retakeHref ? `<a class="btn btn-secondary" href="${retakeHref}">${icon("rotate", 16)} Retake</a>` : ""}
          ${review(questions, attempt)}
        </div>` : ""}
    </section>`;
}

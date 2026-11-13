import { ACHIEVEMENTS, achievementStats } from "../achievements.js";
import { icon } from "../components/icons.js";
import { chip, disclaimer, pageHead, progressBar, ring, sectionHead } from "../components/ui.js";
import { esc, formatDate } from "../utils.js";

const TIER_ORDER = ["Academy", "Course badge", "Milestone", "Mission", "Exploration"];

function achievementCard(achievement, earnedAt) {
  const earned = Boolean(earnedAt);
  return `
    <button class="achievement-card tone-${esc(achievement.accent)} ${earned ? "is-earned" : "is-locked"}" type="button" data-action="open-achievement" data-achievement="${esc(achievement.id)}" data-earned="${earned}" data-achievement-card aria-label="${esc(achievement.name)} — ${earned ? "earned" : "locked"}">
      <div class="achievement-card-glow"></div>
      <div class="achievement-card-top">
        <div class="achievement-medallion">${icon(achievement.icon, 27)}</div>
        <span class="achievement-tier">${esc(achievement.tier)}</span>
        <span class="achievement-state">${earned ? icon("check-circle", 17) : icon("lock", 15)}</span>
      </div>
      <h3>${esc(achievement.name)}</h3>
      <p>${esc(achievement.description)}</p>
      <div class="achievement-criteria">
        <span>Criteria</span>
        <small>${esc(achievement.criteria)}</small>
      </div>
      <div class="achievement-card-foot">
        <span>${earned ? `Earned ${formatDate(earnedAt)}` : "Not yet earned"}</span>
        <span class="achievement-open">${earned ? "View badge" : "View criteria"} ${icon("arrow-right", 13)}</span>
      </div>
    </button>`;
}

export function renderAchievements({ data, store }) {
  const state = store.get();
  const stats = achievementStats(state);
  const earned = ACHIEVEMENTS.filter((achievement) => state.badges?.[achievement.id]);
  const latest = [...earned].sort((a, b) => new Date(state.badges[b.id].earnedAt) - new Date(state.badges[a.id].earnedAt))[0];
  const tierCounts = TIER_ORDER.map((tier) => {
    const items = ACHIEVEMENTS.filter((achievement) => achievement.tier === tier);
    return {
      tier,
      total: items.length,
      earned: items.filter((achievement) => state.badges?.[achievement.id]).length
    };
  });

  return `
    ${pageHead({
      eyebrow: "Section G · Achievements",
      title: "Achievement Cabinet",
      subtitle: "Twenty badges record meaningful steps across the Academy, the mission simulation, and independent exploration. Every achievement is evaluated automatically from saved progress.",
      actions: `<a class="btn btn-secondary" href="#/progress">${icon("progress", 16)} View progress record</a>`
    })}

    <section class="achievement-hero">
      <div class="achievement-hero-main">
        ${ring(stats.percent, 142, 9, "earned")}
        <div class="achievement-hero-copy">
          <div class="eyebrow"><span class="eyebrow-dot"></span>BADGE CABINET</div>
          <h2>${stats.earned === 0 ? "Your first badge is within reach." : stats.earned === stats.total ? "Every badge in the cabinet is earned." : `${stats.earned} of ${stats.total} achievements earned.`}</h2>
          <p>Badges are awarded for lessons, quizzes, practical work, course completion, the capstone challenge, mission decisions, mission outcomes, Mars exploration, and library reading.</p>
          <div class="achievement-hero-meta">
            ${chip(`${stats.earned} earned`, stats.earned ? "success" : "subtle", "award")}
            ${chip(`${stats.total - stats.earned} locked`, "subtle", "lock")}
            ${latest ? chip(`Latest: ${latest.name}`, "subtle", "spark") : chip("No badge yet", "subtle", "spark")}
          </div>
          ${progressBar(stats.percent, "amber")}
        </div>
      </div>
      <div class="achievement-tier-board">
        ${tierCounts.map((tier) => `
          <div class="tier-board-row">
            <span>${esc(tier.tier)}</span>
            <div class="tier-board-bar">${progressBar(tier.total ? Math.round((tier.earned / tier.total) * 100) : 0, "cyan")}</div>
            <strong>${tier.earned}/${tier.total}</strong>
          </div>`).join("")}
      </div>
    </section>

    <section class="achievement-filter-bar" aria-label="Filter achievements">
      <div class="filter-buttons">
        <button class="filter-button is-active" type="button" data-action="filter-achievements" data-filter="all">All <span>${stats.total}</span></button>
        <button class="filter-button" type="button" data-action="filter-achievements" data-filter="earned">Earned <span>${stats.earned}</span></button>
        <button class="filter-button" type="button" data-action="filter-achievements" data-filter="locked">Locked <span>${stats.total - stats.earned}</span></button>
      </div>
      <span class="filter-note">${icon("info", 14)} Filters apply to this page only.</span>
    </section>

    <section class="achievement-grid" data-achievement-grid>
      ${ACHIEVEMENTS.map((achievement) => achievementCard(achievement, state.badges?.[achievement.id]?.earnedAt)).join("")}
    </section>

    <div class="achievement-empty-filter" data-achievement-empty hidden>
      ${icon("award", 30)}
      <strong>No achievements in this filter.</strong>
      <span>Switch to “All” to see the full cabinet.</span>
    </div>

    <section class="home-section">
      ${sectionHead({
        kicker: "How badges work",
        title: "Automatic, local, and transparent",
        subtitle: "Achievements are checked after every saved action. No badge is awarded from a placeholder or a dead interaction."
      })}
      <div class="achievement-rules">
        <article class="rule-card"><span>${icon("book-open", 20)}</span><strong>Learn</strong><p>Lessons and module quizzes build the Academy badge pathway.</p></article>
        <article class="rule-card"><span>${icon("flask", 20)}</span><strong>Practise</strong><p>Practical submissions and final assessments complete each course.</p></article>
        <article class="rule-card"><span>${icon("mission", 20)}</span><strong>Apply</strong><p>Mission decisions, outcomes, and task completion unlock mission badges.</p></article>
        <article class="rule-card"><span>${icon("globe", 20)}</span><strong>Explore</strong><p>NASA Mars Trek steps and Science Library reading reward independent study.</p></article>
      </div>
    </section>

    ${disclaimer("Achievements are local educational markers. They are not official NASA awards, certifications, or evidence of operational readiness.", "Educational badges")}
  `;
}

export function achievementDestination(achievement) {
  if (!achievement) return { href: "#/home", label: "Return home" };
  if (achievement.tier === "Course badge" || achievement.tier === "Academy" || achievement.tier === "Milestone") {
    return { href: "#/academy", label: "Open the Academy" };
  }
  if (achievement.tier === "Mission") return { href: "#/mission", label: "Open the mission" };
  if (achievement.id === "mars-explorer") return { href: "#/mars", label: "Open Mars Exploration" };
  if (achievement.id === "library-researcher") return { href: "#/library", label: "Open the Science Library" };
  return { href: "#/home", label: "Return home" };
}

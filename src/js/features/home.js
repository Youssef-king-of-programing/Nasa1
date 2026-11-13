import { academyStats, challengeUnlocked, courseProgress, nextAcademyAction } from "../academy-engine.js";
import { ACHIEVEMENTS, achievementStats } from "../achievements.js";
import { courseCard, compactBadge, missionDayCard } from "../components/cards.js";
import { icon } from "../components/icons.js";
import { chip, disclaimer, progressBar, ring, sectionHead, statCard } from "../components/ui.js";
import { esc, formatShort, percent } from "../utils.js";
import { missionStats } from "../mission-engine.js";

function heroScene(state, completedCourses) {
  const missionDay = state.mission.started ? (state.mission.status === "complete" ? "Complete" : `Day ${state.mission.currentDay}`) : "Briefing";
  return `
    <div class="hero-visual" aria-hidden="true">
      <div class="hero-grid"></div>
      <svg class="hero-illustration" viewBox="0 0 560 560" role="presentation">
        <defs>
          <radialGradient id="planetFill" cx="38%" cy="32%" r="72%">
            <stop offset="0%" stop-color="#7fe8ff"/>
            <stop offset="32%" stop-color="#2d8cff"/>
            <stop offset="72%" stop-color="#123c84"/>
            <stop offset="100%" stop-color="#071630"/>
          </radialGradient>
          <linearGradient id="ringStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#67ecff" stop-opacity=".1"/>
            <stop offset="45%" stop-color="#67ecff" stop-opacity=".8"/>
            <stop offset="100%" stop-color="#7a7cff" stop-opacity=".12"/>
          </linearGradient>
          <linearGradient id="stationStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#bff7ff"/>
            <stop offset="100%" stop-color="#4d9dff"/>
          </linearGradient>
          <filter id="softGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <circle cx="280" cy="288" r="188" fill="none" stroke="rgba(91,231,255,.12)" stroke-dasharray="2 8"/>
        <circle cx="280" cy="288" r="228" fill="none" stroke="rgba(91,231,255,.08)" stroke-dasharray="1 12"/>
        <ellipse cx="280" cy="288" rx="270" ry="112" fill="none" stroke="url(#ringStroke)" stroke-width="1.2" transform="rotate(-22 280 288)"/>
        <ellipse cx="280" cy="288" rx="240" ry="88" fill="none" stroke="rgba(122,124,255,.18)" stroke-width="1" transform="rotate(28 280 288)"/>
        <circle cx="280" cy="288" r="150" fill="url(#planetFill)" opacity=".96"/>
        <path d="M180 260c36-28 76-30 113-12s67 12 103-12" fill="none" stroke="rgba(196,248,255,.3)" stroke-width="1.2"/>
        <path d="M168 320c48 24 93 18 128 0s58-24 104-8" fill="none" stroke="rgba(3,24,62,.45)" stroke-width="16" opacity=".35"/>
        <circle cx="224" cy="235" r="20" fill="rgba(3,20,50,.18)"/>
        <circle cx="352" cy="343" r="27" fill="rgba(3,20,50,.18)"/>
        <circle cx="343" cy="233" r="12" fill="rgba(3,20,50,.24)"/>
        <g filter="url(#softGlow)" transform="rotate(-18 280 288)">
          <ellipse cx="280" cy="288" rx="212" ry="68" fill="none" stroke="#5be7ff" stroke-opacity=".28" stroke-width="1.4" stroke-dasharray="3 7"/>
          <g transform="translate(444 265) rotate(18)">
            <rect x="-18" y="-7" width="36" height="14" rx="4" fill="#081b34" stroke="url(#stationStroke)" stroke-width="1.4"/>
            <rect x="-35" y="-3" width="13" height="6" rx="1" fill="#1b5c9e" stroke="#66dfff" stroke-width=".8"/>
            <rect x="22" y="-3" width="13" height="6" rx="1" fill="#1b5c9e" stroke="#66dfff" stroke-width=".8"/>
            <path d="M-12 -7v-8h8v8M4 -7v-8h8v8" fill="none" stroke="#66dfff" stroke-width=".9"/>
          </g>
        </g>
        <g opacity=".8">
          <circle cx="92" cy="120" r="2" fill="#9beeff"/>
          <circle cx="466" cy="92" r="1.5" fill="#9beeff"/>
          <circle cx="500" cy="392" r="2" fill="#8f9cff"/>
          <circle cx="72" cy="420" r="1.5" fill="#8f9cff"/>
          <circle cx="390" cy="120" r="1" fill="#d9fbff"/>
        </g>
      </svg>
      <div class="hero-float hero-float-top">
        <span class="float-icon">${icon("shield-check", 16)}</span>
        <div><small>MISSION READINESS</small><strong>${state.mission.started ? "Tracked live" : "Awaiting crew"}</strong></div>
      </div>
      <div class="hero-float hero-float-bottom">
        <span class="float-icon">${icon("orbit", 16)}</span>
        <div><small>SIMULATION CLOCK</small><strong>${missionDay}</strong></div>
      </div>
      <div class="hero-float hero-float-side">
        <span class="float-kicker">ACADEMY</span>
        <strong>${completedCourses}<span>/6</span></strong>
        <small>courses complete</small>
      </div>
    </div>`;
}

export function renderHome({ data, store }) {
  const state = store.get();
  const academy = academyStats(state, data.academy);
  const badges = achievementStats(state);
  const next = nextAcademyAction(state, data.academy);
  const mStats = missionStats(state.mission, data.mission);
  const earnedAchievements = ACHIEVEMENTS.filter((achievement) => state.badges[achievement.id])
    .sort((a, b) => new Date(state.badges[b.id].earnedAt) - new Date(state.badges[a.id].earnedAt))
    .slice(0, 4);
  const missionActive = state.mission.started && state.mission.status === "active";
  const missionComplete = state.mission.status === "complete";
  const challengeReady = challengeUnlocked(state, data.academy);
  const latestActivity = state.activity[0];
  const heroPrimaryHref = missionActive ? `#/mission/day/${state.mission.currentDay}` : missionComplete ? "#/reports/final" : "#/academy";
  const heroPrimaryLabel = missionActive ? `Continue mission · Day ${state.mission.currentDay}` : missionComplete ? "Review final mission report" : "Enter Astronaut Academy";
  const nextHref = String(next.href || "");
  const nextIsMission = nextHref.startsWith("#/mission") || nextHref.startsWith("#/reports");
  const nextProgress = nextIsMission ? (missionComplete ? 100 : mStats.progressPercent) : academy.average;

  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>COHORT 01 · CREW OPERATIONS TRACK</div>
        <h1>Train for the human side of <span class="grad-text">spaceflight.</span></h1>
        <p class="hero-lede">Learn astronaut science in the Academy, apply it across a five-day station simulation, and explore the real surface of Mars with NASA's official exploration tools.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="${heroPrimaryHref}">${icon(missionActive ? "play" : "academy", 19)} ${esc(heroPrimaryLabel)}</a>
          <a class="btn btn-secondary btn-lg" href="#/mission">${icon("mission", 19)} ${state.mission.started ? "Mission console" : "Mission briefing"}</a>
        </div>
        <div class="hero-trust">
          <span>${icon("check-circle", 15)} 6 complete courses</span>
          <span>${icon("check-circle", 15)} 5 mission days</span>
          <span>${icon("check-circle", 15)} NASA Mars Trek</span>
        </div>
      </div>
      ${heroScene(state, academy.completed)}
    </section>

    <section class="stat-row" aria-label="Training overview">
      ${statCard({ label: "Academy progress", value: `${academy.average}%`, detail: `${academy.modulesComplete}/${academy.totalModules} modules complete`, icon: "academy", tone: "cyan", href: "#/academy" })}
      ${statCard({ label: "Courses completed", value: `${academy.completed}<span class="stat-of">/ ${academy.totalCourses}</span>`, detail: academy.completed === academy.totalCourses ? "Academy graduate" : "Complete all six to unlock the challenge", icon: "award", tone: "blue", href: "#/progress" })}
      ${statCard({ label: "Mission status", value: missionComplete ? "Complete" : missionActive ? `Day ${state.mission.currentDay}<span class="stat-of">/ 5</span>` : "Briefing", detail: missionComplete ? `Final score ${state.mission.finalReport?.score ?? "—"}%` : missionActive ? `${mStats.decided} of ${mStats.totalEvents} decisions logged` : "Start the five-day simulation", icon: "mission", tone: "violet", href: "#/mission" })}
      ${statCard({ label: "Achievements", value: `${badges.earned}<span class="stat-of">/ ${badges.total}</span>`, detail: earnedAchievements[0] ? `Latest: ${earnedAchievements[0].name}` : "Your first badge is one lesson away", icon: "achievements", tone: "amber", href: "#/achievements" })}
    </section>

    <section class="home-split">
      <article class="panel continue-panel">
        <div class="panel-kicker">${icon("target", 15)} Your next step</div>
        <div class="continue-main">
          <div class="continue-ring">${ring(state.mission.started ? mStats.progressPercent : academy.average, 96, 7, state.mission.started ? "mission" : "academy")}</div>
          <div class="continue-copy">
            <span class="kicker">${state.mission.started ? "Recommended mission action" : "Recommended Academy action"}</span>
            <h2>${esc(next.label)}</h2>
            <p>${esc(next.detail)}</p>
            <a class="btn btn-primary" href="${next.href}">${icon("arrow-right", 17)} Continue</a>
          </div>
        </div>
        <div class="continue-footer">
          <div><span>Last activity</span><strong>${latestActivity ? esc(latestActivity.label) : "No activity recorded yet"}</strong></div>
          <span class="mini-time">${latestActivity ? formatShort(latestActivity.at) : "Start anywhere"}</span>
        </div>
      </article>

      <article class="panel mission-snapshot">
        <div class="panel-kicker">${icon("orbit", 15)} Five-day mission</div>
        <div class="mission-snapshot-head">
          <div>
            <h2>${missionComplete ? "Mission complete" : missionActive ? `Day ${state.mission.currentDay} in progress` : "Awaiting crew"}</h2>
            <p>${missionActive ? `${mStats.remaining} decisions remain across the scenario.` : missionComplete ? "Review the final report and decision history." : "Prepare for station preparation, radiation, equipment, fatigue, and final assessment."}</p>
          </div>
          <a class="btn btn-secondary btn-sm" href="${missionComplete ? "#/reports/final" : "#/mission"}">${missionComplete ? "Final report" : "Open console"} ${icon("arrow-up-right", 14)}</a>
        </div>
        <div class="system-mini-grid">
          ${Object.entries(state.mission.systems).slice(0, 6).map(([key, status]) => {
            const system = data.mission.initial_state.systems[key];
            return `<div class="system-mini"><span class="mini-status ${status}"></span><span>${esc(system.label)}</span><small>${status}</small></div>`;
          }).join("")}
        </div>
        <div class="day-strip">
          ${data.mission.days.map((day) => missionDayCard(day, state, data.mission)).join("")}
        </div>
      </article>
    </section>

    <section class="home-section">
      ${sectionHead({
        kicker: "Astronaut Academy",
        title: "Six disciplines. One mission-ready crew.",
        subtitle: "Every course combines explanations, key learning points, a practical activity, module quizzes, and a final assessment.",
        action: `<a class="btn btn-ghost" href="#/academy">View Academy ${icon("arrow-right", 16)}</a>`
      })}
      <div class="course-grid">
        ${data.academy.courses.map((course) => courseCard(course, state)).join("")}
      </div>
    </section>

    <section class="pathway-section">
      <div class="pathway-intro">
        <div class="kicker">Learn → Apply → Explore</div>
        <h2>The Academy teaches the knowledge. The mission tests how you use it.</h2>
        <p>Each mission event links back to a relevant Academy module, so a decision about sleep, exercise, nutrition, or communication becomes a chance to apply what you learned.</p>
        <a class="btn btn-secondary" href="#/academy/sleep-circadian-rhythm">See a course pathway ${icon("arrow-right", 16)}</a>
      </div>
      <div class="pathway-cards">
        <a class="pathway-card accent-cyan" href="#/academy/sleep-circadian-rhythm/module/sleep-m5">
          <span class="pathway-step">01 · LEARN</span>
          <div class="pathway-icon">${icon("moon", 22)}</div>
          <h3>Protect sleep</h3>
          <p>Build a crew sleep plan and recognize cumulative fatigue.</p>
          <span class="pathway-link">Sleep & Circadian Rhythm ${icon("arrow-right", 14)}</span>
        </a>
        <a class="pathway-card accent-blue" href="#/mission/day/1">
          <span class="pathway-step">02 · APPLY</span>
          <div class="pathway-icon">${icon("compass", 22)}</div>
          <h3>Make the call</h3>
          <p>Decide whether to compress the schedule or protect rest.</p>
          <span class="pathway-link">Mission Day 1 ${icon("arrow-right", 14)}</span>
        </a>
        <a class="pathway-card accent-orange" href="#/mars">
          <span class="pathway-step">03 · EXPLORE</span>
          <div class="pathway-icon">${icon("mars", 22)}</div>
          <h3>Look beyond</h3>
          <p>Explore real Mars data and landing regions with NASA Mars Trek.</p>
          <span class="pathway-link">Mars Exploration Center ${icon("arrow-right", 14)}</span>
        </a>
      </div>
    </section>

    <section class="home-split home-split-bottom">
      <article class="panel mars-teaser">
        <div class="mars-teaser-art" aria-hidden="true">
          <div class="mars-planet"></div>
          <div class="mars-orbit"></div>
          <span class="mars-moon m1"></span>
          <span class="mars-moon m2"></span>
        </div>
        <div class="mars-teaser-copy">
          <div class="kicker">${icon("globe", 14)} NASA resource integration</div>
          <h2>Explore the real surface of Mars.</h2>
          <p>NASA Mars Trek is an official exploration tool. Use its map layers, terrain, and mission data, then complete a guided observation checklist.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/mars">${icon("mars", 17)} Enter Mars Center</a>
            <a class="btn btn-ghost" href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer" data-action="mars-launch">Official NASA Mars Trek ${icon("external", 14)}</a>
          </div>
          <p class="micro-note">NASA imagery and data are separate from the fictional station simulation.</p>
        </div>
      </article>

      <article class="panel achievements-panel">
        <div class="panel-kicker">${icon("achievements", 15)} Latest achievements</div>
        <div class="achievement-compact-list">
          ${earnedAchievements.length
            ? earnedAchievements.map((achievement) => compactBadge(achievement, true, state.badges[achievement.id].earnedAt)).join("")
            : `<div class="achievement-empty">
                <span class="achievement-medal tone-cyan">${icon("award", 22)}</span>
                <div><strong>No badges yet</strong><p>Complete a lesson, submit a quiz, or start the mission to unlock your first achievement.</p></div>
              </div>`}
        </div>
        <a class="panel-footer-link" href="#/achievements">View all ${badges.total} achievements ${icon("arrow-right", 15)}</a>
      </article>
    </section>

    <section class="connection-band">
      <div>
        <span class="kicker">Knowledge uplink</span>
        <h2>Mission events bring the Academy with them.</h2>
        <p>When a decision involves sleep, equipment, nutrition, communication, hygiene, or human adaptation, the simulator displays a targeted learning recommendation and a direct route back to the relevant module.</p>
      </div>
      <div class="connection-list">
        <a href="#/academy/physical-health-exercise/module/fitness-m3"><span>${icon("dumbbell", 16)} Exercise equipment fault</span><strong>Day 3</strong></a>
        <a href="#/academy/nutrition-diet/module/nutrition-m3"><span>${icon("nutrition", 16)} Nutrition during reduced exercise</span><strong>Day 3</strong></a>
        <a href="#/academy/mental-health-psychology/module/mind-m2"><span>${icon("mind", 16)} Crew communication and conflict</span><strong>Day 4</strong></a>
        <a href="#/academy/hygiene-personal-care/module/hygiene-m1"><span>${icon("hygiene", 16)} Water recovery and hygiene</span><strong>Day 1</strong></a>
      </div>
    </section>

    ${disclaimer("This platform is an independent educational simulation. It is not an official NASA product. Mission procedures, statuses, and outcomes are fictional learning devices, not operational guidance.", "Educational simulation · not official NASA")}
  `;
}

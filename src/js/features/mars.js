import { icon } from "../components/icons.js";
import { chip, disclaimer, pageHead, ring, sectionHead } from "../components/ui.js";
import { esc, formatDate, percent } from "../utils.js";

const EXPLORATION_STEPS = [
  {
    id: "open-trek",
    title: "Open NASA Mars Trek",
    detail: "Launch the official NASA mapping tool and take a moment to orient yourself in its layer and search controls.",
    tag: "Official tool"
  },
  {
    id: "compare-layers",
    title: "Compare two official map layers",
    detail: "Turn a terrain, elevation, or imagery layer on and off. Note how the same region reads differently across datasets.",
    tag: "Map layers"
  },
  {
    id: "locate-region",
    title: "Locate a named NASA landing region",
    detail: "Use Mars Trek's official search or layers to find a named region such as Jezero Crater or Gale Crater. Do not enter invented coordinates.",
    tag: "Landing region"
  },
  {
    id: "read-legend",
    title: "Read the legend and scale",
    detail: "Check what the colours, units, and scale bar actually represent before you interpret a feature.",
    tag: "Evidence"
  },
  {
    id: "mission-context",
    title: "Connect an image to mission science",
    detail: "Open an official NASA Mars mission page and connect what you observed to the questions that mission is investigating.",
    tag: "Mission science"
  },
  {
    id: "observation-note",
    title: "Separate observation from inference",
    detail: "In your own notebook, write one thing the data shows and one question or interpretation you are testing.",
    tag: "Reflection"
  }
];

const MARS_DESTINATIONS = [
  {
    title: "NASA Mars Trek",
    label: "Official interactive Mars map",
    description: "Explore NASA imagery, terrain, and mission data in a full mapping environment maintained by NASA.",
    url: "https://trek.nasa.gov/mars/",
    icon: "map",
    primary: true
  },
  {
    title: "NASA Mars Exploration",
    label: "Mission and science overview",
    description: "Follow NASA's current Mars exploration programme, mission news, and scientific results.",
    url: "https://science.nasa.gov/mars/",
    icon: "mars"
  },
  {
    title: "Mars 2020 Perseverance",
    label: "Rover mission",
    description: "Read about the Perseverance rover, its landing region, and its science objectives at Jezero Crater.",
    url: "https://science.nasa.gov/mission/mars-2020-perseverance/",
    icon: "satellite"
  }
];

function checklistItem(item, checked) {
  return `
    <button class="checklist-row ${checked ? "is-done" : ""}" type="button" data-action="mars-check" data-item="${esc(item.id)}" data-label="${esc(item.title)}" aria-pressed="${checked}">
      <span class="checklist-box">${checked ? icon("check", 14) : ""}</span>
      <span class="checklist-copy">
        <small>${esc(item.tag)}</small>
        <strong>${esc(item.title)}</strong>
        <span>${esc(item.detail)}</span>
      </span>
      <span class="checklist-state">${checked ? "Recorded" : "Mark"}</span>
    </button>`;
}

export function renderMars({ data, store }) {
  const state = store.get();
  const checked = new Set(state.mars?.checked || []);
  const done = EXPLORATION_STEPS.filter((step) => checked.has(step.id)).length;
  const launched = Boolean(state.mars?.launched);
  const progress = percent(done, EXPLORATION_STEPS.length);

  return `
    ${pageHead({
      eyebrow: "Section D · Mars Exploration Center",
      title: "Explore the real surface of Mars.",
      subtitle: "Use NASA's official Mars Trek mapping tool for real planetary data, then keep the station simulation clearly separate from that evidence.",
      actions: `
        <a class="btn btn-secondary" href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer" data-action="mars-launch">${icon("external", 17)} Official NASA Mars Trek</a>`
    })}

    <section class="mars-hero">
      <div class="mars-hero-art" aria-hidden="true">
        <div class="mars-globe">
          <span class="mars-surface s1"></span>
          <span class="mars-surface s2"></span>
          <span class="mars-surface s3"></span>
          <span class="mars-cap"></span>
        </div>
        <div class="mars-scan-line"></div>
        <div class="mars-orbit-ring"></div>
        <span class="mars-coordinate-label l1">OFFICIAL NASA DATA</span>
        <span class="mars-coordinate-label l2">MARS TREK</span>
      </div>
      <div class="mars-hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>NASA RESOURCE · EXTERNAL MAPPING TOOL</div>
        <h2>Real planetary data. A separate fictional mission.</h2>
        <p>NASA Mars Trek is a full interactive mapping application built from NASA data. It opens as an external tool so you can use its real controls, layers, and search without a reduced embedded copy.</p>
        <div class="mars-hero-actions">
          <a class="btn btn-primary btn-lg" href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer" data-action="mars-launch">${icon("mars", 19)} Launch NASA Mars Trek ${icon("external", 14)}</a>
          <a class="btn btn-secondary btn-lg" href="#/library/mars-landing-regions">${icon("library", 18)} Read the Mars brief</a>
        </div>
        <div class="mars-hero-meta">
          ${chip(launched ? `Launched ${formatDate(state.mars.launchedAt)}` : "Not launched yet", launched ? "success" : "subtle", launched ? "check-circle" : "external")}
          ${chip("Official NASA destination", "subtle", "shield-check")}
          ${chip("No invented coordinates", "subtle", "pin")}
        </div>
      </div>
    </section>

    <section class="mars-separation">
      <article class="mars-evidence-card is-real">
        <div class="evidence-head">
          <span class="evidence-icon">${icon("globe", 20)}</span>
          <span class="evidence-label">REAL · NASA SOURCE</span>
        </div>
        <h3>What is real</h3>
        <ul>
          <li>NASA Mars Trek and the official Mars mission pages linked here.</li>
          <li>NASA map layers, imagery, terrain data, and mission information inside those tools.</li>
          <li>Real named regions and mission destinations discoverable through NASA's own interfaces.</li>
        </ul>
        <p class="micro-note">Always check the source and timestamp of external NASA data. External pages can change.</p>
      </article>
      <article class="mars-evidence-card is-fictional">
        <div class="evidence-head">
          <span class="evidence-icon">${icon("mission", 20)}</span>
          <span class="evidence-label">FICTIONAL · THIS PLATFORM</span>
        </div>
        <h3>What is simulated</h3>
        <ul>
          <li>The five-day space station scenario, its crew, systems, events, and decisions.</li>
          <li>All qualitative status changes and the proposed simulation assessment model.</li>
          <li>Your role as a Crew Operations Support Officer and the platform's progress records.</li>
        </ul>
        <p class="micro-note">The station simulation does not take place on Mars, and its outcomes are not operational data.</p>
      </article>
    </section>

    <section class="mars-workbench">
      <div class="mars-checklist-panel panel">
        <div class="mars-checklist-head">
          <div>
            <div class="panel-kicker">${icon("target", 15)} Guided exploration</div>
            <h2>Mars Trek observation checklist</h2>
            <p>Complete the steps in NASA's official tool. This checklist records your process, not scientific findings.</p>
          </div>
          ${ring(progress, 98, 7, "steps")}
        </div>
        <div class="checklist-list">
          ${EXPLORATION_STEPS.map((item) => checklistItem(item, checked.has(item.id))).join("")}
        </div>
        <div class="checklist-foot">
          <span>${done} of ${EXPLORATION_STEPS.length} steps recorded</span>
          <span>${done >= 3 && launched ? `${icon("award", 14)} Mars Explorer achievement progress met` : `${icon("info", 14)} Launch Mars Trek and record at least 3 steps for the achievement`}</span>
        </div>
      </div>

      <aside class="mars-side">
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("compass", 15)} How to explore responsibly</div>
          <div class="mars-guide">
            <div><span>01</span><p><strong>Name the layer.</strong> Know whether you are viewing imagery, elevation, or another dataset.</p></div>
            <div><span>02</span><p><strong>Check the scale.</strong> A feature that looks small can be enormous. Read the scale bar.</p></div>
            <div><span>03</span><p><strong>Separate observation from interpretation.</strong> Describe what is visible, then state what you think it might mean.</p></div>
            <div><span>04</span><p><strong>Use NASA's labels.</strong> Rely on official place names and mission pages rather than inventing coordinates or facts.</p></div>
          </div>
        </article>
        <article class="panel rail-panel mars-limits">
          <div class="panel-kicker">${icon("info", 15)} Scope and limits</div>
          <p>This platform does not host or modify NASA imagery. It does not calculate landing sites, radiation exposure, traverse plans, or scientific conclusions from Mars Trek data.</p>
          <p>An observation made in a browser is a starting point for learning, not a peer-reviewed result.</p>
        </article>
      </aside>
    </section>

    <section class="home-section">
      ${sectionHead({
        kicker: "Official destinations",
        title: "Continue with NASA",
        subtitle: "Use these official sources for current mission information, data, and educational context."
      })}
      <div class="mars-destination-grid">
        ${MARS_DESTINATIONS.map((destination) => `
          <a class="mars-destination ${destination.primary ? "is-primary" : ""}" href="${destination.url}" target="_blank" rel="noopener noreferrer" ${destination.primary ? 'data-action="mars-launch"' : ""}>
            <span class="destination-icon">${icon(destination.icon, 22)}</span>
            <span class="destination-label">${esc(destination.label)}</span>
            <strong>${esc(destination.title)}</strong>
            <p>${esc(destination.description)}</p>
            <span class="destination-link">Open official NASA page ${icon("external", 13)}</span>
          </a>`).join("")}
      </div>
    </section>

    <section class="connection-band mars-connection-band">
      <div>
        <span class="kicker">Keep the boundary clear</span>
        <h2>Mars exploration is not part of the station simulation.</h2>
        <p>The Academy teaches human spaceflight science. The simulator applies it on a fictional station. NASA Mars Trek is a separate, real planetary-data resource. Mixing those categories would make the educational boundary less honest.</p>
      </div>
      <div class="connection-list">
        <a href="#/library/mars-landing-regions"><span>${icon("library", 16)} Mars landing regions</span><strong>Library</strong></a>
        <a href="#/library/planetary-science-observation"><span>${icon("telescope", 16)} Reading planetary data</span><strong>Library</strong></a>
        <a href="#/mission"><span>${icon("mission", 16)} Fictional station scenario</span><strong>Simulator</strong></a>
        <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer"><span>${icon("map", 16)} NASA Mars Trek</span><strong>NASA ${icon("external", 12)}</strong></a>
      </div>
    </section>

    ${disclaimer("NASA Mars Trek and linked mission pages are external NASA resources. This platform is not an official NASA product. The station simulation and its data are fictional educational content.", "NASA source separation")}
  `;
}

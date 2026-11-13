import { icon } from "../components/icons.js";
import { chip, disclaimer, emptyState, pageHead, progressBar, ring, sectionHead } from "../components/ui.js";
import { esc, formatDate, percent } from "../utils.js";

function allArticles(library) {
  return library.categories.flatMap((category) =>
    category.articles.map((article) => ({ ...article, category }))
  );
}

function findArticle(library, articleId) {
  return allArticles(library).find((article) => article.id === articleId) || null;
}

function libraryConnections(data, relatedCourses) {
  const courseIds = new Set(relatedCourses.map((course) => course.id));
  const modules = new Map();
  const events = new Map();

  for (const course of relatedCourses) {
    for (const link of course.mission_links || []) {
      for (const day of data.mission.days) {
        const missionEvent = day.events.find((event) => event.id === link.event_id);
        if (!missionEvent) continue;
        events.set(missionEvent.id, {
          id: missionEvent.id,
          day: day.day,
          title: missionEvent.title,
          course: course.short_title
        });
        break;
      }
    }
  }

  for (const day of data.mission.days) {
    for (const missionEvent of day.events) {
      for (const link of missionEvent.academy_links || []) {
        if (!courseIds.has(link.course_id)) continue;
        const course = relatedCourses.find((item) => item.id === link.course_id);
        const key = `${link.course_id}:${link.module_id}`;
        if (!modules.has(key)) {
          modules.set(key, {
            courseId: link.course_id,
            moduleId: link.module_id,
            moduleTitle: link.module_title,
            courseTitle: link.course_title || course?.short_title || link.course_id
          });
        }
      }
    }
  }

  return { modules: [...modules.values()], events: [...events.values()] };
}

function connectionRows(items, type) {
  return items.map((item) => {
    if (type === "module") {
      return `<a class="related-course-row" href="#/academy/${esc(item.courseId)}/module/${esc(item.moduleId)}" title="${esc(item.moduleTitle)}">
        <span class="mini-course-icon tone-cyan">${icon("academy", 16)}</span>
        <span><strong>${esc(item.moduleTitle)}</strong><small>${esc(item.courseTitle)}</small></span>
        ${icon("arrow-right", 14)}
      </a>`;
    }
    return `<a class="related-course-row" href="#/mission/day/${item.day}?scroll=event-${esc(item.id)}" title="${esc(item.title)}">
      <span class="mini-course-icon tone-blue">${icon("compass", 16)}</span>
      <span><strong>${esc(item.title)}</strong><small>Day ${item.day} · ${esc(item.course)}</small></span>
      ${icon("arrow-right", 14)}
    </a>`;
  }).join("");
}

function connectionGroup(label, items, type) {
  if (!items.length) return "";
  const visible = items.slice(0, 4);
  const rest = items.slice(4);
  return `
    <div class="library-connection-group">
      <span>${esc(label)} <em>${items.length}</em></span>
      <div class="related-course-list">${connectionRows(visible, type)}</div>
      ${rest.length ? `<details class="inline-details"><summary>View ${rest.length} more</summary><div class="related-course-list">${connectionRows(rest, type)}</div></details>` : ""}
    </div>`;
}

function articleSearchText(article, category) {
  return [article.title, article.summary, category.name, category.description, ...article.sections.map((section) => section.heading)].join(" ").toLowerCase();
}

function articleLink(article, category, read) {
  return `
    <a class="library-article-link ${read ? "is-read" : ""}" href="#/library/${article.id}" data-article-search="${esc(articleSearchText(article, category))}">
      <span class="library-article-icon">${icon(read ? "check-circle" : "file-text", 19)}</span>
      <span class="library-article-copy">
        <strong>${esc(article.title)}</strong>
        <span>${esc(article.summary)}</span>
        <small>${read ? `Read ${formatDate(read)}` : `${article.sections.length} sections`} · ${article.related_courses.length} linked course${article.related_courses.length === 1 ? "" : "s"}</small>
      </span>
      <span class="library-article-arrow">${icon("arrow-right", 16)}</span>
    </a>`;
}

export function renderLibrary({ data, store, query }) {
  const state = store.get();
  const library = data.library;
  const totalArticles = allArticles(library).length;
  const readCount = Object.keys(state.libraryRead || {}).length;
  const search = query?.q || "";

  return `
    ${pageHead({
      eyebrow: "Section E · Science Library",
      title: "Science Library",
      subtitle: "Twelve research briefs connecting human spaceflight, station systems, planetary science, and the Academy curriculum.",
      actions: `<a class="btn btn-secondary" href="#/library/${library.categories[0]?.articles[0]?.id || ""}">${icon("book-open", 17)} Start with the basics</a>`
    })}

    <section class="library-toolbar">
      <div class="library-toolbar-copy">
        <div class="panel-kicker">${icon("library", 15)} Research desk</div>
        <h2>Read across the whole mission</h2>
        <p>Each brief is a platform edition summary with links to official NASA resources. Reading an article records it in your local progress.</p>
        <div class="library-stats">
          ${chip(`${totalArticles} articles`, "subtle", "file-text")}
          ${chip(`${readCount} read`, readCount ? "success" : "subtle", "check-circle")}
          ${chip("12 categories", "subtle", "layers")}
        </div>
      </div>
      <div class="library-toolbar-side">
        ${ring(percent(readCount, totalArticles), 98, 7, "read")}
        <label class="library-search">
          <span class="sr-only">Search the Science Library</span>
          ${icon("search", 16)}
          <input type="search" placeholder="Search articles, topics, categories…" value="${esc(search)}" data-library-search autocomplete="off" />
        </label>
      </div>
    </section>

    <div class="library-read-progress">${progressBar(percent(readCount, totalArticles))}<span>${readCount} of ${totalArticles} briefs read</span></div>

    <section class="library-category-grid" data-library-grid>
      ${library.categories.map((category) => `
        <article class="library-category accent-${esc(category.accent)}" data-library-category>
          <div class="library-category-head">
            <span class="library-category-icon">${icon(category.icon, 21)}</span>
            <div>
              <span class="library-category-code">${esc(category.name)}</span>
              <h2>${esc(category.name)}</h2>
            </div>
            <span class="library-category-count">${category.articles.length}</span>
          </div>
          <p class="library-category-description">${esc(category.description)}</p>
          <div class="library-article-list">
            ${category.articles.map((article) => articleLink(article, category, state.libraryRead?.[article.id])).join("")}
          </div>
          <div class="library-category-resources">
            <span>NASA sources</span>
            ${category.nasa_resources.map((resource) => `<a href="${resource.url}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ${icon("external", 12)}</a>`).join("")}
          </div>
        </article>`).join("")}
    </section>

    <div class="library-empty-search" data-library-empty hidden>
      ${icon("search", 28)}
      <strong>No articles match that search.</strong>
      <span>Try a broader topic such as sleep, nutrition, radiation, Mars, or station systems.</span>
    </div>

    <section class="panel library-note">
      <div class="panel-kicker">${icon("info", 15)} About this library</div>
      <h2>Educational summaries with explicit limits</h2>
      <p>${esc(library.meta.content_status)}</p>
      <p class="micro-note">${esc(library.meta.disclaimer)}</p>
    </section>

    ${disclaimer("Library briefs summarize educational concepts. They do not provide medical advice, operational procedures, or current mission data. Open the linked NASA pages for authoritative information.", "Educational summaries")}
  `;
}

export function renderLibraryArticle({ data, store, articleId }) {
  const state = store.get();
  const article = findArticle(data.library, articleId);
  if (!article) {
    return emptyState({
      title: "Article not found",
      body: "This brief is not part of the Science Library.",
      action: `<a class="btn btn-primary" href="#/library">${icon("arrow-left", 16)} Back to the library</a>`
    });
  }
  const category = article.category;
  const readAt = state.libraryRead?.[article.id];
  const articles = allArticles(data.library);
  const index = articles.findIndex((item) => item.id === article.id);
  const prev = index > 0 ? articles[index - 1] : null;
  const next = index < articles.length - 1 ? articles[index + 1] : null;
  const relatedCourses = article.related_courses
    .map((courseId) => data.academy.courses.find((course) => course.id === courseId))
    .filter(Boolean);
  const connections = libraryConnections(data, relatedCourses);

  return `
    <div class="breadcrumb"><a href="#/library">${icon("arrow-left", 14)} Science Library</a><span>/</span><span>${esc(category.name)}</span></div>

    <section class="article-hero accent-${esc(category.accent)}">
      <div class="article-hero-icon">${icon(category.icon, 34)}</div>
      <div class="article-hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>${esc(category.name).toUpperCase()} · RESEARCH BRIEF</div>
        <h1>${esc(article.title)}</h1>
        <p>${esc(article.summary)}</p>
        <div class="article-hero-meta">
          ${chip(`${article.sections.length} sections`, "subtle", "list")}
          ${chip(`${relatedCourses.length} linked courses`, "subtle", "academy")}
          ${readAt ? chip(`Read ${formatDate(readAt)}`, "success", "check-circle") : chip("Unread", "subtle", "book-open")}
        </div>
      </div>
      <div class="article-hero-actions">
        ${readAt
          ? `<span class="submission-status">${icon("check-circle", 15)} Recorded as read</span>`
          : `<button class="btn btn-primary" type="button" data-action="library-mark-read" data-article="${esc(article.id)}" data-title="${esc(article.title)}">${icon("check", 16)} Mark as read</button>`}
        <button class="btn btn-ghost btn-sm" type="button" data-action="print-report">${icon("print", 15)} Print brief</button>
      </div>
    </section>

    <section class="article-layout">
      <article class="article-body panel">
        ${article.sections.map((section, sectionIndex) => `
          <section class="article-section" id="section-${sectionIndex + 1}">
            <span class="article-section-index">${String(sectionIndex + 1).padStart(2, "0")}</span>
            <div>
              <h2>${esc(section.heading)}</h2>
              ${section.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
            </div>
          </section>`).join("")}
        <div class="article-source-note">
          ${icon("info", 16)}
          <div>
            <strong>Source note</strong>
            <p>${esc(article.source_note)}</p>
          </div>
        </div>
        <div class="article-footer-nav">
          ${prev ? `<a href="#/library/${prev.id}">${icon("arrow-left", 14)} <span><small>Previous brief</small>${esc(prev.title)}</span></a>` : "<span></span>"}
          ${next ? `<a href="#/library/${next.id}"><span><small>Next brief</small>${esc(next.title)}</span> ${icon("arrow-right", 14)}</a>` : "<span></span>"}
        </div>
      </article>

      <aside class="article-rail">
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("academy", 15)} Related Academy courses</div>
          ${relatedCourses.length
            ? `<div class="related-course-list">${relatedCourses.map((course) => `
                <a class="related-course-row" href="#/academy/${course.id}">
                  <span class="mini-course-icon tone-${course.accent}">${icon(course.icon, 17)}</span>
                  <span><strong>${esc(course.short_title)}</strong><small>${course.modules.length} modules</small></span>
                  ${icon("arrow-right", 14)}
                </a>`).join("")}</div>`
            : `<div class="mini-empty">No related courses listed.</div>`}
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("orbit", 15)} Apply this brief</div>
          <p class="micro-note">Connections are drawn from the Academy course mission links and the mission events' Academy learning links.</p>
          ${connectionGroup("Academy modules", connections.modules, "module")}
          ${connectionGroup("Mission events", connections.events, "event")}
          ${!connections.modules.length && !connections.events.length ? `<div class="mini-empty">No mission connection is recorded for this brief yet.</div>` : ""}
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("external", 15)} Official NASA sources</div>
          <div class="resource-links">
            ${category.nasa_resources.map((resource) => `<a href="${resource.url}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ${icon("external", 13)}</a>`).join("")}
          </div>
          <p class="micro-note">External links open official NASA pages. Verify current information at the source.</p>
        </article>
        <article class="panel rail-panel">
          <div class="panel-kicker">${icon("orbit", 15)} Library progress</div>
          <div class="rail-stat-list">
            <div><span>Briefs read</span><strong>${Object.keys(state.libraryRead || {}).length} / ${articles.length}</strong></div>
            <div><span>Category</span><strong>${esc(category.name)}</strong></div>
            <div><span>Status</span><strong>${readAt ? "Read" : "Unread"}</strong></div>
          </div>
          <a class="btn btn-sm btn-secondary btn-block" href="#/library">${icon("library", 14)} All briefs</a>
        </article>
      </aside>
    </section>

    ${disclaimer("This brief is an educational summary, not a substitute for NASA source material, medical advice, or operational guidance.", "Research brief")}
  `;
}

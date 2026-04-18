const THEME_KEY = "topresearch-theme";
const COUNTRY_FLAGS = {
  Austria: "🇦🇹",
  Canada: "🇨🇦",
  France: "🇫🇷",
  Italy: "🇮🇹",
  Mexico: "🇲🇽",
  Singapore: "🇸🇬",
  "United States": "🇺🇸"
};
const NAV_ICONS = {
  "index.html": "🏠",
  "conferences.html": "🏛",
  "journals.html": "📚",
  "areas.html": "🧭",
  "cfp.html": "⏰",
  "methodology.html": "🧪",
  "support.html": "💖"
};
const PAGE_SEARCH_TARGETS = {
  "index.html": "conferences.html",
  "conferences.html": "conferences.html",
  "journals.html": "journals.html",
  "cfp.html": "cfp.html",
  "areas.html": "areas.html",
  "methodology.html": "conferences.html",
  "support.html": "conferences.html"
};
const WATCHLIST_KEY = "venueatlas-watchlist";
const COMPARE_KEY = "venueatlas-compare";

function syncTopbarOffset() {
  const topbar = document.querySelector(".topbar-shell");
  const height = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 84;
  document.documentElement.style.setProperty("--topbar-offset", `${height}px`);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  root.dataset.theme = resolved;
  document.querySelectorAll(".theme-button[data-theme-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === theme);
  });
  const compact = document.querySelector("[data-theme-cycle]");
  if (compact) compact.textContent = `Theme · ${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "auto";
  applyTheme(saved);
  document.querySelectorAll(".theme-button[data-theme-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeOption || "auto";
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    });
  });
  const compact = document.querySelector("[data-theme-cycle]");
  if (compact) {
    const order = ["auto", "light", "dark"];
    compact.addEventListener("click", () => {
      const current = localStorage.getItem(THEME_KEY) || "auto";
      const next = order[(order.indexOf(current) + 1) % order.length];
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }
}

function initCurrentNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".topbar-nav a").forEach((linkEl) => {
    const href = linkEl.getAttribute("href") || "";
    const target = href.split("/").pop() || "index.html";
    const label = linkEl.textContent.trim();
    if (!linkEl.dataset.decorated) {
      linkEl.innerHTML = `${NAV_ICONS[target] || "•"} <span>${escapeHtml(label)}</span>`;
      linkEl.dataset.decorated = "true";
    }
    const isCurrent = target === current || (current === "" && target === "index.html");
    linkEl.classList.toggle("is-current", isCurrent);
    if (isCurrent) {
      linkEl.setAttribute("aria-current", "page");
    }
  });
}

function currentPageName() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function queryParams() {
  return new URLSearchParams(window.location.search);
}

function loadStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function watchlistItems() {
  return loadStored(WATCHLIST_KEY, []);
}

function compareItems(type) {
  return loadStored(COMPARE_KEY, { conference: [], journal: [] })[type] || [];
}

function initTopbarQuickSearch() {
  const topbar = document.querySelector(".topbar");
  const themeToggle = document.querySelector(".theme-toggle");
  if (!topbar || !themeToggle || document.querySelector(".topbar-search")) return;
  const current = currentPageName();
  const params = queryParams();
  const wrapper = document.createElement("form");
  wrapper.className = "topbar-search";
  wrapper.innerHTML = `
    <select aria-label="Quick search target">
      <option value="conferences.html">Conf</option>
      <option value="journals.html">Jour</option>
      <option value="cfp.html">CFPs</option>
      <option value="areas.html">Area</option>
    </select>
    <input type="search" placeholder="Quick search venues…" aria-label="Quick search input" />
    <button type="submit" aria-label="Run quick search">🔎</button>
  `;
  const select = wrapper.querySelector("select");
  const input = wrapper.querySelector("input");
  select.value = PAGE_SEARCH_TARGETS[current] || "conferences.html";
  input.value = params.get("q") || "";
  wrapper.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = input.value.trim();
    const target = select.value;
    const url = new URL(target, window.location.href);
    if (q) url.searchParams.set("q", q);
    window.location.href = url.pathname.split("/").pop() + url.search;
  });
  topbar.insertBefore(wrapper, themeToggle);
}

function getPrefillQuery() {
  return queryParams().get("q") || "";
}

function renderPagination(container, page, totalItems, pageSize, onPageChange, onSizeChange) {
  if (!container) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : ((safePage - 1) * pageSize) + 1;
  const end = Math.min(totalItems, safePage * pageSize);
  container.innerHTML = `
    <div class="pagination-meta">Showing ${start}-${end} of ${totalItems}</div>
    <div class="pagination-actions">
      <div class="pagination-size">
        <label>Rows</label>
        <select>
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </select>
      </div>
      <button class="page-button" data-page="prev" ${safePage <= 1 ? "disabled" : ""}>Previous</button>
      <span class="pagination-meta">Page ${safePage} / ${totalPages}</span>
      <button class="page-button" data-page="next" ${safePage >= totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;
  const sizeSelect = container.querySelector("select");
  sizeSelect.value = String(pageSize);
  sizeSelect.addEventListener("change", () => onSizeChange(Number(sizeSelect.value)));
  container.querySelector('[data-page="prev"]')?.addEventListener("click", () => onPageChange(safePage - 1));
  container.querySelector('[data-page="next"]')?.addEventListener("click", () => onPageChange(safePage + 1));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value, window.location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function link(label, url) {
  const href = safeUrl(url);
  return href ? `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>` : "—";
}

function miniLink(label, url, icon = "↗") {
  const href = safeUrl(url);
  return href ? `<a class="mini-link" href="${href}" target="_blank" rel="noreferrer">${icon} ${escapeHtml(label)}</a>` : "";
}

function countryFlag(country) {
  return COUNTRY_FLAGS[country] || "🌍";
}

function formatLocation(location, country) {
  if (!location) return "TBA";
  if (!country || location === "TBA") return escapeHtml(location);
  return `${countryFlag(country)} ${escapeHtml(location)}`;
}

function tagList(items = []) {
  return items.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("");
}

function statusBadge(status) {
  const normalized = (status || "TBA").toLowerCase();
  const cls = normalized === "open" ? "status-open" : normalized === "soon" ? "status-soon" : normalized === "closed" ? "status-closed" : "status-tba";
  return `<span class="status-badge ${cls}">${escapeHtml(status || "TBA")}</span>`;
}

function numericRate(value) {
  if (!value) return -1;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : -1;
}

function compareTier(a, b) {
  const order = { "A+": 0, "A": 1, "B": 2 };
  return (order[a] ?? 99) - (order[b] ?? 99);
}

function formatDate(value) {
  if (!value) return "Rolling / TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(value) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysUntil(value) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function relativeDeadlineLabel(value) {
  const delta = daysUntil(value);
  if (delta === null) return "rolling";
  if (delta < 0) return `${Math.abs(delta)} day${Math.abs(delta) === 1 ? "" : "s"} ago`;
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  return `in ${delta} days`;
}

function latestProceedings(item) {
  return item.edition_log?.[0]?.proceedings_url || "";
}

function currentIsoDate() {
  return "2026-04-15";
}

function venueDetailUrl(item) {
  return `./venue.html?type=${item.type || (item.oa_model !== undefined ? "journal" : "conference")}&slug=${encodeURIComponent(item.slug)}`;
}

function internalVenueLink(item) {
  return `<a class="detail-title-link" href="${venueDetailUrl(item)}">${escapeHtml(item.short_name || item.name)}</a>`;
}

function normalizeSourceLinks(item, type) {
  if (item.source_links?.length) return item.source_links;
  const links = [];
  if (item.website) links.push({ label: "Official site", url: item.website, kind: "official" });
  if (item.submission_url) links.push({ label: type === "conference" ? "Submission" : "Author info", url: item.submission_url, kind: "submission" });
  if (type === "conference" && latestProceedings(item)) links.push({ label: "Proceedings", url: latestProceedings(item), kind: "proceedings" });
  if (type === "journal" && item.issue_log?.[0]?.issue_url) links.push({ label: "Latest issue", url: item.issue_log[0].issue_url, kind: "issue" });
  return links;
}

function normalizeConference(item) {
  const normalized = (function(orig){ return {
    tier: "A", area: "Computer Science", publisher: "", website: "", submission_url: "", frequency: "Annual", review_model: "Double-blind", acceptance_rate: "—", usual_deadline_window: "TBA", next_deadline: "", notification_date: "", camera_ready_date: "", event_date: "", location: "TBA", location_country: "", status: "TBA", tags: [], notes: "Curated venue entry.", edition_log: [], subareas: [], subarea_slugs: [], area_strengths: { [(orig.primary_area_slug || "systems")]: "core" }, ...orig }; })(item);
  normalized.type = "conference";
  normalized.source_primary = normalized.source_primary || "official";
  normalized.source_links = normalizeSourceLinks(normalized, "conference");
  normalized.last_verified_at = normalized.last_verified_at || currentIsoDate();
  normalized.data_confidence = normalized.data_confidence || (normalized.website ? "high" : "medium");
  normalized.updated_at = normalized.updated_at || currentIsoDate();
  normalized.created_at = normalized.created_at || currentIsoDate();
  normalized.change_note = normalized.change_note || "Venue profile refreshed with current links and cadence.";
  return normalized;
}

function normalizeJournal(item) {
  const normalized = (function(orig){ return {
    tier: "A", area: "Computer Science", publisher: "", website: "", submission_url: "", oa_model: "Hybrid", frequency: "Quarterly", review_speed: "Moderate", impact_note: "Curated journal entry", latest_issue: "Latest issue TBA", latest_publication_date: "", tags: [], notes: "Curated venue entry.", issue_log: [], subareas: [], subarea_slugs: [], area_strengths: { [(orig.primary_area_slug || "systems")]: "core" }, ...orig }; })(item);
  normalized.type = "journal";
  normalized.source_primary = normalized.source_primary || "official";
  normalized.source_links = normalizeSourceLinks(normalized, "journal");
  normalized.last_verified_at = normalized.last_verified_at || currentIsoDate();
  normalized.data_confidence = normalized.data_confidence || (normalized.website ? "high" : "medium");
  normalized.updated_at = normalized.updated_at || currentIsoDate();
  normalized.created_at = normalized.created_at || currentIsoDate();
  normalized.change_note = normalized.change_note || "Journal metadata and issue links refreshed.";
  return normalized;
}

function normalizeCfp(item, venues) {
  const venue = venues.get(item.venue_slug);
  return {
    source_primary: "official",
    source_links: [
      ...(venue?.website ? [{ label: "Official CFP", url: venue.website, kind: "official" }] : []),
      ...(item.submission_url ? [{ label: "Submission", url: item.submission_url, kind: "submission" }] : [])
    ],
    last_verified_at: currentIsoDate(),
    deadline_confidence: (item.confidence || "estimated").toLowerCase(),
    updated_at: currentIsoDate(),
    created_at: currentIsoDate(),
    change_note: item.notes || "CFP entry refreshed.",
    ...item
  };
}

function renderSourcePrimaryBadge(kind) {
  const label = { official: "Official", proceedings: "Proceedings", index: "Index", curated: "Curated" }[kind] || "Official";
  return `<span class="trust-badge">${label}</span>`;
}

function renderFreshness(lastVerifiedAt) {
  return `<span class="freshness-pill">Verified ${escapeHtml(formatDate(lastVerifiedAt))}</span>`;
}

function renderConfidenceBadge(value, type = "data") {
  const key = (value || (type === "deadline" ? "estimated" : "medium")).toLowerCase();
  const labelMap = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
    confirmed: "Confirmed",
    estimated: "Estimated",
    tba: "TBA"
  };
  return `<span class="confidence-pill confidence-${key}">${labelMap[key] || escapeHtml(value)}</span>`;
}

function renderTrustChips(item, type = "data") {
  const confidence = type === "deadline" ? item.deadline_confidence || item.confidence : item.data_confidence;
  return `<div class="trust-row">${renderSourcePrimaryBadge(item.source_primary)}${renderFreshness(item.last_verified_at)}${renderConfidenceBadge(confidence, type)}</div>`;
}

function renderTrustInline(item, type = "data") {
  const source = { official: "Official", proceedings: "Proceedings", index: "Index", curated: "Curated" }[item.source_primary] || "Official";
  const confidence = type === "deadline" ? (item.deadline_confidence || item.confidence || "estimated") : (item.data_confidence || "medium");
  const label = type === "deadline" ? renderConfidenceBadge(confidence, "deadline") : renderConfidenceBadge(confidence, "data");
  return `<div class="trust-inline">${source} · Verified ${escapeHtml(formatDate(item.last_verified_at))} · ${label.replace(/<[^>]+>/g, "")}</div>`;
}

function renderSourceLinks(item, limit = 2) {
  return `<div class="source-links">${(item.source_links || []).slice(0, limit).map((entry) => miniLink(entry.label, entry.url, entry.kind === "official" ? "🌐" : entry.kind === "submission" ? "📝" : entry.kind === "proceedings" ? "📄" : "↗")).join("")}</div>`;
}

function isSameMonth(dateString, reference = new Date(currentIsoDate())) {
  if (!dateString) return false;
  const d = new Date(dateString);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

function collectRecentUpdates(conferences, journals, cfps, venues) {
  const ref = new Date(currentIsoDate());
  const items = [
    ...conferences.map((item) => ({ label: item.short_name, reason: item.change_note, date: item.updated_at, href: venueDetailUrl(item) })),
    ...journals.map((item) => ({ label: item.short_name, reason: item.change_note, date: item.updated_at, href: venueDetailUrl(item) })),
    ...cfps.map((item) => ({ label: venues.get(item.venue_slug)?.short_name || item.venue_slug, reason: item.change_note, date: item.updated_at, href: `./cfp.html?q=${encodeURIComponent(item.venue_slug)}` }))
  ].filter((item) => isSameMonth(item.date, ref)).sort((a, b) => new Date(b.date) - new Date(a.date));
  return items.slice(0, 5);
}

function collectWeeklyUpdates(conferences, journals, cfps, venues) {
  return [
    ...conferences.map((item) => ({ label: item.short_name, reason: item.change_note, date: item.updated_at, href: venueDetailUrl(item) })),
    ...journals.map((item) => ({ label: item.short_name, reason: item.change_note, date: item.updated_at, href: venueDetailUrl(item) })),
    ...cfps.map((item) => ({ label: venues.get(item.venue_slug)?.short_name || item.venue_slug, reason: item.change_note, date: item.updated_at, href: `./cfp.html?q=${encodeURIComponent(item.venue_slug)}` }))
  ].filter((item) => {
    const d = new Date(item.date);
    const ref = new Date(currentIsoDate());
    return !Number.isNaN(d.getTime()) && ((ref - d) / 86400000) <= 7;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
}

function collectRecentlyVerified(conferences, journals, cfps, venues) {
  return [
    ...conferences.map((item) => ({ label: item.short_name, reason: "Verified source links", date: item.last_verified_at, href: venueDetailUrl(item) })),
    ...journals.map((item) => ({ label: item.short_name, reason: "Verified issue and author links", date: item.last_verified_at, href: venueDetailUrl(item) })),
    ...cfps.map((item) => ({ label: venues.get(item.venue_slug)?.short_name || item.venue_slug, reason: "Verified CFP source", date: item.last_verified_at, href: `./cfp.html?q=${encodeURIComponent(item.venue_slug)}` }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
}

function getUpcomingTimelineBuckets(cfps, monthsAhead = 6) {
  const base = new Date(currentIsoDate());
  base.setDate(1);
  const buckets = [];
  for (let i = 0; i < monthsAhead; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }), total: 0, items: [] });
  }
  cfps.forEach((item) => {
    if (!item.deadline) return;
    const d = new Date(item.deadline);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket && d >= new Date(currentIsoDate())) {
      bucket.total += 1;
      bucket.items.push(item);
    }
  });
  return buckets;
}

function renderUpdateList(targetId, items, emptyText) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = items.length ? items.map((item) => `<article class="update-item stack-sm"><p><strong><a class="detail-title-link" href="${item.href}">${escapeHtml(item.label)}</a></strong></p><p class="muted">${escapeHtml(item.reason || "Updated metadata")}</p><p class="muted">${escapeHtml(formatDate(item.date))}</p></article>`).join("") : `<p class="muted">${escapeHtml(emptyText)}</p>`;
}

function renderWatchlist(venues) {
  const el = document.getElementById("watchlist-grid");
  const countEl = document.getElementById("watchlist-count");
  if (!el) return;
  const items = watchlistItems().map(({ slug, type }) => venues.get(slug)).filter(Boolean).slice(0, 6);
  if (countEl) countEl.textContent = items.length ? `⭐ ${items.length} saved venues` : "⭐ No saved venues yet";
  el.innerHTML = items.length ? items.map((item) => `<article class="venue-card stack-sm"><div class="inline-meta"><span class="badge">${escapeHtml(item.area)}</span><span class="badge">Saved</span></div><h3>${internalVenueLink(item)}</h3><p class="muted">${escapeHtml(item.notes || "")}</p><div class="actions">${miniLink("Open", venueDetailUrl(item), "🔍").replace('target="_blank" rel="noreferrer"','')}${miniLink("Site", item.website, "🌐")}</div></article>`).join("") : `<article class="update-item watchlist-empty"><p class="muted">No saved venues yet. Use the Save button on conference and journal listings.</p></article>`;
}

function renderCompareStatus(targetId, type, rows) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const selected = compareItems(type).map((slug) => rows.find((item) => item.slug === slug)).filter(Boolean);
  if (!selected.length) {
    el.innerHTML = `<span class="compare-hint">Select up to 4 ${type === "conference" ? "conferences" : "journals"} to compare.</span>`;
    return;
  }
  el.innerHTML = `<div class="inline-meta compare-status"><span class="summary-pill">Comparing ${selected.length} ${type === "conference" ? "conferences" : "journals"}</span><span class="compare-hint">Scroll below for the compare tray.</span><button class="tiny-button" data-clear-compare="${type}">Clear</button></div>`;
  el.querySelector("[data-clear-compare]")?.addEventListener("click", () => {
    const state = loadStored(COMPARE_KEY, { conference: [], journal: [] });
    state[type] = [];
    saveStored(COMPARE_KEY, state);
    renderCompareStatus(targetId, type, rows);
    renderCompareTray(type === "conference" ? "conference-compare" : "journal-compare", type, rows);
  });
}

function renderCompareTray(targetId, type, rows) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const selected = compareItems(type).map((slug) => rows.find((item) => item.slug === slug)).filter(Boolean);
  if (!selected.length) {
    el.innerHTML = "";
    return;
  }
  const fieldRows = type === "conference"
    ? [
        ["Venue", (item) => `<strong>${escapeHtml(item.short_name)}</strong><div class="muted">${escapeHtml(item.area)} · ${escapeHtml(item.tier)}</div>`],
        ["Deadline", (item) => `${formatDate(item.next_deadline)}<div class="muted">${relativeDeadlineLabel(item.next_deadline)}</div>`],
        ["Event", (item) => `${formatDate(item.event_date)}<div class="muted">${formatLocation(item.location, item.location_country)}</div>`],
        ["Acceptance", (item) => escapeHtml(item.acceptance_rate)],
        ["Review", (item) => escapeHtml(item.review_model)],
        ["Actions", (item) => `<div class="action-cluster">${miniLink("Venue", venueDetailUrl(item), "🔍").replace('target="_blank" rel="noreferrer"','')}${miniLink("Submit", item.submission_url, "📝")}<button class="tiny-button" data-remove-compare="${escapeHtml(item.slug)}">Remove</button></div>`]
      ]
    : [
        ["Venue", (item) => `<strong>${escapeHtml(item.short_name)}</strong><div class="muted">${escapeHtml(item.area)} · ${escapeHtml(item.tier)}</div>`],
        ["Latest issue", (item) => `${escapeHtml(item.latest_issue)}<div class="muted">${formatDate(item.latest_publication_date)}</div>`],
        ["Review speed", (item) => escapeHtml(item.review_speed)],
        ["OA model", (item) => escapeHtml(item.oa_model)],
        ["Frequency", (item) => escapeHtml(item.frequency)],
        ["Actions", (item) => `<div class="action-cluster">${miniLink("Venue", venueDetailUrl(item), "🔍").replace('target="_blank" rel="noreferrer"','')}${miniLink("Submit", item.submission_url, "✍️")}<button class="tiny-button" data-remove-compare="${escapeHtml(item.slug)}">Remove</button></div>`]
      ];
  el.innerHTML = `<div class="stack-sm"><div><div class="compare-title">Compare ${type === "conference" ? "conferences" : "journals"}</div><div class="compare-hint">You can compare up to 4 venues at once.</div></div><div class="compare-table">${fieldRows.map(([label, render]) => `<div class="compare-row"><div class="compare-label">${label}</div>${selected.map((item) => `<div class="compare-value">${render(item)}</div>`).join("")}</div>`).join("")}</div></div>`;
  el.querySelectorAll("[data-remove-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = loadStored(COMPARE_KEY, { conference: [], journal: [] });
      state[type] = state[type].filter((slug) => slug !== button.dataset.removeCompare);
      saveStored(COMPARE_KEY, state);
      renderCompareTray(targetId, type, rows);
      renderCompareStatus(type === "conference" ? "conference-compare-status" : "journal-compare-status", type, rows);
    });
  });
}

function renderDeadlineTimeline(cfps, venues) {
  const bars = document.getElementById("deadline-timeline");
  const list = document.getElementById("deadlines-this-month");
  if (!bars && !list) return;
  const buckets = getUpcomingTimelineBuckets(cfps);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  if (bars) {
    bars.innerHTML = buckets.map((bucket) => `<div class="timeline-bar-item"><div class="timeline-count">${bucket.total}</div><a class="timeline-bar-link" aria-label="${escapeHtml(bucket.label)}, ${bucket.total} upcoming deadlines" href="./cfp.html?month=${bucket.key}" style="height:${Math.max(18, Math.round((bucket.total / max) * 140))}px"></a><div class="timeline-month">${escapeHtml(bucket.label)}</div></div>`).join("");
  }
  if (list) {
    const now = new Date(currentIsoDate());
    const items = cfps.filter((item) => {
      if (!item.deadline) return false;
      const d = new Date(item.deadline);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d >= now;
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
    list.innerHTML = items.length ? items.map((item) => {
      const venue = venues.get(item.venue_slug);
      return `<article class="update-item stack-sm"><p><strong><a class="detail-title-link" href="./cfp.html?q=${encodeURIComponent(item.venue_slug)}">${escapeHtml(venue?.short_name || item.venue_slug)}</a></strong></p><p class="muted">${escapeHtml(item.track)} · ${relativeDeadlineLabel(item.deadline)}</p><p class="muted">${escapeHtml(formatDate(item.deadline))}</p></article>`;
    }).join("") : `<p class="muted">No deadlines fall in the current month.</p>`;
  }
}

function isRollingSubmission(item) {
  return item.venue_type === "Journal" && (!item.deadline || item.notification_date === "Rolling");
}

function getUrgentConferenceDeadlines(cfps) {
  return cfps
    .filter((item) => item.venue_type === "Conference" && item.deadline && (daysUntil(item.deadline) ?? 9999) >= 0)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);
}

function getRollingJournalSubmissions(cfps, venues) {
  return cfps
    .filter((item) => isRollingSubmission(item))
    .sort((a, b) => (venues.get(a.venue_slug)?.short_name || a.venue_slug).localeCompare(venues.get(b.venue_slug)?.short_name || b.venue_slug))
    .slice(0, 6);
}

function renderCfpUrgencyBlocks(cfps, venues) {
  const urgentEl = document.getElementById("cfp-urgent-grid");
  const rollingEl = document.getElementById("cfp-rolling-grid");
  if (!urgentEl && !rollingEl) return;
  const urgent = getUrgentConferenceDeadlines(cfps);
  const rolling = getRollingJournalSubmissions(cfps, venues);
  if (urgentEl) {
    urgentEl.innerHTML = urgent.length ? urgent.map((item) => {
      const venue = venues.get(item.venue_slug);
      return `<article class="deadline-card stack-sm"><div class="inline-meta">${statusBadge(item.status)} ${renderConfidenceBadge(item.deadline_confidence || item.confidence, "deadline")}</div><h3>${escapeHtml(venue?.short_name || item.venue_slug)}</h3><p class="muted">${escapeHtml(item.track)} · ${escapeHtml(venue?.area || "")}</p><p><strong>${formatDate(item.deadline)}</strong> · ${relativeDeadlineLabel(item.deadline)}</p><div class="actions">${miniLink("Submit", item.submission_url, "📝")}${miniLink("Venue", venue?.website, "🌐")}</div></article>`;
    }).join("") : `<p class="empty-state">No urgent conference deadlines found.</p>`;
  }
  if (rollingEl) {
    rollingEl.innerHTML = rolling.length ? rolling.map((item) => {
      const venue = venues.get(item.venue_slug);
      return `<article class="venue-card stack-sm"><h3>${venue ? internalVenueLink(venue) : escapeHtml(item.venue_slug)}</h3><p class="muted">${escapeHtml(venue?.area || "")} · ${escapeHtml(venue?.oa_model || "Rolling journal submission")}${venue?.review_speed ? ` · ${escapeHtml(venue.review_speed)} review` : ""}</p><p>Rolling submission</p><div class="actions">${miniLink("Author info", venue?.submission_url || item.submission_url, "✍️")}${miniLink("Official site", venue?.website, "🌐")}</div></article>`;
    }).join("") : `<p class="empty-state">No rolling journal submissions recorded.</p>`;
  }
}

function relatedVenuesFor(venue, conferences, journals) {
  return [...conferences, ...journals].filter((item) => item.slug !== venue.slug && item.primary_area_slug === venue.primary_area_slug).slice(0, 6);
}

function getVenueBestFor(venue) {
  if (venue.type === "conference") {
    if (venue.primary_area_slug === "machine-learning") return "Broad, high-visibility papers in fast-moving AI/ML areas.";
    if (venue.primary_area_slug === "computer-vision") return "Strong visual learning, recognition, and multimodal vision work.";
    if (venue.primary_area_slug === "nlp") return "Language-focused work with strong research community visibility.";
    return "Researchers seeking recognized conference visibility in this area.";
  }
  if (venue.primary_area_slug === "machine-learning") return "Archival ML work, mature experiments, and methods papers.";
  if (venue.primary_area_slug === "computer-vision") return "Longer-form vision and pattern analysis papers with archival depth.";
  if (venue.primary_area_slug === "nlp") return "Archival NLP papers and deeper follow-up work after conference iterations.";
  return "Archival publication with sustained visibility in this area.";
}

function getPrimaryAction(venue) {
  return venue.type === "conference"
    ? { label: "Open submission", url: venue.submission_url || venue.website, icon: "📝", note: "Best next action if you are preparing a submission." }
    : { label: "Open author info", url: venue.submission_url || venue.website, icon: "✍️", note: "Best next action if you are evaluating journal submission requirements." };
}

function getVenueWhyUseIt(venue) {
  if (venue.type === "conference") {
    return `${venue.short_name} is useful when you want fast-moving visibility in ${venue.area}, community recognition, and a strong proceedings footprint.`;
  }
  return `${venue.short_name} is useful when you want a more archival publication path, deeper experiments, and a longer-lived journal record in ${venue.area}.`;
}

function renderVenuePage(conferences, journals, cfps) {
  const hero = document.getElementById("venue-hero");
  if (!hero) return;
  const params = queryParams();
  const type = params.get("type");
  const slug = params.get("slug");
  const collection = type === "journal" ? journals : conferences;
  const venue = collection.find((item) => item.slug === slug);
  const breadcrumb = document.getElementById("venue-breadcrumb");
  const actions = document.getElementById("venue-actions");
  const snapshot = document.getElementById("venue-snapshot");
  const bestFor = document.getElementById("venue-best-for");
  const primaryAction = document.getElementById("venue-primary-action");
  const areaFit = document.getElementById("venue-area-fit");
  const sources = document.getElementById("venue-sources");
  const why = document.getElementById("venue-why");
  const related = document.getElementById("venue-related");
  const history = document.getElementById("venue-history");
  if (!venue) {
    hero.innerHTML = `<h1>Venue not found</h1><p class="muted">Try returning to the conference or journal directory.</p>`;
    return;
  }
  document.title = `${venue.short_name} · Top Research Venues`;
  breadcrumb.innerHTML = `<a href="./index.html">Home</a> / <a href="./${type === "journal" ? "journals" : "conferences"}.html">${type === "journal" ? "Journals" : "Conferences"}</a> / ${escapeHtml(venue.short_name)}`;
  hero.innerHTML = `<p class="eyebrow">${type === "journal" ? "📚 Journal profile" : "🏛 Conference profile"}</p><h1>${escapeHtml(venue.short_name)}</h1><p class="muted">${escapeHtml(venue.name)}</p><div class="inline-meta"><span class="badge">${escapeHtml(venue.area)}</span><span class="badge">${escapeHtml(venue.tier)}</span>${type === "journal" ? `<span class="badge">${escapeHtml(venue.latest_issue || "Latest issue TBA")}</span>` : statusBadge(venue.status)}</div><p>${escapeHtml(venue.notes || "")}</p>${renderTrustChips(venue)}`;
  if (bestFor) bestFor.innerHTML = `<div class="best-for-card stack-sm"><strong>Best for</strong><p class="muted">${escapeHtml(getVenueBestFor(venue))}</p></div>`;
  if (primaryAction) {
    const action = getPrimaryAction(venue);
    primaryAction.innerHTML = `<div class="best-for-card stack-sm"><p class="muted">${escapeHtml(action.note)}</p>${miniLink(action.label, action.url, action.icon)}</div>`;
  }
  if (why) why.innerHTML = `<div class="best-for-card stack-sm"><p class="muted">${escapeHtml(getVenueWhyUseIt(venue))}</p></div>`;
  actions.innerHTML = `${renderSourceLinks(venue, 3)}${miniLink(type === "journal" ? "Author info" : "Submit", venue.submission_url, type === "journal" ? "✍️" : "📝")}${type === "conference" ? miniLink("Proceedings", latestProceedings(venue), "📄") : miniLink("Latest issue", venue.issue_log?.[0]?.issue_url, "📰")}`;
  snapshot.innerHTML = type === "journal"
    ? `<div class="snapshot-grid"><div class="snapshot-card"><strong>Publisher</strong><span>${escapeHtml(venue.publisher)}</span></div><div class="snapshot-card"><strong>OA model</strong><span>${escapeHtml(venue.oa_model)}</span></div><div class="snapshot-card"><strong>Frequency</strong><span>${escapeHtml(venue.frequency)}</span></div><div class="snapshot-card"><strong>Review speed</strong><span>${escapeHtml(venue.review_speed)}</span></div><div class="snapshot-card"><strong>Latest issue</strong><span>${escapeHtml(venue.latest_issue)}</span></div><div class="snapshot-card"><strong>Latest publication</strong><span>${escapeHtml(formatDate(venue.latest_publication_date))}</span></div></div>`
    : `<div class="snapshot-grid"><div class="snapshot-card"><strong>Next deadline</strong><span>${escapeHtml(formatDate(venue.next_deadline))}</span></div><div class="snapshot-card"><strong>Notification</strong><span>${escapeHtml(formatDate(venue.notification_date))}</span></div><div class="snapshot-card"><strong>Event date</strong><span>${escapeHtml(formatDate(venue.event_date))}</span></div><div class="snapshot-card"><strong>Location</strong><span>${formatLocation(venue.location, venue.location_country)}</span></div><div class="snapshot-card"><strong>Review model</strong><span>${escapeHtml(venue.review_model)}</span></div><div class="snapshot-card"><strong>Acceptance</strong><span>${escapeHtml(venue.acceptance_rate)}</span></div></div>`;
  areaFit.innerHTML = `<p><strong>Primary area:</strong> ${escapeHtml(venue.primary_area_slug)}</p><div>${tagList(venue.subareas || [])}</div>`;
  if (related) {
    related.innerHTML = relatedVenuesFor(venue, conferences, journals).map((item) => `<article class="related-venue-card stack-sm"><strong><a class="detail-title-link" href="${venueDetailUrl(item)}">${escapeHtml(item.short_name)}</a></strong><p class="muted">${escapeHtml(item.area)} · ${escapeHtml(item.tier)}</p></article>`).join("") || `<p class="muted">No related venues found.</p>`;
  }
  sources.innerHTML = `${renderTrustChips(venue)}${renderSourceLinks(venue, 3)}<p class="muted">Primary source: ${escapeHtml(venue.source_primary || "official")}</p>`;
  if (type === "journal") {
    history.innerHTML = `<div class="history-list">${(venue.issue_log || []).map((log) => `<article class="history-item stack-sm"><strong>Vol. ${escapeHtml(log.volume)}${log.issue ? `, Issue ${escapeHtml(log.issue)}` : ""}</strong><p class="muted">${escapeHtml(formatDate(log.date))}</p><p>${escapeHtml(log.featured_articles?.[0]?.title || "Issue summary")}</p>${miniLink("Issue", log.issue_url, "📰")}</article>`).join("") || `<p class="muted">No issue history recorded yet.</p>`}</div>`;
  } else {
    history.innerHTML = `<div class="history-list">${(venue.edition_log || []).map((log) => `<article class="history-item stack-sm"><strong>${escapeHtml(String(log.year))}</strong><p class="muted">${formatLocation(log.location, log.location_country)} · ${escapeHtml(log.date_range)}</p><p>${escapeHtml(log.acceptance_rate)} acceptance${log.papers_published ? ` · ${log.papers_published} papers` : ""}</p>${miniLink("Proceedings", log.proceedings_url, "📄")}</article>`).join("") || `<p class="muted">No edition history recorded yet.</p>`}</div>`;
  }
}

function renderTrendCard(item) {
  const logs = [...(item.edition_log || [])].sort((a, b) => a.year - b.year);
  const withCounts = logs.filter((log) => typeof log.papers_published === "number");
  if (!withCounts.length) return "";
  const max = Math.max(...withCounts.map((log) => log.papers_published));
  return `
    <article class="trend-card stack-sm">
      <div class="inline-meta">
        <span class="badge">${escapeHtml(item.area)}</span>
        <span class="badge">${escapeHtml(item.tier)}</span>
      </div>
      <h3>${link(item.short_name, item.website)}</h3>
      <p class="muted">Recent paper volume by edition — a quick visual cue for scale and continuity.</p>
      <div class="trend-chart">
        ${withCounts.map((log) => `
          <div class="trend-bar-group">
            <div class="trend-value">${log.papers_published}</div>
            <div class="trend-bar" style="height:${Math.max(24, Math.round((log.papers_published / max) * 120))}px"></div>
            <div class="trend-label">${log.year}</div>
          </div>
        `).join("")}
      </div>
      <div class="actions">
        ${miniLink("Site", item.website, "🌐")}
        ${miniLink("Submit", item.submission_url, "📝")}
        ${miniLink("Proceedings", latestProceedings(item), "📄")}
      </div>
    </article>
  `;
}

function venueMap(conferences, journals) {
  return new Map([...conferences.map((item) => [item.slug, { ...item, type: "conference" }]), ...journals.map((item) => [item.slug, { ...item, type: "journal" }])]);
}

function matchText(input, tokens) {
  return tokens.join(" ").toLowerCase().includes(input.toLowerCase());
}

function renderMeta(meta) {
  const el = document.getElementById("meta-summary");
  if (!el) return;
  el.innerHTML = `
    <h2>${escapeHtml(meta.title)}</h2>
    <p>${escapeHtml(meta.source_note)}</p>
    <p><strong>Updated:</strong> ${escapeHtml(meta.updated_at)}</p>
    <div class="stat-strip">
      <div class="stat-card"><strong>${meta.coverage.conferences}</strong><span>conferences tracked</span></div>
      <div class="stat-card"><strong>${meta.coverage.journals}</strong><span>journals tracked</span></div>
      <div class="stat-card"><strong>${meta.coverage.cfps}</strong><span>CFP entries tracked</span></div>
      <div class="stat-card"><strong>${meta.coverage.areas}</strong><span>research areas mapped</span></div>
    </div>
    <p class="topbar-status">💡 Best experience: browse areas first, then compare deadlines, proceedings, and journals.</p>
  `;
}

function renderFeatured(featured, confs, journals) {
  const el = document.getElementById("featured-grid");
  if (!el) return;
  const map = venueMap(confs, journals);
  el.innerHTML = featured.featured.map((entry) => {
    const item = map.get(entry.slug);
    if (!item) return "";
    const topTags = (item.subareas?.slice(0, 2) || item.tags?.slice(0, 2) || []);
    return `
      <article class="venue-card stack-sm">
        <div class="inline-meta">
          <span class="status-badge status-featured">Featured</span>
          <span class="badge">${escapeHtml(item.type === "conference" ? "Conference" : "Journal")}</span>
          <span class="badge">${escapeHtml(item.area)}</span>
        </div>
        <h3 class="featured-title">${internalVenueLink(item)}</h3>
        <p class="featured-subline">${escapeHtml(item.notes || "Strong venue in this area.")}</p>
        ${item.type === "conference" ? `<div class="meta-list"><div class="meta-row">📍 ${formatLocation(item.location, item.location_country)}</div><div class="meta-row">🗓 ${formatDate(item.event_date)}</div></div>` : `<div class="meta-list"><div class="meta-row">🏢 ${escapeHtml(item.publisher)}</div><div class="meta-row">📰 ${escapeHtml(item.latest_issue || "Latest issue TBA")}</div></div>`}
        <div>${tagList(topTags)}</div>
        ${renderTrustInline(item)}
        <div class="actions">
          ${miniLink("Site", item.website, "🌐")}
          ${miniLink(item.type === "conference" ? "Submit" : "Author info", item.submission_url, item.type === "conference" ? "📝" : "✍️")}
          ${item.type === "conference" ? miniLink("Proceedings", latestProceedings(item), "📄") : miniLink("Latest issue", item.issue_log?.[0]?.issue_url, "📰")}
        </div>
      </article>
    `;
  }).join("");
}

function renderHomeDeadlines(cfps, venues) {
  const el = document.getElementById("deadline-grid");
  if (!el) return;
  const sorted = [...cfps]
    .filter((item) => item.venue_type === "Conference" && item.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 6);
  el.innerHTML = sorted.map((item) => {
    const venue = venues.get(item.venue_slug);
    return `
      <article class="deadline-card stack-sm">
        <div class="inline-meta">${statusBadge(item.status)} <span class="badge">${escapeHtml(item.confidence)}</span></div>
        <h3>${escapeHtml(venue?.short_name || item.venue_slug)}</h3>
        <p class="muted">${escapeHtml(item.track)} · ${escapeHtml(venue?.area || "")}</p>
        <div class="meta-row">📍 ${formatLocation(venue?.location, venue?.location_country)}</div>
        <p><strong>${formatDate(item.deadline)}</strong>${item.deadline ? ` · ${relativeDeadlineLabel(item.deadline)}` : ""}</p>
        <p class="muted">${escapeHtml(item.notes || "")}</p>
        <div class="actions">${miniLink("Submit", item.submission_url, "📝")}${miniLink("Venue page", venue?.website, "🌐")}</div>
      </article>
    `;
  }).join("");
}

function renderHomeConferencePreview(conferences) {
  const body = document.getElementById("home-conference-body");
  const total = document.getElementById("overview-conference-total");
  if (!body) return;
  if (total) total.textContent = `🏛 ${conferences.length} conferences tracked`;
  const previewRows = [...conferences]
    .sort((a, b) => compareTier(a.tier, b.tier) || new Date(a.next_deadline || "9999-12-31") - new Date(b.next_deadline || "9999-12-31"))
    .slice(0, 6);
  body.innerHTML = previewRows.map((item) => `
    <tr>
      <td data-label="Tier">${escapeHtml(item.tier)}</td>
      <td data-label="Conference">${internalVenueLink(item)}<div class="muted">${escapeHtml(item.name)}</div>${renderTrustInline(item)}</td>
      <td data-label="Area">${escapeHtml(item.area)}</td>
      <td data-label="Deadline">${formatDate(item.next_deadline)}<div class="muted">${relativeDeadlineLabel(item.next_deadline)}</div></td>
      <td data-label="Event">${formatDate(item.event_date)}<div class="muted">${formatLocation(item.location, item.location_country)}</div></td>
      <td data-label="Acceptance">${escapeHtml(item.acceptance_rate)}</td>
      <td data-label="Status">${statusBadge(item.status)}</td>
    </tr>
  `).join("");
}

function renderHomeJournalPreview(journals) {
  const body = document.getElementById("home-journal-body");
  const total = document.getElementById("overview-journal-total");
  if (!body) return;
  if (total) total.textContent = `📚 ${journals.length} journals tracked`;
  const previewRows = [...journals]
    .sort((a, b) => compareTier(a.tier, b.tier) || new Date(b.latest_publication_date || 0) - new Date(a.latest_publication_date || 0))
    .slice(0, 6);
  body.innerHTML = previewRows.map((item) => `
    <tr>
      <td data-label="Tier">${escapeHtml(item.tier)}</td>
      <td data-label="Journal">${internalVenueLink(item)}<div class="muted">${escapeHtml(item.name)}</div>${renderTrustInline(item)}</td>
      <td data-label="Area">${escapeHtml(item.area)}</td>
      <td data-label="Publisher">${escapeHtml(item.publisher)}</td>
      <td data-label="OA">${escapeHtml(item.oa_model)}</td>
      <td data-label="Latest issue">${escapeHtml(item.latest_issue)}<div class="muted">${formatDate(item.latest_publication_date)}</div></td>
      <td data-label="Review speed">${escapeHtml(item.review_speed)}</td>
    </tr>
  `).join("");
}

function renderLogs(conferences, journals) {
  const confEl = document.getElementById("edition-log-grid");
  const journalEl = document.getElementById("issue-log-grid");
  if (confEl) {
    confEl.innerHTML = conferences.slice(0, 3).map((item) => {
      const log = item.edition_log?.[0];
      if (!log) return "";
      return `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)} ${log.year}</h3><p class="muted">${formatLocation(log.location, log.location_country)} · ${escapeHtml(log.date_range)}</p><p>${escapeHtml(log.acceptance_rate)} acceptance · ${log.papers_published ? `${log.papers_published} papers` : "paper count TBA"}</p><div>${tagList(log.highlights || [])}</div><div class="actions">${miniLink("Proceedings", log.proceedings_url, "📄")}${miniLink("Best paper", log.best_paper_url, "🏆")}</div></article>`;
    }).join("");
  }
  if (journalEl) {
    journalEl.innerHTML = journals.slice(0, 3).map((item) => {
      const log = item.issue_log?.[0];
      if (!log) return "";
      return `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)}</h3><p class="muted">Vol. ${escapeHtml(log.volume)}${log.issue ? `, Issue ${escapeHtml(log.issue)}` : ""}</p><p>${formatDate(log.date)}</p><p class="muted">${escapeHtml(log.featured_articles?.[0]?.title || "")}</p><div class="actions">${miniLink("Issue", log.issue_url, "📰")}${miniLink("Article", log.featured_articles?.[0]?.url, "📄")}</div></article>`;
    }).join("");
  }

  const trendGrid = document.getElementById("trend-grid");
  if (trendGrid) {
    trendGrid.innerHTML = conferences.slice(0, 4).map(renderTrendCard).join("");
  }
}

function renderHomepageActivity(conferences, journals, cfps, venues) {
  renderUpdateList("updates-this-month", collectRecentUpdates(conferences, journals, cfps, venues), "No venue updates recorded this month yet.");
  renderUpdateList("updates-this-week", collectWeeklyUpdates(conferences, journals, cfps, venues), "No venue updates recorded this week yet.");
  renderUpdateList("recently-verified", collectRecentlyVerified(conferences, journals, cfps, venues), "No recent verification activity recorded yet.");
  renderDeadlineTimeline(cfps, venues);
  renderWatchlist(venues);
}

function renderAreaSpotlights(areas, conferences, journals, cfps, venues) {
  const el = document.getElementById("area-spotlight-grid");
  if (!el) return;
  const selectedAreas = areas.slice(0, 4);
  el.innerHTML = selectedAreas.map((area) => {
    const topConference = area.top_conference_slugs?.map((slug) => venues.get(slug)).find(Boolean);
    const topJournal = area.top_journal_slugs?.map((slug) => venues.get(slug)).find(Boolean);
    const nearestDeadline = cfps
      .filter((item) => item.area_slug === area.slug && item.deadline && (daysUntil(item.deadline) ?? 9999) >= 0)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
    const deadlineVenue = nearestDeadline ? venues.get(nearestDeadline.venue_slug) : null;
    return `
      <article class="venue-card stack-sm">
        <div class="inline-meta">
          <span class="badge">${escapeHtml(area.family)}</span>
          <span class="badge">${escapeHtml(area.name)}</span>
        </div>
        <h3 class="featured-title"><a class="detail-title-link" href="./areas.html?q=${encodeURIComponent(area.slug)}">${escapeHtml(area.name)}</a></h3>
        <p class="featured-subline">${escapeHtml(area.description)}</p>
        <div class="meta-list">
          <div class="meta-row">🏛 Top conference: ${topConference ? internalVenueLink(topConference) : "TBA"}</div>
          <div class="meta-row">📚 Top journal: ${topJournal ? internalVenueLink(topJournal) : "TBA"}</div>
          <div class="meta-row">⏰ Next deadline: ${nearestDeadline ? `${escapeHtml(deadlineVenue?.short_name || nearestDeadline.venue_slug)} · ${formatShortDate(nearestDeadline.deadline)} · ${relativeDeadlineLabel(nearestDeadline.deadline)}` : "No active deadline recorded"}</div>
        </div>
        <div class="actions">
          <a class="mini-link" href="./areas.html?q=${encodeURIComponent(area.slug)}">🧭 Explore area</a>
          ${nearestDeadline ? `<a class="mini-link" href="./cfp.html?q=${encodeURIComponent(nearestDeadline.venue_slug)}">⏰ View deadline</a>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function initConferencePage(conferences) {
  const body = document.getElementById("conference-body");
  if (!body) return;
  const search = document.getElementById("conference-search");
  const area = document.getElementById("conference-area");
  const status = document.getElementById("conference-status");
  const tier = document.getElementById("conference-tier");
  const sort = document.getElementById("conference-sort");
  const count = document.getElementById("conference-count");
  const total = document.getElementById("conference-total");
  const logGrid = document.getElementById("conference-log-grid");
  const trendGrid = document.getElementById("conference-trend-grid");
  const pagerTop = document.getElementById("conference-pagination-top");
  const pagerBottom = document.getElementById("conference-pagination-bottom");
  const compare = document.getElementById("conference-compare");
  let page = 1;
  let pageSize = 5;
  const prefill = getPrefillQuery();
  if (prefill) search.value = prefill;
  if (total) total.textContent = `🏛 ${conferences.length} conferences tracked`;
  area.innerHTML += [...new Set(conferences.map((item) => item.area))].sort().map((value) => `<option value="${value}">${value}</option>`).join("");
  status.innerHTML += [...new Set(conferences.map((item) => item.status))].map((value) => `<option value="${value}">${value}</option>`).join("");
  tier.innerHTML += [...new Set(conferences.map((item) => item.tier))].sort(compareTier).map((value) => `<option value="${value}">${value}</option>`).join("");

  function currentData() {
    let rows = conferences.filter((item) => (!area.value || item.area === area.value) && (!status.value || item.status === status.value) && (!tier.value || item.tier === tier.value) && (!search.value || matchText(search.value, [item.name, item.short_name, item.area, item.publisher, ...(item.subareas || []), ...(item.tags || [])])));
    switch (sort.value) {
      case "name-asc": rows.sort((a, b) => a.short_name.localeCompare(b.short_name)); break;
      case "tier-asc": rows.sort((a, b) => compareTier(a.tier, b.tier) || a.short_name.localeCompare(b.short_name)); break;
      case "acceptance-desc": rows.sort((a, b) => numericRate(b.acceptance_rate) - numericRate(a.acceptance_rate)); break;
      case "deadline-asc":
      default: rows.sort((a, b) => new Date(a.next_deadline || "9999-12-31") - new Date(b.next_deadline || "9999-12-31"));
    }
    return rows;
  }

  function draw() {
    const rows = currentData();
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, totalPages);
    const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
    count.textContent = `${rows.length} conferences match the current filters`;
    body.innerHTML = pagedRows.map((item) => `
      <tr>
        <td data-label="Tier">${escapeHtml(item.tier)}</td>
        <td data-label="Conference">${internalVenueLink(item)}<div class="row-subline">${escapeHtml(item.name)}</div>${renderTrustInline(item)}</td>
        <td data-label="Area">${escapeHtml(item.area)}<div class="row-subline">${escapeHtml((item.subareas || []).slice(0, 3).join(" · ") || "General scope")}</div></td>
        <td data-label="Deadline">${formatDate(item.next_deadline)}<div class="muted">${relativeDeadlineLabel(item.next_deadline)}</div></td>
        <td data-label="Event">${formatDate(item.event_date)}<div class="muted">${formatLocation(item.location, item.location_country)}</div></td>
        <td data-label="Frequency">${escapeHtml(item.frequency)}</td>
        <td data-label="Acceptance">${escapeHtml(item.acceptance_rate)}</td>
        <td data-label="Status">${statusBadge(item.status)}</td>
        <td data-label="Links"><div class="row-links">${miniLink("Site", item.website, "🌐")}${miniLink("Submit", item.submission_url, "📝")}${miniLink("Proceedings", latestProceedings(item), "📄")}</div><div class="row-actions"><button class="tiny-button" data-save-venue="${escapeHtml(item.slug)}">Save</button><button class="tiny-button" data-compare-venue="${escapeHtml(item.slug)}">Compare</button></div></td>
      </tr>
    `).join("");
    logGrid.innerHTML = rows.slice(0, 6).map((item) => {
      const log = item.edition_log?.[0];
      return log ? `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)} ${log.year}</h3><p class="muted">${formatLocation(log.location, log.location_country)}</p><p>${escapeHtml(log.acceptance_rate)} acceptance · ${log.papers_published ? `${log.papers_published} papers` : "paper count TBA"}</p><div>${tagList(log.highlights || [])}</div><div class="actions">${miniLink("Proceedings", log.proceedings_url, "📄")}</div></article>` : "";
    }).join("");
    if (trendGrid) trendGrid.innerHTML = rows.slice(0, 6).map(renderTrendCard).join("");
    renderCompareStatus("conference-compare-status", "conference", conferences);
    renderCompareTray("conference-compare", "conference", conferences);
    renderPagination(pagerTop, page, rows.length, pageSize, (next) => { page = next; draw(); }, (size) => { pageSize = size; page = 1; draw(); });
    renderPagination(pagerBottom, page, rows.length, pageSize, (next) => { page = next; draw(); }, (size) => { pageSize = size; page = 1; draw(); });
    body.querySelectorAll("[data-save-venue]").forEach((button) => {
      button.addEventListener("click", () => {
        const state = watchlistItems();
        if (!state.find((item) => item.slug === button.dataset.saveVenue)) {
          state.push({ slug: button.dataset.saveVenue, type: "conference" });
          saveStored(WATCHLIST_KEY, state);
        }
      });
    });
    body.querySelectorAll("[data-compare-venue]").forEach((button) => {
      button.addEventListener("click", () => {
        const state = loadStored(COMPARE_KEY, { conference: [], journal: [] });
        if (!state.conference.includes(button.dataset.compareVenue) && state.conference.length < 4) state.conference.push(button.dataset.compareVenue);
        saveStored(COMPARE_KEY, state);
        renderCompareStatus("conference-compare-status", "conference", conferences);
        renderCompareTray("conference-compare", "conference", conferences);
      });
    });
  }

  [search, area, status, tier, sort].forEach((element) => element.addEventListener("input", () => { page = 1; draw(); }));
  [area, status, tier, sort].forEach((element) => element.addEventListener("change", () => { page = 1; draw(); }));
  draw();
}

function initJournalPage(journals) {
  const body = document.getElementById("journal-body");
  if (!body) return;
  const search = document.getElementById("journal-search");
  const area = document.getElementById("journal-area");
  const oa = document.getElementById("journal-oa");
  const tier = document.getElementById("journal-tier");
  const sort = document.getElementById("journal-sort");
  const count = document.getElementById("journal-count");
  const total = document.getElementById("journal-total");
  const logGrid = document.getElementById("journal-log-grid");
  const pagerTop = document.getElementById("journal-pagination-top");
  const pagerBottom = document.getElementById("journal-pagination-bottom");
  const compare = document.getElementById("journal-compare");
  let page = 1;
  let pageSize = 5;
  const prefill = getPrefillQuery();
  if (prefill) search.value = prefill;
  if (total) total.textContent = `📚 ${journals.length} journals tracked`;
  area.innerHTML += [...new Set(journals.map((item) => item.area))].sort().map((value) => `<option value="${value}">${value}</option>`).join("");
  oa.innerHTML += [...new Set(journals.map((item) => item.oa_model))].map((value) => `<option value="${value}">${value}</option>`).join("");
  tier.innerHTML += [...new Set(journals.map((item) => item.tier))].sort(compareTier).map((value) => `<option value="${value}">${value}</option>`).join("");

  const reviewRank = { Fast: 0, Moderate: 1, Slow: 2 };
  function currentData() {
    let rows = journals.filter((item) => (!area.value || item.area === area.value) && (!oa.value || item.oa_model === oa.value) && (!tier.value || item.tier === tier.value) && (!search.value || matchText(search.value, [item.name, item.short_name, item.area, item.publisher, ...(item.subareas || []), ...(item.tags || [])])));
    switch (sort.value) {
      case "tier-asc": rows.sort((a, b) => compareTier(a.tier, b.tier) || a.short_name.localeCompare(b.short_name)); break;
      case "latest-desc": rows.sort((a, b) => new Date(b.latest_publication_date || 0) - new Date(a.latest_publication_date || 0)); break;
      case "review-asc": rows.sort((a, b) => (reviewRank[a.review_speed] ?? 99) - (reviewRank[b.review_speed] ?? 99)); break;
      case "name-asc":
      default: rows.sort((a, b) => a.short_name.localeCompare(b.short_name));
    }
    return rows;
  }

  function draw() {
    const rows = currentData();
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, totalPages);
    const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
    count.textContent = `${rows.length} journals match the current filters`;
    body.innerHTML = pagedRows.map((item) => `
      <tr>
        <td data-label="Tier">${escapeHtml(item.tier)}</td>
        <td data-label="Journal">${internalVenueLink(item)}<div class="row-subline">${escapeHtml(item.name)}</div>${renderTrustInline(item)}</td>
        <td data-label="Area">${escapeHtml(item.area)}<div class="row-subline">${escapeHtml((item.subareas || []).slice(0, 3).join(" · ") || "General scope")}</div></td>
        <td data-label="Publisher">${escapeHtml(item.publisher)}</td>
        <td data-label="OA model">${escapeHtml(item.oa_model)}</td>
        <td data-label="Frequency">${escapeHtml(item.frequency)}</td>
        <td data-label="Review speed">${escapeHtml(item.review_speed)}</td>
        <td data-label="Latest issue">${escapeHtml(item.latest_issue)}<div class="muted">${formatDate(item.latest_publication_date)}</div></td>
        <td data-label="Links"><div class="row-links">${miniLink("Site", item.website, "🌐")}${miniLink("Submit", item.submission_url, "✍️")}${miniLink("Issue", item.issue_log?.[0]?.issue_url, "📰")}</div><div class="row-actions"><button class="tiny-button" data-save-venue="${escapeHtml(item.slug)}">Save</button><button class="tiny-button" data-compare-venue="${escapeHtml(item.slug)}">Compare</button></div></td>
      </tr>
    `).join("");
    logGrid.innerHTML = rows.slice(0, 6).map((item) => {
      const log = item.issue_log?.[0];
      return log ? `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)}</h3><p class="muted">Vol. ${escapeHtml(log.volume)}${log.issue ? `, Issue ${escapeHtml(log.issue)}` : ""}</p><p>${formatDate(log.date)}</p><p class="muted">${escapeHtml(log.featured_articles?.[0]?.title || "")}</p><div class="actions">${miniLink("Issue", log.issue_url, "📰")}${miniLink("Article", log.featured_articles?.[0]?.url, "📄")}</div></article>` : "";
    }).join("");
    renderCompareStatus("journal-compare-status", "journal", journals);
    renderCompareTray("journal-compare", "journal", journals);
    renderPagination(pagerTop, page, rows.length, pageSize, (next) => { page = next; draw(); }, (size) => { pageSize = size; page = 1; draw(); });
    renderPagination(pagerBottom, page, rows.length, pageSize, (next) => { page = next; draw(); }, (size) => { pageSize = size; page = 1; draw(); });
    body.querySelectorAll("[data-save-venue]").forEach((button) => {
      button.addEventListener("click", () => {
        const state = watchlistItems();
        if (!state.find((item) => item.slug === button.dataset.saveVenue)) {
          state.push({ slug: button.dataset.saveVenue, type: "journal" });
          saveStored(WATCHLIST_KEY, state);
        }
      });
    });
    body.querySelectorAll("[data-compare-venue]").forEach((button) => {
      button.addEventListener("click", () => {
        const state = loadStored(COMPARE_KEY, { conference: [], journal: [] });
        if (!state.journal.includes(button.dataset.compareVenue) && state.journal.length < 4) state.journal.push(button.dataset.compareVenue);
        saveStored(COMPARE_KEY, state);
        renderCompareStatus("journal-compare-status", "journal", journals);
        renderCompareTray("journal-compare", "journal", journals);
      });
    });
  }

  [search, area, oa, tier, sort].forEach((element) => element.addEventListener("input", () => { page = 1; draw(); }));
  [area, oa, tier, sort].forEach((element) => element.addEventListener("change", () => { page = 1; draw(); }));
  draw();
}

function initCfpPage(cfps, conferences, journals, areas) {
  const body = document.getElementById("cfp-body");
  if (!body) return;
  const venues = venueMap(conferences, journals);
  const search = document.getElementById("cfp-search");
  const area = document.getElementById("cfp-area");
  const type = document.getElementById("cfp-type");
  const status = document.getElementById("cfp-status");
  const confidence = document.getElementById("cfp-confidence");
  const count = document.getElementById("cfp-count");
  const summary = document.getElementById("cfp-summary");
  const quickChips = document.getElementById("cfp-quick-chips");
  const pagerTop = document.getElementById("cfp-pagination-top");
  const pagerBottom = document.getElementById("cfp-pagination-bottom");
  let page = 1;
  let pageSize = 5;
  let rangeDays = 0;
  let confirmedOnly = false;
  let quickType = "";
  const prefill = getPrefillQuery();
  if (prefill) search.value = prefill;
  area.innerHTML += areas.map((item) => `<option value="${item.slug}">${item.name}</option>`).join("");
  type.innerHTML += [...new Set(cfps.map((item) => item.venue_type))].map((value) => `<option value="${value}">${value}</option>`).join("");
  status.innerHTML += [...new Set(cfps.map((item) => item.status))].map((value) => `<option value="${value}">${value}</option>`).join("");
  confidence.innerHTML += [...new Set(cfps.map((item) => item.confidence))].map((value) => `<option value="${value}">${value}</option>`).join("");
  const nextDeadlines = cfps.filter((item) => item.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);
  summary.innerHTML = nextDeadlines.map((item) => {
    const venue = venues.get(item.venue_slug);
    return `<article class="deadline-card stack-sm"><h3>${escapeHtml(venue?.short_name || item.venue_slug)}</h3><p>${formatDate(item.deadline)}${item.deadline ? ` · ${relativeDeadlineLabel(item.deadline)}` : ""}</p><p class="muted">${formatLocation(venue?.location, venue?.location_country)} · ${escapeHtml(item.track)} · ${escapeHtml(item.confidence)}</p><div class="actions">${miniLink("Submit", item.submission_url, "📝")}${miniLink("Venue", venue?.website, "🌐")}</div></article>`;
  }).join("");
  renderCfpUrgencyBlocks(cfps, venues);

  function currentData() {
    return cfps
      .filter((item) => (
        (!area.value || item.area_slug === area.value)
        && (!(quickType || type.value) || item.venue_type === (quickType || type.value))
        && (!status.value || item.status === status.value)
        && (!confidence.value || item.confidence === confidence.value)
        && (!confirmedOnly || item.deadline_confidence === "confirmed")
        && (!rangeDays || ((daysUntil(item.deadline) ?? 9999) >= 0 && (daysUntil(item.deadline) ?? 9999) <= rangeDays))
        && (!search.value || matchText(search.value, [
          item.track,
          item.notes || "",
          venues.get(item.venue_slug)?.name || item.venue_slug,
          venues.get(item.venue_slug)?.area || ""
        ]))
      ))
      .sort((a, b) => new Date(a.deadline || "9999-12-31") - new Date(b.deadline || "9999-12-31"));
  }

  function draw() {
    const rows = currentData();
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, totalPages);
    const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
    count.textContent = `${rows.length} CFPs match the current filters`;
    body.innerHTML = pagedRows.map((item) => {
      const venue = venues.get(item.venue_slug);
      return `<tr>
        <td data-label="Venue">${venue ? `<a class="detail-title-link" href="${venueDetailUrl(venue)}">${escapeHtml(venue.short_name || item.venue_slug)}</a>` : escapeHtml(item.venue_slug)}<div class="muted">${escapeHtml(venue?.area || "")} · ${formatLocation(venue?.location, venue?.location_country)}</div>${renderTrustInline(item, "deadline")}</td>
        <td data-label="Type">${escapeHtml(item.venue_type)}</td>
        <td data-label="Track">${escapeHtml(item.track)}</td>
        <td data-label="Deadline">${formatDate(item.deadline)}<div class="muted">${relativeDeadlineLabel(item.deadline)}</div></td>
        <td data-label="Notification">${item.notification_date === "Rolling" ? "Rolling" : formatDate(item.notification_date)}</td>
        <td data-label="Status">${statusBadge(item.status)}</td>
        <td data-label="Confidence">${escapeHtml(item.confidence)}</td>
        <td data-label="Submission">${link("Submit", item.submission_url)}</td>
      </tr>`;
    }).join("");
    renderPagination(pagerTop, page, rows.length, pageSize, (next) => { page = next; draw(); }, (size) => { pageSize = size; page = 1; draw(); });
    renderPagination(pagerBottom, page, rows.length, pageSize, (next) => { page = next; draw(); }, (size) => { pageSize = size; page = 1; draw(); });
  }

  [search, area, type, status, confidence].forEach((element) => element.addEventListener("input", () => { page = 1; draw(); }));
  [area, type, status, confidence].forEach((element) => element.addEventListener("change", () => { page = 1; draw(); }));
  quickChips?.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (chip.dataset.reset) {
        rangeDays = 0;
        confirmedOnly = false;
        quickType = "";
      } else if (chip.dataset.range) {
        const next = Number(chip.dataset.range);
        rangeDays = rangeDays === next ? 0 : next;
      } else if (chip.dataset.confirmed) {
        confirmedOnly = !confirmedOnly;
      } else if (chip.dataset.type) {
        quickType = quickType === chip.dataset.type ? "" : chip.dataset.type;
      }
      quickChips.querySelectorAll(".filter-chip").forEach((button) => {
        const active = (!!button.dataset.range && Number(button.dataset.range) === rangeDays)
          || (!!button.dataset.confirmed && confirmedOnly)
          || (!!button.dataset.type && quickType === button.dataset.type);
        button.classList.toggle("is-active", active);
      });
      page = 1;
      draw();
    });
  });
  draw();
}

function initAreasPage(areas, conferences, journals, cfps) {
  const svg = document.getElementById("area-graph");
  if (!svg) return;
  const familySelect = document.getElementById("area-family");
  const typeSelect = document.getElementById("area-venue-type");
  const search = document.getElementById("area-search");
  const reset = document.getElementById("area-reset");
  const summary = document.getElementById("area-summary");
  const confBody = document.getElementById("area-conference-body");
  const journalBody = document.getElementById("area-journal-body");
  const relatedCfps = document.getElementById("area-related-cfps");
  familySelect.innerHTML += [...new Set(areas.map((item) => item.family))].map((value) => `<option value="${value}">${value}</option>`).join("");
  let selectedArea = areas[0]?.slug || null;

  function filteredAreas() {
    return areas.filter((area) => {
      const relatedConferenceNames = conferences
        .filter((item) => item.primary_area_slug === area.slug || item.subarea_slugs?.includes(area.slug))
        .flatMap((item) => [item.name, item.short_name]);
      const relatedJournalNames = journals
        .filter((item) => item.primary_area_slug === area.slug || item.subarea_slugs?.includes?.(area.slug))
        .flatMap((item) => [item.name, item.short_name]);
      return (!familySelect.value || area.family === familySelect.value)
        && (!search.value || matchText(search.value, [
          area.name,
          area.description,
          ...(area.keywords || []),
          ...relatedConferenceNames,
          ...relatedJournalNames
        ]));
    });
  }

  function venuesForArea(areaSlug) {
    const confs = conferences.filter((item) => item.primary_area_slug === areaSlug || item.subarea_slugs?.includes(areaSlug));
    const jnls = journals.filter((item) => item.primary_area_slug === areaSlug || item.subarea_slugs?.includes?.(areaSlug));
    return {
      conferences: typeSelect.value === "journal" ? [] : confs,
      journals: typeSelect.value === "conference" ? [] : jnls
    };
  }

  function drawGraph() {
    const areaNodes = filteredAreas().slice(0, 10);
    if (!areaNodes.find((item) => item.slug === selectedArea)) selectedArea = areaNodes[0]?.slug || null;
    const currentArea = areaNodes.find((item) => item.slug === selectedArea) || null;
    const currentVenues = currentArea ? venuesForArea(currentArea.slug) : { conferences: [], journals: [] };
    const confs = currentVenues.conferences.slice(0, 5);
    const jnls = currentVenues.journals.slice(0, 5);
    const areaX = 180, confX = 500, journalX = 820;
    svg.innerHTML = "";
    const ns = "http://www.w3.org/2000/svg";
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("width", "1000"); bg.setAttribute("height", "480"); bg.setAttribute("rx", "18"); bg.setAttribute("fill", "transparent"); svg.appendChild(bg);
    areaNodes.forEach((area, index) => {
      const y = 60 + index * 48;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(areaX)); circle.setAttribute("cy", String(y)); circle.setAttribute("r", area.slug === selectedArea ? "18" : "14"); circle.setAttribute("fill", "var(--accent)"); circle.style.cursor = "pointer";
      circle.addEventListener("click", () => { selectedArea = area.slug; drawGraph(); }); svg.appendChild(circle);
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", String(areaX + 28)); label.setAttribute("y", String(y + 5)); label.setAttribute("fill", "var(--text)"); label.setAttribute("font-size", "14"); label.textContent = area.name; label.style.cursor = "pointer";
      label.addEventListener("click", () => { selectedArea = area.slug; drawGraph(); }); svg.appendChild(label);
    });
    confs.forEach((item, index) => {
      const y = 90 + index * 64;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(areaX + 18)); line.setAttribute("y1", String(60 + areaNodes.findIndex((a) => a.slug === selectedArea) * 48)); line.setAttribute("x2", String(confX - 20)); line.setAttribute("y2", String(y)); line.setAttribute("stroke", "#67e8f9"); line.setAttribute("stroke-opacity", "0.55"); svg.appendChild(line);
      const circle = document.createElementNS(ns, "circle"); circle.setAttribute("cx", String(confX)); circle.setAttribute("cy", String(y)); circle.setAttribute("r", "12"); circle.setAttribute("fill", "#67e8f9"); svg.appendChild(circle);
      const label = document.createElementNS(ns, "text"); label.setAttribute("x", String(confX + 22)); label.setAttribute("y", String(y + 5)); label.setAttribute("fill", "var(--text)"); label.setAttribute("font-size", "14"); label.textContent = item.short_name; svg.appendChild(label);
    });
    jnls.forEach((item, index) => {
      const y = 90 + index * 64;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(areaX + 18)); line.setAttribute("y1", String(60 + areaNodes.findIndex((a) => a.slug === selectedArea) * 48)); line.setAttribute("x2", String(journalX - 20)); line.setAttribute("y2", String(y)); line.setAttribute("stroke", "#b27cff"); line.setAttribute("stroke-opacity", "0.55"); svg.appendChild(line);
      const circle = document.createElementNS(ns, "circle"); circle.setAttribute("cx", String(journalX)); circle.setAttribute("cy", String(y)); circle.setAttribute("r", "12"); circle.setAttribute("fill", "#b27cff"); svg.appendChild(circle);
      const label = document.createElementNS(ns, "text"); label.setAttribute("x", String(journalX + 22)); label.setAttribute("y", String(y + 5)); label.setAttribute("fill", "var(--text)"); label.setAttribute("font-size", "14"); label.textContent = item.short_name; svg.appendChild(label);
    });

    if (!currentArea) {
      summary.innerHTML = "No matching areas."; confBody.innerHTML = ""; journalBody.innerHTML = ""; relatedCfps.innerHTML = ""; return;
    }
    summary.innerHTML = `
      <p class="eyebrow">✨ Selected area</p>
      <h3>${escapeHtml(currentArea.name)}</h3>
      <p class="muted">${escapeHtml(currentArea.description)}</p>
      <div>${tagList(currentArea.keywords || [])}</div>
      <p class="muted">Related areas: ${(currentArea.related_areas || []).map((item) => escapeHtml(item)).join(", ")}</p>
    `;
    confBody.innerHTML = currentVenues.conferences.map((item) => `<tr><td data-label="Conference">${link(item.short_name, item.website)}</td><td data-label="Tier">${escapeHtml(item.tier)}</td><td data-label="Deadline">${formatDate(item.next_deadline)}</td><td data-label="Fit">${escapeHtml(item.area_strengths?.[currentArea.slug] || "adjacent")}</td><td data-label="Status">${statusBadge(item.status)}</td></tr>`).join("") || `<tr><td colspan="5">No conference matches.</td></tr>`;
    journalBody.innerHTML = currentVenues.journals.map((item) => `<tr><td data-label="Journal">${link(item.short_name, item.website)}</td><td data-label="Tier">${escapeHtml(item.tier)}</td><td data-label="Latest issue">${escapeHtml(item.latest_issue)}</td><td data-label="Fit">${escapeHtml(item.area_strengths?.[currentArea.slug] || "adjacent")}</td><td data-label="Review">${escapeHtml(item.review_speed)}</td></tr>`).join("") || `<tr><td colspan="5">No journal matches.</td></tr>`;
    const related = cfps.filter((item) => item.area_slug === currentArea.slug).slice(0, 4);
    relatedCfps.innerHTML = related.length ? related.map((item) => {
      const venue = venuesForArea(currentArea.slug).conferences.concat(venuesForArea(currentArea.slug).journals).find((venueItem) => venueItem.slug === item.venue_slug);
      return `<p><strong>${escapeHtml(venue?.short_name || venue?.name || item.venue_slug)}</strong> · ${formatDate(item.deadline)} · ${relativeDeadlineLabel(item.deadline)} · ${escapeHtml(item.status)}</p>`;
    }).join("") : "<p>No immediate CFP entries tied to this area.</p>";
  }

  [familySelect, typeSelect, search].forEach((element) => element.addEventListener("input", drawGraph));
  [familySelect, typeSelect].forEach((element) => element.addEventListener("change", drawGraph));
  reset.addEventListener("click", () => { familySelect.value = ""; typeSelect.value = "all"; search.value = ""; selectedArea = areas[0]?.slug || null; drawGraph(); });
  drawGraph();
}

async function main() {
  initTheme();
  initCurrentNav();
  initTopbarQuickSearch();
  syncTopbarOffset();
  const [meta, conferenceData, conferenceExtraData, journalData, journalExtraData, cfpData, featuredData, areaData] = await Promise.all([
    loadJson("./data/meta.json"),
    loadJson("./data/conferences.json"),
    loadJson("./data/conferences_extra.json"),
    loadJson("./data/journals.json"),
    loadJson("./data/journals_extra.json"),
    loadJson("./data/cfps.json"),
    loadJson("./data/featured.json"),
    loadJson("./data/areas.json")
  ]);
  const conferences = conferenceData.conferences.concat(conferenceExtraData.conferences).map(normalizeConference);
  const journals = journalData.journals.concat(journalExtraData.journals).map(normalizeJournal);
  let cfps = cfpData.cfps;
  const areas = areaData.areas;
  meta.coverage.conferences = conferences.length;
  meta.coverage.journals = journals.length;
  const venues = venueMap(conferences, journals);
  cfps = cfps.map((item) => normalizeCfp(item, venues));

  renderMeta(meta);
  renderFeatured(featuredData, conferences, journals);
  renderHomeDeadlines(cfps, venues);
  renderHomeConferencePreview(conferences);
  renderHomeJournalPreview(journals);
  renderLogs(conferences, journals);
  renderHomepageActivity(conferences, journals, cfps, venues);
  renderAreaSpotlights(areas, conferences, journals, cfps, venues);
  initConferencePage(conferences);
  initJournalPage(journals);
  initCfpPage(cfps, conferences, journals, areas);
  initAreasPage(areas, conferences, journals, cfps);
  renderVenuePage(conferences, journals, cfps);
}

window.addEventListener("resize", syncTopbarOffset);
window.addEventListener("load", syncTopbarOffset);
main().catch((error) => {
  const target = document.querySelector("main") || document.body;
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `<h2>Failed to load site data</h2><p>${escapeHtml(error.message)}</p>`;
  target.prepend(panel);
});

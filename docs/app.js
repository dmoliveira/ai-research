const THEME_KEY = "topresearch-theme";

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
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === theme);
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "auto";
  applyTheme(saved);
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeOption || "auto";
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    });
  });
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

function daysUntil(value) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
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
    <div class="stat-grid">
      <span class="badge">${meta.coverage.conferences} conferences</span>
      <span class="badge">${meta.coverage.journals} journals</span>
      <span class="badge">${meta.coverage.cfps} CFPs</span>
      <span class="badge">${meta.coverage.areas} areas</span>
    </div>
  `;
}

function renderFeatured(featured, confs, journals) {
  const el = document.getElementById("featured-grid");
  if (!el) return;
  const map = venueMap(confs, journals);
  el.innerHTML = featured.featured.map((entry) => {
    const item = map.get(entry.slug);
    if (!item) return "";
    return `
      <article class="venue-card stack-sm">
        <div class="inline-meta">
          <span class="status-badge status-featured">Featured</span>
          <span class="badge">${escapeHtml(item.type === "conference" ? "Conference" : "Journal")}</span>
          <span class="badge">${escapeHtml(item.area)}</span>
        </div>
        <h3>${link(item.short_name || item.name, item.website)}</h3>
        <p class="muted">${escapeHtml(item.notes || "")}</p>
        <div>${tagList(item.subareas?.slice(0, 3) || item.tags || [])}</div>
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
    const delta = daysUntil(item.deadline);
    return `
      <article class="deadline-card stack-sm">
        <div class="inline-meta">${statusBadge(item.status)} <span class="badge">${escapeHtml(item.confidence)}</span></div>
        <h3>${escapeHtml(venue?.short_name || item.venue_slug)}</h3>
        <p class="muted">${escapeHtml(item.track)} · ${escapeHtml(venue?.area || "")}</p>
        <p><strong>${formatDate(item.deadline)}</strong>${delta !== null ? ` · in ${delta} days` : ""}</p>
        <p class="muted">${escapeHtml(item.notes || "")}</p>
      </article>
    `;
  }).join("");
}

function renderHomeConferencePreview(conferences) {
  const body = document.getElementById("home-conference-body");
  if (!body) return;
  body.innerHTML = conferences.slice(0, 6).map((item) => `
    <tr>
      <td data-label="Tier">${escapeHtml(item.tier)}</td>
      <td data-label="Conference">${link(item.short_name, item.website)}<div class="muted">${escapeHtml(item.name)}</div></td>
      <td data-label="Area">${escapeHtml(item.area)}</td>
      <td data-label="Deadline">${formatDate(item.next_deadline)}</td>
      <td data-label="Event">${formatDate(item.event_date)}</td>
      <td data-label="Acceptance">${escapeHtml(item.acceptance_rate)}</td>
      <td data-label="Status">${statusBadge(item.status)}</td>
    </tr>
  `).join("");
}

function renderHomeJournalPreview(journals) {
  const body = document.getElementById("home-journal-body");
  if (!body) return;
  body.innerHTML = journals.slice(0, 6).map((item) => `
    <tr>
      <td data-label="Tier">${escapeHtml(item.tier)}</td>
      <td data-label="Journal">${link(item.short_name, item.website)}<div class="muted">${escapeHtml(item.name)}</div></td>
      <td data-label="Area">${escapeHtml(item.area)}</td>
      <td data-label="Publisher">${escapeHtml(item.publisher)}</td>
      <td data-label="OA">${escapeHtml(item.oa_model)}</td>
      <td data-label="Latest issue">${escapeHtml(item.latest_issue)}</td>
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
      return `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)} ${log.year}</h3><p class="muted">${escapeHtml(log.location)} · ${escapeHtml(log.date_range)}</p><p>${escapeHtml(log.acceptance_rate)} acceptance</p><div>${tagList(log.highlights || [])}</div></article>`;
    }).join("");
  }
  if (journalEl) {
    journalEl.innerHTML = journals.slice(0, 3).map((item) => {
      const log = item.issue_log?.[0];
      if (!log) return "";
      return `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)}</h3><p class="muted">Vol. ${escapeHtml(log.volume)}${log.issue ? `, Issue ${escapeHtml(log.issue)}` : ""}</p><p>${formatDate(log.date)}</p><p class="muted">${escapeHtml(log.featured_articles?.[0]?.title || "")}</p></article>`;
    }).join("");
  }
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
  const logGrid = document.getElementById("conference-log-grid");
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
    count.textContent = `${rows.length} conferences shown`;
    body.innerHTML = rows.map((item) => `
      <tr>
        <td data-label="Tier">${escapeHtml(item.tier)}</td>
        <td data-label="Conference">${link(item.short_name, item.website)}<div class="muted">${escapeHtml(item.name)}</div></td>
        <td data-label="Area">${escapeHtml(item.area)}<div class="muted">${tagList(item.subareas || [])}</div></td>
        <td data-label="Deadline">${formatDate(item.next_deadline)}</td>
        <td data-label="Event">${formatDate(item.event_date)}<div class="muted">${escapeHtml(item.location)}</div></td>
        <td data-label="Frequency">${escapeHtml(item.frequency)}</td>
        <td data-label="Acceptance">${escapeHtml(item.acceptance_rate)}</td>
        <td data-label="Status">${statusBadge(item.status)}</td>
        <td data-label="Links">${link("Site", item.website)} · ${link("Submit", item.submission_url)}</td>
      </tr>
    `).join("");
    logGrid.innerHTML = rows.slice(0, 6).map((item) => {
      const log = item.edition_log?.[0];
      return log ? `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)} ${log.year}</h3><p class="muted">${escapeHtml(log.location)}</p><p>${escapeHtml(log.acceptance_rate)} acceptance</p><div>${tagList(log.highlights || [])}</div></article>` : "";
    }).join("");
  }

  [search, area, status, tier, sort].forEach((element) => element.addEventListener("input", draw));
  [area, status, tier, sort].forEach((element) => element.addEventListener("change", draw));
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
  const logGrid = document.getElementById("journal-log-grid");
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
    count.textContent = `${rows.length} journals shown`;
    body.innerHTML = rows.map((item) => `
      <tr>
        <td data-label="Tier">${escapeHtml(item.tier)}</td>
        <td data-label="Journal">${link(item.short_name, item.website)}<div class="muted">${escapeHtml(item.name)}</div></td>
        <td data-label="Area">${escapeHtml(item.area)}<div class="muted">${tagList(item.subareas || [])}</div></td>
        <td data-label="Publisher">${escapeHtml(item.publisher)}</td>
        <td data-label="OA model">${escapeHtml(item.oa_model)}</td>
        <td data-label="Frequency">${escapeHtml(item.frequency)}</td>
        <td data-label="Review speed">${escapeHtml(item.review_speed)}</td>
        <td data-label="Latest issue">${escapeHtml(item.latest_issue)}<div class="muted">${formatDate(item.latest_publication_date)}</div></td>
        <td data-label="Links">${link("Site", item.website)} · ${link("Submit", item.submission_url)}</td>
      </tr>
    `).join("");
    logGrid.innerHTML = rows.slice(0, 6).map((item) => {
      const log = item.issue_log?.[0];
      return log ? `<article class="log-card stack-sm"><h3>${escapeHtml(item.short_name)}</h3><p class="muted">Vol. ${escapeHtml(log.volume)}${log.issue ? `, Issue ${escapeHtml(log.issue)}` : ""}</p><p>${formatDate(log.date)}</p><p class="muted">${escapeHtml(log.featured_articles?.[0]?.title || "")}</p></article>` : "";
    }).join("");
  }

  [search, area, oa, tier, sort].forEach((element) => element.addEventListener("input", draw));
  [area, oa, tier, sort].forEach((element) => element.addEventListener("change", draw));
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
  area.innerHTML += areas.map((item) => `<option value="${item.slug}">${item.name}</option>`).join("");
  type.innerHTML += [...new Set(cfps.map((item) => item.venue_type))].map((value) => `<option value="${value}">${value}</option>`).join("");
  status.innerHTML += [...new Set(cfps.map((item) => item.status))].map((value) => `<option value="${value}">${value}</option>`).join("");
  confidence.innerHTML += [...new Set(cfps.map((item) => item.confidence))].map((value) => `<option value="${value}">${value}</option>`).join("");
  const nextDeadlines = cfps.filter((item) => item.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);
  summary.innerHTML = nextDeadlines.map((item) => {
    const venue = venues.get(item.venue_slug);
    return `<article class="deadline-card stack-sm"><h3>${escapeHtml(venue?.short_name || item.venue_slug)}</h3><p>${formatDate(item.deadline)}</p><p class="muted">${escapeHtml(item.track)} · ${escapeHtml(item.confidence)}</p></article>`;
  }).join("");

  function currentData() {
    return cfps
      .filter((item) => (
        (!area.value || item.area_slug === area.value)
        && (!type.value || item.venue_type === type.value)
        && (!status.value || item.status === status.value)
        && (!confidence.value || item.confidence === confidence.value)
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
    count.textContent = `${rows.length} CFPs shown`;
    body.innerHTML = rows.map((item) => {
      const venue = venues.get(item.venue_slug);
      return `<tr>
        <td data-label="Venue">${escapeHtml(venue?.short_name || item.venue_slug)}<div class="muted">${escapeHtml(venue?.area || "")}</div></td>
        <td data-label="Type">${escapeHtml(item.venue_type)}</td>
        <td data-label="Track">${escapeHtml(item.track)}</td>
        <td data-label="Deadline">${formatDate(item.deadline)}</td>
        <td data-label="Notification">${escapeHtml(item.notification_date || "Rolling")}</td>
        <td data-label="Status">${statusBadge(item.status)}</td>
        <td data-label="Confidence">${escapeHtml(item.confidence)}</td>
        <td data-label="Submission">${link("Submit", item.submission_url)}</td>
      </tr>`;
    }).join("");
  }

  [search, area, type, status, confidence].forEach((element) => element.addEventListener("input", draw));
  [area, type, status, confidence].forEach((element) => element.addEventListener("change", draw));
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
      <p class="eyebrow">Selected area</p>
      <h3>${escapeHtml(currentArea.name)}</h3>
      <p class="muted">${escapeHtml(currentArea.description)}</p>
      <div>${tagList(currentArea.keywords || [])}</div>
      <p class="muted">Related areas: ${(currentArea.related_areas || []).map((item) => escapeHtml(item)).join(", ")}</p>
    `;
    confBody.innerHTML = currentVenues.conferences.map((item) => `<tr><td data-label="Conference">${link(item.short_name, item.website)}</td><td data-label="Tier">${escapeHtml(item.tier)}</td><td data-label="Deadline">${formatDate(item.next_deadline)}</td><td data-label="Fit">${escapeHtml(item.area_strengths?.[currentArea.slug] || "adjacent")}</td><td data-label="Status">${statusBadge(item.status)}</td></tr>`).join("") || `<tr><td colspan="5">No conference matches.</td></tr>`;
    journalBody.innerHTML = currentVenues.journals.map((item) => `<tr><td data-label="Journal">${link(item.short_name, item.website)}</td><td data-label="Tier">${escapeHtml(item.tier)}</td><td data-label="Latest issue">${escapeHtml(item.latest_issue)}</td><td data-label="Fit">${escapeHtml(item.area_strengths?.[currentArea.slug] || "adjacent")}</td><td data-label="Review">${escapeHtml(item.review_speed)}</td></tr>`).join("") || `<tr><td colspan="5">No journal matches.</td></tr>`;
    const related = cfps.filter((item) => item.area_slug === currentArea.slug).slice(0, 4);
    relatedCfps.innerHTML = related.length ? related.map((item) => `<p><strong>${escapeHtml(item.venue_slug)}</strong> · ${formatDate(item.deadline)} · ${escapeHtml(item.status)}</p>`).join("") : "<p>No immediate CFP entries tied to this area.</p>";
  }

  [familySelect, typeSelect, search].forEach((element) => element.addEventListener("input", drawGraph));
  [familySelect, typeSelect].forEach((element) => element.addEventListener("change", drawGraph));
  reset.addEventListener("click", () => { familySelect.value = ""; typeSelect.value = "all"; search.value = ""; selectedArea = areas[0]?.slug || null; drawGraph(); });
  drawGraph();
}

async function main() {
  initTheme();
  syncTopbarOffset();
  const [meta, conferenceData, journalData, cfpData, featuredData, areaData] = await Promise.all([
    loadJson("./data/meta.json"),
    loadJson("./data/conferences.json"),
    loadJson("./data/journals.json"),
    loadJson("./data/cfps.json"),
    loadJson("./data/featured.json"),
    loadJson("./data/areas.json")
  ]);
  const conferences = conferenceData.conferences;
  const journals = journalData.journals;
  const cfps = cfpData.cfps;
  const areas = areaData.areas;
  const venues = venueMap(conferences, journals);

  renderMeta(meta);
  renderFeatured(featuredData, conferences, journals);
  renderHomeDeadlines(cfps, venues);
  renderHomeConferencePreview(conferences);
  renderHomeJournalPreview(journals);
  renderLogs(conferences, journals);
  initConferencePage(conferences);
  initJournalPage(journals);
  initCfpPage(cfps, conferences, journals, areas);
  initAreasPage(areas, conferences, journals, cfps);
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

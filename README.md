# VenueAtlas — Top Research Conferences and Journals for CS, AI/ML, and Data Science

[![Updated 2026](https://img.shields.io/badge/updated-2026-blue)](./docs/data/meta.json)
[![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-ready-black)](./docs/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

VenueAtlas is a research-friendly directory of top conferences, journals, upcoming calls for papers, and area-based publishing routes for Computer Science, AI/ML, and Data Science.

Created by **[Diego Marinho](https://dmoliveira.github.io/my-cv-public/cv/human/)**.

## What this includes

- top conferences and journals for CS, AI/ML, and Data Science
- upcoming calls for papers and deadline tracking
- standardized conference edition logs and journal issue logs
- area explorer with graph view for venues by subfield
- static site ready for **GitHub Pages** from `/docs`

## Open the site locally

Serve `/docs` locally because the site loads JSON with `fetch()`:

```bash
python3 -m http.server 8000 -d docs
```

- Main site: [http://localhost:8000/index.html](http://localhost:8000/index.html)
- Conferences: [http://localhost:8000/conferences.html](http://localhost:8000/conferences.html)
- Journals: [http://localhost:8000/journals.html](http://localhost:8000/journals.html)
- Areas: [http://localhost:8000/areas.html](http://localhost:8000/areas.html)
- CFPs: [http://localhost:8000/cfp.html](http://localhost:8000/cfp.html)

## Data notes

- This repo is a curated publishing navigation directory, not an official ranking publication.
- Deadlines may be **confirmed**, **estimated**, or **TBA**.
- Venue selection favors highly recognized flagship conferences and journals in each covered area.
- Use this as a practical research map for publishing discovery, not as a substitute for official venue pages.

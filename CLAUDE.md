# La Noche de los Teatros 2026 — Interactive zone map

Client: Agencia Córdoba Cultura. Designer/owner: MAXI. Event: **30 Nov 2026**, Córdoba capital.
Talk to MAXI in Spanish (rioplatense, voseo). All site copy in Spanish.

## Token rules (follow always)
- Edit only what's needed; never rewrite whole files to change a few lines.
- Short replies: what changed + what's next. No recaps.
- Don't re-read big data files (`data/zones.json`, `../datos-mapa/calles-cordoba.json`) unless a task needs them; grep instead.
- One stage per session. When a stage is done, update **Status** below so the next session (after `/clear`) knows where we are.

## Goal
A one-page interactive site: a simplified-but-recognizable street map of Córdoba divided into 6 colored, angular sectors (one per zone). Each zone is named after a historic Córdoba theatre group; under the name goes the real barrio. **Clicking** a sector (not hover) opens a floating panel with the zone's venues and an embedded Google My Maps showing all its venues as pins (locations, not a route).

## Source of truth
- `data/zones.json` — 6 zones, 28 venues: name, address, lat/lon, Google place_id, Maps link, zone color, barrio, label text color, My Maps `mid` + embed URL, and the mockup's sector polygon (SVG path in mockup coords; projection documented inside).
- `reference/mockup.html` — approved visual mockup (open in a browser). Its floating panel uses a drawn mini-map only because the preview host blocked iframes; **the real site uses the My Maps iframe** (`zones[i].googleMyMaps.embed`).
- `reference/mockup-src/` — how the mockup was generated (Python: Voronoi sectors with shapely, clipped to an octagon frame, mitre-buffered; template + build script). Reuse if sectors must be recomputed.
- `data/calles-cordoba.json` (copy of `../datos-mapa/calles-cordoba.json`, so the site works served from `web-mapa/`) — OSM streets already simplified (Douglas-Peucker) for the basemap: `roads` by class (motorway/primary/secondary…) + `water`.
- `../datos-mapa/google-my-maps-embeds.json` — embeds per zone (same as in zones.json).
- `assets/caretas/careta-*.svg` — the identity "caretas" (angular masks) per zone, extracted from `../CONTEXTO GRAFICO.ai`. Used as icons in the panel header, NOT on the map.
- `assets/logo-caretas.svg`, `logo-titulo.svg`, `logos-institucionales.svg` — vector logo from page 1 of the .ai (`reference/extraer-logo.py`, needs PyMuPDF). The caretas are also inlined in `site/index.html` for the intro animation.
- `reference/mockup-src/agrandar_zona.py` — grows one sector and trims its neighbours (needs shapely). Siripo was grown with `siripo 1.15,1.7 --sur` (area ×2, label radius 32→56); it checks every venue stays in its zone. Shapes before that: `reference/zones.antes-siripo.json`.

## Identity
- Font: Poppins (700/800 for titles, 500 for body).
- Background `#181818`, panels `#21211F`.
- Zone colors: Siripo `#0063FF` · El Juglar `#CFF933` · La Chispa `#FE9FF3` · TEUC `#64AC9E` · LTL `#FF6699` · El Arlequín `#AF78D3`.
- Labels on sectors: dark `#181818` text, except Siripo (blue) → white.
- Label layout on each sector: small "ZONA" / big group name / barrio below. When the map is narrower than 560px (phones) only the group name is drawn, larger (the barrio is on the zone cards and in the panel).
- Angular, rectilinear, pointy shapes (caretas style). No caretas drawn on the map.

## Zones (barrio label)
Siripo — Abasto · Cofico (5) · El Juglar — Barrio Pueyrredón (3) · La Chispa — Alta Córdoba · Providencia (5; pending: maybe "Alta Córdoba · San Martín") · TEUC — Centro (4) · LTL — Güemes · Observatorio (6) · El Arlequín — Alberdi · Alto Alberdi · Argüello (5; La Llave in Argüello is far NW but must stay inside Arlequín's sector).

## Tech decisions
- Static site: `site/index.html` + `site/styles.css` + `site/app.js` (vanilla JS, no framework, no build step). Inline SVG for the map, generated from the data.
- Panel: click to open, close button, Esc and outside click close it. Desktop: floating near the clicked zone; mobile: bottom sheet.
- iframe: `loading="lazy"`, only created when the panel opens (don't load 6 maps up front).
- Each venue row: name, address, "Cómo llegar ↗" link (`mapsUrl`).
- Accessible: sectors focusable (`tabindex`, `role="button"`, Enter/Space), panel with `aria-labelledby`.
- Responsive, no horizontal scroll at 360px.

## Google My Maps
6 public maps in the Agencia account "cultura Diseño" (titles "Zona X · La Noche de los Teatros 2026"). Fallback if an embed fails: Leaflet + OSM tiles with the same pins.

## Status
- [x] Venues geolocated, identity extracted, mockup approved (click-to-open), My Maps public.
- [x] Stage 1 — Scaffold `site/` and render the basemap + sectors + labels from data.
- [x] Stage 2 — Floating panel with venue list + My Maps iframe. List numbers match the My Maps pins (same order as the KMLs).
- [x] Stage 3 — Mobile bottom sheet, accessibility, polish (hover highlight, transitions). Extra: zone buttons under the map (same panel).
- [~] Stage 4 — Header/footer copy from the mockup; checked in browser at 1280px and 360px. Pending: MAXI's review of copy, La Chispa barrio, hosting.
- [x] Stage 5 — Mobile-first redesign (verified at 360/375/1280):
  - Intro with the animated logo, once per visit (sessionStorage), skipped by tap or on `#zona` links.
  - Picking a zone zooms the map to it (viewBox animation) and draws numbered pins; tapping a venue highlights its pin and vice versa.
  - Mobile: bottom sheet you can drag (down closes, up grows), with ‹ › to switch zones.
  - Desktop: panel docked at the right of the map, which is capped to the screen height.
  - Each zone has a link (`#siripo`…) and a "Compartir esta zona" button (Web Share, or copies the link).
  - Zone cards under the map; institutional logos in the footer.
Preview: `python3 -m http.server 8770` from `web-mapa/`, then open http://127.0.0.1:8770/site/

## Published
- Repo (public, its own git inside `web-mapa/`): https://github.com/elmaxiromero999-hue/noche-de-los-teatros-mapa
- GitHub Pages: https://elmaxiromero999-hue.github.io/noche-de-los-teatros-mapa/ (root `index.html` redirects to `site/`, keeping `#zona`). `noindex` because it's a preview, not the official site.
- To update: edit, then `git add -A && git commit && git push` from `web-mapa/` (Pages rebuilds in ~1 min). `.gitignore` keeps the ~100 MB `.ai` out.

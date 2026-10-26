First, create `.claude/settings.json` in this folder with exactly:
{"model":"sonnet","effortLevel":"medium","env":{"CLAUDE_CODE_SUBAGENT_MODEL":"haiku"}}
(token-saving config; it applies from the next session).

Read CLAUDE.md. Then open reference/mockup.html only as needed to match the look (grep it, don't read it whole).

Do Stage 1: create site/index.html, site/styles.css and site/app.js. app.js fetches ../data/zones.json and ../datos-mapa/calles-cordoba.json and draws the inline SVG map exactly like the mockup (basemap streets, 6 colored sectors from mockupSector.svgPath, white venue dots, "ZONA / name / barrio" labels). Clicking a sector just logs the zone id for now.

Before writing code, give me a 5-line plan. When done, tell me how to preview it (e.g. `python3 -m http.server` from this folder) and tick Stage 1 in CLAUDE.md.

# Runbook — Static deployment (GitHub Pages / Cloudflare Pages) + CPE

Games and hub are static; the CPE is the only stateful deploy (spec §11.1, §13).

**GitHub Pages:** `.github/workflows/pages.yml` publishes the repo root as the Pages artifact. Every game folder (`apps/games/<id>/`) is independently reachable at `/apps/games/<id>/` and deployable alone (folder = site root; `concepts-subset.json` inside guarantees offline play). Set each game's `?engine=` to your CPE URL (or edit `game.config.json`).

**Cloudflare Pages:** create one project per app with root = that app's folder, no build command, output = folder. **CPE on Workers:** `services/progression-engine/wrangler.toml` (D1 binding `DB`; `npx wrangler secret put AUTHOR_TOKEN`). Node `server.js` remains the tested reference implementation of the same wire.

**CORS:** CPE sends `Access-Control-Allow-Origin: *` for public reads/evidence (demo posture); restrict author routes by token, never by shipping secrets in games.

**Final verification (both hosts):** CPE stopped → local-only badge, fully playable; CPE running → synced badge, evidence from Game A visible in Game B and the Console for the same `learnerId`.

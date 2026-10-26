# Publishing — where everything lives on GitHub

All repos are **public**, under the `entrevoces` organization. One source
tree (this repo); the publisher puts each thing in its right repo. Nothing
is hand-copied.

## Repo map

| Repo | What belongs there | Source in this repo |
|---|---|---|
| [entrevoces](https://github.com/entrevoces/entrevoces) | The monorepo: engine, games, spec, docs, tests (source of truth) | repo root |
| [entrevoces.github.io](https://github.com/entrevoces/entrevoces.github.io) | The live site: hub + all web games (GitHub Pages) | `dist/site` ← `apps/` + `packages/` |
| [engine](https://github.com/entrevoces/engine) | Progression Engine: core, client, CPE, tests, spec | `dist/engine` |
| [knowledge-bases](https://github.com/entrevoces/knowledge-bases) | One JSON per world + source register | `dist/knowledge-bases` ← `content/` |
| `game-<id>` (11 repos) | Each web game, standalone: vendored engine, imports rewritten | `dist/games/<id>` |
| [roblox-puente-islands](https://github.com/entrevoces/roblox-puente-islands) | Roblox Studio Luau sources + install guide | `apps/games/roblox-puente-islands` |

Standalone means standalone: a `game-*` repo contains `index.html`,
`game.js`, `style.css`, its concepts subset, and the engine client vendored
under `engine/` — clone it, serve it, it plays. Its Hub link points at
https://entrevoces.github.io/apps/hub/.

## How to publish

```bash
npm test                 # gate first — never publish red
npm run publish:build    # build every bundle into dist/ and inspect
npm run publish:push     # commit + push each bundle to its own repo (SSH)
git push origin main     # the monorepo itself
```

Access is SSH (`git@github.com:entrevoces/...`) with the maintainer's key.
No credentials live in any repo, script, or bundle — the publisher builds
remotes from the org name only. Repos must exist and be public first;
`publish.mjs` reports `BLOCKED` with the exact repo name if one is missing.

The site also deploys from the monorepo via `.github/workflows/pages.yml`
when Pages is configured for Actions; `entrevoces.github.io` is the
canonical published copy either way.

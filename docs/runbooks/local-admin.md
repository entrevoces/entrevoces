# Runbook — Local development & admin (start here)

```bash
cd entrevoces
npm test                                   # conformance gate (no server needed)
npm run admin -- validate                  # same validators, as a CLI report
npm run engine                             # CPE on :8787 (terminal 1; AUTHOR_TOKEN=dev-author-token by default in server)
npm run serve                              # static host on :8000 (terminal 2, serves repo root)
```
Open: Hub `http://127.0.0.1:8000/apps/hub/` · Console `http://127.0.0.1:8000/apps/engine-console/` · Games under `http://127.0.0.1:8000/apps/games/<id>/`.

**Make new stuff:** `admin scaffold domain <id>` → fill TODOs → Activate in Console → `admin generate night --domain <id>` to preview minted people. `admin scaffold game <id>` → invent its verb → `admin validate` → link from hub. After editing seed knowledge: `admin export content` + `admin sync subsets`, then `npm test`.

**Verify like the spec (§24):** stop the CPE → every game shows local-only and plays; restart it → badges sync, one shared learner across Atelier / Night Shift / Bench Call. Any red in `npm test` blocks shipping.

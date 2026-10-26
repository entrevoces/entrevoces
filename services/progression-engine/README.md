# Centralized Progression Engine (CPE) — API

Reference Node implementation of ENTRE VOCES spec §9. Zero dependencies (Node ≥ 18).

## Run locally

```bash
cd services/progression-engine
AUTHOR_TOKEN=dev-author-token PORT=8787 node server.js
# → http://127.0.0.1:8787/v1/health
```

Data persists to `data/store.json` (seeded with Oregon Medical + Legal on first run).

## Endpoints (wire v1)

Base `http://127.0.0.1:8787/v1`. Learner endpoints are public (pseudonymous IDs); domain/concept writes require `Authorization: Bearer <AUTHOR_TOKEN>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ ok, counts }` |
| GET | `/domains?status=active` | Domain registry (ETag) |
| GET | `/domains/:domainId` | One DomainConfig incl. translation areas |
| POST | `/domains` † | Create domain (validated §3.1; 422 + fieldErrors) |
| PUT | `/domains/:domainId` † | Update (optimistic concurrency; 409 on stale `version`) |
| GET | `/sources` | Source register (provenance) |
| GET | `/concepts?domainId=&areaId=&limit=&cursor=` | Concepts, stable sort + cursor |
| POST | `/concepts` † | Bulk seed/upsert; per-item results |
| POST | `/learners` | `{ displayName?, languagePair? }` → learner (UUID) |
| GET | `/learners` | List learners (Console) |
| GET | `/learners/:id/state?domainId=` | Computed LearnerState (§5.4) |
| GET | `/learners/:id/export` | Learner + full evidence (data portability) |
| DELETE | `/learners/:id` | Delete learner + evidence |
| POST | `/evidence` | Batch EvidenceEvent[] — idempotent on `eventId` |
| GET | `/evidence?learnerId=&domainId=&since=` | Sync pull (server cursor) |
| GET | `/next?learnerId=&domainId=&excludeGameId=` | NextRecommendation with rationale |
| GET | `/coverage?domainId=&learnerId=` | Per-area coverage |
| GET | `/generate/client?domainId=&seed=&lang=` | One minted person (§22) |
| GET | `/generate/night?domainId=&seed=&size=&learnerId=` | A night of people, gap-biased |
| GET | `/generate/practice?domainId=&conceptId=&stage=&lang=` | One validated practice item |
| POST | `/admin/seed` † / `/admin/reset` † | Reseed domains/concepts; full reset |

† author token required.

## Worked examples

```bash
# Create a NEW domain in the engine (no code change) — the §3.4 gate
curl -X POST http://127.0.0.1:8787/v1/domains \
  -H "Authorization: Bearer dev-author-token" -H "Content-Type: application/json" \
  -d '{"domainId":"oregon-education","label":{"en":"Oregon — Education Interpreting"},"jurisdiction":{"country":"US","region":"Oregon","regionCode":"US-OR"},"profession":"education","institutions":["Oregon Department of Education"],"languagePairs":[{"source":"en","target":"es","direction":"bidirectional"}],"modalities":["consecutive"],"translationAreas":[{"areaId":"enrollment","label":{"en":"School enrollment"},"setting":"School front office","participants":["registrar","parent"],"goals":["Complete enrollment accurately"],"typicalSpeechFeatures":["forms and dates"],"riskIfMistranslated":"medium","conceptIds":[],"prerequisiteAreaIds":[],"order":1}],"competencyWeights":{"bilingual-terminology":1},"sourceIds":[],"status":"draft"}'

# Submit evidence (idempotent — resending the same eventId is a safe duplicate)
curl -X POST http://127.0.0.1:8787/v1/evidence -H "Content-Type: application/json" \
  -d '[{"eventId":"11111111-1111-4111-8111-111111111111","learnerId":"<learnerId>","domainId":"oregon-medical","conceptId":"dose","areaId":"treatment-plan","gameId":"concept-clinch","activityType":"bilingual","stage":2,"languageDirection":"en->es","correct":true,"score":1,"confidence":0.9,"clientTs":1760000000000}]'

# What should this learner do next, and why?
curl "http://127.0.0.1:8787/v1/next?learnerId=<learnerId>&domainId=oregon-medical"
```

Errors are `{ type, title, status, detail, fieldErrors? }` (400/401/404/409/422).

## Production host

`wrangler.toml` in this folder describes the Cloudflare Workers + D1 port. The wire protocol above — not the vendor — is the contract; any host implementing it is a valid CPE. Games never hold the author token or a Meta API key.

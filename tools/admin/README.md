# ENTRE VOCES Admin Tool (local)

Zero-dependency Node CLI — the scriptable twin of the Engine Console (spec §23). Runs on your machine; reads, generation, and validation need **no server**.

```bash
node tools/admin/entrevoces-admin.js validate        # conformance gate
node tools/admin/entrevoces-admin.js generate night --domain oregon-medical --seed demo1
node tools/admin/entrevoces-admin.js generate practice --domain oregon-legal --concept waiver --stage 2
node tools/admin/entrevoces-admin.js scaffold domain oregon-education
node tools/admin/entrevoces-admin.js scaffold game river-shift
node tools/admin/entrevoces-admin.js export content  # regenerate content/ mirrors
node tools/admin/entrevoces-admin.js sync subsets    # refresh games' offline seeds
node tools/admin/entrevoces-admin.js health          # needs CPE on :8787
npm run admin -- validate                            # same, via root package.json
npm test                                             # durable conformance suite
```

Generation is deterministic: same `--seed`, same people/items — preview exactly what games will mint. Scaffolds validate immediately and never overwrite. CPE writes (via Console/curl) need `--token` / `AUTHOR_TOKEN`; the tool surfaces 409/422 verbatim.

# ENTRE VOCES — Progression Engine

**The engine is the product; games prove it.** Specify a professional world (jurisdiction, profession, language pairs, translation areas) once — in the Console or Admin Tool — and every standalone game teaches it. Oregon Legal + Medical (EN↔ES, EN↔ZH) ship as the seed instance, not the limit.

Eleven games, one career, no repeated verb: **Voice Atelier** (BUILD) · **Night Shift** (ENDURE — consecutive with Rozan notes) · **Bench Call** (DECIDE) · **Term Rush** (RUSH) · **Echo Sequence** (ECHO) · **The Table** (NEGOTIATE) · **Repair Shop** (REPAIR) · **Lingua Lab VR** (IMMERSE) · **VocabCraft** (MINE & BUILD) · **Neon Bastion** (SHOOT — platform shooter) · **Melon Reef** (DIVE — underwater listening), plus a Roblox Studio world. Each is a static site (GitHub/Cloudflare Pages); one centralized Progression Engine (CPE) holds domains, knowledge, evidence, and what's-next. Offline always plays; sync never duplicates.

**New here, no computer experience?** Start with the [beginner guide](docs/beginner-guide.md) — play in 2 minutes, make your own game in 1, no code. Honest self-assessment: [game-critic report](docs/critic-report.md).

## Quickstart (local)

```bash
npm test                        # conformance gate — no server needed
npm run admin -- validate       # CLI report of the same gate
npm run engine                  # terminal 1: CPE :8787
npm run serve                   # terminal 2: static :8000
# open http://127.0.0.1:8000/apps/hub/
```

Make new stuff: `npm run admin -- scaffold domain oregon-education` · `generate night --domain oregon-medical` · `scaffold game <id>` — see [Admin README](tools/admin/README.md), [local runbook](docs/runbooks/local-admin.md), and the normative [spec.md](spec.md) (v2.1, §22–§24 cover generation, admin, conformance & open gaps).

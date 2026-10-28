# Interpreter knowledge library

Three complementary professional resources are built by the local agent pipeline:

- **Medical interpreting:** understanding encounters, important clinical concepts, tests, treatment, medicines, consent, uncertainty and language decisions.
- **Legal interpreting:** procedural models, roles, consequential distinctions, courtroom language and communication, with explicit jurisdiction and institutional boundaries.
- **Interpreter language foundations:** interpreting practice, linguistic meaning, register, pragmatics, clarification/repair, memory/notes, terminology research and supplemental definitions linking the domain books.

English–Spanish and English–Chinese are the confirmed language priorities. Source-defined variants, dialects and scripts stay explicit. There is no Oregon-centered curriculum and no claim that one legal system's rules are universal.

`briefs/` contains instructions, not hand-written knowledge. The research-planner agent produces `library-plan.json` and `domains/`; acquisition agents discover and retrieve authoritative sources, audit coverage and repeat for weaknesses. Knowledge and editorial agents then produce grounded dossiers, a typed graph and substantial topical books. Source snippets, dictionaries alone and bibliography counts cannot establish completeness.

Run `npm run knowledge:build`. Durable source and chapter checkpoints live in ignored `data/`. Successful audited draft volumes export to `generated/<volume>/<job>/`. A failed or incomplete acquisition remains visible and cannot be called a comprehensive book. Rerun to resume accepted work. Professional/source-rights review remains necessary before teaching from a generated draft.

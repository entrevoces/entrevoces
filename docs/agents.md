# Local authoring agents

Run `npm run agents` for the versioned registry. Each role has substantial instructions in `agents/<id>.md` and inherits `agents/common.md`. The host dispatches role-specific tasks; it does not fabricate the knowledge or game design itself.

| Stage | Agents | Saved handoff |
|---|---|---|
| Specification | spec-analyst | project_brief.md/json |
| Acquisition | research-planner, source-researcher, source-curator, coverage-auditor | blueprint, search receipts, retrieved sources, coverage audits, acquisition.md/json |
| Knowledge | knowledge-reader, knowledge-architect, knowledge-critic | grounded dossiers, typed graph, procedures, passage dispositions, knowledgebase.md/json |
| Handbook | handbook-editor, handbook-writer, editorial-critic | topical plan, chapters, composition/entailment audits, handbook.md/json |
| Design | game-designer | compared candidates, complete game_framework.md/json |
| Adversarial review | gameplay-critic, learning-critic, originality-critic, systems-critic | four independent reports on the final unchanged definition |
| Assets | art-director, asset-builder, sound-designer | original local SVG, authored rendered WAV, media manifest |
| Implementation | game-builder, code-critic | complete source, repairs/rechecks, validated static package |
| Observed evaluation | playtest-analyst | analysis of supplied real observations; never fabricated playtests |

`generator/agent-runner.js` starts a fresh ephemeral local CLI execution for each task. It writes input, role/task instructions, structured schema where supported, result and receipt in a private run workspace. It accepts only a completed turn, successful exit and bounded valid final JSON. Its environment is allowlisted and excludes model keys. Existing CLI authentication remains managed by the CLI; the application has no provider HTTP client or endpoint/key configuration. Search requires observed search-tool events, then independent host retrieval of the discovered URLs. Shell arguments are passed directly without a shell. Timeout/cancellation terminates the agent process group while accepted job checkpoints remain.

Critics are separate executions with distinct responsibilities, not claims of human independence. Any framework revision invalidates prior approvals; four critics must accept the same content. Output schema validation is structural evidence only. Package validation and source review do not prove visual polish or fun. Actual rendered inspection, listening, complete sessions and adversarial play sequences remain required before publication; export labels this explicitly.

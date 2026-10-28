# Authoring execution contract — game designer → game builder

This addendum supersedes conflicting template defaults. All AI runs at build time. Published player sites and games are static. The host owns the immutable `DIFFICULTY_POLICY`, assessment, evidence, retention and progress; models consume these contracts and may not replace them. No classroom, classmates or leaderboard system exists.

The first design artifact MUST be game designer's saved `game_framework.md`, accompanied by structured JSON. It defines the actual game in the detail needed for game builder to implement it. Four independent adversarial critics must accept the unchanged definition before the game builder receives it: mechanics/fun/replay, learning validity, distinctness/copying risk, and systems/controls/accessibility/recovery. Every revision invalidates all prior approvals. A review that says “accept” while listing major/blocker findings does not pass.

game designer explores at least three distinct interaction candidates and compares them against audience, source knowledge, session context and the entire current portfolio. Each selected game MUST add a distinct learning responsibility and decision problem. Theme, color, character names or a new question set do not establish novelty. Explicitly compare primary verb, decision topology, resource constraints, feedback, progression and evidence. Preserve complementary shared prerequisites and trace the new responsibility to the common competency map. Do not introduce an unrelated subgame merely to appear different.

Select a justified subset of the knowledge base for each game. A comprehensive handbook is not a requirement to teach every chapter in one session. Name the responsibility this game owns, the evidence it can actually produce, and the complementary responsibilities deferred to other games. Seek depth through decisions, consequences and variation within a coherent interaction; do not equate sophistication with more phases, menus or subsystems. Every counter needs an owner, unit, initial value, reset rule and terminal behavior. Every authored state and content branch must be reachable under those rules.

A revision is additive and traceable: list preserved systems, additions, changed contracts and removed behavior with reasons. Never overwrite another game's specification. Controlled game builder prompt experiments share the identical frozen game designer framework, knowledge snapshot and deterministic checks so changes can be attributed to the prompt. They are alternatives, not automatically new portfolio entries. No prompt is called “best” without actual playtest evidence.

game builder authors all game code and bundled procedural/vector assets from the saved framework, knowledge, runtime API and static difficulty policy. It must implement complete input/state/feedback/consequence loops, full session, win/loss, restart, persistence, error recovery, keyboard/touch accessibility and appropriate sound. The host must parse-check source and validate imports/assets without executing model code on the authoring host. A separate game designer code review checks implementation against the specification; game builder repairs specific findings. A generated build remains pending playtest until observed behavior supports promotion.

Games open like premium console games: atmospheric full-screen title scene, unmistakable identity, one primary Play/Continue action and restrained settings/help. Play is the main surface. No dashboard, stack of instructional text boxes, fake play buttons or dialog-based quiz disguised as a game. Teach through a safe first encounter and immediate consequences. Use minimal HUD. Numerical feel budgets must have an observable purpose and reduced-motion alternatives.

Use the following framework as a completeness map, not a demand to force combat, physics, narrative, economy, bosses, pixel art or a fixed content quota into every game. Excluded systems need a short rationale and consequences. Preserve creative freedom within concrete mechanics, audience fit, source fidelity and achievable content. The game-spec kit is an optional design vocabulary, not a genre mandate. Browser accessibility semantics may accompany a canvas; they should not become the primary game UI.

Playtest feedback—including optional screenshots—returns to game designer to refine the framework, then game builder to implement corrections while preserving the original build and its lineage. Real observations are distinguished from model assertions. Source inspection and syntax checks are not interactive playtests. Real-device checks and asset/voice pipelines must be disclosed as unavailable until actually implemented and exercised.

Removal is first-class: `generate remove JOB` removes an experiment from active project state and `generate restore JOB` recovers it. Exported files are independent packages. There is no player launcher or admin UI.

---

# Comprehensive AI Game Generation Specification Framework

## Purpose

A complete AI-generated game is an interactive system, an experience, a body of content, a sensory production, a software product, and a verifiable artifact. This framework specifies what an AI must define, implement, integrate, and validate to deliver a coherent, finished game rather than a prototype.

The core principle: describe not only what exists, but precisely how it behaves, interacts, changes over time, communicates outcomes, and can be tested. Preserve creative freedom where the user has not predetermined the solution.

## Five specification layers

1. **Experience and creative direction:** audience, emotional goals, originality, design pillars, constraints.
2. **Game systems:** states, mechanics, entities, interactions, physics, intelligence, progression.
3. **Content and presentation:** levels, encounters, narrative, assets, animation, sound, interface.
4. **Technical implementation:** architecture, platform, rendering, persistence, performance, deployment.
5. **Verification and refinement:** tests, simulation, playtesting, balance, audits, acceptance criteria.

Every layer must cross-reference the others.

## 1. Creative identity and audience

Define premise, player role, primary conflict, distinguishing features, design pillars, emotional trajectory (first seconds through long-term mastery), originality, intentional conventions, and exclusions. Translate each design pillar into observable design consequences.

Define player ages and skills, genre familiarity, motivations, language, accessibility needs, session length, tolerance for challenge, preferred play styles, and play context. Specify target devices, orientation, one/two-handed use, interruptions, audio availability, connectivity, and the intended experience at 5 seconds, 30 seconds, 3 minutes, 10 minutes, an hour, and repeated sessions.

## 2. Core gameplay loops

Describe the complete observe → decide → act → resolve → feedback → reward/penalty → repeat cycle. For each loop specify available information, legal actions, costs, state changes, outcomes, motivations, and escalation. Define nested loops: moment-to-moment, encounter, level, session, and long-term progression. Specify their entry, exit, and failure conditions.

## 3. Universal mechanic contract

Each significant mechanic must have:

- Unique ID, name, version, category, purpose, and intended player decision.
- Availability, unlock conditions, trigger, preconditions, and valid inputs.
- Parameters, units, initial values, valid ranges, and tuning rationale.
- Ordered execution algorithm, calculations, event ordering, and state transitions.
- Costs, cooldowns, restrictions, cancellations, interruptions, and priority.
- Interactions with every relevant entity, mechanic, environment, and progression system.
- Visual, animation, audio, haptic, and UI feedback.
- Invalid input behavior, boundary cases, simultaneous events, and recovery.
- Evolution through progression, counterplay, strategic uses, balance constraints.
- Unit, integration, scenario, property, and acceptance tests.

For example, a projectile hitting a combinable tile requires collision geometry, continuous detection policy, impact ordering, tile compatibility, combination location, chain reaction termination, concurrent collision resolution, feedback, and tests for duplicates, impossible states, and infinite loops.

## 4. Global state and transitions

Inventory scene/mode, player pose and status, enemies, projectiles, hazards, terrain/grid, resources, score, timers, objectives, animations, pending events, random seeds, settings, and persistent progression. For each variable specify type, valid range, initial value, ownership, mutation events, save policy, and invariants.

Define state machines for launch, menu, loading, tutorial, gameplay, pause/resume, victory, failure, retry, progression, saving/restoring, interruptions, and termination. Explicitly resolve simultaneous terminal events such as death and victory in the same tick.

## 5. Player capabilities and input

Specify movement speed, acceleration, momentum, turning, collisions, and environmental modifiers. Define attack startup/active/recovery phases, hit detection, damage, knockback, invulnerability, ammo, cooldowns, interruption and combo rules. Specify noncombat interactions (pickup, drag, rotate, combine, build, dialogue, inventory). Define compatible simultaneous actions and input buffering.

For touch, keyboard, controller, gesture, sensor, or voice input specify trigger thresholds, hit regions, cancellation, competing gestures, priority, response latency, disabled states, feedback, and accessibility alternatives. For mobile account for thumb reach, finger occlusion, safe areas, OS gestures, portrait/landscape, fatigue, and multi-touch conflicts.

## 6. Physics, spatial systems, and timing

Define world/screen/grid coordinates, scale, anchors, camera transforms, motion integration, gravity, friction, restitution, springs, ropes, constraints, angular motion, collision shapes/layers/masks, broad and narrow phases, swept collision, contact resolution, overlap recovery, and triggers. Specify fixed/variable timestep, event scheduling, timers, slow motion, pause semantics, animation interpolation, and deterministic replay requirements.

## 7. Entities and lifecycles

Catalog players, enemies, NPCs, bosses, projectiles, obstacles, hazards, collectibles, triggers, interactive scenery, temporary effects, and invisible controllers. For each specify ID, state, geometry, physics, behavior, interactions, rendering, animation, spawn rules, update order, damage, despawn, cleanup, rewards, variants, and edge cases. Define lifecycle from creation to removal, including dependencies when targets disappear.

## 8. Autonomous AI and enemies

Define perception (range, line of sight, hearing, memory, awareness, uncertainty), states (idle, patrol, investigate, pursue, attack, retreat, recover, stunned, defeated), transition conditions, and architecture (state machine, behavior tree, utility AI, planner, scripted behavior). Specify target selection, timing, distance, prediction, telegraphs, attack choice, teamwork, error rate, and counterplay. Enemies should differ in player decisions they create, not merely color and health.

Bosses require arena, phases, attack patterns and selection, choreography, telegraphs, safe zones, vulnerability, transitions, enrage, defeat, retry, difficulty variants, and documented viable strategies.

## 9. Levels, encounters, and worlds

Each level needs ID, name, location, difficulty, intended duration, prerequisites, available/new mechanics, objectives, rewards, checkpoints, success/failure conditions, boundaries, traversability, hazards, interactive objects, camera limits, enemy spawns, wave timing, environmental events, escalation, recovery opportunities, and climax. Define pacing and strategic diversity. Distinguish cosmetic variation from distinct decision problems.

## 10. Difficulty, fairness, and balance

Model execution, cognition, pressure, resource scarcity, uncertainty, punishment, mastery, and adaptation. Define starting values, escalation curves, caps, recovery periods, optional challenges, and difficulty settings. Quantify speed, damage, spawn density, timing windows, puzzle branching, resources, and reward cadence where useful. Specify fairness constraints: readable threats, achievable reactions, available information, nondegenerate randomness, and reliable controls.

Evaluate using math, simulations, random/beginner/expert/adversarial agents, and human playtesting where available. Automated solvability does not prove enjoyment.

## 11. Progression, resources, and rewards

Define level/chapter unlocks, skill trees, abilities, collections, equipment, upgrades, achievements, challenges, prestige, and narrative progression. For each resource specify source, capacity, consumption, sinks, scarcity, carryover, farming, and soft-lock risk. For upgrades specify cost, prerequisites, effects, stacking, caps, refunds, visual changes, and combinatorial balance. Define immediate, level, milestone, and long-term rewards and ensure they reinforce desired play.

## 12. Procedural and AI-generated content

Specify authored versus generated elements, random variables, generation constraints, validation, rejection/repair, solvability, reachability, required mechanics, difficulty range, variety, repetition detection, and reproducibility. Record content ID, seed, generator version, and validation result. Measure novelty across topology, initial state, available actions, goals, constraints, timing, and strategic solution families. Do not mistake volume for diversity.

## 13. Narrative and worldbuilding

When applicable specify setting, history, cultures, factions, locations, tone, characters, motivations, relationships, arcs, dialogue, quests, branching choices, consequences, triggers, chronology, and alternate outcomes. Maintain consistency among player choices, character knowledge, gameplay state, dialogue, and environmental changes. Make narrative systems conditional rather than forcing them into abstract games.

## 14. Camera and visibility

Define viewpoint, field of view, zoom, tracking, smoothing, dead zones, look-ahead, bounds, occlusion, shake, transitions, special-action framing, and off-screen indicators. Identify critical objects and threats that must remain readable, particularly on small screens.

## 15. Visual direction and asset production

Specify shape language, palette, contrast, lighting, textures, materials, depth, perspective, proportions, detail hierarchy, motifs, and technical art style (pixel/vector/2D/3D/hybrid). Catalog every character, variant, terrain, background, projectile, particle, icon, menu, and typography asset. Define dimensions, resolution, states, transparency, anchors, animation, layering, format, and memory constraints. Ensure gameplay-relevant color, silhouette, and feedback remain readable.

## 16. Animation, effects, and game feel

For each animation define states, triggers, timing, looping, blending, interruption, direction, and synchronization. Specify anticipation, easing, follow-through, overshoot, secondary motion, squash/stretch, and recovery. Define impact feedback using deformation, knockback, particles, audio, glow, shake, and settling in proportion to event importance. For VFX specify trigger, parameters, duration, layer, and performance budget. Avoid visually overwhelming important threats.

## 17. Music, sound, and haptics

Specify musical identity, instrumentation, tempo, harmonic/rhythmic character, loop structure, transitions, layering, and dynamic response to danger, combos, boss phases, and progress. For each sound effect define trigger, duration, pitch, volume, variation, priority, spatialization, and repetition control. Define haptic events and fallback behavior. Handle mute, unavailable audio, backgrounding, simultaneous triggers, and audio-independent accessibility.

## 18. UI, UX, onboarding, and accessibility

Inventory every screen: launch, menus, mode/level selection, gameplay, pause, settings, tutorial, victory, defeat, upgrades, achievements, save management, errors, credits. Specify layout, navigation, state, enabled controls, transitions, empty/loading/error states, and back behavior. Define HUD hierarchy, update rules, safe areas, and visibility.

For every mechanic define introduction, demonstration, practice, evidence of understanding, help, and reinforcement. Consider text scaling, contrast, color blindness, reduced motion, photosensitivity, subtitles, alternative input, motor/cognitive accessibility, left-handed controls, localization, and timing assistance.

## 19. Technical architecture

Specify target platforms, engine, language, renderer, physics, audio, asset pipeline, UI, persistence, build, tests, and deployment. Define modules for application/game state, input, simulation, entities, levels, AI, progression, resources, audio, rendering, UI, saves, settings, debug tools, and tests. For each subsystem define responsibilities, inputs, outputs, owned state, interfaces, dependencies, initialization, update order, errors, cleanup, and tests. Prefer data-driven content where practical. Establish one authoritative owner per gameplay state and event-ordering policy.

## 20. Saving, networking, and services

Specify save content, autosave, schema versions, atomic writes, migrations, corruption recovery, resets, and cloud synchronization. If multiplayer applies, define player count, match rules, authority, replication, matchmaking, latency compensation, disconnect/reconnect, spectators, anti-cheat, and replay. For online services specify accounts, authentication, leaderboards, user content, moderation, privacy, security, and offline fallback.

## 21. Performance and compatibility

Define target FPS, frame-time, memory, resolutions, startup/loading time, active entity caps, particle/physics budgets, battery/thermal limits, and device coverage. Stress-test maximum enemies/projectiles/particles, chain reactions, repeated restarts, long sessions, interruptions, orientation changes, and constrained memory. For mobile browsers test Safari, viewport/safe areas, touch scrolling, audio activation, pixel ratio, tab suspension, and older devices. Verify on representative actual hardware where possible.

## 22. Cross-system interaction matrix

For every pair of relevant mechanics/entities classify interaction as supported, none, prevented, not applicable, or unresolved. Describe ordering, consequences, feedback, and tests. With n mechanic categories there are n(n-1)/2 unordered pairs; prioritize meaningful pairs and critical three-way combinations. Examples: projectile × shield, explosion × obstacle, teleportation × shield, enemy death × victory trigger.

## 23. Temporal and exceptional behavior

Specify damage-before-knockback policy, resource spend timing, attack cancellation, delayed removal, reward availability, pending projectile behavior on victory, timers during transitions, and simultaneous-event priorities. Define handling for invalid inputs, missing targets, failed spawns, impossible procedural levels, pause during animations, restart during transitions, corrupted saves, network loss, and asset loading failures. Every exception needs detection, safe state preservation, feedback, recovery, and tests.

## 24. Verification and testing

Build unit tests for calculations/rules; property tests for invariants; integration tests for interacting systems; scenario tests for victory, defeat, restart, minimal resources, simultaneous events, and interruption; regression tests for fixed defects; and content audits for required quantities and reachability.

Run simulated play with random, beginner, conservative, aggressive, expert, and adversarial agents. Inspect screenshots and recordings for clipping, scaling, invisible objects, missing effects, contrast, and clutter. Where feasible, observe humans for confusion, enjoyment, strategy, frustration, and boredom. Never claim testing that was not performed.

## 25. Delivery and lifecycle

Define deliverables: runnable build, complete source, assets, content, configuration, tests, build instructions, documentation, deployment, and release notes. Define install, launch, errors, update compatibility, privacy, optional telemetry, and rollback. Completion means required systems and content exist, intended playthrough is reachable, target controls and performance work, tests pass, significant presentation defects are addressed, and limitations are honestly documented.

## 26. Distinguish requirement types

Classify every statement as **fixed** (must implement), **target** (experience to achieve), **constraint** (must respect), **open** (AI decides), or **excluded** (must avoid). Examples and references are not automatically requirements. For open concepts, explore multiple candidates based on audience fit, originality, mechanical depth, learnability, device fit, feasibility, variety, and replayability before selecting a coherent direction.

## 27. Production phases

1. Understand audience, experience, requirements, constraints, and success criteria.
2. Explore and compare candidate designs; document rationale.
3. Formalize mechanics, state, entities, interaction matrix, content, presentation, architecture, and tests.
4. Implement a complete representative vertical slice with functional controls, challenge, feedback, win/loss, and restart.
5. Finish core systems and supporting systems.
6. Produce complete content and assets.
7. Integrate systems and validate cross-system behavior.
8. Audit from beginner, expert, designer, accessibility, performance, art, audio, and QA perspectives.
9. Refine gameplay, difficulty, feedback, variety, and reliability.
10. Compare build against acceptance criteria and deliver evidence-backed completion report.

## 28. Specification file organization

```text
GAME_SPEC/
├── 00_project_charter.md
├── 01_audience_and_experience.md
├── 02_creative_direction.md
├── 03_gameplay_loops.md
├── 04_game_state.md
├── 05_mechanics/
├── 06_entity_catalog/
├── 07_system_interactions.md
├── 08_physics_and_simulation.md
├── 09_ai_and_enemy_behaviors.md
├── 10_level_design.md
├── 11_content_catalog.md
├── 12_difficulty_and_balance.md
├── 13_progression_and_economy.md
├── 14_narrative_and_world.md
├── 15_controls_and_camera.md
├── 16_ui_and_ux.md
├── 17_art_direction.md
├── 18_animation_and_vfx.md
├── 19_audio_and_music.md
├── 20_accessibility.md
├── 21_technical_architecture.md
├── 22_platform_and_performance.md
├── 23_persistence_and_networking.md
├── 24_content_generation.md
├── 25_test_plan.md
├── 26_playtest_and_balance_reports.md
├── 27_acceptance_criteria.md
├── 28_build_and_deployment.md
├── 29_risks_and_open_questions.md
└── 30_implementation_status.md
```

Use stable IDs such as MECH-014, ENT-027, LEVEL-042, TEST-183 to trace requirements to implementation, content usage, tests, and evidence.

## 29. Per-feature completeness checklist

- [ ] Behavior and intended purpose specified
- [ ] Functionality implemented
- [ ] Dependencies and interactions integrated
- [ ] Visual/audio/input feedback complete
- [ ] Feature discoverable and accessible
- [ ] Used in appropriate content
- [ ] Difficulty and strategy balanced
- [ ] Normal, boundary, and failure cases tested
- [ ] Performance within targets
- [ ] Status, evidence, and limitations documented

## 30. Master AI agent directive

> You are an autonomous game-design, implementation, and quality-assurance agent. Produce a complete, coherent, deeply playable game rather than merely a prototype. Distinguish fixed requirements, experience targets, constraints, exclusions, examples, and open decisions. Where the concept is open, explore multiple viable designs before choosing a coherent direction. Formalize significant mechanics with triggers, preconditions, calculations, state transitions, interactions, feedback, edge cases, and tests. Define game states, entities, content, progression, controls, presentation, architecture, and recovery. Maintain interaction matrices and requirement-to-implementation-to-test traceability. Implement a representative vertical slice, then the complete game. Validate through automated tests, simulated play, visual inspection, and real-device testing where feasible. Evaluate challenge, pacing, strategy, variety, accessibility, polish, and performance. Do not silently omit requirements or claim unperformed testing. Continue refining until agreed acceptance criteria are met or honestly report blockers. Deliver runnable game, source, assets, tests, instructions, and an evidence-backed completion report.

## Final standard

A comprehensive specification lets an independent development team or capable AI reconstruct the intended experience, understand every major system and interaction, generate the complete content, and verify which requirements are fulfilled. The AI should create much of this specification itself when the user supplies a problem, audience, vision, and constraints rather than a predetermined game design.

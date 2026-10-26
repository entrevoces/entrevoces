# Training Modes, Classrooms & the Altruistic Shelf — research pass

## Modes are different crafts (implemented in `packages/engine-core/classroom.js`)

The literature is unambiguous that "interpreting" is several skills wearing
one coat. The engine now treats them that way — each mode re-weights the
eight stages and prefers different games:

- **Consecutive** — Gile's two phases (listen+note, remember+render). Effort
  lives in memory and notes (Rozan's seven principles; Gillies' exercises).
  Games: Night Shift, Echo, Lotería.
- **Simultaneous** — listening and speaking contend for the same attention;
  Seeber's cognitive-load work and Jones explain décalage management.
  Games: Term Rush, Neon Bastion, Night Shift.
- **Telephone / audio-only** — no gesture, no paper, degraded signal.
  Listening (Stage 1/6) is weighted highest; clarification becomes survival.
  Games: Melon Reef (ears only), Echo, Night Shift.
- **Remote / video** — presence and turn-taking through a screen; consent
  and judgement carry extra weight. Games: The Table, VR Lab, Night Shift.
- **Sight translation** — reading ahead of the voice; sense-grouping is the
  skill (Bench Call's scan). Written-translation's spoken cousin.
- **Written translation** — revision exists; speed stages nearly vanish,
  distinction stages dominate. Games: Atelier, Repair, VocabCraft.
- **Cultural translation** — Seleskovitch's *sens* over words, Dam on
  form- vs meaning-based choice. Songs, slang, humour: the tango path
  (Milonga del Sentido) with lunfardo scholarship (Gobello) behind it.
- **Group / classroom** — social learning: calling games (lotería's century
  of classroom use), peer pace, public joy as assessment cover.

Selecting modes in the Hub profile changes `recommendNext` weights and
`recommendGames` boosts. That is the difference between a mode and a label.

## Classrooms (local, imagined — honestly)

Membership is multi-class or none, stored on-device. Leaderboard classmates
are *imagined* — deterministic from the class code, labelled everywhere —
because a demo must never invent people and call them real. Their hobbies
are functional: each maps to a real game's verb, so "Marisol (cooking)
suggests VocabCraft" is a recommendation with a reason, not decoration.
The instructor view reads the thinnest stage and prescribes the group game
for it first, solo game as homework — standard deliberate-practice sequencing.

## The altruistic shelf

`recommendResources` exists to help, full stop: no affiliate links, no
store, no engagement metric. It matches weakest stages + chosen modes to
Gile, Rozan, Gillies, Jones, Pöchhacker, Seleskovitch, Dam, the NCIHC code,
AIIC video, and the SCIC Speech Repository, and says *why* in plain words.
If a better free resource exists, the list should take it — curation here
is a service, not a moat.

## Copyright & the tango path

Classics (Gardel, Discépolo) are referenced by title/artist with cultural
notes and outbound Spotify/Apple Music *search* links. Lyrics are never
reproduced; every sung verse in Milonga del Sentido is original pastiche
written for the game. Lunfardo glosses are summarized from lexicographic
tradition and flagged Rioplatense — check with porteño speakers before
publishing translations professionally.

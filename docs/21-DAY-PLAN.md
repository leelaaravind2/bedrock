# Thraksha — 21-Day Implementation Plan

**No calendar dates — days are numbered. Work at your own pace; a "Day" is a unit of
work, not a clock day.**

---

## The daily rhythm — 3 sessions per day

Every Day runs as **three Claude Code sessions**, in order. Each session starts by reading
`docs/CONSTITUTION.md`, `docs/adr/`, and this plan. All reports are written by Claude Code
and saved as files, so everything is documented for reference.

### Session 1 — PLANNING
- Read the guardrails and the Day's goal (from this plan).
- Produce a short written plan: what will be built, how it maps to existing code, which
  ADRs apply, what "done" looks like, and the proof method (usually a hash check).
- **Output:** `docs/daily/day-NN-plan.md`
- **No building in this session** — planning only.

### Session 2 — EXECUTION
- Do the actual build work described in the plan.
- Stay strictly within the Day's scope. Do not start the next Day's work.
- Keep the engine deterministic; do not touch core/plugins/generation unless the Day
  explicitly requires it.
- **Output:** the code changes (committed / on disk). Brief inline notes as needed.

### Session 3 — EVALUATION + CLOSING (End-of-Day report)
- Verify against the Day's done-conditions.
- Run the proof: confirm relevant hashes, confirm ADR compliance (no AI in generation,
  file separation intact, determinism, etc.), confirm the loop still works.
- Write the **End-of-Day report**: what was done, the proof/results, what changed, any
  honest caveats or bugs found+fixed, and what the next Day picks up.
- **Output:** `docs/daily/day-NN-report.md`

**Rule for every session:** if a proof fails (hash drift, broken loop, ADR violation),
stop and fix before closing the Day. A Day is not "done" until its report shows the proof
passing. Catching these is the discipline that keeps everything real.

---

## Week 1 — Depth & Data (make what exists richer and more real)

### Day 1 — Relationships in generated code: design + Spring
**Tasks:** Design how entity relationships (belongs-to / has-many) are represented in the
model and generated into code; implement for the **Spring** plugin first.
**Details:** Add real foreign keys and the related-entity wiring in generated Spring code
(e.g. `Ticket` belongs-to `Team` → `team_id` FK + the mapping). Prove it generates
deterministically. Other stacks follow on Days 2–3. Existing single-entity baselines must
stay valid; relationships are additive. This is the highest-value gap — do it carefully.

### Day 2 — Relationships: Express + FastAPI
**Tasks:** Implement the same relationship generation for the **Express** and **FastAPI**
plugins, matching Spring's behavior.
**Details:** Foreign keys + related wiring in each stack, deterministic, file separation
intact. Prove each stack's relationship output is stable (hashes).

### Day 3 — Relationships: Django + cross-stack proof
**Tasks:** Implement relationships for **Django**; then prove all four stacks generate a
related multi-entity model correctly and identically-per-stack.
**Details:** One richer model (e.g. Team → Application → Ticket → Comment) generates real
related backends in all four stacks. Blueprint shows connected boxes. Deterministic across
all four.

### Day 4 — Relationships hardening + live run
**Tasks:** Harden relationships (edge cases: required vs optional relations, self-relations
if trivial), and run at least one stack live (Docker) to confirm related data actually
works end-to-end (create a Team, create a Ticket under it, fetch it back).
**Details:** Prove relationships aren't just generated but *function* against a real
database. Fix any startup/wiring bugs in the templates.

### Day 5 — Second database: MySQL (design + core wiring)
**Tasks:** Add **MySQL** as a second database option (plugin/knowledge for MySQL, similar
to Postgres).
**Details:** MySQL migrations/schema generation for entities + relationships, wired so
selecting MySQL routes correctly. SQL-similar to Postgres, so lower risk. Deterministic.

### Day 6 — MySQL: prove across stacks + dropdown
**Tasks:** Prove MySQL works with the backends, add it to the database dropdown, confirm
Postgres path unaffected.
**Details:** Generate with MySQL selected → real MySQL-based project. Postgres baselines
and the four backend hashes unchanged. MySQL appears as a real dropdown option.

### Day 7 — Week 1 checkpoint + clean demo run
**Tasks:** Evaluation-heavy day. Confirm relationships + MySQL all solid; run a clean
end-to-end demo (related entities, pick a stack, pick a database, generate, browse, view
blueprint). Fix any drift.
**Details:** No new features — this is a prove-and-stabilize day. Write a Week 1 summary
report. Catch problems before Week 2 builds on top.

---

## Week 2 — Reach & Choice (more stacks + the coding-style engine)

### Day 8 — New backend Go: Step 1 (plugin + entity CRUD)
**Tasks:** Build the **Go** backend plugin — entity CRUD generation — via the proven
3-step recipe, Step 1.
**Details:** Same interface as the other plugins, core untouched, deterministic, other
stacks unaffected. Genuinely different language (compiled) — good recipe stress-test.

### Day 9 — Go: Step 2 (file separation + multi-user + relationships)
**Tasks:** Give Go file separation, multi-user owner scoping, and relationship generation,
matching the other stacks.
**Details:** Prove developer-file survival, owner scoping, and related-entity wiring for Go.
Deterministic; others unaffected.

### Day 10 — Go: Step 3 (dropdown) + live run
**Tasks:** Wire Go into the backend dropdown; run a Go project live to confirm it works.
**Details:** Five backends now selectable. Same model → five stacks. Go runs against a real
database. Others unaffected.

### Day 11 — Coding-style engine: design + naming conventions
**Tasks:** Design the **coding-style** feature (a post-setup screen where the developer
picks style options the generator applies deterministically); implement the first option:
**naming convention** (camelCase / snake_case).
**Details:** Style choices are deterministic switches — same model + same style → same
output (ADR-003 preserved; NO probabilistic "code personality"). Prove naming-convention
switching changes output predictably and identically on repeat.

### Day 12 — Coding-style: formatting options
**Tasks:** Add **formatting** style options (indentation, quote style) as deterministic
switches, across the stacks.
**Details:** Each option a clean switch, proven deterministic. Style choices shown/recorded
(ADR-004 spirit — visible, not hidden).

### Day 13 — Coding-style: architecture depth
**Tasks:** Add an **architecture-depth** choice (e.g. simple vs. layered
controller/service/repository structure) as a deterministic option.
**Details:** This is the meatier style option — it changes *what files* are generated, not
just naming. Prove both variants generate deterministically and both run.

### Day 14 — Coding-style: wire into wizard + prove
**Tasks:** Add the **style-selection screen** to the wizard (after setup, before/at
generate), wire the style options end-to-end, and prove the whole thing.
**Details:** Developer completes setup → chooses coding style → generates in that style.
All style combinations deterministic. Engine hashes for the *default* style unchanged from
baselines. Write a Week 2 summary report.

---

## Week 3 — Breadth & Polish (project types, integrations, presentation)

### Day 15 — API-only project type (design + generation)
**Tasks:** Add **API-only** as a second project type — a backend with no frontend.
**Details:** Proves the project-type machinery ("type decides what's asked/generated").
Selecting API-only skips frontend questions and generates a backend-only project. Web-app
type unaffected.

### Day 16 — API-only: wizard + prove across stacks
**Tasks:** Wire API-only into the wizard (type selection changes the flow), prove it across
the backends.
**Details:** Pick API-only → no frontend section → backend-only project in any stack.
Deterministic. Web-app baselines unaffected.

### Day 17 — Optional-integrations branch: design + first integration
**Tasks:** Design the **"optional integration"** wizard pattern (needs X? → how? → config?),
implement ONE integration end-to-end (pick the cleanest — e.g. email, or AI as a detachable
hook per ADR-001).
**Details:** The integration must NOT violate ADR-001 (if AI: it's an optional detachable
hook the generated app *can* use, never AI in Thraksha's generation path). Prove the branch:
"no" changes nothing; "yes" adds the integration's wiring deterministically.

### Day 18 — Optional-integrations: prove + one more (if clean)
**Tasks:** Harden the integration branch; add a second integration if it's clean and
low-risk (reusing the same pattern).
**Details:** Prove the reusable "need X? how? config?" shape works for more than one
integration. Keep each deterministic and optional. Don't force a hard one.

### Day 19 — Wizard enrichment (details + relationships in entity screen)
**Tasks:** Add remaining wizard details: **project description** (→ README), **relationships
in the entity screen** (so a developer declares "belongs-to" in the UI, feeding the Day 1–4
relationship generation), and ensure the style + integration + type screens all flow
cleanly.
**Details:** The wizard now captures the richer intake end-to-end. All additive; engine
untouched; deterministic.

### Day 20 — Full-system integration + regression proof
**Tasks:** Prove EVERYTHING together: pick a project type, pick a stack (of five), pick a
database (of two), define related entities, choose a coding style, add an integration,
generate, browse files, view blueprint — end to end, live if possible.
**Details:** A full regression: confirm all baselines/hashes for default paths still hold,
all five backends, both databases, all style options, both project types. Catch any
interaction bugs.

### Day 21 — Demo polish + final documentation
**Tasks:** Polish the whole experience (a rich demo project, clean flow), and write the
final documentation: an updated capabilities summary ("what Thraksha does now") and a
consolidated report of the 21 days.
**Details:** End state — a genuinely more capable, polished, documented platform. Ready to
show and ready to grow. Write `docs/daily/day-21-report.md` plus a `docs/CAPABILITIES.md`
summary of everything the platform can now generate.

---

## What this plan deliberately does NOT include (honesty)

- **Rich frontend generation** (real per-entity UIs) — too large even for 21 days alongside
  this; deserves its own dedicated chapter. React stays scaffolded.
- **Mobile / desktop / CLI project types** — the plan proves the *project-type mechanism*
  (via API-only) so these are addable later, but does not build them.
- **MongoDB** — non-relational, harder; SQL databases (Postgres, MySQL) first.
- **"All languages"** — Go is added; the proven recipe lets others be added later, one at a
  time. Not chasing the infinite list.
- **Full "code personality"** — the style engine is scoped to deterministic conventions,
  formatting, and architecture depth — NOT probabilistic verbosity/comment styles, which
  would break determinism (ADR-003).

## The end state at Day 21

- **5 backend stacks** (Spring, Express, FastAPI, Django, Go)
- **Real relationships** in generated code (related data across all stacks)
- **2 databases** (PostgreSQL, MySQL)
- **Developer-chosen coding style** (naming, formatting, architecture depth)
- **2 project types** (Web App, API-only) with the mechanism proven for more
- **Optional integrations** pattern (need X? how? config?), with 1–2 built
- All inside the **polished 4-screen wizard**, everything deterministic, everything
  documented day-by-day, everything proven by hash.

## The rule that holds through all 21 days

One capability per day, three sessions (plan → execute → evaluate+report), proven before the
next. Every day produces a documented report. If a proof fails, fix before closing. This is
the discipline that has kept Thraksha real from the first entity to here — it does not change
because the plan got longer.

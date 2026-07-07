# Eco-Day 34 — REPORT: cron-worker + queue-consumer project types `[2 days]`

**Phase 3, Day 34. EXECUTE + REPORT (combined session).** Two new `projectType`
archetypes — **cron-worker** and **queue-consumer** — added as deterministic
**entrypoint/lifecycle projections that REUSE the domain layer unchanged** and swap
only the HTTP entrypoint + route table. **Express (Node) is done + BOOTED for both
types**; the other 4 stacks are **honestly STAGED to pass 2** (like Day 25 pass 1).
The **default (web-app/api-only) is byte-identical** — no frozen hash moved.

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` →
PASS, 124 OK / 0 FAIL, 78 digests asserted** (76 baked + 2 new worker baselines).

---

## 1. What shipped (Stage 1 — Express, both types, booted)

### 1.1 The two archetypes
Both **reuse the deterministic domain layer** (per-entity model/repository/dto/
service + `db`/`migrate`/`seed`/`auth`/`http-error` + migrations) and swap only the
**entrypoint + the route table**:

- **cron-worker** — a **scheduler** (`src/worker.js`: migrate → seed → run once →
  `setInterval` tick — a Node **builtin, NO dependency**) + a **job table**
  (`src/scheduler.js`: auto-discovers every `entities/<name>/<name>.job.js`, the cron
  analog of `app.js`'s router auto-mount) + a per-entity **idempotent job**
  (`<slug>.job.js`: an idempotent scan over the SAME domain service). **No HTTP routes.**
- **queue-consumer** — a **broker connection** (`src/broker.js`: amqplib, WIRED but
  INERT until `QUEUE_URL` set) + a **consume loop** (`src/worker.js`: subscribe every
  topic) + a **topic→handler table with ack/retry/dead-letter** (`src/dispatcher.js`)
  + a per-entity **handler** (`<slug>.handler.js`: `<slug>.created`/`<slug>.updated`
  topics calling the SAME domain service). The HTTP route table becomes the
  topic→handler table. **No HTTP routes.**

### 1.2 The enum + the type↔frontend constraint
- `projectType: 'Web App' | 'API-only' | 'Cron Worker' | 'Queue Consumer'`
  ([`core/project-model.ts`](../../generator/src/core/project-model.ts)). Additive union values.
- The Day-15 type↔frontend constraint **generalized**: every non-`'Web App'` type
  forces `frontend = 'None'` (workers have no frontend), recorded in `defaultsApplied`
  (ADR-004 — shown, not silent). **The API-only reason string is preserved
  BYTE-IDENTICAL** so its Day-15 baseline does not move; the worker types name
  themselves in their own (new) reason.

### 1.3 Where the projection lives (per-stack plugin, Law 25)
- [`plugins/express/express-plugin.ts`](../../generator/src/plugins/express/express-plugin.ts):
  `generateProjectShell` skips `src/server.js` + `src/app.js` for worker types and
  emits the worker entrypoint/table shell; `package.json` repoints `main`/`start` →
  `src/worker.js` (+ `amqplib` for queue); `README.md` gets a truthful worker section.
- [`plugins/express/entity-codegen.ts`](../../generator/src/plugins/express/entity-codegen.ts):
  `generateWorkerEntityFiles` reuses the domain builders byte-identically and swaps
  the HTTP route/controller layer for the job/handler.
- [`core/plugin.ts`](../../generator/src/core/plugin.ts): `EntityGenerationContext`
  gains `projectType` (defaulted — an omitting caller reproduces HTTP output).

---

## 2. The determinism spine — the proofs

### DC-2 — DEFAULT = LITERAL BYPASS (load-bearing)
`rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full frozen
backstop byte-identical (**76 baked + non-hash gates 1c–1p**). **No fixture uses a
worker type**, so the enum addition + gated branches move **no frozen hash** — the
worker branch fires only for the new types. A moved hash would have been a finding;
none moved.

### DC-3 — new twice-identical baselines + DOMAIN-REUSE (PART 1q, additive)
Recorded in [`day20-regression.ts`](../../generator/src/day20-regression.ts) PART 1q:

| projectType (Express, DemoApp, PG) | baseline (twice-identical) |
|---|---|
| Cron Worker | `7f6c09cfad31eadefe12adb31e0f58e6b695a4cb7baaa8bc6bff1db73e15ff59` |
| Queue Consumer | `799ef9873a6ccc28b3d7fd2b537f0c4fb8bc7f5d4304c3db49129c91bd44d6c5` |

**DOMAIN-REUSE proof (asserted in PART 1q):** diffing each worker project against its
**api-only twin** — every file present in **both** is **byte-identical** except the
legitimately-rewritten `GENERATION-MANIFEST.txt` / `package.json` / `README.md`; the
**removed** set is EXACTLY the 5 HTTP files (`src/server.js`, `src/app.js`,
`ticket.controller.base.js`, `ticket.routes.base.js`, `ticket.routes.js`); the
**added** set is EXACTLY the worker files (cron: `worker.js` + `scheduler.js` +
`ticket.job.js`; queue: `worker.js` + `dispatcher.js` + `broker.js` +
`ticket.handler.js`). The **7 domain files** (model/repository/dto/service.base/
service.js + V1 users + V2 ticket migrations) are byte-identical to api-only. So the
domain layer is provably **reused unchanged** — only the entrypoint + route/handler
layer differs.

### DC-4 — THE LIFECYCLE BOOT (Express, both types — actually RUNS)
Booted via Node over a **stubbed pool** (Docker down / no DB — the Day-25/27 pattern):

- **cron:** `scheduler.runAllJobs()` discovered the ticket job, ran the idempotent
  domain scan **to completion over the domain service** (processed 2 stub rows);
  re-run yielded the same result (**idempotent**). A real **`setInterval` (40 ms)
  genuinely fired the job 3× over ~160 ms** — the tick drives the domain job, not just
  a manual call.
- **queue:** the topic→handler table auto-discovered `ticket.created`/`ticket.updated`.
  A stubbed message → handler (service.create over stub) → **ack**; a validation
  failure (`title is required`) → **retry** (attempt 1 < 3); an exhausted message
  (attempt 3) → **dead-letter**; an unknown topic → **dead-letter** ("no handler").
  All four broker paths ran against a stub broker.

Honest verification level: **Express booted (runtime)**; the full `worker.js`
entrypoint's `migrate`/`seed`/`broker.connect` are generation-verified but not booted
here (they need `npm install` of bcryptjs/amqplib + a real DB/broker) — the scheduler
tick logic and the dispatch ack/retry/dead-letter paths are the booted lifecycle.

---

## 3. Stage 2 — the other stacks (DC-5) + invariants (DC-6)

### DC-5 — Spring / FastAPI / Django / Go: HONESTLY STAGED to pass 2
**Not implemented this pass — deliberately staged, not crammed** (the plan's DC-5
explicitly permits this, "like Day 25 pass 1"). Rationale (honest per GUARDRAILS §4):
no Go/Java toolchain locally, heavy Python installs, Docker down → **none can be
booted or compiled**, and each needs a **different** scheduler/broker idiom (Go
`time.Ticker`; Python APScheduler/asyncio; Spring `@Scheduled`; per-stack broker
drivers). Writing 4 stacks × 2 types of unverified cross-stack templates is exactly
what the guardrails warn against. Express (Node) is the boot-verifiable stack and is
**done + booted for both types** — the provable heart of the `[2 days]`. Pass 2 adds
the other stacks as generation-only additive baselines.

### DC-6 — invariants (all confirmed)
- **Generator pure-Node, `deps {}`, 0 native modules** — verified: `dependencies: {}`,
  no `amqplib`/`node-cron`/`node-schedule` anywhere in the generator's `package.json`,
  no `.node`. `setInterval` is a builtin; **amqplib is a GENERATED-PROJECT dep, gated
  on the queue type** (`workerPackageJson`), never a Thraksha core dep.
- **No frozen hash moved** (DC-2) — the default is a literal bypass by construction.
- **The domain layer is reused unchanged** (DC-3) — entrypoint/route-handler swap only.
- **New baselines additive** — 78 digests = 76 + 2 (PART 1q); nothing replaced.

---

## 4. Verification levels (honest, per §4 — like Day 25/27)

| Claim | Level |
|---|---|
| Default (web-app/api-only) byte-identical | **Proven** — 124 OK / 0 FAIL from clean |
| Express cron/queue twice-identical baselines | **Proven** — recorded, re-derived each run |
| Domain reused unchanged (worker == api-only twin, minus HTTP + plus worker) | **Proven** — asserted in PART 1q |
| Express cron tick fires the idempotent job to completion | **Booted** — `setInterval` + `runAllJobs` over stub pool |
| Express queue message → handler → ack / retry / dead-letter | **Booted** — dispatch over stub broker |
| Full `worker.js` (migrate/seed/broker.connect) | **Generation-verified** — needs npm install + real DB/broker |
| Spring / FastAPI / Django / Go cron/queue | **Staged** (pass 2) — not written this pass |

**Determinism ≠ validity:** generation is deterministic + boot-verified for Express;
runtime correctness for the other stacks is reasoned, not run.

---

## 5. Forward-flags

- **`[2 days]` scope status:** Express (Node) × {cron-worker, queue-consumer} — **done
  + booted**. Spring / FastAPI / Django / Go × both types — **staged to pass 2**
  (generation-only additive baselines; no local toolchain to boot/compile).
- **Pass 2 (remaining Day-34 budget):** the 4 other stacks' cron/queue entrypoint/
  lifecycle projections (per-stack scheduler/broker idioms as gated generated-project
  deps), recorded as additive PART 1q baselines, default byte-identical after each.
- **Day 36 picks up:** CLI + GraphQL + static-site+API project types.
- **Invariant to keep:** any scheduler/broker library stays a **generated-project**
  dependency, gated on the type — never Thraksha core (`deps {}` stays).

---

*Day 34 added cron-worker + queue-consumer as deterministic entrypoint/lifecycle
projections that reuse the domain layer unchanged (proven byte-identical to the
api-only twin) and swap only the HTTP entrypoint + route table for a scheduler + job
table (cron) or a broker + consume loop + topic→handler table with ack/retry/dead-letter
(queue). The default (web-app/api-only) is a literal bypass by construction — 76 baked
+ non-hash gates reproduce byte-for-byte; each new type yields a new twice-identical
additive baseline (PART 1q, 78 digests). Express booted both lifecycles (a setInterval
tick fires the idempotent job; a stubbed message is handled + acked, with retry +
dead-letter). The other 4 stacks are honestly staged to pass 2. Any scheduler/broker
library is a gated generated-project dependency — Thraksha core stays deps {} with 0
native modules; no AI, no frozen hash moved.*

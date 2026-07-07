# Eco-Day 34 — REPORT (PASS 2 of 2): cron-worker + queue-consumer for Go / FastAPI / Django / Spring

**Phase 3, Day 34, pass 2. EXECUTE + REPORT (combined).** Pass 1 (commit `7bb2424`)
delivered **Express** both archetypes end-to-end (booted). Pass 2 applies the SAME
proven pattern — **entrypoint/lifecycle projections that reuse the domain layer
unchanged and swap only the HTTP entrypoint + route/handler layer** — to the remaining
**4 stacks: Go, FastAPI, Django, Spring**, one at a time with a default-bypass gate
after each. These 4 are **generation-only** (no Go/Java toolchain, heavy Python,
Docker down): determinism is proven via the twice-identical baselines + the
domain-reuse diff — **not compiled or booted** (honest per GUARDRAILS §4).

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS,
140 OK / 0 FAIL, 86 digests** (78 from pass 1 + 8 new worker baselines). The default
(web-app/api-only) stayed byte-identical after **every** stack — no frozen hash moved.

`[2 days]` scope is now **COMPLETE**: all **5 stacks × 2 archetypes = 10** worker
baselines (Express booted in pass 1; the other 4 generation-only here).

---

## 1. The per-stack projection (each in the stack's idiom)

Every stack reuses its domain layer **byte-identically** and swaps only the HTTP
entrypoint + the entity route/controller layer:

| Stack | cron entrypoint / table | cron per-entity | queue entrypoint / table | queue per-entity | gated dep (queue) |
|---|---|---|---|---|---|
| **Go** | `main.go` (`time.Ticker`, stdlib) + `internal/worker/register.go` | `entities/<e>/job.go` (`RunJob`) | `main.go` + `internal/worker/register.go` + `broker.go` | `entities/<e>/handler.go` (`Handlers`) | `amqp091-go` (go.mod) |
| **FastAPI** | `app/worker.py` (stdlib `time`) + `app/scheduler.py` | `entities/<e>/job.py` (`run`) | `app/worker.py` + `app/dispatcher.py` + `app/broker.py` | `entities/<e>/handler.py` | `pika` (requirements) |
| **Django** | `worker.py` (`django.setup()` + stdlib `time`) + `scheduler.py` | `entities/<e>/job.py` (`run`) | `worker.py` + `dispatcher.py` + `broker.py` | `entities/<e>/handler.py` | `pika` (requirements) |
| **Spring** | `@EnableScheduling` on the app class | `<E>Job.java` (`@Scheduled`) | `spring-boot-starter-amqp` (pom) | `<E>Listener.java` (`@RabbitListener`) | `spring-boot-starter-amqp` (pom) |

**cron** = a scheduler + a job table (auto-discovered, or component-scanned for
Spring) + a per-entity idempotent job. **queue** = a broker + a consume loop + a
topic→handler table with **ack/retry/dead-letter** + a per-entity handler. Go/Python/
Django hand-roll the ack/retry/dead-letter loop over a stub-testable broker seam;
**Spring uses `@RabbitListener`'s declarative ack / redelivery / DLX** — the idiomatic
equivalent. Every scheduler uses the **standard library** where possible (Go
`time.Ticker`, Python `time`, Spring `@Scheduled`) — **no scheduler dependency**; only
the **broker** driver is a dependency, and it is a **gated GENERATED-PROJECT dep**,
never Thraksha core.

Where each stack reuses its request-scoped machinery:
- **Go / FastAPI** reuse the domain **service** directly (a system context: owner `0`
  for multi-user).
- **Django** reuses the **serializer + ORM model** (a system consumer attributes new
  rows to the first/seeded user).
- **Spring** reuses the **repository + Dto** directly (`JpaRepository.findAll()/save()`),
  *not* the request-scoped `Service` — a worker has no `SecurityContext`, so binding to
  the shared repository is the correct, honest reuse.

---

## 2. The determinism proofs

### 2.1 DEFAULT = LITERAL BYPASS after every stack
`npm run day20:regress` stayed **byte-identical (78 baked + non-hash gates)** after Go,
after FastAPI, after Django, and after Spring — no worker fixture exists in the frozen
matrix, so the gated worker branches move **no frozen hash**. A moved hash would have
been a finding; none moved.

### 2.2 New twice-identical baselines (PART 1q pass 2, additive) — 8 new
Recorded in [`day20-regression.ts`](../../generator/src/day20-regression.ts) `WORKER_STACKS`:

| Stack | Cron Worker | Queue Consumer |
|---|---|---|
| **Go** | `2166268f486558b1…` | `70b13ecd004be67d…` |
| **FastAPI** | `8cf75cd681ceefc6…` | `7bbfa9623ca9ec4b…` |
| **Django** | `c54249e232031791…` | `4d13ff89c2618b95…` |
| **Spring Boot** | `86a4bf9d9e88d2a5…` | `1e0379535672cfd5…` |

Each is generated twice → byte-identical → asserted against the recorded baseline.
Total worker baselines now **10** (Express `7f6c09cf…`/`799ef987…` from pass 1 + these 8).

### 2.3 DOMAIN-REUSE proof per stack (asserted in PART 1q pass 2)
For each stack×type, diffing the worker project against its **api-only twin**: every
file present in **both** is **byte-identical** except the legitimately-rewritten shell
files (entrypoint / manifest / package-manifest / README — e.g. Go `main.go`, Spring
`Application.java`+`pom.xml`); the **removed** set contains the HTTP route/controller
marker (Go `handler_base.go`, FastAPI `router_base.py`, Django `views_base.py`, Spring
`*ControllerBase.java`); the **added** set contains the worker marker (`job.*`/`handler.*`,
Spring `*Job.java`/`*Listener.java`). So the domain layer (models/repos/dto/serializers/
service-base/migrations) is provably **reused unchanged** — only the entrypoint +
route/handler layer differs, exactly as pass 1 proved for Express.

---

## 3. Verification levels (honest, per §4)

| Claim | Level |
|---|---|
| Default (web-app/api-only) byte-identical after every stack | **Proven** — 140 OK / 0 FAIL from clean |
| Go/FastAPI/Django/Spring cron+queue twice-identical baselines | **Proven** — recorded, re-derived each run |
| Domain reused unchanged (worker == api-only twin, minus HTTP + plus worker) | **Proven** — asserted in PART 1q pass 2 |
| Express cron tick / queue ack-retry-dead-letter | **Booted** (pass 1) — the reference lifecycle |
| Go / FastAPI / Django / Spring worker runtime | **Generation-only** — no toolchain to compile/boot here; correctness reasoned from each stack's existing CRUD patterns + the booted Express reference |

**Determinism ≠ validity:** generation is deterministic and the domain-reuse is
mechanically proven; the 4 new stacks' *runtime* correctness is reasoned, not run
(no JDK / Go toolchain locally; Python installs heavy; Docker down for a broker).

---

## 4. Invariants (all confirmed)

- **Generator pure-Node, `deps {}`, 0 native modules** — verified: `dependencies: {}`;
  **no `amqplib` / `amqp091` / `pika` / `node-cron` / `APScheduler` / `starter-amqp`
  anywhere in the generator's `package.json`**. Every scheduler is stdlib (`time.Ticker`
  / `time` / `@Scheduled`); every broker driver is a **gated GENERATED-PROJECT dep**
  (go.mod / requirements.txt / pom.xml), gated on the queue type.
- **No frozen hash moved** — the default is a literal bypass by construction (§2.1).
- **The domain layer is reused unchanged per stack** (§2.3) — entrypoint/route-handler
  swap only; no worker required a domain-file change (that would have been a finding).
- **New baselines additive** — 86 digests = 78 + 8 worker baselines; nothing replaced.

---

## 5. Completed `[2 days]` status + forward

- **Express** (pass 1): cron-worker + queue-consumer — **done + booted**.
- **Go / FastAPI / Django / Spring** (pass 2): cron-worker + queue-consumer —
  **done, generation-only** (baselines + domain-reuse proven; not compiled/booted).
- **All 5 stacks × 2 archetypes = 10 worker baselines** — Day-34 scope **complete**.
- **Day 36 picks up:** CLI + GraphQL + static-site+API project types.
- **Invariant to carry:** any scheduler/broker library stays a generated-project dep,
  gated on the type — never Thraksha core (`deps {}` stays).

---

*Day 34 pass 2 extended cron-worker + queue-consumer to Go, FastAPI, Django, and Spring
as deterministic entrypoint/lifecycle projections that reuse each stack's domain layer
byte-identically (proven vs the api-only twin) and swap only the HTTP entrypoint +
route/controller layer — a `time.Ticker`/`@Scheduled`/stdlib-loop scheduler for cron and
a broker + consume loop + topic→handler table with ack/retry/dead-letter for queue, in
each stack's idiom. The default stayed byte-identical after every stack (no frozen hash
moved); 8 new twice-identical additive baselines bring the worker total to 10 (5 stacks
× 2 types), with Express (pass 1) the booted reference and these 4 generation-only
(no toolchain to compile/boot; honest per §4). Every scheduler is standard-library; every
broker driver is a gated generated-project dependency — Thraksha core stays deps {} with
0 native modules. Day 36 picks up CLI + GraphQL + static-site+API types.*

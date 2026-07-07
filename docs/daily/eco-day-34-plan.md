# Eco-Day 34 — PLAN: cron-worker + queue-consumer project types `[2 days]`

**Phase 3, Day 34. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 34 adds the two project archetypes **structurally closest to api-only**: **cron-worker** (a scheduler trigger + an idempotent handler that runs to completion; NO HTTP routes) and **queue-consumer** (a broker connection + a consume loop + a per-message handler with ack/retry/dead-letter; the "route table" becomes a **topic/queue → handler** table). Each is a **new project-type enum value + an entrypoint/lifecycle projection reusing the existing domain layer.** The **DEFAULT (web-app / api-only) is UNAFFECTED.** **`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §1.5 core-neutral / per-stack logic in plugins; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 34 (lines 74–77) + Day 36 (lines 79–82, the next types) → [`eco-day-31-report.md`](eco-day-31-report.md) (gate: **76 baked + 10 TeamTracker + non-hash 1c–1p**) → the REAL project-type handling: `core/project-model.ts` (the `projectType` enum + the Day-15 type↔frontend constraint) and each stack's `generateProjectShell` (the HTTP entrypoint + route table the workers swap).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code):**
> - **The enum is `projectType: 'Web App' | 'API-only'`** (`core/project-model.ts`). **API-only (Day 15) = Web-App MINUS the frontend** — both still serve HTTP routes; the branch is keyed on `frontend === 'None'` (Spring subtracts the frontend subtree; other stacks are frontendless anyway). The **type↔frontend constraint** (line 416: `if (projectType === 'API-only') frontend = 'None'`) is a generic project-shape rule in the kernel.
> - **The HTTP entrypoint + route table is what the workers swap.** Express: `src/server.js` (migrate → seed → `app.listen`) + `src/app.js` (**auto-mounts every entity router** — the route table). The **domain layer** = the per-entity files (`generateEntity`: model/repository/service/dto) + `db.js`/`migrate.js`/`seed.js`/`auth.js`. **The workers reuse the domain and replace `server.js`/`app.js` + the entity HTTP route/controller layer** with a scheduler/consumer entrypoint + a handler table.
> - **No fixture uses a non-`Web App`/`API-only` type** ⇒ adding enum values is a **literal bypass by construction** (the worker branch fires only for the new types; existing baselines untouched).
> - **The additive-pattern precedents:** api-only (Day 15 — a new type, additive, own baselines) is the exact template; `generateProjectShell`/`generateEntity` already branch on the model. Node is the boot-verifiable stack (Days 25/27/29 — Express ran via Node); Go/Java/Python are toolchain-gated here.

---

## 0. What Day 34 is — two new archetypes as entrypoint/lifecycle projections

Both new types **reuse the deterministic domain layer** (entities/repositories/services/migrations) and **swap only the entrypoint + the route table**:
- **cron-worker:** a **scheduler** (a tick loop) + an **idempotent handler** that runs a domain job to completion. **No HTTP routes.**
- **queue-consumer:** a **broker connection** + a **consume loop** + a **per-message handler** with **ack / retry / dead-letter**; the HTTP route table becomes a **topic/queue → handler** table.

This is a definite structural mapping — software builds it whole (not creative). The DEFAULT (web-app/api-only) is a literal bypass.

---

## 1. THE DETERMINISM SPINE

1. **The DEFAULT (web-app / api-only) is a LITERAL BYPASS.** Adding the two enum values + the worker branch does NOT change web-app/api-only generation (the branch fires only for the new types; no fixture uses them). **Proof (execute):** `rm -rf dist && npm run build && npm run day20:regress` → PASS, the full backstop byte-identical (**76 baked + 10 TeamTracker + non-hash gates 1c–1p**). **A moved frozen hash = a FINDING, STOP** (never a re-baseline).
2. **Each new type → NEW twice-identical baselines (additive).** A cron-worker fixture + a queue-consumer fixture (per stack as scoped) → generated twice → byte-identical → recorded in a new **PART 1q**, never replacing a frozen hash. Each entrypoint/lifecycle projection deterministic.
3. **At least one type BOOTS + runs its lifecycle.** A cron tick fires the handler / a consumed message is handled (ack). **Honest** about which stack×type booted vs generation-only (Express-family runtime-verifiable via Node; others generation-only — no Go/Java toolchain, heavy Python installs, Docker down).

---

## 2. THE ARCHITECTURE — reuse the domain, swap the entrypoint/lifecycle

### 2.1 The enum + the type-shape constraint
- **`projectType: 'Web App' | 'API-only' | 'Cron Worker' | 'Queue Consumer'`.** Additive union values.
- **The type↔frontend constraint extends:** the non-web-app types (API-only, Cron Worker, Queue Consumer) force `frontend = 'None'` — workers have no frontend (the existing Day-15 rule, generalized). Recorded in `defaultsApplied` (ADR-004). No fixture uses the new types ⇒ byte-identical default.

### 2.2 The domain layer is REUSED UNCHANGED; the entrypoint + route table is SWAPPED
- **Reused (byte-identical to api-only):** each entity's **domain** files (model/repository/service/dto) + `db`/`migrate`/`seed`/`auth` + the migrations. A determinism + reuse proof: the worker's domain files are **byte-identical** to the same-model api-only project's domain files.
- **Swapped (the projection, per-stack `generateProjectShell`/`generateEntity` branch on `projectType`):**
  - `server.js`/`app.js` (HTTP listen + route mounting) → the **worker entrypoint** (scheduler/consumer).
  - the entity **HTTP route/controller** layer → the worker **handlers** (which call the reused domain services).
- **cron-worker** (per stack): a **scheduler** + an **idempotent handler**. The Node scheduler is `setInterval`/`setTimeout` (a **builtin — NO new dep**); the handler runs a domain job (e.g. a deterministic "process pending items" over a repository) to completion. Other stacks: their native idiom (Go `time.Ticker`; Python APScheduler; Spring `@Scheduled`) — a **scheduler lib is a GENERATED-PROJECT dep, gated on the type**, never a Thraksha core dep.
- **queue-consumer** (per stack): a **broker connection** + a **consume loop** + a **topic→handler** table; each handler processes one message (calling the domain services) with **ack** (success) / **retry** (transient) / **dead-letter** (poison). The broker driver (Node `amqplib`, etc.) is a **GENERATED-PROJECT dep, gated on the type**; the **boot proof uses a stubbed/in-process message** (no real broker — Docker is down), proving the consume-loop + handler + ack path.

### 2.3 The dependency question (the recurring finding)
- **Thraksha core stays `deps {}`** — the projection is pure-Node string templates. **Any scheduler/broker library is a GENERATED-PROJECT dependency** (in the generated `package.json`/`go.mod`/`requirements.txt`), **gated on the project type** so web-app/api-only manifests are byte-identical. **Prefer NO new dep where possible** (Node cron via `setInterval`; the queue boot via a stub). This is the decimal-lib / Style-Dictionary finding again: a runtime lib belongs in the generated project, never in the generator core.

### 2.4 Scope (`[2 days]` — honest)
- **Definite (boot-verified): Express (Node)** — **both** cron-worker + queue-consumer, **booted** (a `setInterval` cron tick fires the handler; a stubbed queue message → handler → ack). Node is runtime-verifiable here.
- **Generation-only (per the toolchain reality): the other 4 stacks** (Spring/FastAPI/Django/Go) — the same entrypoint/lifecycle projection, recorded as additive baselines where cleanly writable; **HONESTLY STAGED** if a stack×type is too large to do correctly this pass (no boot/compile here). Boot ≥1 type (Express, both); be explicit which are generation-only.

---

## 3. What the plan resolves (answered from the real code)

1. **The project-type enum + where the entrypoint diverges:** `projectType` (core/project-model.ts) + the type↔frontend constraint (extend for workers); the per-stack `generateProjectShell` HTTP entrypoint (`server.js`/`app.js` + the route table) is what the workers swap (§2.1/§2.2).
2. **cron-worker mechanism:** a scheduler (Node `setInterval` — no dep) + an idempotent handler running a domain job to completion; other stacks' schedulers are gated generated-project deps (§2.2).
3. **queue-consumer shape:** a broker + a consume loop + a topic→handler table with ack/retry/dead-letter; the broker driver is a gated generated-project dep; the boot uses a stubbed message (§2.2).
4. **Which stacks × types (honest scope):** Express both types **boot-verified**; the other 4 stacks generation-only / staged (§2.4).
5. **How the domain is reused unchanged:** the worker's model/repository/service/dto/migrations are **byte-identical** to the api-only project's — only the entrypoint + route/handler layer differs (§2.2; a gate in DC-3).

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### Stage 1 — the enum + the Express projections + default-bypass + the Express baselines + the lifecycle boot
- **DC-1:** the two enum values + the type↔frontend constraint (workers → no frontend); the **Express** cron-worker + queue-consumer entrypoint/lifecycle projections (scheduler / broker+consume-loop+ack/retry/dead-letter + the topic→handler table), **reusing the domain layer unchanged**. Any Node scheduler/broker lib is a **gated generated-project dep** (`deps {}` core unchanged).
- **DC-2 (DEFAULT = LITERAL BYPASS — load-bearing):** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full backstop byte-identical (76 baked + 10 + non-hash). The new types are additive enum values; web-app/api-only untouched. **A moved hash = a finding, STOP.**
- **DC-3 (Express new baselines + domain reuse):** cron-worker + queue-consumer (Express) → generated **twice-identical** → recorded in a new **PART 1q** (additive). **Prove the domain is reused unchanged:** the worker's model/repository/service/dto/migrations are byte-identical to the same-model api-only project's (only the entrypoint + route/handler layer differs).
- **DC-4 (THE LIFECYCLE BOOT — Express, both types):** boot the cron-worker (Node) → a **`setInterval` tick fires the idempotent handler** (the job runs to completion); boot the queue-consumer (Node) → a **stubbed message → the topic handler runs → ack** (retry/dead-letter paths present). Runtime-verified via Node (a real broker/DB is not available — Docker down; the domain job/handler is exercised over a stub, as Day-25/27 did).

### Stage 2 — the other stacks (generation-only / staged) + invariants
- **DC-5:** extend the two projections to the other stacks (Spring/FastAPI/Django/Go) as **generation-only** additive baselines where cleanly writable (per-stack scheduler/broker idioms, gated deps); **HONESTLY STAGE** any stack×type too large this pass. Record which are generation-only vs booted (Express).
- **DC-6 (invariants):** generator **pure-Node** (`deps {}`, 0 native — **no scheduler/broker lib as a Thraksha core dep**; any such lib is a gated generated-project dep only); **no frozen hash moved** (default); the **domain layer reused unchanged** (DC-3); the new baselines additive.

**Execute scope guard (every stage):** only cron-worker + queue-consumer. **NOT** CLI/GraphQL/static (Day 36); **NOT** CI/CD (Day 38). The default (web-app/api-only) byte-identical (**a move = finding, STOP**). The **domain layer reused unchanged** (entrypoint/lifecycle swap only). **Scheduler/broker libs are generated-project deps only, never Thraksha core** (`deps {}` stays). No AI. No signing. Commit to `main`. Don't compress the 2 days — Express both-types-booted is the provable heart; the other stacks are generation-only/staged honestly.

---

## 5. REPORT — done-conditions

[`eco-day-34-report.md`](eco-day-34-report.md): the two archetypes + the per-stack entrypoint/lifecycle projection (scheduler / broker+consume-loop+ack/retry/dead-letter; the topic→handler table; the domain reused unchanged); the **default-bypass proof** (web-app/api-only byte-identical, by construction); the **new twice-identical baselines** (Express + the other stacks as scoped, PART 1q, additive); the **lifecycle boot proof** (Express cron tick fires the handler / a stubbed message is handled + acked — **honest verification level per stack**, Express booted vs the rest generation-only, like Day 25/27); **invariants** (pure-Node, `deps {}` — scheduler/broker libs generated-project-only; no frozen hash moved; domain reused unchanged). **Forward-flags:** `[2 days]` scope status (which stacks×types booted vs generation-only vs staged); **determinism ≠ validity** (deterministic generation; runtime correctness boot-verified for Express, reasoned for the rest); what **Day 36** picks up (CLI + GraphQL + static-site+API types).

---

## 6. Scope guard — OUT for Day 34
- Only cron-worker + queue-consumer. **NOT** CLI/GraphQL/static (Day 36); **NOT** CI/CD (Day 38).
- **The default (web-app/api-only) MUST be byte-identical** — a moved hash = a FINDING, STOP (never a re-baseline).
- **The domain layer is reused unchanged** — the archetypes swap only the entrypoint/lifecycle + route table.
- **Scheduler/broker libs are GENERATED-PROJECT deps only, gated on the type — never a Thraksha core dep** (`deps {}` stays).
- No AI. No signing. **`[2 days]`** — stage honestly; boot ≥1 type, honest about the rest.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + Month-2 Day 34 + Day-31 report + the real project-type enum + `generateProjectShell` entrypoint? — ✅ (this session).
2. Only Day-34's job (the two archetypes)? — yes; **not** CLI/GraphQL/static, **not** CI/CD.
3. Which frozen baselines must NOT move? — **all** (76 baked + 10 TeamTracker + non-hash). New enum values are additive; no fixture uses them; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — **yes, by construction**: the worker branch fires only for the new types; web-app/api-only unchanged.
6. Three killers checked? — no clock/RNG/UUID in the projection (deterministic string templates; the scheduler is emitted CODE the generated app runs, not a Thraksha-time clock); LF only; stable order. Any scheduler/broker lib is a gated generated-project dep, not a core dep.
7. A gate that can actually FAIL? — **DC-2** (a moved web-app/api-only hash ⇒ the worker branch leaked into the default), **DC-3** (a worker type non-deterministic / the domain files differ from api-only), **DC-4** (the cron tick doesn't fire the handler / the message isn't handled+acked), **DC-6** (a scheduler/broker lib in Thraksha `deps` / a native module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) a moved default hash silently re-baselined (a finding, STOP); (ii) a scheduler/broker lib added to Thraksha's `deps {}` (must stay empty — it's a generated-project dep, gated); (iii) changing the domain layer (must be reused unchanged — the entrypoint/route-table swap only); (iv) claiming all 5 stacks×2 types boot when only Express did (§4 honesty — booted vs generation-only vs staged); (v) drifting into CLI/GraphQL (Day 36) — all guarded.

---

*Day 34 adds the two project archetypes closest to api-only as deterministic entrypoint/lifecycle projections that REUSE the domain layer unchanged and swap only the entrypoint + route table: cron-worker (a scheduler + an idempotent handler, no HTTP routes) and queue-consumer (a broker + a consume loop + a topic→handler table with ack/retry/dead-letter). They are new `projectType` enum values; the default (web-app/api-only) is a literal bypass by construction — no fixture uses the new types, so the 76 baked + 10 TeamTracker + non-hash gates reproduce byte-identical; each new type yields new twice-identical baselines (additive, PART 1q), and the worker's domain files are byte-identical to the api-only project's (the reuse proof). At least one type boots and runs its lifecycle — Express (Node) cron-worker (a setInterval tick fires the idempotent handler) and queue-consumer (a stubbed message is handled + acked) — with the other stacks generation-only/staged honestly (no Go/Java toolchain; Docker down). Any scheduler/broker library is a gated generated-project dependency, never a Thraksha core dep (`deps {}` stays); no AI, no frozen hash moved. Day 36 picks up CLI + GraphQL + static-site+API types.*

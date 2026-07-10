# THE SESSION LEDGER — SPEC
### `docs/daily/eco-block-A-ledger.md` · the resume file, not the record

> **In-repo home:** `docs/prompts/BEDROCK-SESSION-LEDGER-SPEC.md`
> Referenced verbatim by the Block-A PLAN, EXECUTE and REPORT prompts.

---

## 1. What it is

A live, append-mostly file that a Claude Code session updates **after every completed task**,
so that a session killed by the 5-hour limit can be resumed cold by the next session without
guesswork, re-running finished work, or — the real danger — re-running finished work
*differently*.

It answers exactly four questions for a session that wakes up with no memory:

1. Which tasks are DONE, and what gate proved each one?
2. Which task was IN-PROGRESS when the session died, and how far in?
3. What is the next task, and what must be read before touching it?
4. Has anything moved that should not have moved?

## 2. What it is NOT

**The ledger is not the report.** The report is the certified, self-contained record written
once at the close, with every gate's pasted output. The ledger is scaffolding.

**Authority order, stated so no session gets this wrong:**

> THE CODE > the daily reports > the governing docs > the Knowledge Book > **this ledger**.
>
> The ledger is a resume aid. On any conflict between the ledger and the code, or the ledger
> and a report, **the ledger is wrong.** Correct it; never correct reality to match it.

A ledger that starts being trusted is a second source of truth, which is the SQLite problem
in miniature — and this project is currently spending sixteen build days getting out of
exactly that.

## 3. Write and commit policy

- **Write to disk after every completed task.** Immediately. Before starting the next one.
- **Commit once**, with the day's work, at the day's close.
- Rationale: pre-commit runs the full backstop. A commit per task would mean ~10 backstop
  runs per execution session. An uncommitted-but-written file survives a session kill and is
  readable by the next session; that is all the durability the ledger needs.
- If a session is killed, the next session's **first action** is to read the ledger, then
  `git status` and `git diff` to confirm the ledger's claims against the working tree. Where
  they disagree — the working tree wins, and the disagreement is a finding.

## 4. Format (fixed — do not improvise)

```markdown
# BLOCK A — SESSION LEDGER
Last written: {ISO timestamp} · Session: {N} · Mode: {PLAN | EXECUTE | REPORT}
Baseline at block open: commit `ff6e991` · backstop 203 OK / 0 FAIL · MAXIMAL `366e19d9`

## STATUS
Current day: {71|72|73|74|75}
Current task: {task id} — {DONE | IN-PROGRESS | BLOCKED | STOPPED}
Next task: {task id}
Backstop last run: {timestamp} → {203 OK / 0 FAIL | actual figures}
Frozen 103: {UNMOVED | MOVED → see FINDINGS}
MAXIMAL 366e19d9: {UNMOVED | MOVED → STOP}

## TASK TABLE
| ID | Day | Task | State | Gate that proved it | Gate result | Files touched |
|----|-----|------|-------|---------------------|-------------|---------------|
| A71-1 | 71 | ... | DONE | backstop | 203 OK / 0 FAIL | ... |
| A71-2 | 71 | ... | IN-PROGRESS | UI==CLI 4-template | not yet run | ... |

## IN-PROGRESS DETAIL (only while a task is open)
What was being changed: {files, precisely}
What is already edited on disk: {list}
What has NOT been done yet: {list}
The gate that must run before this task can be called DONE: {name + command}
If resuming cold, read first: {file list}

## FINDINGS (append-only — never delete a finding)
- {date} {what was observed} / {what was expected} / {what was NOT done next}

## PENDING — LEELA'S MACHINE (append-only, never marked done by a Claude Code session)
- Pre-71 control smoke (8 Half-B items, CURRENT shell) — PENDING
- {every live-GUI item, named}

## LEDGER ↔ REALITY RECONCILIATION (run on every cold resume)
- `git status` clean/dirty: {}
- Working tree matches ledger's "files touched": {yes | no → FINDING}
```

## 5. Rules for the ledger itself

1. **Never mark a task DONE without naming the gate that proved it and pasting its result.**
   A task marked DONE with gate "n/a" is a lie the next session will believe.
2. **Never mark a Leela-machine item as done.** No Claude Code session has a GUI. Live items
   stay PENDING, by name, forever, until Leela's own report says otherwise.
3. **FINDINGS are append-only.** A finding is never resolved by deletion. It is resolved by a
   later dated line that says how.
4. **STOPPED is a valid, successful end state.** If a gate goes red, write STOPPED, write the
   finding, and stop. Do not continue to the next task. Do not write a clean-looking close.
5. **A moved baked hash is a FINDING → STOP**, recorded in the ledger *and* escalated to
   Leela. Never a silent re-baseline. Never "probably benign."
6. The ledger is one file for the whole of Block A (`eco-block-A-ledger.md`), because a
   single session now spans the block. Per-day reports remain per-day.
7. New file at that path → check the `.gitignore` `/*` whitelist trap (Rule 28) and add an
   explicit un-ignore rule before the first commit.

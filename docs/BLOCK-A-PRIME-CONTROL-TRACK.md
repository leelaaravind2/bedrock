# BLOCK A′ — THE LEELA-MACHINE TRACK
### Honest-manual. No Claude Code session may mark any item here done.

> **In-repo home:** `docs/daily/eco-block-A-prime-control.md`
> Runs **parallel** to Block A, not inside it. Item 1 must land **before Day 71 executes.**

---

## Why this exists

Every item below needs a GUI, a Store account, or `MakeAppx` — none of which exist in a
Claude Code shell. They are therefore **honest-manual**: they get done by you, on your
machine, and they stay marked **PENDING** in every plan, ledger and report until your own
written result says otherwise. A session that writes "Half-B passed" without your result has
lied, and the lie is load-bearing.

---

## A′.1 — THE PRE-71 CONTROL SMOKE (do this first; one launch; ~30 minutes)

**Purpose, precisely.** Day 71 restructures the shell into a screen router. If something in
the GUI is broken *after* Day 71, you need to know whether the router broke it or whether it
was never right. Without this control you cannot tell those two apart, and you will spend a
fix-day chasing the wrong cause. This is not the full Half-B walkthrough. It is a control.

**Run against:** the CURRENT wall-of-cards shell, at commit `ff6e991`, untouched.

**The 8 items** (names from Knowledge Book V.9 — **the PASS criteria are in
`docs/daily/eco-day-69-report.md` §3; read them there, do not work from memory or from this
list, which is only an index**):

| # | Item | Observed | Notes |
|---|------|----------|-------|
| 1 | Launch | PASS / FAIL | |
| 2 | Wizard → generate | PASS / FAIL | |
| 3 | Save / list / load | PASS / FAIL | |
| 4 | View diagram | PASS / FAIL | |
| 5 | Preview impact | PASS / FAIL | |
| 6 | Compare versions | PASS / FAIL | |
| 7 | Verify | PASS / FAIL | |
| 8 | Friendly errors | PASS / FAIL | |

**Recording rule.** Write the result into `docs/daily/eco-block-A-prime-control.md` with the
date and the commit you ran against. A FAIL here is **not a blocker for Day 71** — it is a
pre-existing defect, now known, and Day 71 must not be blamed for it. A FAIL here is a real
finding: log it, and decide with me whether it earns a fix-day before or after the arc.

**What "Verify" means when you check item 7.** Verify proves **reproducibility**. It does not
prove correctness, security, or bug-freedom. If the GUI text implies otherwise, that is a
finding for Day 74.

---

## A′.2 — FULL HALF-B ON THE NEW SHELL (after Day 75, not before)

Same 8 items, same criteria file (`eco-day-69-report.md` §3), run against the shell that
Days 71–75 produced. Compare, item by item, against your A′.1 control results.

- **Item passed in A′.1, fails now** → Block A broke it. A real finding. A fix-day is inserted
  at the next number; everything after shifts. Renumbering is normal (Forward Plan,
  plan-maintenance rules). Forcing reality into the numbering is the only failure.
- **Item failed in A′.1, fails now** → pre-existing. Not a Block-A regression. Still a defect.
- **Item failed in A′.1, passes now** → note it; do not claim it as an intended deliverable
  unless a plan said so.

Record in `docs/daily/eco-day-75-report.md` — the arc's certification record, which is
required to list every PENDING live item **by name**.

---

## A′.3 — THE FOUR STORE STEPS (timeboxed; the Store is a checkbox, not the channel)

Runbook: `desktop/src-tauri/msix/README.md`. Do not improvise around it.

1. **MakeAppx local-test wrap.**
2. **Packaged launch + Half-B** against the packaged build. (Step 2 of the runbook mirrors the
   same §3 criteria.)
3. **GATE-NAME — yours alone.** "Bedrock" collides with Amazon Bedrock, AWS's flagship AI
   platform. For an *AI-free* tool this is an identity and search problem, not a trademark
   footnote. This gate blocks the ~$19 name reservation **and Day 87 (npm publish)**, and it
   settles GATE-FILENAME (`bedrock.json` is provisional). **A rename before Day 79 costs one
   token. After Day 79 it is a documented format change.** That asymmetry is the whole reason
   this gate has a deadline.
4. **Submission wrap** — the one-line manifest edit, `0.1.0 → 0.2.0`. Hash-independent. Then
   submit.

**Timebox it.** If Partner Center gets messy, park it without guilt and proceed to B1. Rule 33:
the Store is a checkbox; the CLI is the product channel. Nothing in Phase B waits on step 4.

---

## A′.4 — WHAT STAYS OPEN ON YOUR DESK (not build work)

- **GATE-NAME** — blocks Store step 3 and Day 87. Cheapest to settle before Day 79.
- **GATE-LICENSE** — npm-publishing the CLI ships the engine publicly. Options memo due by
  **Day 85**; blocks Day 87. Full OSS / source-available / dist-only.
- **Single-maintainer risk** — the one blocker no feature fixes. Not actionable today. Stays
  named in every strategy document until an open spec, the test discipline, and eventually a
  second contributor or an institution dissolve it. It is the #1 long-term threat to this
  project and it is not a build task.

---

## The line

Every item on this page is something I cannot do and cannot verify. If a report of mine ever
claims one of them is done, audit it — because I got it from you or I made it up, and only one
of those is acceptable.

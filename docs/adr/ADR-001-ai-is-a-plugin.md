# ADR-001 — AI is a Detachable Plugin, Never in the Generation Path

**Status:** Accepted · **Derives from:** Constitution Laws 4, 5, 15, 16, 17, 18

---

## The decision

AI is a **plugin** that can be attached or detached like any other plugin. The
platform must generate code **completely and correctly with no AI present at all.**

AI is allowed to do exactly these things, and only for the developer who asks:
- Explain existing code.
- Answer questions / doubts.
- Research (offline, in the knowledge pipeline).
- Suggest, classify, document.

AI is **never** part of how code is generated.

---

## Why (in plain terms)

The entire reason Thraksha is different from "just ask ChatGPT" is that its
generation is **deterministic** — the same input always produces the same output,
so a developer can trust it without re-reading every line.

The moment AI is involved in generating code, that guarantee is gone. The output
becomes a guess that changes each time, and Thraksha becomes a slower, more
expensive wrapper around the exact thing it set out to replace.

AI in generation = the platform loses its only real advantage.

---

## What this looks like in practice

- Generation runs through templates + the deterministic compiler. No AI call
  anywhere in that path.
- If the AI plugin is uninstalled, **nothing about generation breaks.** Only the
  "explain this code" and "ask a question" buttons disappear.
- AI can be used **offline** to help build knowledge packs — but its output is
  reviewed by a human, validated, and frozen into a versioned pack *before* it is
  ever used. The generator only ever uses the frozen pack, never a live AI call.
- Any AI provider (Claude, OpenAI, etc.) can be swapped without touching the core.

---

## What would VIOLATE this rule (watch for these)

- ❌ Calling an AI model anywhere during code generation, "just to fill a gap."
- ❌ Making generation quality depend on which AI provider is connected.
- ❌ A feature that "doesn't work without AI" when that feature is part of
  building the project (as opposed to explaining it).
- ❌ Using AI to *resolve* a decision the platform should make deterministically.

---

## How to check

Ask: **"If I delete the AI plugin right now, does the project still generate
correctly?"** If the answer is no, this rule is being broken.

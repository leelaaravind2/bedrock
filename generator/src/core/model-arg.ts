/*
 * Thraksha — the --model CLI arg reader (Eco-Day 52).
 *
 * The command-surface wiring (the packaged Bedrock shell) needs the model-taking CLIs
 * (export / map / flow-map) to run on a REAL user blueprint, not only their built-in
 * demo model. This reader turns a `--model <path-or-json>` value into a ProjectModel
 * via the EXISTING canonical construction path (`assembleBlueprint`) — it introduces NO
 * new model-setup and NO generation logic. It is purely an INPUT source: the same
 * `BlueprintChoices` the wizard/CLI already assemble, now read from a file or inline JSON.
 *
 * ADDITIVE + LITERAL BYPASS: a CLI only calls this when `--model` is supplied; with no
 * `--model` the CLI keeps its exact prior demo/dir/backend behavior (byte-identical
 * frozen output). `assembleBlueprint` is itself a proven literal bypass (its default
 * dimensions fire no setter), so the reader adds no determinism risk.
 *
 * Pure Node, no dependency (fs + JSON only). No AI, no clock, no randomness.
 */

import { promises as fs } from 'node:fs';
import { assembleBlueprint, type BlueprintChoices } from './assemble.js';
import type { ProjectModel } from './project-model.js';

/**
 * Parse a `--model` value as JSON. The value is either INLINE JSON (parses directly)
 * or a FILE PATH (a path is not valid JSON, so we fall through to reading the file).
 */
export async function loadModelJson<T = unknown>(value: string): Promise<T> {
  try { return JSON.parse(value) as T; }
  catch { return JSON.parse(await fs.readFile(value, 'utf8')) as T; }
}

/**
 * Read a single blueprint from a `--model` value and assemble it through the EXISTING
 * canonical path (`assembleBlueprint`) — the same deterministic construction the wizard
 * and demos use. No new generation logic.
 */
export async function readModelArg(value: string): Promise<ProjectModel> {
  return assembleBlueprint(await loadModelJson<BlueprintChoices>(value));
}

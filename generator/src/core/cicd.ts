/*
 * Thraksha — CI/CD pipeline generation (Eco-Day 38).
 *
 * CI/CD config as a DETERMINISTIC, HASHED artifact. A gated `cicd` field (default
 * 'none' = the literal bypass, mirroring integrations/designTokens): when a provider
 * is declared, buildFileSet emits a workflow whose shape is FIXED and whose
 * versions are PINNED — the runtime version is READ from the blueprint's Day-11
 * version pin (`versions[runtimeKey]`), so the pipeline runtime == the pin BY
 * CONSTRUCTION, and every action ref is a fixed pinned tag (never `@latest`/floating).
 *
 * The three CI-specific determinism killers are all avoided (ADR-003):
 *   1. NO timestamp / run-id / date in the YAML (the leading killer).
 *   2. LF only (the caller joins with '\n').
 *   3. Stable order (a fixed step sequence; the pinned-action table is a constant,
 *      never map-iteration order). And NO `matrix` (one pinned runtime, not combinatorial).
 *
 * Law 25: the core owns the neutral provider YAML SHAPE + the pinned-action table
 * (a CI provider is a FORMAT, like the manifest — not a technology); the plugin
 * supplies the stack-specific facts (setup action, build/test commands, dockerfile)
 * via `BackendPlugin.ciProfile()`. Pure Node, no dependency, no AI, no secrets.
 */

import type { StackVersions } from './versions.js';

/** How CI/CD is generated. 'none' = no CI/CD (the literal bypass). */
export type CiProvider = 'none' | 'github-actions';

/** The optional CI/CD config a project opted into. Default = none (a literal bypass). */
export interface CiConfig {
  readonly provider: CiProvider;
}

/** The default — no CI/CD. A literal bypass that reproduces current output. */
export const defaultCiConfig: CiConfig = { provider: 'none' };

/**
 * Neutral per-stack CI facts a plugin supplies (NO YAML — Law 25). The core renders
 * the provider workflow from these + the blueprint version pins + the pinned-action table.
 */
export interface CiProfile {
  /** Which getVersions() pin drives the setup step (the LANGUAGE runtime, not the framework). */
  runtimeKey: 'node' | 'go' | 'python' | 'java';
  /** The setup action (its version is pinned by the core PINNED_ACTIONS table). */
  setupAction: string; // e.g. 'actions/setup-node'
  /** The setup step's version input name. */
  versionInput: string; // e.g. 'node-version'
  /** setup-java only: the JDK distribution. */
  distribution?: string;
  /** Build commands (the CI projection of the stack's Dockerfile). */
  buildCommands: string[];
  /** Test / validation commands (a deterministic smoke where no suite ships). */
  testCommands: string[];
  /** The Dockerfile path for the docker-build step. */
  dockerfile: string;
}

/**
 * The FIXED pinned action versions (a core constant — never floating, never @latest).
 * Pinning to a major tag (@v4) is the conventional pin; SHA-pinning is a stricter
 * option a project can adopt. These strings are LITERAL, so the emitted YAML is
 * byte-identical run-to-run (deterministic generation).
 */
const PINNED_ACTIONS: Record<string, string> = {
  checkout: 'actions/checkout@v4',
  'actions/setup-node': 'actions/setup-node@v4',
  'actions/setup-go': 'actions/setup-go@v5',
  'actions/setup-java': 'actions/setup-java@v4',
  'actions/setup-python': 'actions/setup-python@v5',
};

/** The pinned runner label — a fixed string (the artifact is byte-identical). */
const RUNNER = 'ubuntu-latest';

/** A concrete pin starts with a digit (never "latest"/"lts") — asserted, never resolved here. */
function assertConcrete(runtimeKey: string, version: unknown): string {
  if (typeof version !== 'string' || !/^[0-9]/.test(version)) {
    throw new Error(
      `CI/CD: the runtime version for "${runtimeKey}" is not a concrete pin ("${String(version)}"). ` +
        `Versions must be resolved to a pin BEFORE generation (resolve-then-pin, ADR-003).`,
    );
  }
  return version;
}

/**
 * Render the deterministic GitHub Actions workflow (.github/workflows/ci.yml).
 * Pure + total: the SAME (profile, versions) always yields the SAME YAML. The runtime
 * version is READ from `versions[profile.runtimeKey]` (the Day-11 pin) — so the pipeline
 * runtime == the blueprint pin BY CONSTRUCTION (default AND a non-default setVersions).
 * Fixed shape (checkout → setup [ONE pinned runtime] → build → test → docker build [no
 * push] → deploy [placeholder]); NO matrix; NO timestamp; pinned actions only.
 */
export function renderGithubActions(profile: CiProfile, versions: StackVersions): string {
  const runtimeVersion = assertConcrete(profile.runtimeKey, versions[profile.runtimeKey]);
  const setupAction = PINNED_ACTIONS[profile.setupAction];
  if (!setupAction) throw new Error(`CI/CD: no pinned version registered for setup action "${profile.setupAction}".`);

  const setupWith: string[] = [`          ${profile.versionInput}: '${runtimeVersion}'`];
  if (profile.distribution) setupWith.push(`          distribution: '${profile.distribution}'`);

  const runBlock = (name: string, cmds: string[]): string[] =>
    cmds.length === 0 ? [] : [`      - name: ${name}`, `        run: |`, ...cmds.map((c) => `          ${c}`)];

  return [
    `# THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `# Deterministic CI: pinned action refs + one pinned runtime (from the blueprint`,
    `# version pin, Day 11). Fixed single-runtime shape; no floating tags; no embedded dates.`,
    `name: ci`,
    ``,
    `on:`,
    `  push:`,
    `  pull_request:`,
    ``,
    `jobs:`,
    `  build:`,
    `    runs-on: ${RUNNER}`,
    `    steps:`,
    `      - name: Checkout`,
    `        uses: ${PINNED_ACTIONS.checkout}`,
    `      - name: Set up ${profile.runtimeKey}`,
    `        uses: ${setupAction}`,
    `        with:`,
    ...setupWith,
    ...runBlock('Build', profile.buildCommands),
    ...runBlock('Test', profile.testCommands),
    `      - name: Docker build`,
    `        run: docker build -f ${profile.dockerfile} .`,
    `      - name: Deploy (placeholder)`,
    `        run: echo "Wire your deploy target here (no secrets baked; configure in repo settings)."`,
    ``,
  ].join('\n');
}

/**
 * The workflow file for a declared provider, or null for the default ('none' — the
 * literal bypass, so buildFileSet emits nothing and the frozen backstop is byte-identical).
 * A plugin that supplies no ciProfile() yields null (a stack with no CI mapping).
 */
export function renderCiWorkflow(config: CiConfig, profile: CiProfile | undefined, versions: StackVersions): { relPath: string; content: string } | null {
  if (config.provider === 'none' || !profile) return null;
  if (config.provider === 'github-actions') {
    return { relPath: '.github/workflows/ci.yml', content: renderGithubActions(profile, versions) };
  }
  return null;
}

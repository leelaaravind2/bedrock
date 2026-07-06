/*
 * Thraksha — Toolchain detect-and-guide: the PURE detection core (Eco-Day 18).
 *
 * The honest "one install" story: DETECT what a generated project needs on the
 * developer's machine, GUIDE if missing/mismatched, and OFFER the container-build
 * path. This file is the PURE, deterministic core — plain functions over strings.
 * It NEVER spawns a process and NEVER reads the environment; the impure probe EDGE
 * (detect/probe.ts, the server /api/detect route, or a shell-side Rust command)
 * spawns the probes and hands their RAW output here.
 *
 * ── The load-bearing determinism boundary (why this is safe) ────────────────────
 *  1. DETECTION IS ADDITIVE — this module is NOT imported by buildFileSet / the
 *     plugins / the model. Generation output is untouched (the frozen 49 reproduce
 *     byte-identical). It is a tool module, like the harness/gates.
 *  2. NO ENV VALUE FEEDS BACK INTO GENERATION — a DetectionReport has NO write-path
 *     to the blueprint. It is a report the wizard SHOWS; it never mutates ProjectState
 *     and never reaches assembleBlueprint/buildFileSet. (Contrast Day-11 resolve-then-pin:
 *     a CONCRETE value written into the blueprint BEFORE generation is deterministic;
 *     a live env-probe result must NEVER become a generation input.)
 *  3. DETERMINISM ≠ VALIDITY — this reports FACTS about the environment (what's
 *     installed, what version). It tells the user whether their MACHINE can BUILD the
 *     deterministically-generated project; it NEVER claims the project itself builds/boots.
 *  4. TOOLCHAINS ≠ BUILD-DEPENDENCIES — it probes the MACHINE toolchains the user must
 *     pre-install (java/maven/node/python/pip/go + docker/podman). The framework-version
 *     pins (springBoot/express/fastapi/django) are BUILD-RESOLVED dependencies in the
 *     manifests (Maven/npm/pip fetch them) — they are NOT machine tools and are NEVER probed.
 *
 * Being pure, the whole core is FIXTURE-TESTED with canned probe outputs — no live
 * toolchain required (day20-regression PART 1j). Pure Node, no dependency.
 */

import type { ProjectState } from '../core/project-model.js';

// ── Types ───────────────────────────────────────────────────────────────────────

/** present = installed & (if pinned) version matches; mismatch = installed but wrong version; missing = not found. */
export type ToolStatus = 'present' | 'missing' | 'mismatch';

/** The role a toolchain plays — for grouping/messaging only. */
export type ToolRole = 'runtime' | 'build-tool' | 'frontend' | 'container';

/** One toolchain a project requires on the machine. */
export interface ToolReq {
  /** The probe name: java, maven, node, python, pip, go, docker, podman. */
  tool: string;
  role: ToolRole;
  /** The `ProjectState.versions` key whose pin this tool must satisfy (runtimes only). Absent ⇒ present/missing only. */
  pinKey?: string;
  /** The concrete pinned version resolved from the blueprint (Day 11). Absent ⇒ no version compare. */
  pin?: string;
  /** Container runtimes are alternatives — either docker OR podman satisfies the container path. */
  container?: boolean;
}

/** The RAW output of one probe, produced by the impure edge and consumed here. */
export interface ProbeResult {
  tool: string;
  /** Did the executable run at all (false = not on PATH / spawn error ⇒ missing). */
  found: boolean;
  rawStdout: string;
  rawStderr: string;
}

/** Static install guidance for one tool. */
export interface Guidance {
  message: string;
  installUrl: string;
}

/** The per-tool detection outcome. */
export interface ToolReport {
  tool: string;
  role: ToolRole;
  status: ToolStatus;
  /** The parsed detected version, or null when missing/unparseable. */
  detected: string | null;
  /** The pin compared against, or null when the tool has no pin. */
  pin: string | null;
  /** Present ONLY when missing/mismatch (never silently fail) — a message + official link. */
  guidance: Guidance | null;
}

/** The container-build escape hatch. */
export interface ContainerOffer {
  available: boolean;
  runtime: string | null; // 'docker' | 'podman' | null
  message: string;
}

/** The whole environment report the wizard shows (never fed back into generation). */
export interface DetectionReport {
  backend: string;
  tools: ToolReport[];
  container: ContainerOffer;
  summary: {
    present: number;
    missing: number;
    mismatch: number;
    /** All required NON-container tools present + matching. A HEURISTIC — NOT a build guarantee. */
    canBuildNatively: boolean;
    /** Honest caveat carried in the report itself. */
    note: string;
  };
}

// ── requiredToolchains — the MACHINE tools a stack needs (NOT the framework deps) ──

/**
 * The machine toolchains a given blueprint needs. Runtimes carry the blueprint's
 * Day-11 pin (from `state.versions`); build tools (maven/pip) are presence-only; the
 * container runtimes (docker/podman) are always offered as the zero-native-toolchain path.
 *
 * NOTE (toolchains ≠ build-deps): the framework-version pins — springBoot/express/
 * fastapi/django in state.versions — are NOT emitted here. They are build-resolved
 * dependencies (Maven/npm/pip fetch them from pom.xml/package.json/requirements.txt),
 * not machine tools, so they are never probed.
 */
export function requiredToolchains(state: ProjectState): ToolReq[] {
  const backend = state.phaseA.backend;
  const versions = state.versions || {};
  const reqs: ToolReq[] = [];
  const runtime = (tool: string, pinKey: string): ToolReq => ({ tool, role: 'runtime', pinKey, pin: versions[pinKey] });

  switch (backend) {
    case 'Spring Boot':
      reqs.push(runtime('java', 'java'));
      reqs.push({ tool: 'maven', role: 'build-tool' }); // maven:3.9 is a fixed infra image (Day-11) — presence only
      // A React frontend is a separate Node build (Spring ships a frontend Dockerfile on node:__NODE_VERSION__).
      if (state.phaseA.frontend === 'React') reqs.push({ tool: 'node', role: 'frontend', pinKey: 'node', pin: versions.node });
      break;
    case 'Express':
      reqs.push(runtime('node', 'node'));
      break;
    case 'FastAPI':
    case 'Django':
      reqs.push(runtime('python', 'python'));
      reqs.push({ tool: 'pip', role: 'build-tool' });
      break;
    case 'Go':
      reqs.push(runtime('go', 'go'));
      break;
    default:
      // An unknown backend carries no runtime map — the container path still applies.
      break;
  }
  // The container path is always available (every stack ships a pinned Dockerfile + compose).
  reqs.push({ tool: 'docker', role: 'container', container: true });
  reqs.push({ tool: 'podman', role: 'container', container: true });
  return reqs;
}

// ── parseVersion — extract a version from a probe's RAW output ────────────────────

/**
 * Parse the version string a probe printed. Takes BOTH streams because some tools
 * print to STDERR — notably `java -version` (the classic gotcha). Returns null when
 * nothing parseable is present (⇒ the compare treats it as missing/unparseable).
 */
export function parseVersion(tool: string, rawStdout: string, rawStderr: string): string | null {
  const text = `${rawStdout}\n${rawStderr}`;
  const pick = (re: RegExp): string | null => {
    const m = text.match(re);
    return m ? m[1] : null;
  };
  switch (tool) {
    // `openjdk version "21.0.5"` / `java version "1.8.0_401"` → the quoted token.
    case 'java':
      return pick(/version\s+"([\d._]+)"/i);
    // `Apache Maven 3.9.6 (...)`
    case 'maven':
      return pick(/Apache Maven\s+([\d.]+)/i);
    // `v22.14.0`
    case 'node':
      return pick(/v?(\d+\.\d+\.\d+)/);
    // `Python 3.12.4`
    case 'python':
      return pick(/Python\s+(\d+\.\d+(?:\.\d+)?)/i);
    // `pip 24.0 from ...`
    case 'pip':
      return pick(/pip\s+(\d+\.\d+(?:\.\d+)?)/i);
    // `go version go1.22.1 windows/amd64`
    case 'go':
      return pick(/go\s*(?:version\s+go)?(\d+\.\d+(?:\.\d+)?)/i);
    // `Docker version 27.0.3, build ...`
    case 'docker':
      return pick(/Docker version\s+(\d+\.\d+\.\d+)/i);
    // `podman version 5.0.1`
    case 'podman':
      return pick(/podman version\s+(\d+\.\d+\.\d+)/i);
    default:
      return pick(/(\d+\.\d+(?:\.\d+)?)/);
  }
}

// ── compareToPin — a DETECTION HEURISTIC (not a determinism concern) ──────────────

/**
 * Compare a detected version to the pin. The comparison granularity is the PIN's:
 * a pin of "21" compares the MAJOR only (machine "21.0.5" = present; "20" = mismatch);
 * a pin of "3.12" compares MAJOR.MINOR; a pin of "1.22" compares MAJOR.MINOR. This is a
 * heuristic — it does not judge patch-level compatibility — and it is honestly imperfect;
 * it is NOT a determinism concern (it reads reality, it never touches generation).
 *
 * No pin ⇒ presence-only (found = present). Detected null ⇒ missing.
 */
export function compareToPin(detected: string | null, pin: string | null | undefined): ToolStatus {
  if (detected == null) return 'missing';
  if (pin == null || pin === '') return 'present'; // presence-only tool
  const pinParts = pin.split('.');
  const detParts = detected.split('.');
  for (let i = 0; i < pinParts.length; i++) {
    if (detParts[i] !== pinParts[i]) return 'mismatch';
  }
  return 'present';
}

// ── guidanceFor — static install catalog (no network; never silently fail) ────────

/** The official install links per tool (static — no network call needed for the links). */
const INSTALL_URLS: Record<string, string> = {
  java: 'https://adoptium.net/temurin/releases/', // Adoptium/Temurin
  maven: 'https://maven.apache.org/download.cgi',
  node: 'https://nodejs.org/en/download',
  python: 'https://www.python.org/downloads/',
  pip: 'https://pip.pypa.io/en/stable/installation/',
  go: 'https://go.dev/dl/',
  docker: 'https://docs.docker.com/get-docker/',
  podman: 'https://podman.io/docs/installation',
};

/**
 * Guidance for a tool given its status. `present` ⇒ null (nothing to guide). `missing`/
 * `mismatch` ⇒ a clear message + the official install link — NEVER a silent failure.
 */
export function guidanceFor(tool: string, status: ToolStatus, detected: string | null, pin: string | null): Guidance | null {
  if (status === 'present') return null;
  const url = INSTALL_URLS[tool] ?? '';
  const label = tool.charAt(0).toUpperCase() + tool.slice(1);
  if (status === 'missing') {
    const need = pin ? `${label} ${pin}` : label;
    return { message: `${need} was not found on PATH. Install it, or use the container build (needs only a container runtime).`, installUrl: url };
  }
  // mismatch
  return {
    message: `${label} ${detected} is installed, but this project pins ${label} ${pin}. Install/switch to ${label} ${pin}, or use the container build.`,
    installUrl: url,
  };
}

// ── containerOffer — the zero-native-toolchain escape hatch ───────────────────────

/**
 * The container-build offer. Every stack ships a version-pinned Dockerfile + compose
 * (Day 11), so the honest alternative to N native toolchains is a single container
 * runtime. `available` reflects whether docker/podman was detected.
 */
export function containerOffer(dockerPresent: boolean, podmanPresent: boolean): ContainerOffer {
  const runtime = dockerPresent ? 'docker' : podmanPresent ? 'podman' : null;
  if (runtime) {
    const cmd = runtime === 'podman' ? 'podman compose up' : 'docker compose up';
    return {
      available: true,
      runtime,
      message: `You can build & run with only a container runtime: \`${cmd}\` uses the version-pinned Dockerfile Thraksha generated — no native java/node/python/go needed.`,
    };
  }
  return {
    available: false,
    runtime: null,
    message: 'No container runtime found. Install Docker or Podman to build without native toolchains — the generated project already ships a version-pinned Dockerfile + docker-compose.yml.',
  };
}

// ── buildReport — compose the whole report from probe results (PURE) ──────────────

/**
 * Build the full DetectionReport for a blueprint from a map of raw probe results.
 * Pure: same (state, probes) → same report. The impure edge supplies `probes`.
 */
export function buildReport(state: ProjectState, probes: Map<string, ProbeResult>): DetectionReport {
  const reqs = requiredToolchains(state);
  const parsedOf = (tool: string): { found: boolean; detected: string | null } => {
    const pr = probes.get(tool);
    if (!pr || !pr.found) return { found: false, detected: null };
    return { found: true, detected: parseVersion(tool, pr.rawStdout, pr.rawStderr) };
  };

  const tools: ToolReport[] = [];
  for (const req of reqs) {
    if (req.container) continue; // container runtimes handled below (as an alternative pair)
    const { detected } = parsedOf(req.tool);
    const pin = req.pin ?? null;
    const status = compareToPin(detected, pin);
    tools.push({ tool: req.tool, role: req.role, status, detected, pin, guidance: guidanceFor(req.tool, status, detected, pin) });
  }

  const dockerFound = parsedOf('docker').found && parsedOf('docker').detected != null;
  const podmanFound = parsedOf('podman').found && parsedOf('podman').detected != null;
  const container = containerOffer(dockerFound, podmanFound);

  const present = tools.filter((t) => t.status === 'present').length;
  const missing = tools.filter((t) => t.status === 'missing').length;
  const mismatch = tools.filter((t) => t.status === 'mismatch').length;
  const canBuildNatively = tools.length > 0 && tools.every((t) => t.status === 'present');

  return {
    backend: state.phaseA.backend,
    tools,
    container,
    summary: {
      present,
      missing,
      mismatch,
      canBuildNatively,
      note:
        'Detection reports what THIS machine has — whether it CAN build the deterministically-generated project. ' +
        'It is not a guarantee the project builds/boots (that depends on more than toolchain presence).',
    },
  };
}

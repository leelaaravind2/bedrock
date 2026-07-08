/*
 * Thraksha — deterministic security scan wiring (Eco-Day 43).
 *
 * The FREE, CERTAIN, DETERMINISTIC security tier: Semgrep with a PINNED custom ruleset
 * (semgrep-rules.yml — shipped by Thraksha, NOT the floating `p/default` registry) + a
 * PINNED Semgrep version. Same project + pinned rules + pinned version → the same
 * findings (CERTAIN). NO AI, no key, no tokens (the AI scan is Day 45 — ADVISORY, separate).
 *
 * A gated `security` field (default 'none' = the literal bypass, mirroring cicd/designTokens):
 * when 'semgrep', buildFileSet emits a SEPARATE additive `.github/workflows/security.yml`
 * (so the 5 frozen Day-38 `ci.yml` baselines stay byte-identical — the scan is NOT a step in
 * ci.yml) + the pinned `semgrep-rules.yml`. This module is a PURE-NODE string projection: it
 * NEVER runs Semgrep (findings are a scan-time output, produced by CI or the in-app scan
 * action — Thraksha never runs the tool at generation time, so generation stays a pure
 * function of the blueprint). Semgrep is a TOOL / a generated-project-CI concern — never a
 * Thraksha dependency (deps {}). Determinism killers avoided: no timestamps, LF, stable order.
 */

/** Whether a deterministic security scan is wired. 'none' = no scan (the literal bypass). */
export type SecurityScan = 'none' | 'semgrep';

/** The optional security config a project opted into. Default = no scan (a literal bypass). */
export interface SecurityConfig {
  readonly scan: SecurityScan;
}

/** The default — no scan. A literal bypass that reproduces current output. */
export const defaultSecurityConfig: SecurityConfig = { scan: 'none' };

/**
 * The PINNED Semgrep version (a fixed pin — never floating/`@latest`). Same version +
 * same rules → reproducible findings. Bumping this is a deliberate, documented change.
 */
export const SEMGREP_VERSION = '1.90.0';

/**
 * The PINNED custom ruleset (semgrep-rules.yml) — a fixed, high-signal, deterministic set
 * Thraksha authors, NOT the changing `p/default` registry. `generic` mode + pattern-regex
 * makes the rules language-agnostic (JS/TS/Python/Go/Java) and robust; the deterministic
 * generated code (env-var secrets + parameterized queries) does not trip them — the scan
 * guards the DEVELOPER's additions. Findings are CERTAIN (deterministic static analysis).
 */
export const SEMGREP_RULES = [
  `# THRAKSHA-OWNED — pinned deterministic security rules. Do not edit.`,
  `# A FIXED, hashed custom ruleset (not a floating remote registry): same rules + same`,
  `# Semgrep version → the same findings (CERTAIN). No AI, no network, no key.`,
  `rules:`,
  `  - id: thraksha-hardcoded-secret`,
  `    message: >-`,
  `      Possible hardcoded secret/credential literal. Read secrets from the environment`,
  `      (env vars / a secrets manager) — never bake them into source.`,
  `    severity: ERROR`,
  `    languages: [generic]`,
  `    paths:`,
  `      exclude:`,
  `        - "*.md"`,
  `        - ".env.example"`,
  `        - "**/*.example"`,
  `    patterns:`,
  `      - pattern-regex: (?i)\\b(password|passwd|secret|api[_-]?key|access[_-]?key|token)\\b\\s*[:=]\\s*["'][^"'\\n]{8,}["']`,
  `      - pattern-not-regex: (?i)(process\\.env|os\\.environ|getenv|System\\.getenv|\\$\\{|__[A-Z_]+__)`,
  `  - id: thraksha-sql-string-concat`,
  `    message: >-`,
  `      SQL assembled by string concatenation/interpolation — use parameterized queries`,
  `      ($1/?/placeholders) to prevent SQL injection.`,
  `    severity: ERROR`,
  `    languages: [generic]`,
  `    patterns:`,
  `      - pattern-regex: (?i)(select|insert\\s+into|update|delete)\\s+[^;\\n]*?(\\+\\s*["']|\\+\\s*\\w+|%\\s*\\(|\\$\\{|f["'])`,
  `  - id: thraksha-dangerous-exec`,
  `    message: >-`,
  `      Dynamic execution (eval/exec/os.system/child_process/Runtime.exec) — never execute`,
  `      untrusted input.`,
  `    severity: WARNING`,
  `    languages: [generic]`,
  `    patterns:`,
  `      - pattern-regex: (?i)\\b(eval|exec|os\\.system|subprocess\\.(call|run|Popen)|child_process\\.exec|Runtime\\.getRuntime\\(\\)\\.exec)\\s*\\(`,
  `  - id: thraksha-weak-random`,
  `    message: >-`,
  `      Weak randomness for a security-sensitive value — use a CSPRNG (crypto.randomBytes /`,
  `      secrets / java.security.SecureRandom / crypto/rand).`,
  `    severity: WARNING`,
  `    languages: [generic]`,
  `    patterns:`,
  `      - pattern-regex: (?i)(Math\\.random\\s*\\(|random\\.random\\s*\\(|rand\\.Intn\\s*\\(|new\\s+Random\\s*\\()`,
  ``,
].join('\n');

/** The pinned actions the security workflow uses (a fixed subset — never floating). */
const CHECKOUT = 'actions/checkout@v4';
const SETUP_PYTHON = 'actions/setup-python@v5';
const RUNNER = 'ubuntu-latest';

/**
 * The deterministic Semgrep CI workflow (`.github/workflows/security.yml`) — SEPARATE from
 * the Day-38 `ci.yml` (so those 5 baselines never move). Pins the actions + the Semgrep
 * version + runs the shipped pinned rules; `--error` fails CI on a finding (the gate);
 * findings → `semgrep-findings.json` (a scan-time CERTAIN output). No timestamps, no floating.
 */
function renderSecurityWorkflow(): string {
  return [
    `# THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `# Deterministic security scan: pinned Semgrep version + pinned custom rules`,
    `# (semgrep-rules.yml). CERTAIN findings; no AI, no key, no tokens. Separate from ci.yml.`,
    `name: security`,
    ``,
    `on:`,
    `  push:`,
    `  pull_request:`,
    ``,
    `jobs:`,
    `  semgrep:`,
    `    runs-on: ${RUNNER}`,
    `    steps:`,
    `      - name: Checkout`,
    `        uses: ${CHECKOUT}`,
    `      - name: Set up python`,
    `        uses: ${SETUP_PYTHON}`,
    `        with:`,
    `          python-version: '3.12'`,
    `      - name: Install Semgrep (pinned)`,
    `        run: pip install semgrep==${SEMGREP_VERSION}`,
    `      - name: Run Semgrep (pinned custom rules — deterministic, CERTAIN findings)`,
    `        run: semgrep --config semgrep-rules.yml --error --json --output semgrep-findings.json .`,
    ``,
  ].join('\n');
}

/**
 * The gated security artifacts, or [] for the default ('none' — the literal bypass, so
 * buildFileSet emits nothing and the frozen backstop is byte-identical). PURE string
 * projection — never runs Semgrep. When 'semgrep': the pinned rules + a SEPARATE additive
 * security.yml (the Day-38 ci.yml is untouched).
 */
export function renderSecurityArtifacts(config: SecurityConfig): { relPath: string; content: string }[] {
  if (config.scan === 'none') return [];
  if (config.scan === 'semgrep') {
    return [
      { relPath: 'semgrep-rules.yml', content: SEMGREP_RULES },
      { relPath: '.github/workflows/security.yml', content: renderSecurityWorkflow() },
    ];
  }
  return [];
}

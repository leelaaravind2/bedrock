// Thraksha desktop shell (ships as "Bedrock") — the front-end THIN CLIENT (Eco-Day 55).
//
// It CALLS the 5 Day-52 Tauri commands via the GLOBAL window.__TAURI__.core.invoke
// (tauri.conf.json has withGlobalTauri: true, and there is NO bundler — frontendDist is
// raw ../src — so we use the injected global, NOT an `import` from @tauri-apps/api) and
// RENDERS the Day-53 SidecarResult. It is a THIN CLIENT: no generation logic in JS, no
// parsing/transforming of generator output — stdout is rendered VERBATIM. The certified
// generator (invoked through the thin-invoker commands) is the only source of truth.
//
// The Day-53 SidecarResult contract { stdout, stderr, exit_code } (snake_case on the wire —
// the Rust struct has no rename_all, so JS reads result.exit_code):
//   - a REJECTED promise  → an ENVIRONMENT failure ONLY (sidecar missing/broken). NOT a finding.
//   - a RESOLVED value    → a COMPLETED run as DATA; read exit_code:
//       * 0            → clean / success (stdout shown).
//       * 1 on a scan  → CERTAIN findings — rendered AS RESULTS, never an error (gap #6's point).
//       * other ≠ 0    → informational (e.g. export usage exit 2) — stdout + stderr shown.
//
// Command-arg casing: the commands carry no #[command(rename_all)], so Tauri v2's default
// (rename_all = "camelCase") applies — JS passes camelCase keys (targetDir, projectDir),
// mapped to the Rust snake_case params. Empty optional fields are OMITTED so the command
// takes its literal-bypass demo path (Day-52), not an empty-string arg.

function tauriInvoke() {
  const t = window.__TAURI__;
  if (t && t.core && typeof t.core.invoke === 'function') return t.core.invoke;
  return null; // running outside the Tauri WebView (e.g. a plain browser) — no backend.
}

function setOutput(kind, title, body) {
  const out = document.getElementById('output');
  out.className = kind;
  out.textContent = `[${title}]\n\n${body && body.length ? body : '(no output)'}`;
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

// Read an optional input by element id; '' / whitespace ⇒ undefined (the key is dropped
// from the invoke payload, so the Rust Option is None ⇒ the command's demo bypass).
function optValue(id) {
  if (!id) return undefined;
  const el = document.getElementById(id);
  if (!el) return undefined;
  const v = el.value.trim();
  return v === '' ? undefined : v;
}

// Build the invoke args object from a button's data-* attributes. camelCase keys per the
// Tauri v2 default. Required fields (targetDir, projectDir) are validated by the caller.
function buildArgs(btn) {
  const args = {};
  if (btn.dataset.targetdir)  args.targetDir  = optValue(btn.dataset.targetdir);
  if (btn.dataset.projectdir) args.projectDir = optValue(btn.dataset.projectdir);
  if (btn.dataset.backend)    args.backend    = optValue(btn.dataset.backend);
  if (btn.dataset.model)      args.model      = optValue(btn.dataset.model);
  // Drop undefined keys so omitted optionals become Rust None (the literal bypass).
  for (const k of Object.keys(args)) if (args[k] === undefined) delete args[k];
  return args;
}

async function runCommand(btn) {
  const cmd = btn.dataset.cmd;
  const invoke = tauriInvoke();
  if (!invoke) {
    setStatus('not running inside Bedrock');
    setOutput('env-error', 'no Tauri backend',
      'window.__TAURI__.core.invoke is unavailable — this page is not running inside the Bedrock WebView, so no command can be invoked.');
    return;
  }

  const args = buildArgs(btn);

  // Required-field guards (the command would error, but a clear UI message is friendlier).
  if (cmd === 'export_project' && !args.targetDir) {
    setStatus('export: missing target directory');
    setOutput('info', 'export — input needed', 'Enter a target directory before running export.');
    return;
  }
  if (cmd === 'scan_project' && !args.projectDir) {
    setStatus('scan: missing project directory');
    setOutput('info', 'scan — input needed', 'Enter a project directory before running the scan.');
    return;
  }

  setStatus(`running ${cmd}…`);
  try {
    // Resolves for ANY completed run (Day-53). Rejects ONLY on a spawn/environment failure.
    const r = await invoke(cmd, args);
    const code = r.exit_code;
    setStatus(`${cmd}: completed (exit ${code})`);

    if (code === 0) {
      setOutput('clean', `${cmd} — OK (exit 0)`, r.stdout);
    } else if (code === 1 && cmd === 'scan_project') {
      // The deterministic gate WORKING: CERTAIN findings on stdout. Results, NOT an error.
      setOutput('findings', `${cmd} — CERTAIN findings (exit 1) · review required`,
        r.stdout && r.stdout.length ? r.stdout : r.stderr);
    } else {
      // Other completed non-zero (e.g. export usage exit 2) — informational, not a crash.
      const body = [r.stdout, r.stderr].filter((s) => s && s.length).join('\n---\n');
      setOutput('info', `${cmd} — completed (exit ${code})`, body);
    }
  } catch (err) {
    // A rejected promise = an ENVIRONMENT problem ONLY (Day-53: Err is spawn/env failure).
    setStatus(`${cmd}: environment error`);
    setOutput('env-error', `${cmd} — environment problem (sidecar missing/broken)`, String(err));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  for (const btn of document.querySelectorAll('button[data-cmd]')) {
    btn.addEventListener('click', () => runCommand(btn));
  }
  if (!tauriInvoke()) {
    setStatus('note: Tauri backend not detected (open inside Bedrock to run commands).');
  }
});

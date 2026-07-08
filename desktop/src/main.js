// Bedrock desktop shell — the front-end THIN CLIENT (Eco-Day 55; wizard Eco-Day 61).
//
// A GUIDED WIZARD collects BlueprintChoices and drives the EXISTING export_project command
// (via the certified --model path → readModelArg → assembleBlueprint, the Day-16 seam). It
// is a THIN CLIENT: no generation logic in JS. buildBlueprintChoices (wizard-choices.mjs)
// is a pure field→JSON serializer; the certified Node engine does all generation.
//
// No bundler (frontendDist is raw ../src) → the global window.__TAURI__.core.invoke, NOT an
// npm import. This file is an ES module so it can import the pure serializer that Node also
// imports for the headless UI==CLI proof. Invoke args are camelCase (Tauri v2 default).
//
// SidecarResult (Day 53) { stdout, stderr, exit_code }: a rejected promise = an environment
// failure ONLY; a resolved value = a completed run as DATA (exit_code 0 = clean; 1 on a scan
// = CERTAIN findings, results not an error; other = informational).

import { buildBlueprintChoices, TEMPLATES, STEPS } from './wizard-choices.js';

function tauriInvoke() {
  const t = window.__TAURI__;
  if (t && t.core && typeof t.core.invoke === 'function') return t.core.invoke;
  return null; // outside the Tauri WebView (e.g. a plain browser) — no backend.
}

function setOutput(kind, title, body) {
  const out = document.getElementById('output');
  out.className = kind;
  out.textContent = `[${title}]\n\n${body && body.length ? body : '(no output)'}`;
}
function setStatus(text) { document.getElementById('status').textContent = text; }

// ─── The wizard ────────────────────────────────────────────────────────────────────────
// The collected selections (defaults = the Blank template's values; edited step by step).
const selections = { ...TEMPLATES[0].sel };
let stepIndex = 0; // 0..STEPS.length-1 are field steps; STEPS.length is the Review step.

function applyTemplate(sel) {
  Object.assign(selections, sel);
  stepIndex = 0;
  renderStep();
  setStatus(`Template loaded: ${selections.projectName} (${selections.projectType} · ${selections.backend}). Edit any step, then Generate.`);
}

function renderStep() {
  const body = document.getElementById('wizard-body');
  const back = document.getElementById('wizard-back');
  const next = document.getElementById('wizard-next');
  const progress = document.getElementById('wizard-progress');
  const onReview = stepIndex >= STEPS.length;

  back.disabled = stepIndex === 0;
  progress.textContent = onReview
    ? `Review — step ${STEPS.length + 1} of ${STEPS.length + 1}`
    : `Step ${stepIndex + 1} of ${STEPS.length + 1}: ${STEPS[stepIndex].label}`;

  if (!onReview) {
    next.textContent = 'Next';
    const step = STEPS[stepIndex];
    const cur = selections[step.id];
    if (step.kind === 'text') {
      body.innerHTML = `<label>${step.label}</label><input id="field" value="${escapeAttr(cur)}" />`;
    } else {
      const opts = step.options.map((o) => `<option value="${escapeAttr(o)}"${o === cur ? ' selected' : ''}>${escapeHtml(o)}</option>`).join('');
      body.innerHTML = `<label>${step.label}</label><select id="field">${opts}</select>`;
    }
    return;
  }

  // Review step: the assembled BlueprintChoices + a target-dir + Generate.
  next.textContent = 'Generate ▸';
  const choices = buildBlueprintChoices(selections);
  const rows = Object.entries(choices.settings)
    .map(([k, v]) => `<div class="review-row"><span>${escapeHtml(k)}</span><span>${escapeHtml(String(v))}</span></div>`)
    .join('');
  body.innerHTML =
    rows +
    `<pre class="choices" id="choices-json">${escapeHtml(JSON.stringify(choices, null, 2))}</pre>` +
    `<label>Export to folder</label><input id="target-dir" placeholder="C:\\path\\to\\output" />` +
    `<p style="font-size:0.72rem;opacity:0.6;margin:0.4rem 0 0">Settings-only project shell (entities & fields arrive next). Generation is deterministic — same choices, same code.</p>`;
}

function captureCurrentStep() {
  if (stepIndex >= STEPS.length) return;
  const el = document.getElementById('field');
  if (!el) return;
  const step = STEPS[stepIndex];
  let v = el.value;
  if (step.id === 'projectName') v = v.trim() || 'MyApp';
  selections[step.id] = v;
}

async function generate() {
  const invoke = tauriInvoke();
  const dir = (document.getElementById('target-dir') || {}).value;
  const targetDir = dir ? dir.trim() : '';
  if (!targetDir) { setStatus('Enter an export folder before generating.'); return; }
  const choices = buildBlueprintChoices(selections);
  if (!invoke) {
    setStatus('not running inside Bedrock');
    setOutput('env-error', 'no Tauri backend',
      'window.__TAURI__.core.invoke is unavailable — open inside the Bedrock window to generate. (The assembled BlueprintChoices is shown above.)');
    return;
  }
  setStatus(`Generating ${selections.projectName}…`);
  try {
    // The wizard is just another producer of --model: the SAME certified export path.
    const r = await invoke('export_project', { targetDir, model: JSON.stringify(choices) });
    renderResult('export_project', r);
  } catch (err) {
    setStatus('export: environment error');
    setOutput('env-error', 'export_project — environment problem (sidecar missing/broken)', String(err));
  }
}

function wizardNext() {
  captureCurrentStep();
  if (stepIndex >= STEPS.length) { generate(); return; }
  stepIndex += 1;
  renderStep();
}
function wizardBack() {
  captureCurrentStep();
  if (stepIndex > 0) stepIndex -= 1;
  renderStep();
}

// ─── The Advanced harness (raw commands — unchanged behavior) ────────────────────────────
function optValue(id) {
  if (!id) return undefined;
  const el = document.getElementById(id);
  if (!el) return undefined;
  const v = el.value.trim();
  return v === '' ? undefined : v;
}
function buildArgs(btn) {
  const args = {};
  if (btn.dataset.targetdir)  args.targetDir  = optValue(btn.dataset.targetdir);
  if (btn.dataset.projectdir) args.projectDir = optValue(btn.dataset.projectdir);
  if (btn.dataset.backend)    args.backend    = optValue(btn.dataset.backend);
  if (btn.dataset.model)      args.model      = optValue(btn.dataset.model);
  for (const k of Object.keys(args)) if (args[k] === undefined) delete args[k];
  return args;
}
function renderResult(cmd, r) {
  const code = r.exit_code;
  setStatus(`${cmd}: completed (exit ${code})`);
  if (code === 0) {
    setOutput('clean', `${cmd} — OK (exit 0)`, r.stdout);
  } else if (code === 1 && cmd === 'scan_project') {
    setOutput('findings', `${cmd} — CERTAIN findings (exit 1) · review required`, r.stdout && r.stdout.length ? r.stdout : r.stderr);
  } else {
    const body = [r.stdout, r.stderr].filter((s) => s && s.length).join('\n---\n');
    setOutput('info', `${cmd} — completed (exit ${code})`, body);
  }
}
async function runCommand(btn) {
  const cmd = btn.dataset.cmd;
  const invoke = tauriInvoke();
  if (!invoke) {
    setStatus('not running inside Bedrock');
    setOutput('env-error', 'no Tauri backend', 'window.__TAURI__.core.invoke is unavailable — open inside the Bedrock WebView to run commands.');
    return;
  }
  const args = buildArgs(btn);
  if (cmd === 'export_project' && !args.targetDir) { setStatus('export: missing target directory'); setOutput('info', 'export — input needed', 'Enter a target directory.'); return; }
  if (cmd === 'scan_project' && !args.projectDir) { setStatus('scan: missing project directory'); setOutput('info', 'scan — input needed', 'Enter a project directory.'); return; }
  setStatus(`running ${cmd}…`);
  try {
    const r = await invoke(cmd, args);
    renderResult(cmd, r);
  } catch (err) {
    setStatus(`${cmd}: environment error`);
    setOutput('env-error', `${cmd} — environment problem (sidecar missing/broken)`, String(err));
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function escapeAttr(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ─── init ────────────────────────────────────────────────────────────────────────────────
function init() {
  // Templates
  const tpl = document.getElementById('templates');
  for (const t of TEMPLATES) {
    const b = document.createElement('button');
    b.className = 'ghost';
    b.textContent = t.label;
    b.addEventListener('click', () => applyTemplate(t.sel));
    tpl.appendChild(b);
  }
  // Wizard nav
  document.getElementById('wizard-next').addEventListener('click', wizardNext);
  document.getElementById('wizard-back').addEventListener('click', wizardBack);
  renderStep();
  // Advanced harness
  for (const btn of document.querySelectorAll('button[data-cmd]')) {
    btn.addEventListener('click', () => runCommand(btn));
  }
  if (!tauriInvoke()) {
    setStatus('note: Tauri backend not detected (open inside Bedrock to generate). The wizard + the assembled BlueprintChoices still work.');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

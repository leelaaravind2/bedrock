// Bedrock desktop shell — the front-end THIN CLIENT (Eco-Day 55; wizard 61; data model 62).
//
// A GUIDED WIZARD collects BlueprintChoices — settings (Day 61) + entities/fields/relationships
// (Day 62) — and drives the EXISTING export_project command (via the certified --model path →
// readModelArg → assembleBlueprint, the Day-16 seam). THIN CLIENT: no generation logic in JS.
// buildBlueprintChoices (wizard-choices.js) is a pure field→JSON serializer; the certified Node
// engine does all generation. has-many is collected EXPLICITLY (never inferred).
//
// No bundler → the global window.__TAURI__.core.invoke, NOT an npm import. ES module so Node can
// import the pure serializer for the headless UI==CLI proof. Invoke args camelCase (Tauri v2).
// SidecarResult (Day 53) { stdout, stderr, exit_code }: rejected = env failure ONLY; resolved =
// a completed run as DATA (0 = clean; 1 on a scan = findings; other = informational).

import {
  buildBlueprintChoices, choicesToSelections, TEMPLATES, STEPS, FIELD_TYPES, RELATIONSHIP_KINDS,
  newEntity, newField, newRelationship, TEAMTRACKER_EXAMPLE,
} from './wizard-choices.js';

function tauriInvoke() {
  const t = window.__TAURI__;
  if (t && t.core && typeof t.core.invoke === 'function') return t.core.invoke;
  return null;
}
function setOutput(kind, title, body) {
  const out = document.getElementById('output');
  out.className = kind;
  out.textContent = `[${title}]\n\n${body && body.length ? body : '(no output)'}`;
}
function setStatus(text) { document.getElementById('status').textContent = text; }

// ─── tiny DOM helpers (programmatic — for the dynamic data-model editor) ───────────────────
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v != null) e.setAttribute(k, v);
  }
  for (const kid of kids) { if (kid == null) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return e;
}
function input(value, onInput, placeholder, mode) {
  const i = h('input', { placeholder: placeholder || '', oninput: (ev) => onInput(ev.target.value) });
  i.value = value == null ? '' : value;
  if (mode === 'num') i.type = 'number';
  return i;
}
function select(options, value, onChange) {
  const s = h('select', { onchange: (ev) => onChange(ev.target.value) });
  for (const o of options) { const opt = h('option', { value: o }, o); if (o === value) opt.selected = true; s.appendChild(opt); }
  return s;
}
function checkbox(label, checked, onChange) {
  const c = h('input', { type: 'checkbox', onchange: (ev) => onChange(ev.target.checked) });
  c.checked = !!checked;
  return h('label', { class: 'chk' }, c, ' ' + label);
}

// ─── wizard state + flow ───────────────────────────────────────────────────────────────────
const selections = { ...TEMPLATES[0].sel, entities: [] };
let stepIndex = 0;
const DATA_STEP = STEPS.length;       // the data-model step
const REVIEW_STEP = STEPS.length + 1; // the review step
const TOTAL = STEPS.length + 2;

function applyTemplate(sel) {
  Object.assign(selections, sel);     // settings only; entities untouched
  stepIndex = 0; renderStep();
  setStatus(`Template loaded: ${selections.projectName} (${selections.projectType} · ${selections.backend}). Edit any step, then Generate.`);
}
function loadTeamTracker() {
  Object.assign(selections, JSON.parse(JSON.stringify(TEAMTRACKER_EXAMPLE.settings)));
  selections.entities = JSON.parse(JSON.stringify(TEAMTRACKER_EXAMPLE.entities));
  renderDataModel();
  setStatus('Loaded TeamTracker example (4 related entities). Review, then Generate.');
}

function renderStep() {
  const back = document.getElementById('wizard-back');
  const next = document.getElementById('wizard-next');
  const progress = document.getElementById('wizard-progress');
  back.disabled = stepIndex === 0;
  if (stepIndex < STEPS.length) {
    next.textContent = 'Next';
    progress.textContent = `Step ${stepIndex + 1} of ${TOTAL}: ${STEPS[stepIndex].label}`;
    renderSettingsStep();
  } else if (stepIndex === DATA_STEP) {
    next.textContent = 'Next';
    progress.textContent = `Step ${DATA_STEP + 1} of ${TOTAL}: Data model`;
    renderDataModel();
  } else {
    next.textContent = 'Generate ▸';
    progress.textContent = `Review — step ${TOTAL} of ${TOTAL}`;
    renderReview();
  }
}

function renderSettingsStep() {
  const body = document.getElementById('wizard-body');
  const step = STEPS[stepIndex];
  const cur = selections[step.id];
  if (step.kind === 'text') {
    body.innerHTML = `<label>${step.label}</label>`;
    body.appendChild(input(cur, (v) => { selections[step.id] = v; }, step.label));
  } else {
    body.innerHTML = `<label>${step.label}</label>`;
    body.appendChild(select(step.options, cur, (v) => { selections[step.id] = v; }));
  }
}

// The dynamic data-model editor: add/remove entities → fields → relationships.
function targetOptions(ei, kind) {
  const names = selections.entities.map((e) => e.name);
  // belongs-to: an EARLIER entity (the engine enforces this). has-many: any OTHER entity.
  return kind === 'belongs-to' ? names.slice(0, ei) : names.filter((_, i) => i !== ei);
}
function fieldRow(ent, f, fi) {
  const row = h('div', { class: 'row-inline' });
  row.append(input(f.name, (v) => { f.name = v; }, 'name'));
  row.append(select(FIELD_TYPES, f.type, (v) => { f.type = v; renderDataModel(); }));
  row.append(checkbox('req', f.required, (v) => { f.required = v; }));
  row.append(checkbox('uniq', f.unique, (v) => { f.unique = v; }));
  if (f.type === 'Decimal') {
    row.append(input(f.precision, (v) => { f.precision = v; }, 'precision (19)', 'num'));
    row.append(input(f.scale, (v) => { f.scale = v; }, 'scale (4)', 'num'));
  }
  row.append(h('button', { class: 'ghost danger', onclick: () => { ent.fields.splice(fi, 1); renderDataModel(); } }, '✕'));
  return row;
}
function relRow(ent, ei, r, ri) {
  const row = h('div', { class: 'row-inline' });
  row.append(select(RELATIONSHIP_KINDS, r.kind, (v) => { r.kind = v; r.target = targetOptions(ei, v)[0] || ''; renderDataModel(); }));
  const opts = targetOptions(ei, r.kind);
  row.append(select(opts.length ? opts : ['—'], r.target || opts[0] || '—', (v) => { r.target = v; }));
  row.append(h('button', { class: 'ghost danger', onclick: () => { ent.relationships.splice(ri, 1); renderDataModel(); } }, '✕'));
  return row;
}
function entityCard(ent, ei) {
  const card = h('div', { class: 'entity-card' });
  const head = h('div', { class: 'row-inline' });
  head.append(input(ent.name, (v) => { ent.name = v; }, 'Entity name'));
  head.append(h('button', { class: 'ghost danger', onclick: () => { selections.entities.splice(ei, 1); renderDataModel(); } }, 'remove entity'));
  card.append(head);
  card.append(h('div', { class: 'sub' }, 'Fields'));
  ent.fields.forEach((f, fi) => card.append(fieldRow(ent, f, fi)));
  card.append(h('button', { class: 'ghost', onclick: () => { ent.fields.push(newField()); renderDataModel(); } }, '+ field'));
  card.append(h('div', { class: 'sub' }, 'Relationships'));
  ent.relationships.forEach((r, ri) => card.append(relRow(ent, ei, r, ri)));
  card.append(h('button', { class: 'ghost', onclick: () => {
    const t = targetOptions(ei, 'belongs-to'); ent.relationships.push(newRelationship(t[t.length - 1] || '')); renderDataModel();
  } }, '+ relationship'));
  return card;
}
function renderDataModel() {
  const body = document.getElementById('wizard-body');
  body.textContent = '';
  const wrap = h('div');
  wrap.append(h('button', { class: 'ghost', onclick: loadTeamTracker }, 'Load TeamTracker example'));
  wrap.append(h('p', { class: 'hint' }, 'Add entities, fields (name + type), and relationships. belongs-to targets must be an earlier entity (the engine enforces this). has-many is explicit — never auto-added.'));
  selections.entities.forEach((ent, ei) => wrap.append(entityCard(ent, ei)));
  wrap.append(h('button', { onclick: () => { selections.entities.push(newEntity('Entity' + (selections.entities.length + 1))); renderDataModel(); } }, '+ Add entity'));
  if (selections.entities.length === 0) wrap.append(h('p', { class: 'hint' }, 'No entities yet — a settings-only project shell. Add entities to define your data model.'));
  body.append(wrap);
}

function renderReview() {
  const body = document.getElementById('wizard-body');
  const choices = buildBlueprintChoices(selections);
  const rows = Object.entries(choices.settings)
    .map(([k, v]) => `<div class="review-row"><span>${escapeHtml(k)}</span><span>${escapeHtml(String(v))}</span></div>`).join('');
  const nEnt = choices.entities ? choices.entities.length : 0;
  body.innerHTML =
    rows +
    `<div class="review-row"><span>entities</span><span>${nEnt}</span></div>` +
    `<pre class="choices" id="choices-json">${escapeHtml(JSON.stringify(choices, null, 2))}</pre>` +
    `<button id="save-project">Save project</button> ` +
    `<label>Export to folder</label><input id="target-dir" placeholder="C:\\path\\to\\output" />` +
    `<p class="hint">Generation is deterministic — same choices, same code.${nEnt === 0 ? ' (Settings-only shell — add entities in the Data model step for a full app.)' : ''}</p>`;
  document.getElementById('save-project').addEventListener('click', saveProject);
}

// ─── the blueprint store (Eco-Day 63) — save / list / load; thin client over the commands ──
async function saveProject() {
  const invoke = tauriInvoke();
  const choices = buildBlueprintChoices(selections);
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'Open inside the Bedrock window to save. (The assembled BlueprintChoices is shown above.)'); return; }
  setStatus(`Saving ${selections.projectName}…`);
  try {
    const id = await invoke('save_blueprint', { name: selections.projectName, modelJson: JSON.stringify(choices) });
    setStatus(`Saved "${selections.projectName}" as #${id}.`);
    setOutput('clean', 'Saved', `Project "${selections.projectName}" persisted to your local store (id #${id}).`);
    refreshProjects();
  } catch (err) { setStatus('save: storage error'); setOutput('env-error', 'save_blueprint — storage error', String(err)); }
}
async function refreshProjects() {
  const invoke = tauriInvoke();
  const list = document.getElementById('projects-list');
  if (!list) return;
  if (!invoke) { list.innerHTML = '<span class="empty">(open inside Bedrock to see saved projects)</span>'; return; }
  try {
    const rows = await invoke('list_blueprints');
    list.textContent = '';
    if (!rows.length) { list.innerHTML = '<span class="empty">(no saved projects yet)</span>'; return; }
    for (const r of rows) list.append(h('button', { class: 'ghost project-item', onclick: () => loadProject(r.id) }, `${r.name} · #${r.id} · ${r.created_at}`));
  } catch (err) { list.innerHTML = `<span class="empty">list error: ${escapeHtml(String(err))}</span>`; }
}
async function loadProject(id) {
  const invoke = tauriInvoke();
  if (!invoke) return;
  try {
    const json = await invoke('load_blueprint', { id });
    Object.assign(selections, choicesToSelections(JSON.parse(json)));
    stepIndex = REVIEW_STEP; renderStep();
    setStatus(`Loaded "${selections.projectName}" (#${id}). Review or edit, then Generate / Save.`);
  } catch (err) { setStatus('load: storage error'); setOutput('env-error', 'load_blueprint — storage error', String(err)); }
}

function captureCurrentStep() {
  if (stepIndex >= STEPS.length) return; // data-model + review write to the model live
  const el = document.querySelector('#wizard-body input, #wizard-body select');
  if (!el) return;
  const step = STEPS[stepIndex];
  let v = el.value;
  if (step.id === 'projectName') v = v.trim() || 'MyApp';
  selections[step.id] = v;
}
async function generate() {
  const invoke = tauriInvoke();
  const dirEl = document.getElementById('target-dir');
  const targetDir = dirEl ? dirEl.value.trim() : '';
  if (!targetDir) { setStatus('Enter an export folder before generating.'); return; }
  const choices = buildBlueprintChoices(selections);
  if (!invoke) {
    setStatus('not running inside Bedrock');
    setOutput('env-error', 'no Tauri backend', 'window.__TAURI__.core.invoke is unavailable — open inside the Bedrock window to generate. (The assembled BlueprintChoices is shown above.)');
    return;
  }
  setStatus(`Generating ${selections.projectName}…`);
  try {
    const r = await invoke('export_project', { targetDir, model: JSON.stringify(choices) });
    renderResult('export_project', r);
  } catch (err) {
    setStatus('export: environment error');
    setOutput('env-error', 'export_project — environment problem (sidecar missing/broken)', String(err));
  }
}
function wizardNext() { captureCurrentStep(); if (stepIndex >= REVIEW_STEP) { generate(); return; } stepIndex += 1; renderStep(); }
function wizardBack() { captureCurrentStep(); if (stepIndex > 0) stepIndex -= 1; renderStep(); }

// ─── the Advanced harness (raw commands — unchanged) ────────────────────────────────────────
function optValue(id) { const el = id && document.getElementById(id); const v = el ? el.value.trim() : ''; return v === '' ? undefined : v; }
function buildArgs(btn) {
  const args = {};
  if (btn.dataset.targetdir) args.targetDir = optValue(btn.dataset.targetdir);
  if (btn.dataset.projectdir) args.projectDir = optValue(btn.dataset.projectdir);
  if (btn.dataset.backend) args.backend = optValue(btn.dataset.backend);
  if (btn.dataset.model) args.model = optValue(btn.dataset.model);
  for (const k of Object.keys(args)) if (args[k] === undefined) delete args[k];
  return args;
}
function renderResult(cmd, r) {
  const code = r.exit_code;
  setStatus(`${cmd}: completed (exit ${code})`);
  if (code === 0) setOutput('clean', `${cmd} — OK (exit 0)`, r.stdout);
  else if (code === 1 && cmd === 'scan_project') setOutput('findings', `${cmd} — CERTAIN findings (exit 1) · review required`, r.stdout && r.stdout.length ? r.stdout : r.stderr);
  else setOutput('info', `${cmd} — completed (exit ${code})`, [r.stdout, r.stderr].filter((s) => s && s.length).join('\n---\n'));
}
async function runCommand(btn) {
  const cmd = btn.dataset.cmd;
  const invoke = tauriInvoke();
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'window.__TAURI__.core.invoke is unavailable — open inside the Bedrock WebView to run commands.'); return; }
  const args = buildArgs(btn);
  if (cmd === 'export_project' && !args.targetDir) { setStatus('export: missing target directory'); setOutput('info', 'export — input needed', 'Enter a target directory.'); return; }
  if (cmd === 'scan_project' && !args.projectDir) { setStatus('scan: missing project directory'); setOutput('info', 'scan — input needed', 'Enter a project directory.'); return; }
  setStatus(`running ${cmd}…`);
  try { renderResult(cmd, await invoke(cmd, args)); }
  catch (err) { setStatus(`${cmd}: environment error`); setOutput('env-error', `${cmd} — environment problem (sidecar missing/broken)`, String(err)); }
}

function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

// ─── init ────────────────────────────────────────────────────────────────────────────────
function init() {
  const tpl = document.getElementById('templates');
  for (const t of TEMPLATES) {
    const b = h('button', { class: 'ghost', onclick: () => applyTemplate(t.sel) }, t.label);
    tpl.appendChild(b);
  }
  document.getElementById('wizard-next').addEventListener('click', wizardNext);
  document.getElementById('wizard-back').addEventListener('click', wizardBack);
  renderStep();
  document.getElementById('projects-refresh').addEventListener('click', refreshProjects);
  refreshProjects();
  for (const btn of document.querySelectorAll('button[data-cmd]')) btn.addEventListener('click', () => runCommand(btn));
  if (!tauriInvoke()) setStatus('note: Tauri backend not detected (open inside Bedrock to generate). The wizard + the assembled BlueprintChoices still work.');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

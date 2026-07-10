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
// setOutput(kind, title, body, rawDetail?) — the human message goes in #output; the RAW engine
// text (a stack, stderr, the full stdout) goes into an expandable <details> that is ALWAYS
// reachable when it exists (friendly ≠ hiding — never swallowed, never the primary UI). The
// standalone-export note is shown ONLY by the export path, so hide it on every other output.
function setOutput(kind, title, body, rawDetail) {
  const out = document.getElementById('output');
  out.className = kind;
  out.textContent = `[${title}]\n\n${body && body.length ? body : '(no output)'}`;
  const details = document.getElementById('output-details');
  const rawPre = document.getElementById('output-raw');
  if (details && rawPre) {
    if (rawDetail != null && String(rawDetail).length) {
      rawPre.textContent = String(rawDetail);
      details.hidden = false;
      details.open = false; // collapsed by default — reachable, not shouting
    } else {
      rawPre.textContent = '';
      details.hidden = true;
    }
  }
  const note = document.getElementById('export-note');
  if (note) note.hidden = true;
}
function setStatus(text) { document.getElementById('status').textContent = text; }

// A rejected invoke promise = an ENVIRONMENT failure ONLY (Day-53 SidecarResult contract): the
// sidecar is missing or couldn't run. We say exactly that — no diagnosis of engine internals — and
// keep the raw error String(err) in the expandable detail.
function setEnvError(status, title, friendly, err) {
  setStatus(status);
  setOutput('env-error', title, friendly, err == null ? undefined : String(err));
}

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
    setBaseline(choices, `#${id} (saved)`); // the just-saved blueprint becomes the impact "current"
    refreshProjects();
    refreshCompareSelects(); // a newly-saved project becomes available to compare
  } catch (err) { setEnvError('save: storage error', "Couldn't save your project", 'A local-store (SQLite) error occurred while saving. Your wizard input is intact. The technical detail is below.', err); }
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
    const choices = JSON.parse(json);
    Object.assign(selections, choicesToSelections(choices));
    setBaseline(choices, `#${id} (loaded)`); // the loaded blueprint is the impact "current"
    stepIndex = REVIEW_STEP; renderStep();
    showScreen('wizard'); // the loaded project opens in the wizard at review (Eco-Day 71 routing)
    setStatus(`Loaded "${selections.projectName}" (#${id}). Edit it, then Preview impact to see exactly what changes.`);
  } catch (err) { setEnvError('load: storage error', "Couldn't load that project", 'A local-store (SQLite) error occurred while loading. The technical detail is below.', err); }
}

// ─── Welcome → "Open a saved project" (Eco-Day 71) — the LIVE saved-blueprint list ─────────
// A thin client over the Day-63 store (list_blueprints → load_blueprint, both certified and
// already called from the workspace). "Open a saved project" = open a STORED blueprint, NOT
// open-from-folder (that is a later build day). Each item loads its blueprint into the wizard.
async function openExisting() {
  const invoke = tauriInvoke();
  const list = document.getElementById('welcome-projects');
  if (!list) return;
  list.hidden = false;
  if (!invoke) { list.innerHTML = '<span class="empty">(open inside Bedrock to see saved projects)</span>'; return; }
  try {
    const rows = await invoke('list_blueprints');
    list.textContent = '';
    if (!rows.length) { list.innerHTML = '<span class="empty">(no saved projects yet — Create a new project to get started)</span>'; return; }
    for (const r of rows) list.append(h('button', { class: 'ghost project-item', onclick: () => loadProject(r.id) }, `${r.name} · #${r.id} · ${r.created_at}`));
  } catch (err) { list.innerHTML = `<span class="empty">list error: ${escapeHtml(String(err))}</span>`; }
}

// ─── the linked project view (Eco-Day 64) — maps + impact on the user's OWN blueprint ──────
// baselineChoices = the last SAVED or LOADED blueprint (the impact "current"); NEVER fabricated.
let baselineChoices = null;
let baselineLabel = '';

function setBaseline(choices, label) {
  baselineChoices = JSON.parse(JSON.stringify(choices)); // a snapshot, immune to later wizard edits
  baselineLabel = label;
  renderProjectView();
}
function renderProjectView() {
  const el = document.getElementById('baseline-label');
  if (!el) return;
  el.textContent = baselineChoices
    ? `Impact compares your edits against baseline ${baselineLabel}. Change the data model, then Preview impact.`
    : 'No saved baseline yet — Save or load a project, then your edits can be previewed against it.';
}

// View the DRAWN diagram of the current wizard blueprint (Eco-Day 65). The certified engine
// (flow_svg → renderFlowSvg(buildFlowMap)) produces the SVG; the shell is a THIN DISPLAY —
// it inserts the certified SVG string (from our generator, not user HTML). NO JS layout, NO
// re-derivation, NO text-parsing. The interactive impact highlight is Day 66.
async function viewDiagram() {
  const invoke = tauriInvoke();
  const model = JSON.stringify(buildBlueprintChoices(selections));
  const diagram = document.getElementById('diagram');
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'Open inside the Bedrock window to view the diagram.'); return; }
  setStatus('Drawing the diagram…');
  try {
    const r = await invoke('flow_svg', { model });
    if (r.exit_code === 0 && r.stdout) {
      diagram.innerHTML = r.stdout; // insert the CERTIFIED SVG (thin display)
      diagram.hidden = false;
      setStatus(`Diagram of ${selections.projectName} — drawn by the certified engine (same graph as the text flow map).`);
      setOutput('info', 'flow_svg — diagram shown above', 'The drawn diagram is the certified flow map (a projection of your declared model). The text map is available via "Flow map (text)".');
    } else { renderResult('flow_svg', r); }
  } catch (err) { setEnvError('flow_svg: environment error', "Couldn't draw the diagram", "Bedrock's generator couldn't run (an environment problem — the sidecar is missing or broke), not a problem with your project. The technical detail is below.", err); }
}

// View the flow map of the CURRENT wizard blueprint. The engine projects the declared model;
// JS renders its stdout VERBATIM (a projection, never parsed from code — Day 50).
async function viewFlowMap() {
  const invoke = tauriInvoke();
  const model = JSON.stringify(buildBlueprintChoices(selections));
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'Open inside the Bedrock window to view the flow map.'); return; }
  setStatus('Building the flow map…');
  try { renderResult('flow_map', await invoke('flow_map', { model })); } // pass ONLY model (backend rides settings.backend)
  catch (err) { setEnvError('flow_map: environment error', "Couldn't build the flow map", "Bedrock's generator couldn't run (an environment problem — the sidecar is missing or broke). The technical detail is below.", err); }
}

// Preview the impact of the user's EDIT: the engine diffs { current: baseline, proposed: edited }
// and returns the exact file delta. JS builds the PAIR (pure data — two BlueprintChoices, NO diff)
// and renders the engine's stdout VERBATIM (a JS-computed diff would break previewed==real).
async function previewImpactOfEdit() {
  const invoke = tauriInvoke();
  if (!baselineChoices) {
    setStatus('preview impact: no baseline');
    setOutput('info', 'Preview impact — needs a baseline', 'Save or load a project first, then edit it. Preview impact will show exactly which files your change affects, before generating.');
    return;
  }
  const pair = { current: baselineChoices, proposed: buildBlueprintChoices(selections) };
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'Open inside the Bedrock window to preview impact.'); return; }
  setStatus('Previewing the impact of your edits…');
  try {
    // 1) the certified TEXT delta (Day 64) — stays visible; the highlight is a VIEW of the same truth.
    const model = JSON.stringify(pair);
    renderResult('impact_preview', await invoke('impact_preview', { model }));
    // 2) the IMPACTED node/edge ids (Eco-Day 66) — the ENGINE computes them; JS only PAINTS.
    const r = await invoke('impact_nodes', { model });
    if (r.exit_code === 0 && r.stdout) paintImpact(JSON.parse(r.stdout));
  } catch (err) { setEnvError('impact_preview: environment error', "Couldn't preview the impact", "Bedrock's generator couldn't run (an environment problem — the sidecar is missing or broke). The technical detail is below.", err); }
}

// Paint the certified impacted-id set onto the already-rendered diagram — a CLASS TOGGLE only.
// JS does NOT compute what changed: it receives { nodes, edges } as DATA from the engine and adds
// impact-add / impact-change / impact-delete classes to the matching [data-node-id]/[data-from|to].
const IMPACT_CLASSES = ['impact-add', 'impact-change', 'impact-delete'];
function clearImpactHighlight() {
  const d = document.getElementById('diagram');
  if (d) for (const el of d.querySelectorAll('.' + IMPACT_CLASSES.join(', .'))) el.classList.remove(...IMPACT_CLASSES);
}
// Find an SVG element by an exact attribute value (avoids CSS-selector escaping of ids like "entity:X").
function findByAttrs(container, attrs) {
  const [first] = Object.keys(attrs);
  return [...container.querySelectorAll(`[${first}]`)].find((el) => Object.entries(attrs).every(([k, v]) => el.getAttribute(k) === v));
}
function paintImpact(impacted) {
  const d = document.getElementById('diagram');
  clearImpactHighlight();
  if (!d || d.hidden || !d.querySelector('svg')) {
    setStatus('Impact computed (text delta shown) — click "View diagram" to see it highlighted.');
    return;
  }
  let painted = 0;
  for (const n of impacted.nodes || []) { const el = findByAttrs(d, { 'data-node-id': n.id }); if (el) { el.classList.add('impact-' + n.action); painted++; } }
  for (const e of impacted.edges || []) { const el = findByAttrs(d, { 'data-from': e.from, 'data-to': e.to }); if (el) { el.classList.add('impact-' + e.action); painted++; } }
  setStatus(`Impact highlighted on the diagram: ${painted} node(s)/edge(s) touched — exactly what the change generates.`);
}

// ─── the visible determinism proof (Eco-Day 68) — "Verify" REALLY runs generation twice ─────
// NOT a canned badge. We point the CERTIFIED pair surfaces at the CURRENT blueprint vs ITSELF:
// previewImpact runs buildFileSet TWICE internally (once for current, once for proposed), so this
// is a genuine DOUBLE-GENERATION + diff. An empty result ({nodes:[],edges:[]}) IS the byte-identity
// proof (PART 1z-C's empty bypass, reused as a user-facing Verify). The JS check compares the
// ENGINE's structured result to empty — it computes no diff of its own. A non-empty result (which
// must never happen for a blueprint vs itself) is shown HONESTLY as an unexpected finding.
async function verifyDeterminism() {
  const invoke = tauriInvoke();
  if (!invoke) {
    setStatus('not running inside Bedrock');
    setOutput('env-error', 'Verify — open inside Bedrock', 'Verify runs the generator twice and compares every file — open inside the Bedrock window to run it.');
    return;
  }
  const model = JSON.stringify({ current: buildBlueprintChoices(selections), proposed: buildBlueprintChoices(selections) });
  setStatus('Verifying — generating your project twice and comparing every file…');
  try {
    const r = await invoke('impact_nodes', { model }); // the engine double-generates + diffs
    if (r.exit_code !== 0) { renderResult('impact_nodes', r); return; } // a real run that reported — surface it
    const impacted = JSON.parse(r.stdout);
    const nNodes = (impacted.nodes || []).length;
    const nEdges = (impacted.edges || []).length;
    const pr = await invoke('impact_preview', { model }); // the human "0 add, 0 change… N unchanged" text
    const detail = (pr.exit_code === 0 && pr.stdout && pr.stdout.length) ? pr.stdout : r.stdout;
    if (nNodes === 0 && nEdges === 0) {
      setStatus('Verified — 0 differences across two independent generations.');
      setOutput('clean', 'Verified — byte-identical',
        'Bedrock generated your project twice, independently, and compared every file: 0 differences. '
        + 'The same blueprint always produces byte-identical code. This proves reproducibility — generation '
        + 'is a pure function of your blueprint — not correctness or security.',
        detail);
    } else {
      // Must be impossible for a deterministic engine on a blueprint vs itself — never hide it.
      setStatus(`Verify — UNEXPECTED: ${nNodes} node(s)/${nEdges} edge(s) differ`);
      setOutput('findings', 'Verify — UNEXPECTED difference (please report)',
        `Two generations of the SAME blueprint differed (${nNodes} node(s), ${nEdges} edge(s)). That should be `
        + 'impossible for a deterministic engine — this is a real finding, not a display glitch.',
        detail);
    }
  } catch (err) { setEnvError('verify: environment error', "Verify couldn't run the generator", 'This is an environment problem (the sidecar is missing or broke), not a problem with your project. The technical detail is below.', err); }
}

// ─── the diff Map (Eco-Day 67) — compare TWO SAVED blueprints ───────────────────────────────
// A pure thin client: it points the ALREADY-PROVEN pair surfaces (impact_preview + impact_nodes,
// PART 1w/1z) + flow_svg at two blueprints LOADED from the store (the Day-63 round-trip is lossless,
// so A/B are the REAL saved versions). The ENGINE computes the delta; JS ONLY PAINTS. No JS diff.
async function refreshCompareSelects() {
  const invoke = tauriInvoke();
  const selA = document.getElementById('compare-a');
  const selB = document.getElementById('compare-b');
  if (!selA || !selB) return;
  if (!invoke) { selA.innerHTML = selB.innerHTML = '<option value="">(open inside Bedrock)</option>'; return; }
  try {
    const rows = await invoke('list_blueprints');
    const opts = rows.length
      ? rows.map((r) => `<option value="${r.id}">${escapeHtml(r.name)} · #${r.id} · ${escapeHtml(r.created_at)}</option>`).join('')
      : '<option value="">(no saved projects yet)</option>';
    selA.innerHTML = opts; selB.innerHTML = opts;
    if (rows.length > 1) selB.selectedIndex = 1; // default B ≠ A when possible
  } catch (err) { selA.innerHTML = selB.innerHTML = `<option value="">list error</option>`; }
}

async function compareVersions() {
  const invoke = tauriInvoke();
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'Open inside the Bedrock window to compare saved versions.'); return; }
  const idA = document.getElementById('compare-a').value;
  const idB = document.getElementById('compare-b').value;
  if (!idA || !idB) { setStatus('compare: pick two saved projects'); setOutput('info', 'Compare — pick A and B', 'Save at least two projects, then pick A (from) and B (to).'); return; }
  setStatus(`Comparing #${idA} → #${idB}…`);
  try {
    // A and B are REAL loaded blueprints (the Day-63 round-trip is lossless — loaded == saved).
    const aJson = await invoke('load_blueprint', { id: Number(idA) });
    const bJson = await invoke('load_blueprint', { id: Number(idB) });
    const A = JSON.parse(aJson); const B = JSON.parse(bJson);
    // ALLOW + WARN a stack/type mismatch (the engine answers ANY pair truthfully — reading two
    // settings values is a UI guard, NOT a diff computation; the shell never overrides the engine).
    const mismatch = A.settings && B.settings && (A.settings.backend !== B.settings.backend || A.settings.projectType !== B.settings.projectType);
    const warn = mismatch ? ' (A and B use different backend/project type — the delta will be large.)' : '';
    const model = JSON.stringify({ current: A, proposed: B });
    // 1) the certified TEXT delta (the engine computes it — verbatim).
    renderResult('impact_preview', await invoke('impact_preview', { model }));
    // 2) B's certified diagram (B = the target; the change INTO B is what we highlight — like Day 66's proposed).
    const svgR = await invoke('flow_svg', { model: bJson });
    const diagram = document.getElementById('diagram');
    if (svgR.exit_code === 0 && svgR.stdout) { diagram.innerHTML = svgR.stdout; diagram.hidden = false; }
    // 3) the impacted ids (the engine computes them) → PAINT B's diagram (JS only paints).
    const nodesR = await invoke('impact_nodes', { model });
    if (nodesR.exit_code === 0 && nodesR.stdout) paintImpact(JSON.parse(nodesR.stdout));
    if (warn) setStatus(document.getElementById('status').textContent + warn);
  } catch (err) { setEnvError('compare: environment error', "Couldn't compare those versions", "Bedrock's generator couldn't run (an environment problem — the sidecar is missing or broke). The technical detail is below.", err); }
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
    setEnvError('export: environment error', "Bedrock's generator couldn't start",
      'This is an environment problem (the sidecar is missing or couldn\'t run), not a problem with your project. The technical detail is below.', err);
  }
}
function wizardNext() { captureCurrentStep(); if (stepIndex >= REVIEW_STEP) { generate(); return; } stepIndex += 1; renderStep(); }
function wizardBack() { captureCurrentStep(); if (stepIndex > 0) stepIndex -= 1; renderStep(); }

// ─── the Advanced harness (raw commands — unchanged) ────────────────────────────────────────
function optValue(id) { const el = id && document.getElementById(id); const v = el ? el.value.trim() : ''; return v === '' ? undefined : v; }
// PRE-INVOKE VALIDATION (prevents the ENOENT rather than prettifying it): a non-empty raw --model
// box must be valid JSON OR a plausible file path. This is GUIDANCE, not a diagnosis of internals.
function looksLikePath(s) { return /\.json$/i.test(s) || /[\\/]/.test(s); }
function validModelArg(s) {
  if (s == null) return true;               // omitted ⇒ the demo bypass (fine)
  try { JSON.parse(s); return true; } catch (_e) { /* not JSON — try a path */ }
  return looksLikePath(s);
}
function buildArgs(btn) {
  const args = {};
  if (btn.dataset.targetdir) args.targetDir = optValue(btn.dataset.targetdir);
  if (btn.dataset.projectdir) args.projectDir = optValue(btn.dataset.projectdir);
  if (btn.dataset.backend) args.backend = optValue(btn.dataset.backend);
  if (btn.dataset.model) args.model = optValue(btn.dataset.model);
  for (const k of Object.keys(args)) if (args[k] === undefined) delete args[k];
  return args;
}
// Humanize the Day-53 SidecarResult (a RESOLVED run = DATA, never a crash). Each branch gets a
// human header; the engine's OWN message is shown, never discarded, never re-worded into a claim
// it didn't make, never diagnosed by a heuristic. The raw stdout+stderr stays in the detail.
function renderResult(cmd, r) {
  const code = r.exit_code;
  const raw = [r.stdout, r.stderr].filter((s) => s && s.length).join('\n---\n');
  if (code === 0) {
    setStatus(`${cmd}: done`);
    setOutput('clean', `${cmd} — done`, r.stdout && r.stdout.length ? r.stdout : '(completed with no output)');
    // The standalone-export experience (DC-3): surface the ENGINE's own stdout (file count + the
    // "0 functional Thraksha references" line + the container command, already in r.stdout above),
    // then reveal the STATIC Law-21 note. JS asserts nothing about this particular export.
    if (cmd === 'export_project') { const n = document.getElementById('export-note'); if (n) n.hidden = false; }
    return;
  }
  if (code === 1 && cmd === 'scan_project') {
    // Data, not an error: the scan ran and found CERTAIN findings (Day 45's deterministic scan).
    setStatus(`${cmd}: CERTAIN findings — review required`);
    setOutput('findings', `${cmd} — CERTAIN findings · review required`, r.stdout && r.stdout.length ? r.stdout : r.stderr);
    return;
  }
  if (code === 2) {
    // The engine's usage/exit-2 = a missing input; show its OWN usage line (stderr), no invention.
    setStatus(`${cmd}: an input is needed`);
    setOutput('info', 'Bedrock needs an input', (r.stderr && r.stderr.length ? r.stderr : r.stdout) || 'A required input is missing.', raw);
    return;
  }
  // Any other non-zero: the generator RAN and reported a problem (e.g. the ENOENT of a bad --model
  // path). We say exactly that + show its OWN message — no guessed diagnosis of what went wrong.
  setStatus(`${cmd}: the generator reported a problem (exit ${code})`);
  setOutput('info', "Bedrock's generator ran and reported a problem",
    "The generator started fine but reported a problem while running. Its exact message is below — nothing is hidden or reworded.",
    raw || `(exit ${code}, no output)`);
}
async function runCommand(btn) {
  const cmd = btn.dataset.cmd;
  const invoke = tauriInvoke();
  if (!invoke) { setStatus('not running inside Bedrock'); setOutput('env-error', 'no Tauri backend', 'window.__TAURI__.core.invoke is unavailable — open inside the Bedrock WebView to run commands.'); return; }
  const args = buildArgs(btn);
  if (cmd === 'export_project' && !args.targetDir) { setStatus('export: missing target directory'); setOutput('info', 'export — input needed', 'Enter a target directory.'); return; }
  if (cmd === 'scan_project' && !args.projectDir) { setStatus('scan: missing project directory'); setOutput('info', 'scan — input needed', 'Enter a project directory.'); return; }
  if ('model' in args && !validModelArg(args.model)) {
    setStatus(`${cmd}: check the model input`);
    setOutput('info', 'Model input must be JSON or a file path',
      'The model box must be a BlueprintChoices JSON object or a path to a .json file. Enter valid JSON or a file path, or leave it blank to use the built-in demo model.');
    return; // do NOT invoke — this is exactly what produced the raw-ENOENT stack.
  }
  setStatus(`running ${cmd}…`);
  try { renderResult(cmd, await invoke(cmd, args)); }
  catch (err) { setEnvError(`${cmd}: environment error`, "Bedrock's generator couldn't start", 'An environment problem (the sidecar is missing or broke), not a problem with your input. The technical detail is below.', err); }
}

function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

// ─── the screen router (Eco-Day 71) ─────────────────────────────────────────────────────────
// PURE UI STATE: which one screen is visible. No generation logic, no serializer touch, no data
// derivation — showScreen just sets a data attribute the CSS drives, so every existing DOM region
// keeps its id + handlers. The app opens on Welcome; the top nav appears once you leave it.
const SCREENS = new Set(['welcome', 'wizard', 'workspace']);
function showScreen(name) {
  const app = document.getElementById('app');
  if (!app || !SCREENS.has(name)) return;
  app.dataset.screen = name;
  const nav = document.getElementById('topnav');
  if (nav) nav.hidden = name === 'welcome';
}
// Enter the wizard from the start (Create a new project). Semantics untouched — this only routes.
function startWizard() { stepIndex = 0; renderStep(); showScreen('wizard'); }

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
  document.getElementById('view-diagram').addEventListener('click', viewDiagram);
  document.getElementById('view-flow-map').addEventListener('click', viewFlowMap);
  document.getElementById('preview-impact').addEventListener('click', previewImpactOfEdit);
  document.getElementById('verify-determinism').addEventListener('click', verifyDeterminism);
  renderProjectView();
  document.getElementById('projects-refresh').addEventListener('click', refreshProjects);
  refreshProjects();
  document.getElementById('compare-run').addEventListener('click', compareVersions);
  document.getElementById('compare-refresh').addEventListener('click', refreshCompareSelects);
  refreshCompareSelects();
  for (const btn of document.querySelectorAll('button[data-cmd]')) btn.addEventListener('click', () => runCommand(btn));
  // ── the router wiring (Eco-Day 71) — pure navigation over the existing screens ──
  document.getElementById('brand-home').addEventListener('click', () => showScreen('welcome'));
  document.getElementById('nav-new').addEventListener('click', startWizard);
  document.getElementById('nav-workspace').addEventListener('click', () => showScreen('workspace'));
  document.getElementById('welcome-create').addEventListener('click', startWizard);
  document.getElementById('welcome-open').addEventListener('click', openExisting);
  showScreen('welcome'); // the app opens on Welcome — one screen at a time
  if (!tauriInvoke()) setStatus('note: Tauri backend not detected (open inside Bedrock to generate). The wizard + the assembled BlueprintChoices still work.');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

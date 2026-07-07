/*
 * Thraksha — Figma token export plugin: the impure Figma-plugin EDGE (Eco-Day 31).
 *
 * ⚠️ FIGMA-RUNTIME CODE — runs INSIDE Figma, NOT in Node. It is DELIBERATELY outside the
 * generator's `src/` (tsc never compiles it; the Figma plugin toolchain builds it to code.js).
 * It is the impure edge of the Day-31 ingestion split — the exact analogue of Day-18's
 * detect/probe.ts (spawns real probes) and Day-23's fill/fill-ai.ts (real AI call):
 *
 *   • The EDGE (here): runs in Figma, reads the design via the Figma Plugin API
 *     (getLocalVariablesAsync + getLocalVariableCollectionsAsync + auto-layout), and emits a
 *     FigmaExport JSON. NOT runnable outside Figma → the ingestion CORE is proven instead via
 *     a CANNED FigmaExport fixture (day20 PART 1p, CI-enforced). This edge is honest-manual.
 *   • The CORE (src/figma/figma-ingest.ts): a pure function of that JSON — canonical tokens +
 *     the eligibility gate. Deterministic, AI-free, fixture-tested.
 *
 * The output contract is EXACTLY the core's `FigmaExport` shape:
 *   { tokens: <W3C design-token JSON>, autoLayout: boolean, namedVariables: boolean, unmappable?: string[] }
 * so `figmaEligibility(export)` decides: eligible → tokens; ineligible → slots (Phase-2 path).
 *
 * NOT the Enterprise-only Variables REST API — the Plugin API (all paid plans). No network
 * (manifest networkAccess: none). No AI. Structured data only — never a screenshot / image-to-code.
 */

// The Figma plugin runtime global (declared here so this file is self-describing; the real
// types come from @figma/plugin-typings when built with the Figma plugin toolchain).
declare const figma: any;

/** Map a Figma variable's resolved type to a W3C design-token `$type`. */
function w3cType(figmaType: string): string {
  switch (figmaType) {
    case 'COLOR': return 'color';
    case 'FLOAT': return 'dimension'; // spacing/radius/size numbers → dimension (px appended below)
    case 'STRING': return 'fontFamily';
    default: return 'string';
  }
}

/** A Figma COLOR {r,g,b,a} (0..1) → a canonical #rrggbb(aa) hex string (deterministic). */
function rgbaToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  return c.a === undefined || c.a === 1 ? base : `${base}${h(c.a)}`;
}

/** Coerce a resolved Figma variable value to a canonical W3C `$value` string. */
function w3cValue(figmaType: string, value: unknown): string {
  if (figmaType === 'COLOR' && value && typeof value === 'object') return rgbaToHex(value as { r: number; g: number; b: number; a?: number });
  if (figmaType === 'FLOAT' && typeof value === 'number') return `${value}px`;
  return String(value);
}

/**
 * Build the FigmaExport the ingestion core consumes. Reads local variables + collections
 * (the Plugin API — NOT the Enterprise REST API) and whether the exported frames use Auto
 * Layout. Deterministic: variables are grouped by their (slash-delimited) NAME into a W3C
 * token tree; the core canonicalises (sorted keys), so plugin iteration order never leaks.
 */
async function buildFigmaExport(): Promise<unknown> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();

  // A design is generator-eligible only when variables are NAMED and frames use Auto Layout.
  const namedVariables = variables.length > 0 && variables.every((v: any) => typeof v.name === 'string' && v.name.trim().length > 0);
  const autoLayout = figma.currentPage.children.some(
    (n: any) => 'layoutMode' in n && n.layoutMode !== 'NONE',
  );

  // Build the W3C token tree: name "color/primary" → { color: { primary: { $type, $value } } }.
  const tokens: Record<string, any> = {};
  const unmappable: string[] = [];
  for (const v of variables) {
    const collection = collections.find((c: any) => c.id === v.variableCollectionId);
    const modeId = collection?.defaultModeId;
    const resolved = modeId ? v.valuesByMode[modeId] : undefined;
    if (resolved === undefined || (resolved && typeof resolved === 'object' && 'type' in resolved && resolved.type === 'VARIABLE_ALIAS')) {
      unmappable.push(v.name); // aliases / unresolved → human review (slots), never guessed
      continue;
    }
    const parts = String(v.name).split('/').filter((p) => p.length > 0);
    let node = tokens;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] ??= {};
    node[parts[parts.length - 1]] = { $type: w3cType(v.resolvedType), $value: w3cValue(v.resolvedType, resolved) };
  }

  // Components/frames that carry design NOT expressible as a variable → slots (human review).
  for (const n of figma.currentPage.children) {
    if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') {
      if (!('layoutMode' in n) || n.layoutMode === 'NONE') unmappable.push(n.name);
    }
  }

  return { tokens, autoLayout, namedVariables, unmappable };
}

// Entry: emit the FigmaExport JSON to the plugin UI (the developer copies it into Thraksha,
// where the pure ingestion core turns it into a deterministic design-tokens.json).
(async () => {
  const exp = await buildFigmaExport();
  figma.showUI(`<pre id="out"></pre><script>document.getElementById('out').textContent = ${JSON.stringify(JSON.stringify(exp, null, 2))}<\/script>`, { width: 480, height: 600 });
})();

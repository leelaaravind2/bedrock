/*
 * Thraksha — the Map: flow map as a DRAWN SVG (Eco-Day 65, the visual Map).
 *
 * `renderFlowSvg(map)` is the DRAWING analogue of `renderFlowMap` (the text): it lays out
 * and draws the SAME certified `FlowMap` (the declared-model projection from `buildFlowMap`).
 * It DECIDES NOTHING about the architecture — it reads only the FlowMap's nodes/edges (each a
 * projection of the declared model) and positions/draws them. It never reads generated code,
 * never re-derives the graph, and is not parsed back.
 *
 * DETERMINISM (the load-bearing property, proven by day20:regress PART 1y):
 *   - iterate the FlowMap's GIVEN order (entities declared-order, edges sorted by buildFlowMap);
 *     lookups (positions by id) never iterate a Map/Set into the output;
 *   - INTEGER-grid coordinates only — no floats, so no drift; no timestamps/ids/randomness;
 *   - no locale-dependent formatting (`String(n)`, never `toLocaleString`).
 * Same FlowMap → byte-identical SVG string.
 *
 * FAITHFULNESS (PART 1y): EVERY node → a `<g data-node-id>` box; EVERY edge → a
 * `<line data-from data-to data-kind>`. The drawn id sets are one-to-one with the FlowMap
 * (= the declared entities/relationships) — no phantom, no missing.
 *
 * Day-66 hook: every element carries its stable FlowMap id, so the impact highlight is a
 * class toggle on `[data-node-id="entity:X"]` — no re-layout, no re-render.
 *
 * Pure — no I/O, no DOM, no dependency (a hand-rolled SVG string). deps {} untouched.
 */

import type { FlowMap, FlowNode, FlowNodeKind } from './flow-map.js';

/** The lifecycle layers in request order (the same KNOWN convention buildFlowMap projects). */
const LAYERS: FlowNodeKind[] = ['route', 'controller', 'service', 'repository', 'model', 'table'];

// Integer-grid layout constants (no floats anywhere → no coordinate drift).
const M = 16;               // outer margin
const APP_W = 460, APP_H = 44;
const ENT_W = 132, BOX_H = 40, ROW_H = 66;
const LIFE_X = M + ENT_W + 44, LIFE_W = 104, LIFE_STEP = 116;
const ENT_TOP = M + APP_H + 28;

interface Box { x: number; y: number; w: number; h: number; }

/** XML-escape a label for safe, deterministic SVG text (no locale, no entities beyond these). */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));
}

/** A short box caption: lifecycle layers show their kind; others show the (declared) label. */
function caption(n: FlowNode): string {
  return n.kind === 'app' || n.kind === 'entity' || n.kind === 'integration' ? n.label : n.kind;
}

/**
 * Draw the certified FlowMap as an SVG string. Deterministic + faithful (PART 1y).
 */
export function renderFlowSvg(map: FlowMap): string {
  const entityNodes = map.nodes.filter((n) => n.kind === 'entity');          // declared order
  const integrationNodes = map.nodes.filter((n) => n.kind === 'integration'); // given order (email, ai)

  // Position EVERY node id on the integer grid (read-only lookups; output order driven by arrays).
  const pos = new Map<string, Box>();
  pos.set('app', { x: M, y: M, w: APP_W, h: APP_H });
  entityNodes.forEach((e, i) => {
    const y = ENT_TOP + i * ROW_H;
    pos.set(e.id, { x: M, y, w: ENT_W, h: BOX_H });
    LAYERS.forEach((layer, k) => pos.set(`${layer}:${e.entity}`, { x: LIFE_X + k * LIFE_STEP, y, w: LIFE_W, h: BOX_H }));
  });
  const INT_TOP = ENT_TOP + entityNodes.length * ROW_H + 16;
  integrationNodes.forEach((n, i) => pos.set(n.id, { x: M, y: INT_TOP + i * ROW_H, w: APP_W, h: BOX_H }));

  const W = LIFE_X + LAYERS.length * LIFE_STEP + M;
  const bottom = integrationNodes.length ? INT_TOP + integrationNodes.length * ROW_H : ENT_TOP + entityNodes.length * ROW_H;
  const H = bottom + M;

  // Edges FIRST (drawn behind the boxes). Iterate map.edges in the FlowMap's given order.
  const edgeParts: string[] = [];
  for (const e of map.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue; // every FlowMap edge resolves; guard keeps it total
    // connect box centers (integer midpoints via >>1 — pure integer, no float)
    const x1 = a.x + (a.w >> 1), y1 = a.y + (a.h >> 1);
    const x2 = b.x + (b.w >> 1), y2 = b.y + (b.h >> 1);
    edgeParts.push(`<line class="edge ${e.kind}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" data-kind="${e.kind}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow)" />`);
    if (e.label && (e.kind === 'relationship' || e.kind === 'integration')) {
      const lx = (x1 + x2) >> 1, ly = ((y1 + y2) >> 1) - 4;
      edgeParts.push(`<text class="edge-label" x="${lx}" y="${ly}">${esc(e.label)}</text>`);
    }
  }

  // Nodes: EVERY node → a <g data-node-id> box + caption (the faithfulness + Day-66 hook).
  const nodeParts: string[] = [];
  for (const n of map.nodes) {
    const box = pos.get(n.id);
    if (!box) continue;
    nodeParts.push(
      `<g class="node ${n.kind}" data-node-id="${esc(n.id)}">` +
        `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" />` +
        `<title>${esc(n.label)}</title>` +
        `<text x="${box.x + 8}" y="${box.y + (box.h >> 1) + 4}">${esc(caption(n))}</text>` +
      `</g>`,
    );
  }

  // The whole SVG. Fixed viewBox (integer), a single arrowhead marker, a small stylesheet.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="flow-svg" role="img">`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker></defs>`,
    `<style>`,
    `.flow-svg{font-family:ui-monospace,monospace;font-size:11px}`,
    `.node rect{fill:#eef;stroke:#88a;stroke-width:1}`,
    `.node.app rect{fill:#dde7ff;stroke:#5577cc}`,
    `.node.entity rect{fill:#e6f2e6;stroke:#5a5}`,
    `.node.integration rect{fill:#fff3d6;stroke:#c9a227}`,
    `.node text{fill:#222}`,
    `.edge{stroke:#889;stroke-width:1;fill:none}`,
    `.edge.relationship{stroke:#c05}`,
    `.edge.integration{stroke:#c9a227}`,
    `.edge-label{fill:#667;font-size:9px}`,
    `#arrow path{fill:#889}`,
    `</style>`,
    ...edgeParts,
    ...nodeParts,
    `</svg>`,
  ].join('\n');
}

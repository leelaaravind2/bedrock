/*
 * Thraksha — the Map: flow map (Eco-Day 50, the Map's second half).
 *
 * A request-lifecycle / routes / data-flow map that is a DIRECT PROJECTION of the
 * DECLARED blueprint (entities, relationships, integrations) — NOT parsed or
 * inferred from generated code. Traceability is FREE + EXACT because generation is
 * deterministic: every declared node maps to a KNOWN output artifact set (the same
 * buildFileSet basis the impact map uses). Same model → same flow map.
 *
 * READ-ONLY, and it reads EVEN LESS than the impact map: only the MODEL
 * (getEntities / getIntegrations / getPhaseASettings) — never buildFileSet, never
 * generated output. It CALLS nothing in the generation path; the generation path
 * never imports it (0 generation-path refs). It emits NOTHING into the project
 * (returns a plain FlowMap object, never a GeneratedFile). Pure-Node, deps {} —
 * nodes/edges are plain objects and the render is text (NO graph/viz library).
 *
 * Routes are NOT declared in the model — they are CONVENTION over entities: each
 * entity implies the universal request lifecycle route → controller → service →
 * repository → model → table (the same layers every stack generates). has-many
 * adds the known parent-side collection accessor. We project that KNOWN convention
 * from the declared entity — we do not read the emitted files. No AI (ADR-001).
 */

import type { ProjectModel, Entity } from '../core/project-model.js';

/** The layers of the universal request lifecycle every entity implies (in order). */
export type FlowNodeKind =
  | 'app' // the project root (carries type/backend/frontend/database/auth context)
  | 'entity' // one declared entity
  | 'route' // the HTTP route layer (the known CRUD set)
  | 'controller' // request handling
  | 'service' // domain / business logic
  | 'repository' // persistence access
  | 'model' // the persisted shape
  | 'table' // the database table
  | 'integration'; // an active integration the app calls (email / ai)

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  /** The declared entity this node belongs to (for entity + lifecycle nodes). */
  entity?: string;
}

/**
 * lifecycle  = the request path within one entity (route → … → table).
 * relationship = the entity graph (belongs-to owns the FK; has-many is the inverse).
 * integration  = the app → an active integration edge (email / ai).
 */
export type FlowEdgeKind = 'lifecycle' | 'relationship' | 'integration';

export interface FlowEdge {
  from: string;
  to: string;
  kind: FlowEdgeKind;
  label?: string;
}

export interface FlowMap {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** The lifecycle layers, in request order — the KNOWN convention every entity implies. */
const LIFECYCLE: { kind: FlowNodeKind; label: (e: string) => string }[] = [
  { kind: 'route', label: (e) => `${e} routes (CRUD /api/${e.toLowerCase()}s)` },
  { kind: 'controller', label: (e) => `${e} controller` },
  { kind: 'service', label: (e) => `${e} service (domain)` },
  { kind: 'repository', label: (e) => `${e} repository` },
  { kind: 'model', label: (e) => `${e} model` },
  { kind: 'table', label: (e) => `${e.toLowerCase()}s table` },
];

/** Normalize a relationship (kind|type alias already resolved in the stored model). */
function edgesForEntity(e: Entity): FlowEdge[] {
  // belongs-to owns a FK to the target; has-many is the inverse collection view.
  return [...e.relationships]
    .slice()
    .sort((a, b) => (a.target < b.target ? -1 : a.target > b.target ? 1 : a.kind < b.kind ? -1 : 1))
    .map((r) => ({
      from: `entity:${e.name}`,
      to: `entity:${r.target}`,
      kind: 'relationship' as const,
      label: r.kind === 'belongs-to' ? `belongs-to (FK ${r.target.toLowerCase()}_id)` : `has-many (GET /api/${e.name.toLowerCase()}s/:id/${r.target.toLowerCase()}s)`,
    }));
}

/**
 * Project the DECLARED model into a request-lifecycle / data-flow map. Pure: reads
 * only the model; no side effects, no generated output. Deterministic — entities
 * are taken in declared order and relationships are sorted, so the same model
 * always yields the same FlowMap.
 */
export function buildFlowMap(model: ProjectModel): FlowMap {
  const settings = model.getPhaseASettings();
  const entities = model.getEntities();
  const integrations = model.getIntegrations();

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // The app root — carries the Phase-A context (a projection of the declared settings).
  nodes.push({
    id: 'app',
    kind: 'app',
    label: `${settings.projectName} — ${settings.projectType} (${settings.backend}/${settings.frontend}/${settings.database}; auth: ${settings.auth}; multiUser: ${settings.multiUser})`,
  });

  for (const e of entities) {
    // The entity node + the app → entity edge (the app owns each declared entity's lifecycle).
    nodes.push({ id: `entity:${e.name}`, kind: 'entity', label: e.name, entity: e.name });
    edges.push({ from: 'app', to: `entity:${e.name}`, kind: 'lifecycle', label: 'declares' });

    // The universal request-lifecycle chain (KNOWN convention, not parsed):
    // entity → route → controller → service → repository → model → table.
    let prev = `entity:${e.name}`;
    for (const layer of LIFECYCLE) {
      const id = `${layer.kind}:${e.name}`;
      nodes.push({ id, kind: layer.kind, label: layer.label(e.name), entity: e.name });
      edges.push({ from: prev, to: id, kind: 'lifecycle' });
      prev = id;
    }

    // Relationship edges — the entity graph (belongs-to / has-many), from the declared relationships.
    edges.push(...edgesForEntity(e));
  }

  // Integration edges — the app calls an ACTIVE integration (email/ai). None declared ⇒ no node/edge
  // (the literal bypass: an empty-integrations project's flow map has zero integration edges).
  if (integrations.email !== 'none') {
    nodes.push({ id: 'integration:email', kind: 'integration', label: `email (${integrations.email}) — mailer the app calls (ADR-001)` });
    edges.push({ from: 'app', to: 'integration:email', kind: 'integration', label: 'app sends via' });
  }
  if (integrations.ai !== 'none') {
    nodes.push({ id: 'integration:ai', kind: 'integration', label: `ai (${integrations.ai}) — optional hook the app exposes (ADR-001)` });
    edges.push({ from: 'app', to: 'integration:ai', kind: 'integration', label: 'app calls via' });
  }

  return { nodes, edges };
}

/** Render the flow map as a human-readable text tree/adjacency. Pure — NO viz library. */
export function renderFlowMap(map: FlowMap): string {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const app = map.nodes.find((n) => n.kind === 'app');
  out.push(`Flow map: ${app?.label ?? '(app)'}`);
  out.push('='.repeat(Math.min(72, `Flow map: ${app?.label ?? '(app)'}`.length)));
  out.push('');

  // Per-entity request lifecycle (route → … → table), then the entity graph + integrations.
  for (const e of map.nodes.filter((n) => n.kind === 'entity')) {
    out.push(`● ${e.label}`);
    const chain = LIFECYCLE.map((l) => byId.get(`${l.kind}:${e.entity}`)).filter((n): n is FlowNode => !!n);
    for (const n of chain) out.push(`    → ${n.label}`);
    for (const r of map.edges.filter((x) => x.kind === 'relationship' && x.from === `entity:${e.entity}`)) {
      out.push(`    ⇄ ${r.to.replace('entity:', '')}: ${r.label}`);
    }
  }

  const integrations = map.edges.filter((x) => x.kind === 'integration');
  if (integrations.length > 0) {
    out.push('');
    out.push('Integrations (the app calls these — ADR-001):');
    for (const i of integrations) out.push(`    ⟶ ${byId.get(i.to)?.label ?? i.to}`);
  }

  out.push('');
  out.push(`(${map.nodes.length} nodes, ${map.edges.length} edges — a projection of the declared blueprint; nothing generated)`);
  return out.join('\n');
}

/*
 * Thraksha — the Map: impacted NODES for the interactive impact highlight (Eco-Day 66).
 *
 * `impactedNodes(current, proposed)` computes WHICH DIAGRAM NODES a change touches — the
 * data the shell paints onto the certified flow-svg (a class toggle on the Day-65
 * data-node-id / data-from|to hooks). The shell decides nothing: this module is the
 * CERTIFIED delta, projected onto nodes.
 *
 * THE ATTRIBUTION IS THE EMITTERS' OWN — NOT a path heuristic. buildFileSet generates
 * files one entity at a time via `plugin.generateEntity(entity, …)` (regen.ts) — so each
 * entity's files are EXACTLY what its own emitter produces. We recover that: for a model,
 * ask each entity's emitter which files it owns → `entity:<name>`; every OTHER generated
 * file ⇒ the `app` node (the shell). This is the same call buildFileSet makes; PART 1z
 * proves the partition is TOTAL + DISJOINT over buildFileSet(model) — a heuristic would
 * leave gaps/overlaps. NO regex, NO path pattern-match.
 *
 * THE HONEST GRANULARITY BOUNDARY: we highlight ENTITY nodes, the `app` node, and ADDED
 * relationship EDGES (from the DECLARED-model diff) — all certifiable. We do NOT highlight
 * per-lifecycle-layer nodes (route:X / service:X / …): generated files are not tagged by
 * layer, so per-layer attribution would need a HEURISTIC. We highlight what we can certify,
 * not what would look good.
 *
 * READ-ONLY, deterministic (sorted output), pure — reads only the models + the emitters +
 * previewImpact + buildFlowMap. No writes, no AI, no clock.
 */

import type { ProjectModel } from '../core/project-model.js';
import { selectBackendPlugin } from '../plugins/registry.js';
import { previewImpact, type ImpactAction } from './impact-map.js';
import { buildFlowMap } from './flow-map.js';

export interface ImpactedNode { id: string; action: 'add' | 'change'; }
export interface ImpactedEdge { from: string; to: string; action: 'add'; }
export interface ImpactedNodes { nodes: ImpactedNode[]; edges: ImpactedEdge[]; }

/**
 * The CERTIFIED file→node attribution: `relPath → entity:<name>` for every file an entity's
 * own emitter produces (the same `generateEntity` call buildFileSet makes, with the same
 * context). Every relPath NOT in this map is owned by the `app` node (the shell) — so the
 * map, plus the `app` remainder, PARTITIONS buildFileSet(model) (PART 1z-B1 proves it).
 */
export function fileOwners(model: ProjectModel): Map<string, string> {
  const plugin = selectBackendPlugin(model);
  const inputs = model.getPhaseASettings();
  const style = model.getStyle();
  const owners = new Map<string, string>();
  model.getEntities().forEach((entity, index) => {
    // The SAME per-entity emit buildFileSet performs (regen.ts) — the emitter owns its files.
    const files = plugin.generateEntity(entity, {
      index,
      multiUser: inputs.multiUser === true,
      projectName: inputs.projectName,
      projectType: inputs.projectType,
      style,
    });
    for (const f of files) owners.set(f.relPath, `entity:${entity.name}`);
  });
  return owners; // any relPath absent here ⇒ `app`
}

/** Attribute one changed relPath to its owning node id (entity:X | app). */
function ownerOf(relPath: string, owners: Map<string, string>): string {
  return owners.get(relPath) ?? 'app';
}

/**
 * The impacted node/edge ids for the change (current → proposed), computed from
 * previewImpact's changed files under the certified attribution, intersected with the nodes
 * that EXIST on the shown (proposed) diagram. Deterministic; the highlight the shell paints.
 */
export async function impactedNodes(current: ProjectModel, proposed: ProjectModel): Promise<ImpactedNodes> {
  const plan = await previewImpact(current, proposed);
  const ownersProp = fileOwners(proposed);
  const ownersCur = fileOwners(current);
  const propNodeIds = new Set(buildFlowMap(proposed).nodes.map((n) => n.id)); // the drawn (proposed) diagram

  // Which entities are NEW in proposed (⇒ their node's action is 'add' rather than 'change').
  const curEntities = new Set(current.getEntities().map((e) => e.name));
  const newEntity = (nodeId: string) => nodeId.startsWith('entity:') && !curEntities.has(nodeId.slice('entity:'.length));

  // Gather impacted node ids: the OWNER of each non-no-op changed file, kept iff on the diagram.
  const impacted = new Set<string>();
  for (const e of plan.entries) {
    if (e.action === 'no-op') continue;
    // add/change ⇒ the file is in the PROPOSED set; delete ⇒ only in CURRENT.
    const owner = e.action === 'delete' ? ownerOf(e.file, ownersCur) : ownerOf(e.file, ownersProp);
    if (propNodeIds.has(owner)) impacted.add(owner); // deleted-whole-entity nodes aren't on the proposed diagram → skipped (shown in the text delta)
  }
  const nodes: ImpactedNode[] = [...impacted]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((id) => ({ id, action: newEntity(id) ? 'add' : 'change' }));

  // ADDED relationship EDGES — the certified DECLARED-model diff (not a file heuristic).
  const relKey = (from: string, target: string, kind: string) => `entity:${from}→entity:${target}:${kind}`;
  const curRels = new Set(current.getEntities().flatMap((e) => e.relationships.map((r) => relKey(e.name, r.target, r.kind))));
  const edges: ImpactedEdge[] = proposed
    .getEntities()
    .flatMap((e) => e.relationships.map((r) => ({ from: `entity:${e.name}`, to: `entity:${r.target}`, kind: r.kind })))
    .filter((r) => !curRels.has(`${r.from}→${r.to}:${r.kind}`) && propNodeIds.has(r.from) && propNodeIds.has(r.to)) // added + both ends on the diagram
    .map((r) => ({ from: r.from, to: r.to, action: 'add' as const }))
    .sort((a, b) => (a.from + a.to < b.from + b.to ? -1 : a.from + a.to > b.from + b.to ? 1 : 0));

  return { nodes, edges };
}

// keep ImpactAction referenced for type clarity (the entry actions the attribution consumes)
export type { ImpactAction };

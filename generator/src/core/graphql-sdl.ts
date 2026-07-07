/*
 * Thraksha — canonical GraphQL SDL builder (Eco-Day 36).
 *
 * A PURE, DETERMINISTIC projection of the Project Model's entities into a GraphQL
 * schema (SDL). This is the load-bearing determinism artifact for the 'GraphQL API'
 * project type: the SAME model MUST yield a byte-identical `schema.graphql` every
 * run. It lives in the CORE (like canonical-json.ts / the Figma canonicalTokens) —
 * the SDL is a neutral spec format, not a technology (Law 25 is honoured: no stack
 * specifics here). The per-stack RESOLVERS live in the plugins; the SCHEMA — and
 * its ordering — has ONE home so the ordering rule cannot drift between stacks.
 *
 * THE ORDERING RULE (the new load-bearing property, ADR-003):
 *   - entity TYPES are sorted by entity name (ascending, default code-unit compare —
 *     the SAME comparator the digest uses, NEVER localeCompare);
 *   - FIELDS within a type follow the model's DECLARED order (entity.fields), then
 *     belongs-to FKs (authored order), then owner (if multi-user), then id/audit —
 *     a fixed, stable sequence, NEVER object-key / Map / Set iteration order;
 *   - Query / Mutation fields are grouped per entity (entities sorted), operations
 *     in a fixed order (list, get / create, update, delete);
 *   - scalars are declared in a fixed order (DateTime always; Decimal only when an
 *     entity has a Decimal field — additive, gated).
 * No clock/RNG/UUID; LF only (the caller joins with '\n'). No AI (ADR-001).
 */

import type { Entity, Field, Relationship } from './project-model.js';
import { applyNaming, type NamingConvention } from './style.js';

/** Ascending code-unit compare (NOT localeCompare) — matches the digest's ordering. */
function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** PascalCase -> camelCase (first char lowered), e.g. Ticket -> ticket. */
function decapitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** The GraphQL query field name for a single entity, e.g. Ticket -> ticket. */
function singularField(entity: Entity): string {
  return decapitalize(entity.name);
}

/** The GraphQL query field name for the collection, e.g. Ticket -> tickets. */
function pluralField(entity: Entity): string {
  return `${decapitalize(entity.name)}s`;
}

/** belongs-to relationships in authored (deterministic) order. */
function belongsToRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'belongs-to');
}

/** The GraphQL wire key for a declared field — honours the naming convention (Day 12/29). */
function fieldWireKey(field: Field, naming: NamingConvention): string {
  return applyNaming(field.name, naming);
}

/** The GraphQL wire key for a belongs-to FK, e.g. Application -> applicationId (naming-governed). */
function fkWireKey(rel: Relationship, naming: NamingConvention): string {
  return applyNaming(`${decapitalize(rel.target)}Id`, naming);
}

/**
 * The GraphQL scalar for a logical field type — a FIXED table. Decimal maps to a
 * custom `Decimal` scalar (serialised as a string end-to-end, matching the exact-
 * decimal contract — never a lossy Float); Date/DateTime map to a custom `DateTime`
 * scalar. Unknown types throw (a determinism-safe failure, not a silent default).
 */
function graphqlScalar(fieldType: string): string {
  switch (fieldType) {
    case 'String':
    case 'Text':
      return 'String';
    case 'Integer':
    case 'Long':
      return 'Int';
    case 'Decimal':
      return 'Decimal';
    case 'Boolean':
      return 'Boolean';
    case 'Date':
    case 'DateTime':
      return 'DateTime';
    default:
      throw new Error(`Unsupported field type "${fieldType}" for GraphQL SDL.`);
  }
}

/** A field line `  <name>: <Scalar>[!]` — required fields are non-null. */
function fieldLine(name: string, scalar: string, required: boolean): string {
  return `  ${name}: ${scalar}${required ? '!' : ''}`;
}

export interface SdlOptions {
  /** Multi-user projects expose an ownerId on each type (read-only, not in Input). */
  multiUser: boolean;
  /** Wire-key naming convention (default = declared names). */
  naming: NamingConvention;
}

/**
 * Build the canonical GraphQL SDL for a model's entities. Pure and total: the SAME
 * (entities, options) always yields the SAME string (byte-identical). Entities are
 * sorted by name here, so the CALLER need not pre-sort (defence in depth against a
 * caller passing model order). Returns '' for zero entities (an empty schema is a
 * caller concern; GraphQL projects always have ≥1 entity).
 */
export function buildCanonicalSdl(entities: Entity[], opts: SdlOptions): string {
  const sorted = [...entities].sort(byName);
  const naming = opts.naming;

  // Scalars: DateTime always; Decimal only when some entity has a Decimal field
  // (additive, gated — so a Decimal-free schema is byte-identical without it).
  const hasDecimal = sorted.some((e) => e.fields.some((f) => f.type === 'Decimal'));
  const scalars = ['scalar DateTime', ...(hasDecimal ? ['scalar Decimal'] : [])];

  const typeBlocks: string[] = [];
  for (const e of sorted) {
    // The object type: id, declared fields (declared order), FKs (authored order),
    // owner (if multi-user), audit — a fixed, stable sequence.
    const typeLines: string[] = [`type ${e.name} {`, `  id: ID!`];
    for (const f of e.fields) typeLines.push(fieldLine(fieldWireKey(f, naming), graphqlScalar(f.type), f.required));
    for (const r of belongsToRels(e)) typeLines.push(fieldLine(fkWireKey(r, naming), 'ID', r.required));
    if (opts.multiUser) typeLines.push(`  ownerId: ID`);
    typeLines.push(`  createdAt: DateTime`, `  updatedAt: DateTime`, `}`);

    // The input type: the WRITABLE fields only (declared fields + FKs) — no
    // id/owner/audit (server-managed). Same order as the object type's writable part.
    const inputLines: string[] = [`input ${e.name}Input {`];
    for (const f of e.fields) inputLines.push(fieldLine(fieldWireKey(f, naming), graphqlScalar(f.type), f.required));
    for (const r of belongsToRels(e)) inputLines.push(fieldLine(fkWireKey(r, naming), 'ID', r.required));
    inputLines.push(`}`);

    typeBlocks.push(typeLines.join('\n'), inputLines.join('\n'));
  }

  // Query: per entity (sorted), the collection then the single lookup.
  const queryLines: string[] = ['type Query {'];
  for (const e of sorted) {
    queryLines.push(`  ${pluralField(e)}: [${e.name}!]!`);
    queryLines.push(`  ${singularField(e)}(id: ID!): ${e.name}`);
  }
  queryLines.push('}');

  // Mutation: per entity (sorted), create / update / delete.
  const mutationLines: string[] = ['type Mutation {'];
  for (const e of sorted) {
    mutationLines.push(`  create${e.name}(input: ${e.name}Input!): ${e.name}!`);
    mutationLines.push(`  update${e.name}(id: ID!, input: ${e.name}Input!): ${e.name}!`);
    mutationLines.push(`  delete${e.name}(id: ID!): Boolean!`);
  }
  mutationLines.push('}');

  return [
    `# THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `# GraphQL schema derived deterministically from the project model:`,
    `#   types sorted by entity name; fields in declared order; id/owner/audit appended.`,
    ``,
    scalars.join('\n'),
    ``,
    ...typeBlocks,
    queryLines.join('\n'),
    ``,
    mutationLines.join('\n'),
    ``,
  ].join('\n');
}

/*
 * Thraksha — Express entity code generator.
 *
 * The Express counterpart of the Spring entity codegen: it turns one Entity
 * from the Project Model into a working CRUD slice for an Express + PostgreSQL
 * backend. Same model in; idiomatic Express/Node out.
 *
 * BINDING RULES (identical obligations to the Spring plugin):
 *   ADR-001  No AI. Pure, total functions of the Entity + context.
 *   ADR-002  Each file is tagged THRAKSHA (regenerated) or DEVELOPER (created
 *            once, then never touched). The developer's service/routes survive
 *            regeneration; the generated bases are rewritten freely.
 *   ADR-003  Deterministic: field order follows the model; no timestamps, no
 *            randomness.
 *   ADR-004  Defaults (required->optional, unique->no, String length 255) are
 *            applied here and reported via describeEntityDefaults().
 *   ADR-005  When multiUser is on, every entity is owner-scoped.
 *   Laws 19-21  Ordinary Node/SQL — no Thraksha markers the project needs to run.
 */

import type { Entity, Field, Relationship } from '../../core/project-model.js';
import type { GeneratedFile } from '../../core/plugin.js';
import type { SqlDialect } from '../../core/database.js';
import { applyNaming, type NamingConvention } from '../../core/style.js';

/** Context the Express plugin derives from the agnostic EntityGenerationContext. */
export interface EntityCodegenContext {
  multiUser: boolean;
  migrationVersion: number; // V1 is the users table from the shell
  sql: SqlDialect; // the selected database's SQL dialect
  // When true (Postgres), INSERT/UPDATE … RETURNING reads the row back in one
  // statement; when false (MySQL 8, no RETURNING), the repository inserts/updates
  // and then selects the row back by id.
  supportsReturning: boolean;
  // Coding-style: the wire-key naming convention for declared fields (Day 12).
  // 'default' is a bypass — response/request keys stay exactly as before.
  naming: NamingConvention;
}

/**
 * The JSON wire key for a declared field — the ONLY thing naming governs here.
 * 'default' returns the declared name unchanged. This moves the response object
 * key (rowToObject) and the request read key (dto) TOGETHER; the `row.<column>`
 * accessor, the SQL column, and the internal `data.<declaredName>` contract are
 * NOT touched (Risk 1).
 */
function wireKey(field: Field, ctx: EntityCodegenContext): string {
  return applyNaming(field.name, ctx.naming);
}

const DEFAULT_STRING_LENGTH = 255;
// Supported field-type validation now lives in the database provider's SqlDialect.

// ---------------------------------------------------------------------------
// Naming helpers (deterministic, total) — identical conventions to Spring so
// the database schema matches.
// ---------------------------------------------------------------------------

function snakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function pluralize(s: string): string {
  return `${s}s`;
}

function entitySlug(entity: Entity): string {
  return entity.name.toLowerCase();
}

function tableName(entity: Entity): string {
  return pluralize(snakeCase(entity.name));
}

function columnName(field: Field): string {
  return snakeCase(field.name);
}

// ---------------------------------------------------------------------------
// Relationship helpers (belongs-to only). The FK is an extra writable column:
// column `<target>_id` (matching Spring/FastAPI) with a camelCase data key
// `<target>Id` (matching this stack's ownerId convention). Emission is always a
// loop over these, so relationship-free entities are byte-identical to before.
// ---------------------------------------------------------------------------

/** PascalCase -> camelCase (first char lowered), e.g. Application -> application. */
function decapitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** The belongs-to relationships on an entity, in authored order (deterministic). */
function belongsToRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'belongs-to');
}

/** FK DB column, e.g. Application -> application_id. */
function fkColumnName(rel: Relationship): string {
  return `${snakeCase(rel.target)}_id`;
}

/** FK data key on the JS object, e.g. Application -> applicationId. */
function fkDataKey(rel: Relationship): string {
  return `${decapitalize(rel.target)}Id`;
}

/** Referenced table, e.g. Application -> applications. */
function fkRefTable(rel: Relationship): string {
  return pluralize(snakeCase(rel.target));
}

function isStringType(fieldType: string): boolean {
  return fieldType === 'String' || fieldType === 'Text';
}

function maxLengthOf(field: Field): number {
  const v = field.validation;
  if (v && typeof v === 'object' && 'maxLength' in v) {
    const ml = (v as { maxLength?: unknown }).maxLength;
    if (typeof ml === 'number' && Number.isInteger(ml) && ml > 0) return ml;
  }
  return DEFAULT_STRING_LENGTH;
}

// SQL DDL column types now come from the selected database's SqlDialect (ctx.sql).

/** Validate that a field's type is supported (throws via the dialect). */
function assertSupported(field: Field, sql: SqlDialect): void {
  sql.columnType(field.type, { maxLength: maxLengthOf(field) }); // throws on unsupported
}

// ---------------------------------------------------------------------------
// File builders.
// ---------------------------------------------------------------------------

function buildModel(entity: Entity, ctx: EntityCodegenContext): string {
  const fieldLines = entity.fields.map(
    (f) =>
      `    { name: '${f.name}', column: '${columnName(f)}', type: '${f.type}', required: ${f.required}, unique: ${f.unique} },`,
  );
  return [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Field metadata for the ${entity.name} entity.`,
    `module.exports = {`,
    `  name: '${entity.name}',`,
    `  table: '${tableName(entity)}',`,
    `  basePath: '/api/${tableName(entity)}',`,
    `  multiUser: ${ctx.multiUser},`,
    `  fields: [`,
    ...fieldLines,
    `  ],`,
    `};`,
    ``,
  ].join('\n');
}

/**
 * The insert() method body. With RETURNING (Postgres) the row is read back in one
 * statement; without it (MySQL) we insert then SELECT by the new row's id. The
 * RETURNING branch is byte-identical to the original single-database output.
 */
function insertMethod(opts: {
  ownerScoped: boolean;
  returning: boolean;
  table: string;
  cols: string; // insert columns, comma-joined
  placeholders: string; // '$1, $2, …'
  values: string; // JS value expressions, comma-joined
}): string[] {
  const sig = opts.ownerScoped ? 'insert(data, ownerId)' : 'insert(data)';
  if (opts.returning) {
    return [
      `async function ${sig} {`,
      `  const { rows } = await pool.query(`,
      `    'INSERT INTO ${opts.table} (${opts.cols}) VALUES (${opts.placeholders}) RETURNING ' + COLUMNS,`,
      `    [${opts.values}],`,
      `  );`,
      `  return rowToObject(rows[0]);`,
      `}`,
    ];
  }
  return [
    `async function ${sig} {`,
    `  const result = await pool.query(`,
    `    'INSERT INTO ${opts.table} (${opts.cols}) VALUES (${opts.placeholders})',`,
    `    [${opts.values}],`,
    `  );`,
    `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${opts.table} WHERE id = $1', [result.insertId]);`,
    `  return rowToObject(rows[0]);`,
    `}`,
  ];
}

/**
 * The update() method body. With RETURNING (Postgres) the updated row is read back
 * in one statement; without it (MySQL) we update then SELECT the row back (by id,
 * owner-scoped when multi-user), preserving the "null when not found" contract.
 */
function updateMethod(opts: {
  ownerScoped: boolean;
  returning: boolean;
  table: string;
  setClause: string;
  where: string;
  values: string;
  selectBackWhere: string;
  selectBackParams: string;
}): string[] {
  const sig = opts.ownerScoped ? 'update(id, data, ownerId)' : 'update(id, data)';
  if (opts.returning) {
    return [
      `async function ${sig} {`,
      `  const { rows } = await pool.query(`,
      `    'UPDATE ${opts.table} SET ${opts.setClause}, updated_at = now() WHERE ${opts.where} RETURNING ' + COLUMNS,`,
      `    [${opts.values}],`,
      `  );`,
      `  return rowToObject(rows[0]);`,
      `}`,
    ];
  }
  return [
    `async function ${sig} {`,
    `  await pool.query(`,
    `    'UPDATE ${opts.table} SET ${opts.setClause}, updated_at = now() WHERE ${opts.where}',`,
    `    [${opts.values}],`,
    `  );`,
    `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${opts.table} WHERE ${opts.selectBackWhere}', [${opts.selectBackParams}]);`,
    `  return rowToObject(rows[0]);`,
    `}`,
  ];
}

function buildRepository(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const table = tableName(entity);
  const fields = entity.fields;
  const ownerCols = ctx.multiUser ? ['owner_id'] : [];

  // belongs-to FKs are extra writable columns, sitting with the fields (before
  // owner). writeCols/writeVals drive insert/update; placeholder $N indices are
  // derived from writeCols.length so owner/id positions shift correctly.
  const fkRels = belongsToRels(entity);
  const writeCols = [...fields.map(columnName), ...fkRels.map(fkColumnName)];
  const writeVals = [...fields.map((f) => `data.${f.name}`), ...fkRels.map((r) => `data.${fkDataKey(r)}`)];

  const allColumns = ['id', ...writeCols, ...ownerCols, 'created_at', 'updated_at'].join(', ');

  // rowToObject mapping. The wire KEY (LHS) follows the naming convention; the
  // `row.<column>` accessor (RHS) stays the snake_case DB column (Risk 1).
  const mapLines: string[] = [`    id: row.id,`];
  for (const f of fields) mapLines.push(`    ${wireKey(f, ctx)}: row.${columnName(f)},`);
  for (const r of fkRels) mapLines.push(`    ${fkDataKey(r)}: row.${fkColumnName(r)},`);
  if (ctx.multiUser) mapLines.push(`    ownerId: row.owner_id,`);
  mapLines.push(`    createdAt: row.created_at,`, `    updatedAt: row.updated_at,`);

  // insert.
  const insertCols = [...writeCols, ...ownerCols];
  const insertPlaceholders = insertCols.map((_c, i) => `$${i + 1}`).join(', ');
  const insertValues = [...writeVals, ...(ctx.multiUser ? ['ownerId'] : [])].join(', ');

  // update.
  const setClause = writeCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const idIndex = writeCols.length + 1;
  const ownerIndexU = writeCols.length + 2;
  const updateWhere = ctx.multiUser ? `id = $${idIndex} AND owner_id = $${ownerIndexU}` : `id = $${idIndex}`;
  const updateValues = [...writeVals, 'id', ...(ctx.multiUser ? ['ownerId'] : [])].join(', ');

  const lines: string[] = [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Owner-scoped data access for ${name} (multi-user, ADR-005).`,
    `const pool = require('../../db');`,
    ``,
    `const COLUMNS = '${allColumns}';`,
    ``,
    `function rowToObject(row) {`,
    `  if (!row) return null;`,
    `  return {`,
    ...mapLines,
    `  };`,
    `}`,
    ``,
  ];

  if (ctx.multiUser) {
    lines.push(
      `async function findAll(ownerId) {`,
      `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} WHERE owner_id = $1 ORDER BY id', [ownerId]);`,
      `  return rows.map(rowToObject);`,
      `}`,
      ``,
      `async function findById(id, ownerId) {`,
      `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} WHERE id = $1 AND owner_id = $2', [id, ownerId]);`,
      `  return rowToObject(rows[0]);`,
      `}`,
      ``,
      ...insertMethod({
        ownerScoped: true,
        returning: ctx.supportsReturning,
        table,
        cols: insertCols.join(', '),
        placeholders: insertPlaceholders,
        values: insertValues,
      }),
      ``,
      ...updateMethod({
        ownerScoped: true,
        returning: ctx.supportsReturning,
        table,
        setClause,
        where: updateWhere,
        values: updateValues,
        selectBackWhere: 'id = $1 AND owner_id = $2',
        selectBackParams: 'id, ownerId',
      }),
      ``,
      `async function remove(id, ownerId) {`,
      `  const { rowCount } = await pool.query('DELETE FROM ${table} WHERE id = $1 AND owner_id = $2', [id, ownerId]);`,
      `  return rowCount > 0;`,
      `}`,
    );
  } else {
    const insertColsNo = writeCols;
    const insertPh = insertColsNo.map((_c, i) => `$${i + 1}`).join(', ');
    const insertVals = writeVals.join(', ');
    const updWhere = `id = $${writeCols.length + 1}`;
    const updVals = [...writeVals, 'id'].join(', ');
    lines.push(
      `async function findAll() {`,
      `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} ORDER BY id');`,
      `  return rows.map(rowToObject);`,
      `}`,
      ``,
      `async function findById(id) {`,
      `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} WHERE id = $1', [id]);`,
      `  return rowToObject(rows[0]);`,
      `}`,
      ``,
      ...insertMethod({
        ownerScoped: false,
        returning: ctx.supportsReturning,
        table,
        cols: insertColsNo.join(', '),
        placeholders: insertPh,
        values: insertVals,
      }),
      ``,
      ...updateMethod({
        ownerScoped: false,
        returning: ctx.supportsReturning,
        table,
        setClause,
        where: updWhere,
        values: updVals,
        selectBackWhere: 'id = $1',
        selectBackParams: 'id',
      }),
      ``,
      `async function remove(id) {`,
      `  const { rowCount } = await pool.query('DELETE FROM ${table} WHERE id = $1', [id]);`,
      `  return rowCount > 0;`,
      `}`,
    );
  }

  lines.push(``, `module.exports = { findAll, findById, insert, update, remove };`, ``);
  return lines.join('\n');
}

function validationLinesFor(field: Field, ctx: EntityCodegenContext): string[] {
  // `w` is the WIRE key the client sends/receives (naming-governed): the reads
  // (body.<w>) and the error messages both use it. `col` is the INTERNAL data key
  // the dto hands to the repository — it stays the DECLARED name so it matches the
  // repository's writeVals (`data.<declaredName>`); the repository maps it to the
  // snake_case column. So the wire key moves; the internal mapping does not.
  const w = wireKey(field, ctx);
  const col = field.name;
  const lines: string[] = [];
  const typeLabel = field.type;
  // Presence (required).
  if (field.required) {
    lines.push(`  if (body.${w} === undefined || body.${w} === null || body.${w} === '') {`);
    lines.push(`    errors.push('${w} is required');`);
    lines.push(`  }`);
  }
  // Type + length checks (only when a value is present).
  if (isStringType(typeLabel)) {
    lines.push(`  if (body.${w} !== undefined && body.${w} !== null && typeof body.${w} !== 'string') {`);
    lines.push(`    errors.push('${w} must be a string');`);
    lines.push(`  } else if (typeof body.${w} === 'string' && body.${w}.length > ${maxLengthOf(field)}) {`);
    lines.push(`    errors.push('${w} must be at most ${maxLengthOf(field)} characters');`);
    lines.push(`  }`);
  } else if (typeLabel === 'Integer' || typeLabel === 'Long') {
    lines.push(`  if (body.${w} !== undefined && body.${w} !== null && !Number.isInteger(body.${w})) {`);
    lines.push(`    errors.push('${w} must be an integer');`);
    lines.push(`  }`);
  } else if (typeLabel === 'Decimal') {
    lines.push(`  if (body.${w} !== undefined && body.${w} !== null && typeof body.${w} !== 'number') {`);
    lines.push(`    errors.push('${w} must be a number');`);
    lines.push(`  }`);
  } else if (typeLabel === 'Boolean') {
    lines.push(`  if (body.${w} !== undefined && body.${w} !== null && typeof body.${w} !== 'boolean') {`);
    lines.push(`    errors.push('${w} must be a boolean');`);
    lines.push(`  }`);
  } else {
    // Date / DateTime — accept an ISO string.
    lines.push(`  if (body.${w} !== undefined && body.${w} !== null && typeof body.${w} !== 'string') {`);
    lines.push(`    errors.push('${w} must be an ISO date string');`);
    lines.push(`  }`);
  }
  lines.push(`  data.${col} = body.${w} === undefined ? null : body.${w};`);
  return lines;
}

/** Validation for a belongs-to FK (an integer parent id), keyed by <target>Id. */
function fkValidationLines(rel: Relationship): string[] {
  const n = fkDataKey(rel);
  const lines: string[] = [];
  if (rel.required) {
    lines.push(`  if (body.${n} === undefined || body.${n} === null || body.${n} === '') {`);
    lines.push(`    errors.push('${n} is required');`);
    lines.push(`  }`);
  }
  lines.push(`  if (body.${n} !== undefined && body.${n} !== null && !Number.isInteger(body.${n})) {`);
  lines.push(`    errors.push('${n} must be an integer');`);
  lines.push(`  }`);
  lines.push(`  data.${n} = body.${n} === undefined ? null : body.${n};`);
  return lines;
}

function buildDto(entity: Entity, ctx: EntityCodegenContext): string {
  const fieldBlocks = [
    ...entity.fields.map((f) => validationLinesFor(f, ctx).join('\n')),
    ...belongsToRels(entity).map((r) => fkValidationLines(r).join('\n')),
  ];
  return [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Validation for ${entity.name}, derived from the field rules.`,
    `const { httpError } = require('../../http-error');`,
    ``,
    `// Validate a create/update body; returns only the writable fields.`,
    `function validate(body) {`,
    `  const errors = [];`,
    `  const data = {};`,
    fieldBlocks.join('\n'),
    `  if (errors.length > 0) throw httpError(400, errors.join('; '));`,
    `  return data;`,
    `}`,
    ``,
    `module.exports = { validate };`,
    ``,
  ].join('\n');
}

function buildServiceBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  // For multiUser, repository methods take a trailing ownerId; otherwise not.
  const ownerArg = (extra: string) => (ctx.multiUser ? (extra ? `${extra}, ctx.ownerId` : 'ctx.ownerId') : extra);
  return [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Standard CRUD for ${name}${ctx.multiUser ? ', scoped to the current user (ADR-005)' : ''}.`,
    `const { httpError } = require('../../http-error');`,
    ``,
    `function create${name}ServiceBase(repository) {`,
    `  return {`,
    `    async list(ctx) {`,
    `      return repository.findAll(${ownerArg('')});`,
    `    },`,
    `    async get(ctx, id) {`,
    `      const found = await repository.findById(${ownerArg('id')});`,
    `      if (!found) throw httpError(404, '${name} ' + id + ' not found');`,
    `      return found;`,
    `    },`,
    `    async create(ctx, data) {`,
    `      return repository.insert(${ownerArg('data')});`,
    `    },`,
    `    async update(ctx, id, data) {`,
    `      const updated = await repository.update(${ownerArg('id, data')});`,
    `      if (!updated) throw httpError(404, '${name} ' + id + ' not found');`,
    `      return updated;`,
    `    },`,
    `    async remove(ctx, id) {`,
    `      const ok = await repository.remove(${ownerArg('id')});`,
    `      if (!ok) throw httpError(404, '${name} ' + id + ' not found');`,
    `    },`,
    `  };`,
    `}`,
    ``,
    `module.exports = { create${name}ServiceBase };`,
    ``,
  ].join('\n');
}

function buildControllerBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const ctxBody = ctx.multiUser ? `{ ownerId: req.userId }` : `{}`;
  return [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Express request handlers for ${name} CRUD.`,
    `const { validate } = require('./${slug}.dto');`,
    ``,
    `function create${name}Controller(service) {`,
    `  function ctxOf(req) {`,
    `    return ${ctxBody};`,
    `  }`,
    `  return {`,
    `    async list(req, res, next) {`,
    `      try { res.json(await service.list(ctxOf(req))); } catch (e) { next(e); }`,
    `    },`,
    `    async get(req, res, next) {`,
    `      try { res.json(await service.get(ctxOf(req), Number(req.params.id))); } catch (e) { next(e); }`,
    `    },`,
    `    async create(req, res, next) {`,
    `      try { res.status(201).json(await service.create(ctxOf(req), validate(req.body))); } catch (e) { next(e); }`,
    `    },`,
    `    async update(req, res, next) {`,
    `      try { res.json(await service.update(ctxOf(req), Number(req.params.id), validate(req.body))); } catch (e) { next(e); }`,
    `    },`,
    `    async remove(req, res, next) {`,
    `      try { await service.remove(ctxOf(req), Number(req.params.id)); res.status(204).end(); } catch (e) { next(e); }`,
    `    },`,
    `  };`,
    `}`,
    ``,
    `module.exports = { create${name}Controller };`,
    ``,
  ].join('\n');
}

function buildRoutesBase(entity: Entity): string {
  const name = entity.name;
  return [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Builds the standard CRUD router for ${name}, wired to the controller.`,
    `const express = require('express');`,
    ``,
    `function build${name}Router(controller) {`,
    `  const router = express.Router();`,
    `  router.get('/', controller.list);`,
    `  router.get('/:id', controller.get);`,
    `  router.post('/', controller.create);`,
    `  router.put('/:id', controller.update);`,
    `  router.delete('/:id', controller.remove);`,
    `  return router;`,
    `}`,
    ``,
    `module.exports = { build${name}Router };`,
    ``,
  ].join('\n');
}

function buildServiceDev(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `'use strict';`,
    `// DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    `//`,
    `// Add your business logic for ${name} here. The standard CRUD lives in`,
    `// ${slug}.service.base.js (Thraksha-owned). This file is safe to edit;`,
    `// regeneration will not touch it.`,
    `const { create${name}ServiceBase } = require('./${slug}.service.base');`,
    `const repository = require('./${slug}.repository');`,
    ``,
    `const ${slug}Service = create${name}ServiceBase(repository);`,
    ``,
    `// Your business logic goes here (override a method, or add new ones).`,
    ``,
    `module.exports = ${slug}Service;`,
    ``,
  ].join('\n');
}

function buildRoutesDev(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `'use strict';`,
    `// DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    `//`,
    `// Add custom ${name} endpoints here. The standard CRUD wiring lives in`,
    `// ${slug}.routes.base.js (Thraksha-owned). This file is safe to edit;`,
    `// regeneration will not touch it.`,
    `const { create${name}Controller } = require('./${slug}.controller.base');`,
    `const { build${name}Router } = require('./${slug}.routes.base');`,
    `const service = require('./${slug}.service');`,
    ``,
    `const controller = create${name}Controller(service);`,
    `const router = build${name}Router(controller);`,
    ``,
    `// Your custom routes go here, e.g. router.get('/search', ...).`,
    ``,
    `module.exports = { basePath: '/api/${tableName(entity)}', router };`,
    ``,
  ].join('\n');
}

function buildMigration(entity: Entity, ctx: EntityCodegenContext): string {
  const table = tableName(entity);
  const lines: string[] = [
    `-- V${ctx.migrationVersion} — ${entity.name}`,
    `-- THRAKSHA-OWNED — regenerated on every run.`,
    `-- Table for the ${entity.name} entity. Columns match the model's fields.`,
  ];
  if (ctx.multiUser) {
    lines.push(`-- Multi-user (ADR-005): owner_id ties each row to its owning user.`);
  }
  lines.push(``, `CREATE TABLE ${table} (`);

  const cols: string[] = [`    id          ${ctx.sql.identityPrimaryKey()}`];
  for (const f of entity.fields) {
    const notNull = f.required ? ' NOT NULL' : '';
    cols.push(`    ${columnName(f)} ${ctx.sql.columnType(f.type, { maxLength: maxLengthOf(f) })}${notNull}`);
  }
  // Foreign-key columns for belongs-to relationships (authored order).
  for (const r of belongsToRels(entity)) {
    const notNull = r.required ? ' NOT NULL' : '';
    cols.push(`    ${fkColumnName(r)} ${ctx.sql.bigInt()}${notNull}`);
  }
  if (ctx.multiUser) cols.push(`    owner_id    ${ctx.sql.bigInt()}`);
  cols.push(`    created_at  ${ctx.sql.timestampDefaultNow()}`);
  cols.push(`    updated_at  ${ctx.sql.timestampDefaultNow()}`);
  lines.push(cols.join(',\n'));
  lines.push(`);`);

  for (const f of entity.fields) {
    if (f.unique) lines.push(``, ctx.sql.index(`ux_${table}_${columnName(f)}`, table, columnName(f), true));
  }
  // Foreign-key constraints + indexes (the referenced table precedes this one).
  for (const r of belongsToRels(entity)) {
    const col = fkColumnName(r);
    lines.push(``, ctx.sql.foreignKey(table, `fk_${table}_${snakeCase(r.target)}`, col, fkRefTable(r)));
    lines.push(``, ctx.sql.index(`idx_${table}_${col}`, table, col, false));
  }
  if (ctx.multiUser) lines.push(``, ctx.sql.index(`idx_${table}_owner_id`, table, 'owner_id', false));
  lines.push(``);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// architectureDepth: 'simple' (Day 13) — a flatter file set. model.js and
// repository.js are REMOVED; service.base + controller.base + routes.base + the
// data access MERGE into one crud.base.js whose handlers do CRUD directly against
// the pool. dto.js stays (validation). The developer seam (service.js + routes.js)
// is unchanged in role and still auto-mounted by src/app.js; only the Thraksha
// base-layer count changes. Naming (Risk 1) is preserved: rowToObject emits the
// wire key, the accessor stays the column, and the dto→crud contract is
// data.<declaredName> exactly as before. Multi-user + belongs-to FK writes survive.
// ---------------------------------------------------------------------------

/** The merged CRUD module: data access + service factory + router builder. */
function buildExpressCrudBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const table = tableName(entity);
  const fields = entity.fields;
  const ownerCols = ctx.multiUser ? ['owner_id'] : [];
  const fkRels = belongsToRels(entity);

  // Same write columns/values as the layered repository (data.<declaredName> is
  // the internal contract the dto produces; the wire key rides in rowToObject).
  const writeCols = [...fields.map(columnName), ...fkRels.map(fkColumnName)];
  const writeVals = [...fields.map((f) => `data.${f.name}`), ...fkRels.map((r) => `data.${fkDataKey(r)}`)];
  const allColumns = ['id', ...writeCols, ...ownerCols, 'created_at', 'updated_at'].join(', ');

  const mapLines: string[] = [`    id: row.id,`];
  for (const f of fields) mapLines.push(`    ${wireKey(f, ctx)}: row.${columnName(f)},`);
  for (const r of fkRels) mapLines.push(`    ${fkDataKey(r)}: row.${fkColumnName(r)},`);
  if (ctx.multiUser) mapLines.push(`    ownerId: row.owner_id,`);
  mapLines.push(`    createdAt: row.created_at,`, `    updatedAt: row.updated_at,`);

  const insertCols = [...writeCols, ...ownerCols];
  const insertPlaceholders = insertCols.map((_c, i) => `$${i + 1}`).join(', ');
  const insertValues = [...writeVals, ...(ctx.multiUser ? ['ownerId'] : [])].join(', ');
  const setClause = writeCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const idIndex = writeCols.length + 1;
  const updateWhere = ctx.multiUser ? `id = $${idIndex} AND owner_id = $${idIndex + 1}` : `id = $${idIndex}`;
  const updateValues = [...writeVals, 'id', ...(ctx.multiUser ? ['ownerId'] : [])].join(', ');

  // Data-access functions (was repository.js), now module-local in crud.base.
  const dataAccess: string[] = ctx.multiUser
    ? [
        `async function findAll(ownerId) {`,
        `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} WHERE owner_id = $1 ORDER BY id', [ownerId]);`,
        `  return rows.map(rowToObject);`,
        `}`,
        ``,
        `async function findById(id, ownerId) {`,
        `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} WHERE id = $1 AND owner_id = $2', [id, ownerId]);`,
        `  return rowToObject(rows[0]);`,
        `}`,
        ``,
        ...insertMethod({ ownerScoped: true, returning: ctx.supportsReturning, table, cols: insertCols.join(', '), placeholders: insertPlaceholders, values: insertValues }),
        ``,
        ...updateMethod({ ownerScoped: true, returning: ctx.supportsReturning, table, setClause, where: updateWhere, values: updateValues, selectBackWhere: 'id = $1 AND owner_id = $2', selectBackParams: 'id, ownerId' }),
        ``,
        `async function remove(id, ownerId) {`,
        `  const { rowCount } = await pool.query('DELETE FROM ${table} WHERE id = $1 AND owner_id = $2', [id, ownerId]);`,
        `  return rowCount > 0;`,
        `}`,
      ]
    : [
        `async function findAll() {`,
        `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} ORDER BY id');`,
        `  return rows.map(rowToObject);`,
        `}`,
        ``,
        `async function findById(id) {`,
        `  const { rows } = await pool.query('SELECT ' + COLUMNS + ' FROM ${table} WHERE id = $1', [id]);`,
        `  return rowToObject(rows[0]);`,
        `}`,
        ``,
        ...insertMethod({ ownerScoped: false, returning: ctx.supportsReturning, table, cols: writeCols.join(', '), placeholders: writeCols.map((_c, i) => `$${i + 1}`).join(', '), values: writeVals.join(', ') }),
        ``,
        ...updateMethod({ ownerScoped: false, returning: ctx.supportsReturning, table, setClause, where: `id = $${writeCols.length + 1}`, values: [...writeVals, 'id'].join(', '), selectBackWhere: 'id = $1', selectBackParams: 'id' }),
        ``,
        `async function remove(id) {`,
        `  const { rowCount } = await pool.query('DELETE FROM ${table} WHERE id = $1', [id]);`,
        `  return rowCount > 0;`,
        `}`,
      ];

  // Service factory (was service.base.js) — CRUD over the local repository object.
  const ownerArg = (extra: string) => (ctx.multiUser ? (extra ? `${extra}, ctx.ownerId` : 'ctx.ownerId') : extra);
  const ctxBody = ctx.multiUser ? `{ ownerId: req.userId }` : `{}`;

  return [
    `'use strict';`,
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Flat CRUD for ${name} (architectureDepth: simple): data access + service +`,
    `// router in one module${ctx.multiUser ? ', owner-scoped (ADR-005)' : ''}. Your business logic belongs in`,
    `// ${slug}.service.js, which wraps create${name}ServiceBase(); custom routes go in ${slug}.routes.js.`,
    `const express = require('express');`,
    `const pool = require('../../db');`,
    `const { httpError } = require('../../http-error');`,
    `const { validate } = require('./${slug}.dto');`,
    ``,
    `const COLUMNS = '${allColumns}';`,
    ``,
    `function rowToObject(row) {`,
    `  if (!row) return null;`,
    `  return {`,
    ...mapLines,
    `  };`,
    `}`,
    ``,
    ...dataAccess,
    ``,
    `const repository = { findAll, findById, insert, update, remove };`,
    ``,
    `// Standard CRUD${ctx.multiUser ? ', scoped to the current user' : ''}. The developer service (${slug}.service.js) wraps this.`,
    `function create${name}ServiceBase() {`,
    `  return {`,
    `    async list(ctx) {`,
    `      return repository.findAll(${ownerArg('')});`,
    `    },`,
    `    async get(ctx, id) {`,
    `      const found = await repository.findById(${ownerArg('id')});`,
    `      if (!found) throw httpError(404, '${name} ' + id + ' not found');`,
    `      return found;`,
    `    },`,
    `    async create(ctx, data) {`,
    `      return repository.insert(${ownerArg('data')});`,
    `    },`,
    `    async update(ctx, id, data) {`,
    `      const updated = await repository.update(${ownerArg('id, data')});`,
    `      if (!updated) throw httpError(404, '${name} ' + id + ' not found');`,
    `      return updated;`,
    `    },`,
    `    async remove(ctx, id) {`,
    `      const ok = await repository.remove(${ownerArg('id')});`,
    `      if (!ok) throw httpError(404, '${name} ' + id + ' not found');`,
    `    },`,
    `  };`,
    `}`,
    ``,
    `// Request handlers + router (was controller.base + routes.base).`,
    `function build${name}Router(service) {`,
    `  function ctxOf(req) {`,
    `    return ${ctxBody};`,
    `  }`,
    `  const router = express.Router();`,
    `  router.get('/', async (req, res, next) => {`,
    `    try { res.json(await service.list(ctxOf(req))); } catch (e) { next(e); }`,
    `  });`,
    `  router.get('/:id', async (req, res, next) => {`,
    `    try { res.json(await service.get(ctxOf(req), Number(req.params.id))); } catch (e) { next(e); }`,
    `  });`,
    `  router.post('/', async (req, res, next) => {`,
    `    try { res.status(201).json(await service.create(ctxOf(req), validate(req.body))); } catch (e) { next(e); }`,
    `  });`,
    `  router.put('/:id', async (req, res, next) => {`,
    `    try { res.json(await service.update(ctxOf(req), Number(req.params.id), validate(req.body))); } catch (e) { next(e); }`,
    `  });`,
    `  router.delete('/:id', async (req, res, next) => {`,
    `    try { await service.remove(ctxOf(req), Number(req.params.id)); res.status(204).end(); } catch (e) { next(e); }`,
    `  });`,
    `  return router;`,
    `}`,
    ``,
    `module.exports = { create${name}ServiceBase, build${name}Router };`,
    ``,
  ].join('\n');
}

/** DEVELOPER-OWNED service (simple): wraps create<Name>ServiceBase() from crud.base. */
function buildServiceDevSimple(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `'use strict';`,
    `// DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    `//`,
    `// Add your business logic for ${name} here. The standard CRUD lives in`,
    `// ${slug}.crud.base.js (Thraksha-owned). This file is safe to edit;`,
    `// regeneration will not touch it.`,
    `const { create${name}ServiceBase } = require('./${slug}.crud.base');`,
    ``,
    `const ${slug}Service = create${name}ServiceBase();`,
    ``,
    `// Your business logic goes here (override a method, or add new ones).`,
    ``,
    `module.exports = ${slug}Service;`,
    ``,
  ].join('\n');
}

/** DEVELOPER-OWNED routes (simple): builds the router from crud.base; shell-mounted. */
function buildRoutesDevSimple(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `'use strict';`,
    `// DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    `//`,
    `// Add custom ${name} endpoints here. The standard CRUD wiring lives in`,
    `// ${slug}.crud.base.js (Thraksha-owned). This file is safe to edit;`,
    `// regeneration will not touch it.`,
    `const { build${name}Router } = require('./${slug}.crud.base');`,
    `const service = require('./${slug}.service');`,
    ``,
    `const router = build${name}Router(service);`,
    ``,
    `// Your custom routes go here, e.g. router.get('/search', ...).`,
    ``,
    `module.exports = { basePath: '/api/${tableName(entity)}', router };`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/** Generate all Express files for one entity, each tagged with its ownership. */
export function generateEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  for (const f of entity.fields) assertSupported(f, ctx.sql);
  const slug = entitySlug(entity);
  const dir = `src/entities/${slug}`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  return [
    // THRAKSHA-OWNED — regenerated freely.
    { relPath: `${dir}/${slug}.model.js`, content: buildModel(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/${slug}.repository.js`, content: buildRepository(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/${slug}.dto.js`, content: buildDto(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/${slug}.service.base.js`, content: buildServiceBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/${slug}.controller.base.js`, content: buildControllerBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/${slug}.routes.base.js`, content: buildRoutesBase(entity), ownership: 'thraksha' },
    { relPath: `migrations/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again.
    { relPath: `${dir}/${slug}.service.js`, content: buildServiceDev(entity), ownership: 'developer' },
    { relPath: `${dir}/${slug}.routes.js`, content: buildRoutesDev(entity), ownership: 'developer' },
  ];
}

/**
 * architectureDepth: 'simple' file set (Day 13) — flatter: no model.js, no
 * repository.js; service.base + controller.base + routes.base merged into
 * crud.base.js. dto.js stays (validation). The developer seam (service.js +
 * routes.js) is present and unchanged in role (auto-mounted by src/app.js); only
 * the Thraksha base-layer count changes. Same ctx, so naming (rowToObject wire
 * key + dto read key) and multi-user/FK logic compose exactly as in the default.
 */
export function generateSimpleEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  for (const f of entity.fields) assertSupported(f, ctx.sql);
  const slug = entitySlug(entity);
  const dir = `src/entities/${slug}`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  return [
    // THRAKSHA-OWNED — regenerated freely. (model/repository/service.base/
    // controller.base/routes.base collapsed into crud.base; dto kept.)
    { relPath: `${dir}/${slug}.dto.js`, content: buildDto(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/${slug}.crud.base.js`, content: buildExpressCrudBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `migrations/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again. Same seam files,
    // wired to crud.base instead of the layered modules.
    { relPath: `${dir}/${slug}.service.js`, content: buildServiceDevSimple(entity), ownership: 'developer' },
    { relPath: `${dir}/${slug}.routes.js`, content: buildRoutesDevSimple(entity), ownership: 'developer' },
  ];
}

/**
 * Human-readable lines describing the effective field rules and which were
 * filled in by platform defaults (ADR-004 — shown, never silent).
 */
export function describeEntityDefaults(entity: Entity): string[] {
  const lines: string[] = [];
  for (const f of entity.fields) {
    const parts: string[] = [`${f.type}`];
    parts.push(f.required ? 'required=true' : 'required=false (default: optional)');
    parts.push(f.unique ? 'unique=true' : 'unique=false (default: no)');
    if (isStringType(f.type)) {
      const ml = maxLengthOf(f);
      parts.push(ml === DEFAULT_STRING_LENGTH ? `maxLength=${ml} (default for ${f.type})` : `maxLength=${ml}`);
    }
    lines.push(`${entity.name}.${f.name}: ${parts.join(', ')}`);
  }
  // Relationships — shown, never silent (ADR-004). belongs-to adds a FK column.
  for (const r of belongsToRels(entity)) {
    const req = r.required ? 'required=true' : 'required=false (default: optional)';
    lines.push(`${entity.name} belongs-to ${r.target}: ${fkColumnName(r)}, ${req}`);
  }
  return lines;
}

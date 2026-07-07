/*
 * Thraksha — Go entity code generator.
 *
 * The Go counterpart of the Spring/Express/FastAPI/Django entity codegens: it turns
 * one Entity from the Project Model into a working CRUD slice for a Go
 * (net/http + database/sql) backend. Same model in; idiomatic Go out.
 *
 * BINDING RULES (identical obligations to the other plugins):
 *   ADR-001  No AI. Pure, total functions of the Entity + context.
 *   ADR-002  Each file is tagged THRAKSHA (regenerated) or DEVELOPER (created
 *            once, then never touched). service.go / routes.go survive regen; the
 *            *_base.go / store.go files are rewritten freely.
 *   ADR-003  Deterministic: field order follows the model; no timestamps, no
 *            randomness, sorted iteration.
 *   ADR-004  Defaults (required->optional, unique->no, String length 255) are
 *            applied here and reported via describeEntityDefaults().
 *   ADR-005  When multiUser is on, every entity is owner-scoped.
 *   Laws 19-21  Ordinary Go/SQL — no Thraksha markers the project needs to run.
 *
 * Day 8 (Step 1): entity CRUD on the selected database via the DatabaseProvider
 * SqlDialect seam. Relationships (belongs-to FKs) and MySQL runtime handling are
 * Day 9 — this file does not read entity.relationships yet.
 */

import type { Entity, Field, Relationship } from '../../core/project-model.js';
import type { GeneratedFile } from '../../core/plugin.js';
import type { SqlDialect } from '../../core/database.js';
import { applyNaming, type NamingConvention } from '../../core/style.js';

/** Context the Go plugin derives from the agnostic EntityGenerationContext. */
export interface EntityCodegenContext {
  multiUser: boolean;
  migrationVersion: number; // V1 is the users table from the shell
  sql: SqlDialect; // the selected database's SQL dialect
  // When true (Postgres), INSERT/UPDATE … RETURNING reads the row back in one
  // statement and placeholders are $N; when false (MySQL, no RETURNING),
  // insert/update then select the row back (LastInsertId) and placeholders are ?.
  supportsReturning: boolean;
  // Coding-style: the wire-key naming convention for declared fields (Day 12).
  // 'default' is a bypass — json tags stay exactly as before.
  naming: NamingConvention;
}

/**
 * The JSON wire key for a declared field — the ONLY thing naming governs here.
 * 'default' returns the declared name unchanged. The Go identifier (goFieldName)
 * and DB column (columnName) are NOT touched; only the json:"…" tag moves.
 */
function wireKey(field: Field, ctx: EntityCodegenContext): string {
  return applyNaming(field.name, ctx.naming);
}

const DEFAULT_STRING_LENGTH = 255;
const SUPPORTED_TYPES = 'String, Text, Integer, Long, Decimal, Boolean, Date, DateTime';

// A literal backtick, for Go struct tags, without fighting TS template literals.
const BT = String.fromCharCode(96);
const jsonTag = (name: string): string => `${BT}json:"${name}"${BT}`;

// ---------------------------------------------------------------------------
// Naming helpers (deterministic, total) — identical conventions to the other
// stacks so the database schema matches across all backends.
// ---------------------------------------------------------------------------

function snakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/** camelCase/lowercase field name -> exported Go identifier, e.g. dueDate -> DueDate. */
function pascalCase(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
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

function goFieldName(field: Field): string {
  return pascalCase(field.name);
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

/** The Go base type for a logical field type. */
function goBaseType(field: Field): string {
  switch (field.type) {
    case 'String':
    case 'Text':
      return 'string';
    case 'Integer':
    case 'Long':
      return 'int64';
    case 'Decimal':
      return 'string'; // no native decimal; the driver returns NUMERIC as text
    case 'Boolean':
      return 'bool';
    case 'Date':
    case 'DateTime':
      return 'time.Time';
    default:
      throw new Error(`Unsupported field type "${field.type}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`);
  }
}

/** The Go struct type for a field: value if required, pointer if optional. */
function goStructType(field: Field): string {
  const base = goBaseType(field);
  return field.required ? base : `*${base}`;
}

function assertSupported(field: Field): void {
  goBaseType(field); // throws on unsupported type
}

// ---------------------------------------------------------------------------
// Relationship helpers (belongs-to only) — identical naming to the other stacks
// so the database schema matches. The FK is a scalar column mirroring owner_id;
// the DB constraint lives in the SQL migration. Emission is always a loop over
// these, so relationship-free entities are byte-identical to before.
// ---------------------------------------------------------------------------

/** PascalCase -> camelCase (first char lowered), e.g. Application -> application. */
function decapitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** The belongs-to relationships on an entity, in authored order (deterministic). */
function belongsToRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'belongs-to');
}

// has-many (Day 25) — the REVERSE projection of a belongs-to FK. NO schema change:
// the child already carries `<parent>_id`. has-many adds ONLY a parent-side collection
// endpoint (GET /api/<parents>/{id}/<children>) querying the child table by the existing
// FK column. Emission is a loop over hasManyRels, so has-many-free entities are byte-
// identical (a literal bypass, exactly like belongs-to). Child table + FK derived by the
// SAME convention belongs-to uses, so no child-side change is needed.

/** The has-many relationships on an entity, in authored order (deterministic). */
function hasManyRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'has-many');
}

/** The child table for a has-many, e.g. has-many Application -> applications. */
function childTable(rel: Relationship): string {
  return pluralize(snakeCase(rel.target));
}

/** The child's FK column back to THIS parent, e.g. parent Team -> team_id. */
function reverseFkColumn(parent: Entity): string {
  return `${snakeCase(parent.name)}_id`;
}

/** FK DB column, e.g. Application -> application_id. */
function fkColumnName(rel: Relationship): string {
  return `${snakeCase(rel.target)}_id`;
}

/** FK Go struct field, e.g. Application -> ApplicationID. */
function fkFieldName(rel: Relationship): string {
  return `${pascalCase(rel.target)}ID`;
}

/** FK JSON key, e.g. Application -> applicationId. */
function fkJsonKey(rel: Relationship): string {
  return `${decapitalize(rel.target)}Id`;
}

/** Referenced table, e.g. Application -> applications. */
function fkRefTable(rel: Relationship): string {
  return pluralize(snakeCase(rel.target));
}

/** The Go struct type for a FK column: value if required, pointer if optional. */
function fkStructType(rel: Relationship): string {
  return rel.required ? 'int64' : '*int64';
}

// ---------------------------------------------------------------------------
// File builders.
// ---------------------------------------------------------------------------

/** The entity struct + JSON tags (ticket.go). */
function buildModel(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const lines: string[] = [
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Data model for the ${name} entity. Columns match the model's fields.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import "time"`,
    ``,
    `// ${name} is one ${name} row.`,
    `type ${name} struct {`,
    `\tID        int64     ${jsonTag('id')}`,
  ];
  for (const f of entity.fields) {
    lines.push(`\t${goFieldName(f)} ${goStructType(f)} ${jsonTag(wireKey(f, ctx))}`);
  }
  for (const r of belongsToRels(entity)) {
    lines.push(`\t${fkFieldName(r)} ${fkStructType(r)} ${jsonTag(fkJsonKey(r))}`);
  }
  if (ctx.multiUser) lines.push(`\tOwnerID   int64     ${jsonTag('ownerId')}`);
  lines.push(
    `\tCreatedAt time.Time ${jsonTag('createdAt')}`,
    `\tUpdatedAt time.Time ${jsonTag('updatedAt')}`,
    `}`,
    ``,
  );
  return lines.join('\n');
}

/** The SQL data-access layer (store.go). */
function buildStore(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const table = tableName(entity);
  const mu = ctx.multiUser;
  const fkRels = belongsToRels(entity);

  // Dialect placeholder: $N (Postgres/RETURNING) or ? (MySQL/no-RETURNING).
  const ph = (i: number): string => (ctx.supportsReturning ? `$${i}` : '?');

  // belongs-to FKs are extra writable columns, sitting with the fields (before
  // owner). writeCols/writeVals drive insert/update; index positions shift so
  // owner/id land correctly.
  const writeCols = [...entity.fields.map(columnName), ...fkRels.map(fkColumnName)];
  const writeVals = [...entity.fields.map((f) => `in.${goFieldName(f)}`), ...fkRels.map((r) => `in.${fkFieldName(r)}`)];

  const cols = ['id', ...writeCols, ...(mu ? ['owner_id'] : []), 'created_at', 'updated_at'];
  const columnsConst = cols.join(', ');

  const scanArgs = [
    '&t.ID',
    ...entity.fields.map((f) => `&t.${goFieldName(f)}`),
    ...fkRels.map((r) => `&t.${fkFieldName(r)}`),
    ...(mu ? ['&t.OwnerID'] : []),
    '&t.CreatedAt',
    '&t.UpdatedAt',
  ];

  // insert: writable columns (+ owner)
  const insertCols = [...writeCols, ...(mu ? ['owner_id'] : [])];
  const insertPlaceholders = insertCols.map((_c, i) => ph(i + 1)).join(', ');
  const insertValues = [...writeVals, ...(mu ? ['in.OwnerID'] : [])].join(', ');

  // update: SET writable columns (not owner), then WHERE id (+ owner)
  const setClause = writeCols.map((c, i) => `${c} = ${ph(i + 1)}`).join(', ');
  const idIdx = writeCols.length + 1;
  const updateWhere = mu ? `id = ${ph(idIdx)} AND owner_id = ${ph(idIdx + 1)}` : `id = ${ph(idIdx)}`;
  const updateValues = [...writeVals, 'id', ...(mu ? ['ownerID'] : [])].join(', ');

  const listSig = mu ? '(ownerID int64)' : '()';
  const listWhere = mu ? ` WHERE owner_id = ${ph(1)}` : '';
  const listArgs = mu ? 'ownerID' : '';
  const getSig = mu ? '(id, ownerID int64)' : '(id int64)';
  const getWhere = mu ? `id = ${ph(1)} AND owner_id = ${ph(2)}` : `id = ${ph(1)}`;
  const getArgs = mu ? 'id, ownerID' : 'id';
  const updateSig = mu ? '(id, ownerID int64, in *' + name + ')' : '(id int64, in *' + name + ')';
  const deleteSig = mu ? '(id, ownerID int64)' : '(id int64)';
  const deleteWhere = mu ? `id = ${ph(1)} AND owner_id = ${ph(2)}` : `id = ${ph(1)}`;
  const deleteArgs = mu ? 'id, ownerID' : 'id';
  const selectBackWhere = mu ? `id = ${ph(1)} AND owner_id = ${ph(2)}` : `id = ${ph(1)}`;
  const selectBackArgs = mu ? 'id, ownerID' : 'id';

  // Insert: RETURNING reads the row back (Postgres); otherwise insert then select
  // by LastInsertId (MySQL). The RETURNING branch is byte-identical to Day 8.
  const insertMethod = ctx.supportsReturning
    ? [
        `// Insert creates a ${name} and returns the stored row.`,
        `func (s *Store) Insert(in *${name}) (*${name}, error) {`,
        `\trow := s.db.QueryRow(`,
        `\t\t"INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertPlaceholders}) RETURNING "+columns,`,
        `\t\t${insertValues},`,
        `\t)`,
        `\treturn scan${name}(row)`,
        `}`,
      ]
    : [
        `// Insert creates a ${name} and returns the stored row.`,
        `func (s *Store) Insert(in *${name}) (*${name}, error) {`,
        `\tres, err := s.db.Exec(`,
        `\t\t"INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertPlaceholders})",`,
        `\t\t${insertValues},`,
        `\t)`,
        `\tif err != nil {`,
        `\t\treturn nil, err`,
        `\t}`,
        `\tid, err := res.LastInsertId()`,
        `\tif err != nil {`,
        `\t\treturn nil, err`,
        `\t}`,
        `\trow := s.db.QueryRow("SELECT "+columns+" FROM ${table} WHERE id = ${ph(1)}", id)`,
        `\treturn scan${name}(row)`,
        `}`,
      ];

  // Update: RETURNING (Postgres); otherwise update then select the row back
  // (MySQL) — existence is decided by the select-back, so a no-op update still
  // returns the row (MySQL affectedRows would be 0), matching Postgres.
  const updateMethod = ctx.supportsReturning
    ? [
        `// Update writes the ${name}${mu ? ' owned by ownerID' : ''} and returns it, or nil if not found.`,
        `func (s *Store) Update${updateSig} (*${name}, error) {`,
        `\trow := s.db.QueryRow(`,
        `\t\t"UPDATE ${table} SET ${setClause}, updated_at = now() WHERE ${updateWhere} RETURNING "+columns,`,
        `\t\t${updateValues},`,
        `\t)`,
        `\tt, err := scan${name}(row)`,
        `\tif err == sql.ErrNoRows {`,
        `\t\treturn nil, nil`,
        `\t}`,
        `\treturn t, err`,
        `}`,
      ]
    : [
        `// Update writes the ${name}${mu ? ' owned by ownerID' : ''} and returns it, or nil if not found.`,
        `func (s *Store) Update${updateSig} (*${name}, error) {`,
        `\tif _, err := s.db.Exec(`,
        `\t\t"UPDATE ${table} SET ${setClause}, updated_at = now() WHERE ${updateWhere}",`,
        `\t\t${updateValues},`,
        `\t); err != nil {`,
        `\t\treturn nil, err`,
        `\t}`,
        `\trow := s.db.QueryRow("SELECT "+columns+" FROM ${table} WHERE ${selectBackWhere}", ${selectBackArgs})`,
        `\tt, err := scan${name}(row)`,
        `\tif err == sql.ErrNoRows {`,
        `\t\treturn nil, nil`,
        `\t}`,
        `\treturn t, err`,
        `}`,
      ];

  return [
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// ${mu ? 'Owner-scoped data' : 'Data'} access for ${name}${mu ? ' (multi-user, ADR-005)' : ''}.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import "database/sql"`,
    ``,
    `const columns = "${columnsConst}"`,
    ``,
    `// Store is the ${name} data-access layer.`,
    `type Store struct{ db *sql.DB }`,
    ``,
    `// NewStore builds a ${name} store over the given database handle.`,
    `func NewStore(db *sql.DB) *Store { return &Store{db: db} }`,
    ``,
    `type scanner interface {`,
    `\tScan(dest ...interface{}) error`,
    `}`,
    ``,
    `func scan${name}(row scanner) (*${name}, error) {`,
    `\tvar t ${name}`,
    `\tif err := row.Scan(${scanArgs.join(', ')}); err != nil {`,
    `\t\treturn nil, err`,
    `\t}`,
    `\treturn &t, nil`,
    `}`,
    ``,
    `// List returns all ${table}${mu ? ' owned by ownerID' : ''}, ordered by id.`,
    `func (s *Store) List${listSig} ([]*${name}, error) {`,
    `\trows, err := s.db.Query("SELECT "+columns+" FROM ${table}${listWhere} ORDER BY id"${listArgs ? ', ' + listArgs : ''})`,
    `\tif err != nil {`,
    `\t\treturn nil, err`,
    `\t}`,
    `\tdefer rows.Close()`,
    `\titems := []*${name}{}`,
    `\tfor rows.Next() {`,
    `\t\tt, err := scan${name}(rows)`,
    `\t\tif err != nil {`,
    `\t\t\treturn nil, err`,
    `\t\t}`,
    `\t\titems = append(items, t)`,
    `\t}`,
    `\treturn items, rows.Err()`,
    `}`,
    ``,
    `// FindByID returns one ${name}${mu ? ' if owned by ownerID' : ''}, or nil if not found.`,
    `func (s *Store) FindByID${getSig} (*${name}, error) {`,
    `\trow := s.db.QueryRow("SELECT "+columns+" FROM ${table} WHERE ${getWhere}", ${getArgs})`,
    `\tt, err := scan${name}(row)`,
    `\tif err == sql.ErrNoRows {`,
    `\t\treturn nil, nil`,
    `\t}`,
    `\treturn t, err`,
    `}`,
    ``,
    ...insertMethod,
    ``,
    ...updateMethod,
    ``,
    `// Delete removes the ${name}${mu ? ' owned by ownerID' : ''}; reports whether a row was deleted.`,
    `func (s *Store) Delete${deleteSig} (bool, error) {`,
    `\tres, err := s.db.Exec("DELETE FROM ${table} WHERE ${deleteWhere}", ${deleteArgs})`,
    `\tif err != nil {`,
    `\t\treturn false, err`,
    `\t}`,
    `\tn, err := res.RowsAffected()`,
    `\treturn n > 0, err`,
    `}`,
    ``,
  ].join('\n');
}

/** The request-body type + validation + mapping to the entity (validate.go). */
function buildValidate(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;

  const inputFields = [
    ...entity.fields.map((f) => `\t${goFieldName(f)} *${goBaseType(f)} ${jsonTag(wireKey(f, ctx))}`),
    ...belongsToRels(entity).map((r) => `\t${fkFieldName(r)} *int64 ${jsonTag(fkJsonKey(r))}`),
  ];

  const checks: string[] = [];
  for (const f of entity.fields) {
    const g = goFieldName(f);
    if (f.required) {
      if (isStringType(f.type)) {
        checks.push(`\tif in.${g} == nil || *in.${g} == "" {`, `\t\terrs = append(errs, "${f.name} is required")`, `\t}`);
      } else {
        checks.push(`\tif in.${g} == nil {`, `\t\terrs = append(errs, "${f.name} is required")`, `\t}`);
      }
    }
    if (isStringType(f.type)) {
      checks.push(
        `\tif in.${g} != nil && len(*in.${g}) > ${maxLengthOf(f)} {`,
        `\t\terrs = append(errs, "${f.name} must be at most ${maxLengthOf(f)} characters")`,
        `\t}`,
      );
    }
  }
  // Required belongs-to FKs must be present (an integer parent id).
  for (const r of belongsToRels(entity)) {
    if (r.required) {
      checks.push(`\tif in.${fkFieldName(r)} == nil {`, `\t\terrs = append(errs, "${fkJsonKey(r)} is required")`, `\t}`);
    }
  }

  const toEntity: string[] = [`\tt := &${name}{${ctx.multiUser ? 'OwnerID: ownerID' : ''}}`];
  for (const f of entity.fields) {
    const g = goFieldName(f);
    if (f.required) {
      toEntity.push(`\tif in.${g} != nil {`, `\t\tt.${g} = *in.${g}`, `\t}`);
    } else {
      toEntity.push(`\tt.${g} = in.${g}`);
    }
  }
  for (const r of belongsToRels(entity)) {
    const g = fkFieldName(r);
    if (r.required) {
      toEntity.push(`\tif in.${g} != nil {`, `\t\tt.${g} = *in.${g}`, `\t}`);
    } else {
      toEntity.push(`\tt.${g} = in.${g}`);
    }
  }
  toEntity.push(`\treturn t`);

  const toEntitySig = ctx.multiUser ? `(ownerID int64) *${name}` : `() *${name}`;

  return [
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Request-body validation for ${name}, derived from the field rules.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import (`,
    `\t"errors"`,
    `\t"strings"`,
    `)`,
    ``,
    `// ${name}Input is the writable request body for create/update.`,
    `type ${name}Input struct {`,
    ...inputFields,
    `}`,
    ``,
    `// Validate checks the field rules; it returns an error describing every problem.`,
    `func (in *${name}Input) Validate() error {`,
    `\tvar errs []string`,
    ...checks,
    `\tif len(errs) > 0 {`,
    `\t\treturn errors.New(strings.Join(errs, "; "))`,
    `\t}`,
    `\treturn nil`,
    `}`,
    ``,
    `// toEntity maps a validated input onto a ${name}.`,
    `func (in *${name}Input) toEntity${toEntitySig} {`,
    ...toEntity,
    `}`,
    ``,
  ].join('\n');
}

/** The generated CRUD service base — the seam the developer service embeds. */
function buildServiceBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const mu = ctx.multiUser;

  const getSig = mu ? '(id, ownerID int64)' : '(id int64)';
  const getArgs = mu ? 'id, ownerID' : 'id';
  const listSig = mu ? '(ownerID int64)' : '()';
  const listArgs = mu ? 'ownerID' : '';
  const updateSig = mu ? '(id, ownerID int64, in *' + name + ')' : '(id int64, in *' + name + ')';
  const updateArgs = mu ? 'id, ownerID, in' : 'id, in';
  const deleteSig = mu ? '(id, ownerID int64)' : '(id int64)';
  const deleteArgs = mu ? 'id, ownerID' : 'id';

  return [
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Standard CRUD for ${name}${mu ? ', scoped to the current user (ADR-005)' : ''}.`,
    `// Your business logic belongs in ${name}Service, which embeds this base.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import "database/sql"`,
    ``,
    `// ${name}ServiceBase is the generated CRUD layer over the store.`,
    `type ${name}ServiceBase struct{ store *Store }`,
    ``,
    `// New${name}ServiceBase builds the base service over the given database handle.`,
    `func New${name}ServiceBase(db *sql.DB) *${name}ServiceBase {`,
    `\treturn &${name}ServiceBase{store: NewStore(db)}`,
    `}`,
    ``,
    `func (s *${name}ServiceBase) List${listSig} ([]*${name}, error) {`,
    `\treturn s.store.List(${listArgs})`,
    `}`,
    ``,
    `func (s *${name}ServiceBase) Get${getSig} (*${name}, error) {`,
    `\treturn s.store.FindByID(${getArgs})`,
    `}`,
    ``,
    `func (s *${name}ServiceBase) Create(in *${name}) (*${name}, error) {`,
    `\treturn s.store.Insert(in)`,
    `}`,
    ``,
    `func (s *${name}ServiceBase) Update${updateSig} (*${name}, error) {`,
    `\treturn s.store.Update(${updateArgs})`,
    `}`,
    ``,
    `func (s *${name}ServiceBase) Delete${deleteSig} (bool, error) {`,
    `\treturn s.store.Delete(${deleteArgs})`,
    `}`,
    ``,
    // has-many (Day 25): a generic reverse-collection query over the child table (empty
    // for a has-many-free entity — byte-identical). It reuses the store's db handle; the
    // child columns are unknown at codegen, so rows are returned as generic maps.
    ...(hasManyRels(entity).length > 0
      ? [
          `// ReverseCollection runs a has-many reverse query (a parent's children) and`,
          `// returns the rows as generic maps. Same db handle; reuses the existing FK column.`,
          `func (s *${name}ServiceBase) ReverseCollection(query string, args ...interface{}) ([]map[string]interface{}, error) {`,
          `\trows, err := s.store.db.Query(query, args...)`,
          `\tif err != nil {`,
          `\t\treturn nil, err`,
          `\t}`,
          `\tdefer rows.Close()`,
          `\tcols, err := rows.Columns()`,
          `\tif err != nil {`,
          `\t\treturn nil, err`,
          `\t}`,
          `\tout := []map[string]interface{}{}`,
          `\tfor rows.Next() {`,
          `\t\tvals := make([]interface{}, len(cols))`,
          `\t\tptrs := make([]interface{}, len(cols))`,
          `\t\tfor i := range vals {`,
          `\t\t\tptrs[i] = &vals[i]`,
          `\t\t}`,
          `\t\tif err := rows.Scan(ptrs...); err != nil {`,
          `\t\t\treturn nil, err`,
          `\t\t}`,
          `\t\tm := map[string]interface{}{}`,
          `\t\tfor i, c := range cols {`,
          `\t\t\tm[c] = vals[i]`,
          `\t\t}`,
          `\t\tout = append(out, m)`,
          `\t}`,
          `\treturn out, rows.Err()`,
          `}`,
          ``,
        ]
      : []),
  ].join('\n');
}

/** The HTTP handlers + route registration (handler_base.go). */
function buildHandlerBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const table = tableName(entity);
  const mu = ctx.multiUser;

  const owner = mu ? 'auth.UserID(r)' : '';
  const listCall = mu ? owner : '';
  const getCall = mu ? `id, ${owner}` : 'id';
  const createArg = mu ? `in.toEntity(${owner})` : 'in.toEntity()';
  const updateCall = mu ? `id, ${owner}, in.toEntity(${owner})` : `id, in.toEntity()`;
  const deleteCall = mu ? `id, ${owner}` : 'id';

  const imports = [`\t"encoding/json"`, `\t"net/http"`, `\t"strconv"`, ...(mu ? [``, `\t"app/internal/auth"`] : []), `\t"app/internal/web"`];

  // has-many (Day 25): the reverse-collection routes + handlers (empty for a has-many-free
  // entity → byte-identical). Each queries the child table by the existing FK column,
  // owner-scoped when multi-user. ph() picks the dialect placeholder ($N | ?), as the store does.
  const ph = (i: number): string => (ctx.supportsReturning ? `$${i}` : '?');
  const reverseRels = hasManyRels(entity);
  const parentFk = reverseFkColumn(entity);
  const reverseRoutes: string[] = reverseRels.map(
    (r) => `\tmux.HandleFunc("GET /api/${table}/{id}/${childTable(r)}", h.reverse${pascalCase(r.target)})`,
  );
  const reverseHandlers: string[] = reverseRels.flatMap((r) => {
    const ct = childTable(r);
    const where = mu ? `${parentFk} = ${ph(1)} AND owner_id = ${ph(2)}` : `${parentFk} = ${ph(1)}`;
    const args = mu ? `id, auth.UserID(r)` : `id`;
    return [
      `func (h *handler) reverse${pascalCase(r.target)}(w http.ResponseWriter, r *http.Request) {`,
      `\tid, err := strconv.ParseInt(r.PathValue("id"), 10, 64)`,
      `\tif err != nil {`,
      `\t\tweb.WriteError(w, http.StatusBadRequest, "invalid id")`,
      `\t\treturn`,
      `\t}`,
      `\t// has-many ${name} -> ${r.target}: the parent's ${ct} (reverse of the ${parentFk} FK).`,
      `\titems, err := h.svc.ReverseCollection("SELECT * FROM ${ct} WHERE ${where} ORDER BY id", ${args})`,
      `\tif err != nil {`,
      `\t\tweb.WriteError(w, http.StatusInternalServerError, err.Error())`,
      `\t\treturn`,
      `\t}`,
      `\tweb.WriteJSON(w, http.StatusOK, items)`,
      `}`,
      ``,
    ];
  });

  return [
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// HTTP handlers and route registration for ${name} CRUD.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import (`,
    ...imports,
    `)`,
    ``,
    `type handler struct{ svc *${name}Service }`,
    ``,
    `// StandardRoutes registers the ${name} CRUD endpoints on the mux.`,
    `func StandardRoutes(mux *http.ServeMux, svc *${name}Service) {`,
    `\th := &handler{svc: svc}`,
    `\tmux.HandleFunc("GET /api/${table}", h.list)`,
    `\tmux.HandleFunc("GET /api/${table}/{id}", h.get)`,
    `\tmux.HandleFunc("POST /api/${table}", h.create)`,
    `\tmux.HandleFunc("PUT /api/${table}/{id}", h.update)`,
    `\tmux.HandleFunc("DELETE /api/${table}/{id}", h.remove)`,
    ...reverseRoutes,
    `}`,
    ``,
    `func (h *handler) list(w http.ResponseWriter, r *http.Request) {`,
    `\titems, err := h.svc.List(${listCall})`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusInternalServerError, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\tweb.WriteJSON(w, http.StatusOK, items)`,
    `}`,
    ``,
    `func (h *handler) get(w http.ResponseWriter, r *http.Request) {`,
    `\tid, err := strconv.ParseInt(r.PathValue("id"), 10, 64)`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, "invalid id")`,
    `\t\treturn`,
    `\t}`,
    `\titem, err := h.svc.Get(${getCall})`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusInternalServerError, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\tif item == nil {`,
    `\t\tweb.WriteError(w, http.StatusNotFound, "${name} not found")`,
    `\t\treturn`,
    `\t}`,
    `\tweb.WriteJSON(w, http.StatusOK, item)`,
    `}`,
    ``,
    `func (h *handler) create(w http.ResponseWriter, r *http.Request) {`,
    `\tvar in ${name}Input`,
    `\tif err := json.NewDecoder(r.Body).Decode(&in); err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, "invalid JSON body")`,
    `\t\treturn`,
    `\t}`,
    `\tif err := in.Validate(); err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\titem, err := h.svc.Create(${createArg})`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusInternalServerError, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\tweb.WriteJSON(w, http.StatusCreated, item)`,
    `}`,
    ``,
    `func (h *handler) update(w http.ResponseWriter, r *http.Request) {`,
    `\tid, err := strconv.ParseInt(r.PathValue("id"), 10, 64)`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, "invalid id")`,
    `\t\treturn`,
    `\t}`,
    `\tvar in ${name}Input`,
    `\tif err := json.NewDecoder(r.Body).Decode(&in); err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, "invalid JSON body")`,
    `\t\treturn`,
    `\t}`,
    `\tif err := in.Validate(); err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\titem, err := h.svc.Update(${updateCall})`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusInternalServerError, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\tif item == nil {`,
    `\t\tweb.WriteError(w, http.StatusNotFound, "${name} not found")`,
    `\t\treturn`,
    `\t}`,
    `\tweb.WriteJSON(w, http.StatusOK, item)`,
    `}`,
    ``,
    `func (h *handler) remove(w http.ResponseWriter, r *http.Request) {`,
    `\tid, err := strconv.ParseInt(r.PathValue("id"), 10, 64)`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusBadRequest, "invalid id")`,
    `\t\treturn`,
    `\t}`,
    `\tok, err := h.svc.Delete(${deleteCall})`,
    `\tif err != nil {`,
    `\t\tweb.WriteError(w, http.StatusInternalServerError, err.Error())`,
    `\t\treturn`,
    `\t}`,
    `\tif !ok {`,
    `\t\tweb.WriteError(w, http.StatusNotFound, "${name} not found")`,
    `\t\treturn`,
    `\t}`,
    `\tw.WriteHeader(http.StatusNoContent)`,
    `}`,
    ``,
    ...reverseHandlers,
  ].join('\n');
}

/** DEVELOPER-OWNED business-logic file (service.go) — created once. */
function buildServiceDev(entity: Entity): string {
  const name = entity.name;
  return [
    `// DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    `//`,
    `// Add your business logic for ${name} here. The standard CRUD lives in`,
    `// service_base.go (Thraksha-owned). This file is safe to edit; regeneration`,
    `// will not touch it.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import "database/sql"`,
    ``,
    `// ${name}Service holds your business logic; it embeds the generated base, so`,
    `// the standard CRUD is available and any method can be overridden here.`,
    `type ${name}Service struct{ *${name}ServiceBase }`,
    ``,
    `// New${name}Service builds the ${name} service.`,
    `func New${name}Service(db *sql.DB) *${name}Service {`,
    `\treturn &${name}Service{New${name}ServiceBase(db)}`,
    `}`,
    ``,
    `// Your business logic goes here (override a base method, or add new ones).`,
    ``,
  ].join('\n');
}

/** DEVELOPER-OWNED route wiring (routes.go) — created once. */
function buildRoutesDev(entity: Entity): string {
  const name = entity.name;
  const table = tableName(entity);
  return [
    `// DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    `//`,
    `// Wires ${name}'s CRUD routes; add your own routes here too. The standard CRUD`,
    `// wiring lives in handler_base.go (Thraksha-owned). This file is safe to edit;`,
    `// regeneration will not touch it. internal/entities/register.go calls Register.`,
    `package ${entitySlug(entity)}`,
    ``,
    `import (`,
    `\t"database/sql"`,
    `\t"net/http"`,
    `)`,
    ``,
    `// Register wires ${name}'s routes onto the mux.`,
    `func Register(mux *http.ServeMux, db *sql.DB) {`,
    `\tsvc := New${name}Service(db)`,
    `\tStandardRoutes(mux, svc)`,
    `\t// Your custom routes go here, e.g.`,
    `\t//   mux.HandleFunc("GET /api/${table}/search", ...)`,
    `}`,
    ``,
  ].join('\n');
}

/** The per-entity SQL migration — all DDL comes from the SqlDialect seam. */
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
// Public API.
// ---------------------------------------------------------------------------

/** Generate all Go files for one entity, each tagged with its ownership. */
export function generateEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  for (const f of entity.fields) assertSupported(f);
  const slug = entitySlug(entity);
  const dir = `internal/entities/${slug}`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  return [
    // THRAKSHA-OWNED — regenerated freely.
    { relPath: `${dir}/${slug}.go`, content: buildModel(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/store.go`, content: buildStore(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/validate.go`, content: buildValidate(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/service_base.go`, content: buildServiceBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/handler_base.go`, content: buildHandlerBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `migrations/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again.
    { relPath: `${dir}/service.go`, content: buildServiceDev(entity), ownership: 'developer' },
    { relPath: `${dir}/routes.go`, content: buildRoutesDev(entity), ownership: 'developer' },
  ];
}

/**
 * The generated internal/entities/register.go: statically imports each entity
 * package and registers its routes. Go is compiled, so it cannot discover entity
 * packages at runtime the way FastAPI/Express do — this is the explicit,
 * deterministic equivalent (sorted by entity name).
 */
export function buildEntityRegister(entities: Entity[]): string {
  const sorted = [...entities].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const slugs = sorted.map((e) => e.name.toLowerCase());
  const imports = slugs.map((s) => `\t"app/internal/entities/${s}"`);
  const calls = slugs.map((s) => `\t${s}.Register(mux, db)`);
  return [
    `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `// Registers every entity's routes on the mux (sorted, deterministic).`,
    `package entities`,
    ``,
    `import (`,
    `\t"database/sql"`,
    `\t"net/http"`,
    ...(imports.length > 0 ? [``, ...imports] : []),
    `)`,
    ``,
    `// Register wires all entity routes.`,
    `func Register(mux *http.ServeMux, db *sql.DB) {`,
    ...(calls.length > 0 ? calls : [`\t_ = mux`, `\t_ = db`]),
    `}`,
    ``,
  ].join('\n');
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
  // has-many (Day 25) — the reverse projection: a parent-side collection endpoint over the
  // child's existing FK. No schema change.
  for (const r of hasManyRels(entity)) {
    lines.push(`${entity.name} has-many ${r.target}: GET /api/${tableName(entity)}/{id}/${childTable(r)} (reverse of ${reverseFkColumn(entity)}, no schema change)`);
  }
  return lines;
}

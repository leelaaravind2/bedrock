/*
 * Thraksha — Python (FastAPI) entity code generator.
 *
 * The FastAPI counterpart of the Spring and Express entity codegens: it turns one
 * Entity from the Project Model into a working CRUD slice for a FastAPI +
 * PostgreSQL backend. Same model in; idiomatic Python/FastAPI out (SQLAlchemy for
 * the data model + persistence, Pydantic for validation).
 *
 * BINDING RULES (identical obligations to the Spring/Express plugins):
 *   ADR-001  No AI. Pure, total functions of the Entity + context.
 *   ADR-002  Each file is tagged THRAKSHA (regenerated) or DEVELOPER (created
 *            once, then never touched). The developer's service/routes survive
 *            regeneration; the generated bases are rewritten freely.
 *   ADR-003  Deterministic: field order follows the model; sorted imports; no
 *            timestamps, no randomness.
 *   ADR-004  Defaults (required->optional, unique->no, String length 255) are
 *            applied here and reported via describeEntityDefaults().
 *   ADR-005  When multiUser is on, every entity is owner-scoped.
 *   Laws 19-21  Ordinary Python/SQL — no Thraksha markers the project needs to run.
 */

import type { Entity, Field, Relationship } from '../../core/project-model.js';
import type { GeneratedFile } from '../../core/plugin.js';
import type { SqlDialect } from '../../core/database.js';
import { applyNaming, type NamingConvention } from '../../core/style.js';

/** Context the Python plugin derives from the agnostic EntityGenerationContext. */
export interface EntityCodegenContext {
  multiUser: boolean;
  migrationVersion: number; // V1 is the users table from the shell
  sql: SqlDialect; // the selected database's SQL dialect (Postgres today)
  // Coding-style: the wire-key naming convention for declared fields (Day 12).
  // 'default' is a bypass. The wire key is set via a Pydantic alias; the Python
  // attribute stays the snake_case ORM column (Risk 1).
  naming: NamingConvention;
}

/**
 * The JSON wire key for a declared field. 'default' returns the declared name.
 * When it differs from the snake_case attribute (columnName) a Pydantic
 * `alias="<wire>"` is emitted; the attribute/column is NEVER renamed.
 */
function wireKey(field: Field, ctx: EntityCodegenContext): string {
  return applyNaming(field.name, ctx.naming);
}

const DEFAULT_STRING_LENGTH = 255;
const SUPPORTED_TYPES = 'String, Text, Integer, Long, Decimal, Boolean, Date, DateTime';

// ---------------------------------------------------------------------------
// Naming helpers (deterministic, total) — identical conventions to Spring and
// Express so the database schema matches across all three backends.
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

/** The module/directory segment for an entity, e.g. "ticket". */
function entitySlug(entity: Entity): string {
  return entity.name.toLowerCase();
}

function tableName(entity: Entity): string {
  return pluralize(snakeCase(entity.name));
}

function columnName(field: Field): string {
  return snakeCase(field.name);
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

// ---------------------------------------------------------------------------
// Relationship helpers (belongs-to only). FK is a scalar column mirroring
// owner_id (Column(BigInteger, index=True)); the DB constraint lives in the SQL
// migration. Emission is always a loop over these, so relationship-free entities
// are byte-identical to before. Naming matches Spring/Express so schemas align.
// ---------------------------------------------------------------------------

/** The belongs-to relationships on an entity, in authored order (deterministic). */
function belongsToRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'belongs-to');
}

// has-many (Day 25) — the REVERSE projection of a belongs-to FK. NO schema change: the
// child already carries `<parent>_id`. has-many adds ONLY a parent-side collection route
// (GET /api/<parents>/{id}/<children>) querying the child by the existing FK via a raw
// text() SELECT. Emission loops over hasManyRels, so has-many-free entities are byte-identical.

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

/**
 * The reverse-collection routes for a parent's has-many rels (empty for a has-many-free
 * entity — byte-identical). Owner-scoped when multi-user. Uses a raw text() SELECT over
 * the child table by the existing FK column; returns the rows as dicts.
 */
function reversePyRoutes(entity: Entity, ctx: EntityCodegenContext): string[] {
  const rels = hasManyRels(entity);
  if (rels.length === 0) return [];
  const fk = reverseFkColumn(entity);
  const lines: string[] = [];
  for (const r of rels) {
    const ct = childTable(r);
    if (ctx.multiUser) {
      lines.push(
        ``,
        `    @router.get("/{item_id}/${ct}")`,
        `    def list_${ct}_of_${entitySlug(entity)}(item_id: int, db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
        `        # has-many ${entity.name} -> ${r.target}: the parent's ${ct} (reverse of the ${fk} FK).`,
        `        rows = db.execute(text("SELECT * FROM ${ct} WHERE ${fk} = :pid AND owner_id = :oid ORDER BY id"), {"pid": item_id, "oid": owner_id}).mappings().all()`,
        `        return [dict(row) for row in rows]`,
      );
    } else {
      lines.push(
        ``,
        `    @router.get("/{item_id}/${ct}")`,
        `    def list_${ct}_of_${entitySlug(entity)}(item_id: int, db: Session = Depends(get_db)):`,
        `        # has-many ${entity.name} -> ${r.target}: the parent's ${ct} (reverse of the ${fk} FK).`,
        `        rows = db.execute(text("SELECT * FROM ${ct} WHERE ${fk} = :pid ORDER BY id"), {"pid": item_id}).mappings().all()`,
        `        return [dict(row) for row in rows]`,
      );
    }
  }
  return lines;
}

/** FK column / Python attribute name, e.g. Application -> application_id. */
function fkColumnName(rel: Relationship): string {
  return `${snakeCase(rel.target)}_id`;
}

/** Referenced table, e.g. Application -> applications. */
function fkRefTable(rel: Relationship): string {
  return pluralize(snakeCase(rel.target));
}

// ---------------------------------------------------------------------------
// Type mapping (SQLAlchemy column / Python annotation / SQL). Unsupported types
// block clearly (ADR-004) rather than being guessed.
// ---------------------------------------------------------------------------

/** The SQLAlchemy column type expression + the type name to import. */
function sqlalchemyTypeOf(field: Field): { expr: string; imports: string[] } {
  switch (field.type) {
    case 'String':
      return { expr: `String(${maxLengthOf(field)})`, imports: ['String'] };
    case 'Text':
      return { expr: 'Text', imports: ['Text'] };
    case 'Integer':
      return { expr: 'Integer', imports: ['Integer'] };
    case 'Long':
      return { expr: 'BigInteger', imports: ['BigInteger'] };
    case 'Decimal':
      return { expr: 'Numeric(19, 2)', imports: ['Numeric'] };
    case 'Boolean':
      return { expr: 'Boolean', imports: ['Boolean'] };
    case 'Date':
      return { expr: 'Date', imports: ['Date'] };
    case 'DateTime':
      return { expr: 'DateTime(timezone=True)', imports: ['DateTime'] };
    default:
      throw new Error(`Unsupported field type "${field.type}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`);
  }
}

/** The Python type annotation for a field (used in Pydantic schemas). */
function pyAnnotationOf(field: Field): { name: string; from?: { module: string; name: string } } {
  switch (field.type) {
    case 'String':
    case 'Text':
      return { name: 'str' };
    case 'Integer':
    case 'Long':
      return { name: 'int' };
    case 'Decimal':
      return { name: 'Decimal', from: { module: 'decimal', name: 'Decimal' } };
    case 'Boolean':
      return { name: 'bool' };
    case 'Date':
      return { name: 'date', from: { module: 'datetime', name: 'date' } };
    case 'DateTime':
      return { name: 'datetime', from: { module: 'datetime', name: 'datetime' } };
    default:
      throw new Error(`Unsupported field type "${field.type}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`);
  }
}

// SQL DDL column types now come from the selected database's SqlDialect (ctx.sql);
// the SQLAlchemy model types (sqlalchemyTypeOf) stay here — they are ORM, not dialect.

function assertSupported(field: Field): void {
  sqlalchemyTypeOf(field); // throws on unsupported type
}

/** Sort a set of names deterministically (ASCII order — uppercase before lowercase). */
function sortedUnique(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ---------------------------------------------------------------------------
// File builders.
// ---------------------------------------------------------------------------

function buildModel(entity: Entity, ctx: EntityCodegenContext): string {
  const className = entity.name;
  // Collect the SQLAlchemy type names used, plus the always-present ones.
  const typeNames = new Set<string>(['Column', 'BigInteger', 'DateTime']);
  for (const f of entity.fields) for (const i of sqlalchemyTypeOf(f).imports) typeNames.add(i);
  const importList = [...sortedUnique(typeNames), 'func'].join(', ');

  const columnLines: string[] = [
    `    id = Column(BigInteger, primary_key=True, autoincrement=True)`,
  ];
  for (const f of entity.fields) {
    const attrs: string[] = [sqlalchemyTypeOf(f).expr];
    if (f.required) attrs.push('nullable=False');
    if (f.unique) attrs.push('unique=True');
    columnLines.push(`    ${columnName(f)} = Column(${attrs.join(', ')})`);
  }
  // Foreign keys for belongs-to relationships (scalar, mirroring owner_id).
  for (const r of belongsToRels(entity)) {
    const notNull = r.required ? ', nullable=False' : '';
    columnLines.push(`    ${fkColumnName(r)} = Column(BigInteger, index=True${notNull})`);
  }
  if (ctx.multiUser) columnLines.push(`    owner_id = Column(BigInteger, index=True)`);
  columnLines.push(
    `    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)`,
    `    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)`,
  );

  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `SQLAlchemy data model for the ${entity.name} entity. Columns match the model's`,
    `fields; the table is created by the SQL migration.${ctx.multiUser ? ' owner_id ties each' : ''}`,
    ...(ctx.multiUser ? [`row to its owning user (multi-user-ready, ADR-005).`] : []),
    `"""`,
    `from sqlalchemy import ${importList}`,
    ``,
    `from app.db import Base`,
    ``,
    ``,
    `class ${className}(Base):`,
    `    __tablename__ = "${tableName(entity)}"`,
    ``,
    ...columnLines,
    ``,
  ].join('\n');
}

function buildSchemas(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const fields = entity.fields;

  const belongsTo = belongsToRels(entity);

  // Work out the imports needed.
  const needOptional = ctx.multiUser || fields.some((f) => !f.required) || belongsTo.some((r) => !r.required);
  const datetimeNames = new Set<string>(['datetime']); // created_at / updated_at
  let needDecimal = false;
  let needField = false;
  for (const f of fields) {
    const ann = pyAnnotationOf(f);
    if (ann.from?.module === 'datetime') datetimeNames.add(ann.from.name);
    if (ann.from?.module === 'decimal') needDecimal = true;
    if (isStringType(f.type)) needField = true;
  }

  // Day 12: a declared field whose wire key differs from its snake_case attribute
  // gets a Pydantic alias. Under 'default' (and any single-word field) wire===attr,
  // so no alias/Field/model_config is emitted and output is byte-identical.
  const aliasArgFor = (f: Field): string => {
    const wire = wireKey(f, ctx);
    return wire !== columnName(f) ? `alias="${wire}"` : '';
  };
  const anyAlias = fields.some((f) => aliasArgFor(f) !== '');
  // `Field(...)` is imported for max_length (string fields) OR for any alias.
  const wantField = needField || anyAlias;

  const imports: string[] = [];
  if (needOptional) imports.push(`from typing import Optional`);
  imports.push(`from datetime import ${sortedUnique(datetimeNames).join(', ')}`);
  if (needDecimal) imports.push(`from decimal import Decimal`);
  imports.push(`from pydantic import BaseModel, ConfigDict${wantField ? ', Field' : ''}`);

  // Join the args of a Field(...) call, dropping empties, preserving order.
  const fieldCall = (...args: string[]): string => `Field(${args.filter((a) => a).join(', ')})`;

  // The Pydantic FIELD NAME is the snake_case ORM attribute (columnName), so
  // `payload.model_dump()` yields keys that match the SQLAlchemy model's
  // attributes and `Model(**data)` works. The wire KEY is set by the alias only —
  // never by renaming the attribute (Risk 1).
  // Create schema — the writable fields (+ FK so a create can set the parent), validated.
  const createLines: string[] = [];
  for (const f of fields) {
    const attr = columnName(f);
    const ann = pyAnnotationOf(f).name;
    const alias = aliasArgFor(f);
    if (f.required) {
      if (isStringType(f.type)) createLines.push(`    ${attr}: ${ann} = ${fieldCall(alias, `max_length=${maxLengthOf(f)}`)}`);
      else if (alias) createLines.push(`    ${attr}: ${ann} = ${fieldCall(alias)}`);
      else createLines.push(`    ${attr}: ${ann}`);
    } else {
      if (isStringType(f.type)) createLines.push(`    ${attr}: Optional[${ann}] = ${fieldCall('default=None', alias, `max_length=${maxLengthOf(f)}`)}`);
      else if (alias) createLines.push(`    ${attr}: Optional[${ann}] = ${fieldCall('default=None', alias)}`);
      else createLines.push(`    ${attr}: Optional[${ann}] = None`);
    }
  }
  for (const r of belongsTo) {
    createLines.push(r.required ? `    ${fkColumnName(r)}: int` : `    ${fkColumnName(r)}: Optional[int] = None`);
  }

  // Read schema — everything the API returns.
  const readLines: string[] = [`    id: int`];
  for (const f of fields) {
    const attr = columnName(f);
    const ann = pyAnnotationOf(f).name;
    const alias = aliasArgFor(f);
    if (f.required) {
      readLines.push(alias ? `    ${attr}: ${ann} = ${fieldCall(alias)}` : `    ${attr}: ${ann}`);
    } else {
      readLines.push(alias ? `    ${attr}: Optional[${ann}] = ${fieldCall('default=None', alias)}` : `    ${attr}: Optional[${ann}] = None`);
    }
  }
  for (const r of belongsTo) {
    readLines.push(r.required ? `    ${fkColumnName(r)}: int` : `    ${fkColumnName(r)}: Optional[int] = None`);
  }
  if (ctx.multiUser) readLines.push(`    owner_id: Optional[int] = None`);
  readLines.push(`    created_at: datetime`, `    updated_at: datetime`);

  // populate_by_name lets a client send EITHER the alias (wire key) or the field
  // name; the alias is the wire contract, model_dump() (by field name) feeds the
  // ORM. Emitted only when there is an alias (⇒ default output unchanged).
  const createConfig = anyAlias ? [`    model_config = ConfigDict(populate_by_name=True)`, ``] : [];
  const readConfig = anyAlias
    ? `    model_config = ConfigDict(from_attributes=True, populate_by_name=True)`
    : `    model_config = ConfigDict(from_attributes=True)`;

  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Pydantic schemas for ${name}, derived from the field rules. ${name}Create`,
    `validates request bodies (create/update); ${name}Read shapes responses.`,
    `"""`,
    ...imports,
    ``,
    ``,
    `class ${name}Create(BaseModel):`,
    ...createConfig,
    ...(createLines.length > 0 ? createLines : [`    pass`]),
    ``,
    ``,
    `class ${name}Read(BaseModel):`,
    readConfig,
    ``,
    ...readLines,
    ``,
  ].join('\n');
}

function buildRepository(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const table = tableName(entity);

  const header = [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Data access for ${name}${ctx.multiUser ? ', scoped to the owning user (ADR-005)' : ''}.`,
    `"""`,
    `from typing import List, Optional`,
    ``,
    `from sqlalchemy import func, select`,
    `from sqlalchemy.orm import Session`,
    ``,
    `from .model import ${name}`,
    ``,
  ];

  if (ctx.multiUser) {
    return [
      ...header,
      ``,
      `def list_${table}(db: Session, owner_id: int) -> List[${name}]:`,
      `    stmt = select(${name}).where(${name}.owner_id == owner_id).order_by(${name}.id)`,
      `    return list(db.execute(stmt).scalars().all())`,
      ``,
      ``,
      `def get_${slug}(db: Session, item_id: int, owner_id: int) -> Optional[${name}]:`,
      `    stmt = select(${name}).where(${name}.id == item_id, ${name}.owner_id == owner_id)`,
      `    return db.execute(stmt).scalar_one_or_none()`,
      ``,
      ``,
      `def insert_${slug}(db: Session, data: dict, owner_id: int) -> ${name}:`,
      `    obj = ${name}(**data, owner_id=owner_id)`,
      `    db.add(obj)`,
      `    db.commit()`,
      `    db.refresh(obj)`,
      `    return obj`,
      ``,
      ``,
      `def update_${slug}(db: Session, obj: ${name}, data: dict) -> ${name}:`,
      `    for key, value in data.items():`,
      `        setattr(obj, key, value)`,
      `    obj.updated_at = func.now()`,
      `    db.commit()`,
      `    db.refresh(obj)`,
      `    return obj`,
      ``,
      ``,
      `def delete_${slug}(db: Session, obj: ${name}) -> None:`,
      `    db.delete(obj)`,
      `    db.commit()`,
      ``,
    ].join('\n');
  }

  return [
    ...header,
    ``,
    `def list_${table}(db: Session) -> List[${name}]:`,
    `    stmt = select(${name}).order_by(${name}.id)`,
    `    return list(db.execute(stmt).scalars().all())`,
    ``,
    ``,
    `def get_${slug}(db: Session, item_id: int) -> Optional[${name}]:`,
    `    return db.get(${name}, item_id)`,
    ``,
    ``,
    `def insert_${slug}(db: Session, data: dict) -> ${name}:`,
    `    obj = ${name}(**data)`,
    `    db.add(obj)`,
    `    db.commit()`,
    `    db.refresh(obj)`,
    `    return obj`,
    ``,
    ``,
    `def update_${slug}(db: Session, obj: ${name}, data: dict) -> ${name}:`,
    `    for key, value in data.items():`,
    `        setattr(obj, key, value)`,
    `    obj.updated_at = func.now()`,
    `    db.commit()`,
    `    db.refresh(obj)`,
    `    return obj`,
    ``,
    ``,
    `def delete_${slug}(db: Session, obj: ${name}) -> None:`,
    `    db.delete(obj)`,
    `    db.commit()`,
    ``,
  ].join('\n');
}

function buildServiceBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const table = tableName(entity);

  if (ctx.multiUser) {
    return [
      `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
      ``,
      `Standard CRUD for ${name}, scoped to the current user (ADR-005). Your`,
      `business logic belongs in ${name}Service, which extends this class.`,
      `"""`,
      `from fastapi import HTTPException, status`,
      `from sqlalchemy.orm import Session`,
      ``,
      `from . import repository`,
      ``,
      ``,
      `class ${name}ServiceBase:`,
      `    def list(self, db: Session, owner_id: int):`,
      `        return repository.list_${table}(db, owner_id)`,
      ``,
      `    def get(self, db: Session, item_id: int, owner_id: int):`,
      `        obj = repository.get_${slug}(db, item_id, owner_id)`,
      `        if obj is None:`,
      `            raise HTTPException(`,
      `                status_code=status.HTTP_404_NOT_FOUND, detail=f"${name} {item_id} not found"`,
      `            )`,
      `        return obj`,
      ``,
      `    def create(self, db: Session, data: dict, owner_id: int):`,
      `        return repository.insert_${slug}(db, data, owner_id)`,
      ``,
      `    def update(self, db: Session, item_id: int, data: dict, owner_id: int):`,
      `        obj = self.get(db, item_id, owner_id)`,
      `        return repository.update_${slug}(db, obj, data)`,
      ``,
      `    def delete(self, db: Session, item_id: int, owner_id: int) -> None:`,
      `        obj = self.get(db, item_id, owner_id)`,
      `        repository.delete_${slug}(db, obj)`,
      ``,
    ].join('\n');
  }

  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Standard CRUD for ${name}. Your business logic belongs in ${name}Service,`,
    `which extends this class.`,
    `"""`,
    `from fastapi import HTTPException, status`,
    `from sqlalchemy.orm import Session`,
    ``,
    `from . import repository`,
    ``,
    ``,
    `class ${name}ServiceBase:`,
    `    def list(self, db: Session):`,
    `        return repository.list_${table}(db)`,
    ``,
    `    def get(self, db: Session, item_id: int):`,
    `        obj = repository.get_${slug}(db, item_id)`,
    `        if obj is None:`,
    `            raise HTTPException(`,
    `                status_code=status.HTTP_404_NOT_FOUND, detail=f"${name} {item_id} not found"`,
    `            )`,
    `        return obj`,
    ``,
    `    def create(self, db: Session, data: dict):`,
    `        return repository.insert_${slug}(db, data)`,
    ``,
    `    def update(self, db: Session, item_id: int, data: dict):`,
    `        obj = self.get(db, item_id)`,
    `        return repository.update_${slug}(db, obj, data)`,
    ``,
    `    def delete(self, db: Session, item_id: int) -> None:`,
    `        obj = self.get(db, item_id)`,
    `        repository.delete_${slug}(db, obj)`,
    ``,
  ].join('\n');
}

function buildRouterBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const table = tableName(entity);

  if (ctx.multiUser) {
    return [
      `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
      ``,
      `Standard CRUD endpoints for ${name}, wired to the service. Owner scoping is`,
      `applied by the require_user dependency (ADR-005).`,
      `"""`,
      `from fastapi import APIRouter, Depends, status`,
      `from sqlalchemy.orm import Session`,
      ...(hasManyRels(entity).length > 0 ? [`from sqlalchemy import text`] : []),
      ``,
      `from app.auth import require_user`,
      `from app.db import get_db`,
      ``,
      `from .schemas import ${name}Create, ${name}Read`,
      `from .service_base import ${name}ServiceBase`,
      ``,
      ``,
      `def build_${slug}_router(service: ${name}ServiceBase) -> APIRouter:`,
      `    router = APIRouter()`,
      ``,
      `    @router.get("", response_model=list[${name}Read])`,
      `    def list_${table}(db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
      `        return service.list(db, owner_id)`,
      ``,
      `    @router.get("/{item_id}", response_model=${name}Read)`,
      `    def get_${slug}(item_id: int, db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
      `        return service.get(db, item_id, owner_id)`,
      ``,
      `    @router.post("", response_model=${name}Read, status_code=status.HTTP_201_CREATED)`,
      `    def create_${slug}(`,
      `        payload: ${name}Create,`,
      `        db: Session = Depends(get_db),`,
      `        owner_id: int = Depends(require_user),`,
      `    ):`,
      `        return service.create(db, payload.model_dump(), owner_id)`,
      ``,
      `    @router.put("/{item_id}", response_model=${name}Read)`,
      `    def update_${slug}(`,
      `        item_id: int,`,
      `        payload: ${name}Create,`,
      `        db: Session = Depends(get_db),`,
      `        owner_id: int = Depends(require_user),`,
      `    ):`,
      `        return service.update(db, item_id, payload.model_dump(), owner_id)`,
      ``,
      `    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)`,
      `    def delete_${slug}(item_id: int, db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
      `        service.delete(db, item_id, owner_id)`,
      ...reversePyRoutes(entity, ctx),
      ``,
      `    return router`,
      ``,
    ].join('\n');
  }

  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Standard CRUD endpoints for ${name}, wired to the service.`,
    `"""`,
    `from fastapi import APIRouter, Depends, status`,
    `from sqlalchemy.orm import Session`,
    ...(hasManyRels(entity).length > 0 ? [`from sqlalchemy import text`] : []),
    ``,
    `from app.auth import require_user`,
    `from app.db import get_db`,
    ``,
    `from .schemas import ${name}Create, ${name}Read`,
    `from .service_base import ${name}ServiceBase`,
    ``,
    ``,
    `def build_${slug}_router(service: ${name}ServiceBase) -> APIRouter:`,
    `    router = APIRouter(dependencies=[Depends(require_user)])`,
    ``,
    `    @router.get("", response_model=list[${name}Read])`,
    `    def list_${table}(db: Session = Depends(get_db)):`,
    `        return service.list(db)`,
    ``,
    `    @router.get("/{item_id}", response_model=${name}Read)`,
    `    def get_${slug}(item_id: int, db: Session = Depends(get_db)):`,
    `        return service.get(db, item_id)`,
    ``,
    `    @router.post("", response_model=${name}Read, status_code=status.HTTP_201_CREATED)`,
    `    def create_${slug}(payload: ${name}Create, db: Session = Depends(get_db)):`,
    `        return service.create(db, payload.model_dump())`,
    ``,
    `    @router.put("/{item_id}", response_model=${name}Read)`,
    `    def update_${slug}(item_id: int, payload: ${name}Create, db: Session = Depends(get_db)):`,
    `        return service.update(db, item_id, payload.model_dump())`,
    ``,
    `    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)`,
    `    def delete_${slug}(item_id: int, db: Session = Depends(get_db)):`,
    `        service.delete(db, item_id)`,
    ...reversePyRoutes(entity, ctx),
    ``,
    `    return router`,
    ``,
  ].join('\n');
}

function buildServiceDev(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `"""DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ``,
    `Add your business logic for ${name} here. The standard CRUD lives in`,
    `service_base.py (Thraksha-owned). This file is safe to edit; regeneration`,
    `will not touch it.`,
    `"""`,
    `from .service_base import ${name}ServiceBase`,
    ``,
    ``,
    `class ${name}Service(${name}ServiceBase):`,
    `    # Your business logic goes here (override a method, or add new ones).`,
    `    pass`,
    ``,
    ``,
    `${slug}_service = ${name}Service()`,
    ``,
  ].join('\n');
}

function buildRoutesDev(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `"""DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ``,
    `Add custom ${name} endpoints here. The standard CRUD wiring lives in`,
    `router_base.py (Thraksha-owned). This file is safe to edit; regeneration`,
    `will not touch it. app/main.py auto-discovers this module's router and`,
    `base_path.`,
    `"""`,
    `from .router_base import build_${slug}_router`,
    `from .service import ${slug}_service`,
    ``,
    `base_path = "/api/${tableName(entity)}"`,
    `router = build_${slug}_router(${slug}_service)`,
    ``,
    `# Your custom routes go here, e.g. @router.get("/search").`,
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
// architectureDepth: 'simple' (Day 13) — a flatter file set. The data-access
// (repository) layer is REMOVED and service_base + router_base MERGE into one
// crud_base.py whose ServiceBase does the ORM CRUD directly. The developer seam
// (service.py subclass + routes.py) is unchanged in role and still auto-mounted
// by app/main.py; only the Thraksha base-layer count changes. Multi-user owner
// scoping (ADR-005) and belongs-to FK writes survive: the FK columns arrive in
// `data` (payload.model_dump()) and flow into Model(**data), exactly as before.
// ---------------------------------------------------------------------------

/** The merged CRUD module: ServiceBase (inline ORM) + router builder. */
function buildCrudBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const table = tableName(entity);
  const mu = ctx.multiUser;

  const header = [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Flat CRUD for ${name} (architectureDepth: simple): ${name}ServiceBase does data`,
    `access directly against the ORM — there is no separate repository layer — and`,
    `this module also builds the router.${mu ? ' Owner scoping (ADR-005).' : ''} Your`,
    `business logic belongs in ${name}Service (service.py), which extends ${name}ServiceBase.`,
    `"""`,
    `from fastapi import APIRouter, Depends, HTTPException, status`,
    `from sqlalchemy import func, select`,
    `from sqlalchemy.orm import Session`,
    ``,
    `from app.auth import require_user`,
    `from app.db import get_db`,
    ``,
    `from .model import ${name}`,
    `from .schemas import ${name}Create, ${name}Read`,
    ``,
    ``,
  ];

  // The ServiceBase — same method names/signatures as the layered version, so the
  // dev subclass and the router are unchanged in shape; the bodies inline the ORM.
  const serviceClass = mu
    ? [
        `class ${name}ServiceBase:`,
        `    def list(self, db: Session, owner_id: int):`,
        `        stmt = select(${name}).where(${name}.owner_id == owner_id).order_by(${name}.id)`,
        `        return list(db.execute(stmt).scalars().all())`,
        ``,
        `    def get(self, db: Session, item_id: int, owner_id: int):`,
        `        stmt = select(${name}).where(${name}.id == item_id, ${name}.owner_id == owner_id)`,
        `        obj = db.execute(stmt).scalar_one_or_none()`,
        `        if obj is None:`,
        `            raise HTTPException(`,
        `                status_code=status.HTTP_404_NOT_FOUND, detail=f"${name} {item_id} not found"`,
        `            )`,
        `        return obj`,
        ``,
        `    def create(self, db: Session, data: dict, owner_id: int):`,
        `        obj = ${name}(**data, owner_id=owner_id)`,
        `        db.add(obj)`,
        `        db.commit()`,
        `        db.refresh(obj)`,
        `        return obj`,
        ``,
        `    def update(self, db: Session, item_id: int, data: dict, owner_id: int):`,
        `        obj = self.get(db, item_id, owner_id)`,
        `        for key, value in data.items():`,
        `            setattr(obj, key, value)`,
        `        obj.updated_at = func.now()`,
        `        db.commit()`,
        `        db.refresh(obj)`,
        `        return obj`,
        ``,
        `    def delete(self, db: Session, item_id: int, owner_id: int) -> None:`,
        `        obj = self.get(db, item_id, owner_id)`,
        `        db.delete(obj)`,
        `        db.commit()`,
        ``,
        ``,
      ]
    : [
        `class ${name}ServiceBase:`,
        `    def list(self, db: Session):`,
        `        stmt = select(${name}).order_by(${name}.id)`,
        `        return list(db.execute(stmt).scalars().all())`,
        ``,
        `    def get(self, db: Session, item_id: int):`,
        `        obj = db.get(${name}, item_id)`,
        `        if obj is None:`,
        `            raise HTTPException(`,
        `                status_code=status.HTTP_404_NOT_FOUND, detail=f"${name} {item_id} not found"`,
        `            )`,
        `        return obj`,
        ``,
        `    def create(self, db: Session, data: dict):`,
        `        obj = ${name}(**data)`,
        `        db.add(obj)`,
        `        db.commit()`,
        `        db.refresh(obj)`,
        `        return obj`,
        ``,
        `    def update(self, db: Session, item_id: int, data: dict):`,
        `        obj = self.get(db, item_id)`,
        `        for key, value in data.items():`,
        `            setattr(obj, key, value)`,
        `        obj.updated_at = func.now()`,
        `        db.commit()`,
        `        db.refresh(obj)`,
        `        return obj`,
        ``,
        `    def delete(self, db: Session, item_id: int) -> None:`,
        `        obj = self.get(db, item_id)`,
        `        db.delete(obj)`,
        `        db.commit()`,
        ``,
        ``,
      ];

  const routerFn = mu
    ? [
        `def build_${slug}_router(service: ${name}ServiceBase) -> APIRouter:`,
        `    router = APIRouter()`,
        ``,
        `    @router.get("", response_model=list[${name}Read])`,
        `    def list_${table}(db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
        `        return service.list(db, owner_id)`,
        ``,
        `    @router.get("/{item_id}", response_model=${name}Read)`,
        `    def get_${slug}(item_id: int, db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
        `        return service.get(db, item_id, owner_id)`,
        ``,
        `    @router.post("", response_model=${name}Read, status_code=status.HTTP_201_CREATED)`,
        `    def create_${slug}(`,
        `        payload: ${name}Create,`,
        `        db: Session = Depends(get_db),`,
        `        owner_id: int = Depends(require_user),`,
        `    ):`,
        `        return service.create(db, payload.model_dump(), owner_id)`,
        ``,
        `    @router.put("/{item_id}", response_model=${name}Read)`,
        `    def update_${slug}(`,
        `        item_id: int,`,
        `        payload: ${name}Create,`,
        `        db: Session = Depends(get_db),`,
        `        owner_id: int = Depends(require_user),`,
        `    ):`,
        `        return service.update(db, item_id, payload.model_dump(), owner_id)`,
        ``,
        `    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)`,
        `    def delete_${slug}(item_id: int, db: Session = Depends(get_db), owner_id: int = Depends(require_user)):`,
        `        service.delete(db, item_id, owner_id)`,
        ``,
        `    return router`,
        ``,
      ]
    : [
        `def build_${slug}_router(service: ${name}ServiceBase) -> APIRouter:`,
        `    router = APIRouter(dependencies=[Depends(require_user)])`,
        ``,
        `    @router.get("", response_model=list[${name}Read])`,
        `    def list_${table}(db: Session = Depends(get_db)):`,
        `        return service.list(db)`,
        ``,
        `    @router.get("/{item_id}", response_model=${name}Read)`,
        `    def get_${slug}(item_id: int, db: Session = Depends(get_db)):`,
        `        return service.get(db, item_id)`,
        ``,
        `    @router.post("", response_model=${name}Read, status_code=status.HTTP_201_CREATED)`,
        `    def create_${slug}(payload: ${name}Create, db: Session = Depends(get_db)):`,
        `        return service.create(db, payload.model_dump())`,
        ``,
        `    @router.put("/{item_id}", response_model=${name}Read)`,
        `    def update_${slug}(item_id: int, payload: ${name}Create, db: Session = Depends(get_db)):`,
        `        return service.update(db, item_id, payload.model_dump())`,
        ``,
        `    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)`,
        `    def delete_${slug}(item_id: int, db: Session = Depends(get_db)):`,
        `        service.delete(db, item_id)`,
        ``,
        `    return router`,
        ``,
      ];

  return [...header, ...serviceClass, ...routerFn].join('\n');
}

/** DEVELOPER-OWNED service subclass (simple): extends ServiceBase from crud_base. */
function buildServiceDevSimple(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `"""DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ``,
    `Add your business logic for ${name} here. The standard CRUD lives in`,
    `crud_base.py (Thraksha-owned). This file is safe to edit; regeneration`,
    `will not touch it.`,
    `"""`,
    `from .crud_base import ${name}ServiceBase`,
    ``,
    ``,
    `class ${name}Service(${name}ServiceBase):`,
    `    # Your business logic goes here (override a method, or add new ones).`,
    `    pass`,
    ``,
    ``,
    `${slug}_service = ${name}Service()`,
    ``,
  ].join('\n');
}

/** DEVELOPER-OWNED routes (simple): builds the router from crud_base; shell-mounted. */
function buildRoutesDevSimple(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `"""DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ``,
    `Add custom ${name} endpoints here. The standard CRUD wiring lives in`,
    `crud_base.py (Thraksha-owned). This file is safe to edit; regeneration`,
    `will not touch it. app/main.py auto-discovers this module's router and`,
    `base_path.`,
    `"""`,
    `from .crud_base import build_${slug}_router`,
    `from .service import ${slug}_service`,
    ``,
    `base_path = "/api/${tableName(entity)}"`,
    `router = build_${slug}_router(${slug}_service)`,
    ``,
    `# Your custom routes go here, e.g. @router.get("/search").`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/** Generate all FastAPI files for one entity, each tagged with its ownership. */
export function generateEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  for (const f of entity.fields) assertSupported(f);
  const slug = entitySlug(entity);
  const dir = `app/entities/${slug}`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  return [
    // THRAKSHA-OWNED — regenerated freely.
    { relPath: `${dir}/__init__.py`, content: '', ownership: 'thraksha' },
    { relPath: `${dir}/model.py`, content: buildModel(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/schemas.py`, content: buildSchemas(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/repository.py`, content: buildRepository(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/service_base.py`, content: buildServiceBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/router_base.py`, content: buildRouterBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `migrations/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again.
    { relPath: `${dir}/service.py`, content: buildServiceDev(entity), ownership: 'developer' },
    { relPath: `${dir}/routes.py`, content: buildRoutesDev(entity), ownership: 'developer' },
  ];
}

/**
 * architectureDepth: 'simple' file set (Day 13) — flatter: no repository.py;
 * service_base.py + router_base.py merged into crud_base.py. The developer seam
 * (service.py + routes.py) is present and unchanged in role (auto-mounted by
 * app/main.py); only the Thraksha base-layer count changes. Same ctx, so naming
 * (schemas alias) and multi-user/FK logic compose exactly as in the default set.
 */
export function generateSimpleEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  for (const f of entity.fields) assertSupported(f);
  const slug = entitySlug(entity);
  const dir = `app/entities/${slug}`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  return [
    // THRAKSHA-OWNED — regenerated freely. (repository/service_base/router_base
    // collapsed into crud_base.)
    { relPath: `${dir}/__init__.py`, content: '', ownership: 'thraksha' },
    { relPath: `${dir}/model.py`, content: buildModel(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/schemas.py`, content: buildSchemas(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/crud_base.py`, content: buildCrudBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `migrations/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again. Same seam files,
    // wired to crud_base instead of the layered modules.
    { relPath: `${dir}/service.py`, content: buildServiceDevSimple(entity), ownership: 'developer' },
    { relPath: `${dir}/routes.py`, content: buildRoutesDevSimple(entity), ownership: 'developer' },
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
  // has-many (Day 25) — the reverse projection: a parent-side collection route over the
  // child's existing FK. No schema change.
  for (const r of hasManyRels(entity)) {
    lines.push(`${entity.name} has-many ${r.target}: GET /api/${tableName(entity)}/{id}/${childTable(r)} (reverse of ${reverseFkColumn(entity)}, no schema change)`);
  }
  return lines;
}

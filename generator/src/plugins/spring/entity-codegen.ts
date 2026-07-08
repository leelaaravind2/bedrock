/*
 * Thraksha — Entity code generator (Step 3: "entity spec -> generated code").
 *
 * Turns one Entity from the Project Model into the concrete files of a working
 * CRUD REST API for a Spring Boot + PostgreSQL backend.
 *
 * BINDING RULES honoured here:
 *   ADR-001  No AI. These are pure, total functions of the Entity + context.
 *   ADR-002  Each file is tagged THRAKSHA (regenerated freely) or DEVELOPER
 *            (created once, then never touched). The two connect through a
 *            stable seam: the developer class EXTENDS the generated base class.
 *            The write phase (generate.ts) enforces that ownership.
 *   ADR-003  Deterministic: field order follows the model; no maps with
 *            unstable iteration, no timestamps, no randomness.
 *   ADR-004  Defaults (required->optional, unique->no, String length->255) are
 *            applied here and reported via describeEntityDefaults() so they can
 *            be shown, never silently decided.
 *   ADR-005  When multiUser is on, every entity carries owner scoping, built on
 *            the BaseOwnedEntity foundation established in Step 1.
 *   Laws 19-21  The emitted Java/SQL is ordinary, standard code — no Thraksha
 *            markers the project depends on to compile or run.
 */

import type { Entity, Field, Relationship } from '../../core/project-model.js';
import { decimalPrecision, decimalScale } from '../../core/project-model.js';
import type { GeneratedFile } from '../../core/plugin.js';
import type { SqlDialect } from '../../core/database.js';
import { applyNaming, type NamingConvention } from '../../core/style.js';

/** Everything the entity generator needs that is not on the Entity itself. */
export interface EntityCodegenContext {
  /** Java base package, e.g. "com.demoapp". */
  packageName: string;
  /** Same as a path, e.g. "com/demoapp". */
  packagePath: string;
  /** Whether the project is multi-user (owner scoping active). */
  multiUser: boolean;
  /** Flyway version number for this entity's migration (V2, V3, ...). */
  migrationVersion: number;
  /** The selected database's SQL dialect (Postgres today). */
  sql: SqlDialect;
  /**
   * Coding-style: the wire-key naming convention for declared fields (Day 12).
   * 'default' is a bypass — Jackson keeps serializing by the Java field name, so
   * no @JsonProperty is emitted and output is byte-identical.
   */
  naming: NamingConvention;
}

/**
 * The JSON wire key for a declared field — the ONLY thing naming governs here.
 * 'default' returns the declared name unchanged (⇒ no @JsonProperty). The Java
 * DTO field name (f.name) and the @Column(name=…) DB column are NOT touched.
 */
function wireKey(field: Field, ctx: EntityCodegenContext): string {
  return applyNaming(field.name, ctx.naming);
}

const DEFAULT_STRING_LENGTH = 255;

// ---------------------------------------------------------------------------
// Naming helpers (deterministic, total).
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/** camelCase / PascalCase -> snake_case (e.g. dueDate -> due_date). */
function snakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/** Naive pluralisation — deterministic and sufficient for the MVP. */
function pluralize(s: string): string {
  return `${s}s`;
}

function tableName(entity: Entity): string {
  return pluralize(snakeCase(entity.name));
}

function columnName(field: Field): string {
  return snakeCase(field.name);
}

/** The package segment for an entity, e.g. "ticket". */
function entitySegment(entity: Entity): string {
  return entity.name.toLowerCase();
}

// ---------------------------------------------------------------------------
// Relationship helpers (belongs-to only on Day 1). Scalar foreign keys mirror
// the proven `ownerId` pattern: a Long <target>Id + @Column(name="<target>_id").
// Emission is always via a loop over these, so relationship-free entities are
// byte-identical to before (empty loop -> nothing added).
// ---------------------------------------------------------------------------

/** PascalCase/camelCase -> camelCase (first char lowered), e.g. Team -> team. */
function decapitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** The belongs-to relationships on an entity, in authored order (deterministic). */
function belongsToRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'belongs-to');
}

// has-many (Day 25) — the REVERSE projection of a belongs-to FK. NO schema change: the
// child already carries `<parent>_id` (its scalar FK). has-many adds ONLY a parent-side
// collection endpoint — a @GetMapping("/{id}/<children>") that queries the child table by
// the existing FK via JdbcTemplate. Emission loops over hasManyRels, so has-many-free
// entities are byte-identical. Child table + FK derived by the SAME convention belongs-to uses.

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
 * The reverse-collection @GetMapping methods for a parent's has-many rels (empty for a
 * has-many-free entity — byte-identical). Owner-scoped when multi-user. Uses JdbcTemplate
 * (a Spring Boot autoconfigured bean) to query the child table by the existing FK column;
 * returns the rows as List<Map<String, Object>>.
 */
function reverseSpringMethods(entity: Entity, ctx: EntityCodegenContext): string[] {
  const rels = hasManyRels(entity);
  if (rels.length === 0) return [];
  const fk = reverseFkColumn(entity);
  const lines: string[] = [];
  for (const r of rels) {
    const ct = childTable(r);
    const where = ctx.multiUser ? `${fk} = ? AND owner_id = ?` : `${fk} = ?`;
    const args = ctx.multiUser ? `id, currentUser.requireCurrentUserId()` : `id`;
    lines.push(
      ``,
      `    @GetMapping("/{id}/${ct}")`,
      `    public List<Map<String, Object>> ${ct}(@PathVariable Long id) {`,
      `        // has-many ${entity.name} -> ${r.target}: the parent's ${ct} (reverse of the ${fk} FK).`,
      `        return jdbcTemplate.queryForList("SELECT * FROM ${ct} WHERE ${where} ORDER BY id", ${args});`,
      `    }`,
    );
  }
  return lines;
}

/** FK Java field name, e.g. Application -> applicationId. */
function fkFieldName(rel: Relationship): string {
  return `${decapitalize(rel.target)}Id`;
}

/** FK DB column, e.g. Application -> application_id. */
function fkColumnName(rel: Relationship): string {
  return `${snakeCase(rel.target)}_id`;
}

/** Referenced table, e.g. Application -> applications. */
function fkRefTable(rel: Relationship): string {
  return pluralize(snakeCase(rel.target));
}

// ---------------------------------------------------------------------------
// Type mapping (Java + SQL). Unsupported types block clearly (ADR-004), rather
// than being guessed.
// ---------------------------------------------------------------------------

interface JavaType {
  /** Simple Java type name used in source. */
  name: string;
  /** Fully-qualified import needed, if any (java.lang types need none). */
  importName?: string;
}

const SUPPORTED_TYPES = 'String, Text, Integer, Long, Decimal, Boolean, Date, DateTime';

function javaTypeOf(fieldType: string): JavaType {
  switch (fieldType) {
    case 'String':
    case 'Text':
      return { name: 'String' };
    case 'Integer':
      return { name: 'Integer' };
    case 'Long':
      return { name: 'Long' };
    case 'Decimal':
      return { name: 'BigDecimal', importName: 'java.math.BigDecimal' };
    case 'Boolean':
      return { name: 'Boolean' };
    case 'Date':
      return { name: 'LocalDate', importName: 'java.time.LocalDate' };
    case 'DateTime':
      return { name: 'OffsetDateTime', importName: 'java.time.OffsetDateTime' };
    default:
      throw new Error(
        `Unsupported field type "${fieldType}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`,
      );
  }
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

// SQL DDL column types now come from the selected database's SqlDialect (ctx.sql);
// javaTypeOf (the Java field types) stays here — it is language, not dialect.

/** Sorted, de-duplicated list of `import` lines for a set of field java types. */
function typeImports(fields: Field[], extra: string[] = []): string[] {
  const set = new Set<string>(extra);
  for (const f of fields) {
    const t = javaTypeOf(f.type);
    if (t.importName) set.add(t.importName);
  }
  return [...set].sort().map((i) => `import ${i};`);
}

// ---------------------------------------------------------------------------
// Java fragment helpers.
// ---------------------------------------------------------------------------

function accessors(field: Field): string {
  const t = javaTypeOf(field.type).name;
  const cap = capitalize(field.name);
  return [
    `    public ${t} get${cap}() {`,
    `        return ${field.name};`,
    `    }`,
    ``,
    `    public void set${cap}(${t} ${field.name}) {`,
    `        this.${field.name} = ${field.name};`,
    `    }`,
  ].join('\n');
}

function columnAnnotation(field: Field): string {
  const attrs: string[] = [`name = "${columnName(field)}"`];
  if (field.required) attrs.push('nullable = false');
  if (field.unique) attrs.push('unique = true');
  if (field.type === 'String') attrs.push(`length = ${maxLengthOf(field)}`);
  // Exact decimal (Day 27): @Column(precision, scale) → NUMERIC(p,s), default 19/4.
  if (field.type === 'Decimal') attrs.push(`precision = ${decimalPrecision(field)}`, `scale = ${decimalScale(field)}`);
  return `    @Column(${attrs.join(', ')})`;
}

/** @Column for a belongs-to FK scalar (name + nullable only), mirrors ownerId. */
function fkColumnAnnotation(rel: Relationship): string {
  const attrs: string[] = [`name = "${fkColumnName(rel)}"`];
  if (rel.required) attrs.push('nullable = false');
  return `    @Column(${attrs.join(', ')})`;
}

/** Getter/setter for a belongs-to FK scalar (Long <target>Id). */
function fkAccessors(rel: Relationship): string {
  const name = fkFieldName(rel);
  const cap = capitalize(name);
  return [
    `    public Long get${cap}() {`,
    `        return ${name};`,
    `    }`,
    ``,
    `    public void set${cap}(Long ${name}) {`,
    `        this.${name} = ${name};`,
    `    }`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// File builders.
// ---------------------------------------------------------------------------

function buildEntityBase(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const imports = [
    `import ${ctx.packageName}.common.BaseOwnedEntity;`,
    `import jakarta.persistence.Column;`,
    `import jakarta.persistence.MappedSuperclass;`,
    ...typeImports(entity.fields),
  ];

  const fieldBlocks = entity.fields.map(
    (f) => `${columnAnnotation(f)}\n    private ${javaTypeOf(f.type).name} ${f.name};`,
  );
  const accessorBlocks = entity.fields.map(accessors);

  // Foreign keys for belongs-to relationships (scalar Long, mirroring ownerId).
  // Long is java.lang and @Column is already imported, so no import changes.
  const fkFieldBlocks = belongsToRels(entity).map(
    (r) => `${fkColumnAnnotation(r)}\n    private Long ${fkFieldName(r)};`,
  );
  const fkAccessorBlocks = belongsToRels(entity).map(fkAccessors);

  return [
    `package ${pkg};`,
    ``,
    ...imports,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * Generated field mapping for the ${entity.name} entity. Extends`,
    ` * BaseOwnedEntity so per-user ownership and audit timestamps are present`,
    ` * from the start (multi-user-ready, ADR-005). Your business logic belongs`,
    ` * in ${entity.name}.java, which extends this class.`,
    ` */`,
    `@MappedSuperclass`,
    `public abstract class ${entity.name}Base extends BaseOwnedEntity {`,
    ``,
    [...fieldBlocks, ...fkFieldBlocks].join('\n\n'),
    ``,
    [...accessorBlocks, ...fkAccessorBlocks].join('\n\n'),
    `}`,
    ``,
  ].join('\n');
}

function buildEntityClass(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  return [
    `package ${pkg};`,
    ``,
    `import jakarta.persistence.Entity;`,
    `import jakarta.persistence.Table;`,
    ``,
    `/**`,
    ` * DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ` *`,
    ` * Add your domain behaviour for ${entity.name} here. The generated field`,
    ` * mapping lives in ${entity.name}Base (Thraksha-owned). This class is safe`,
    ` * to edit; regeneration will not touch it.`,
    ` */`,
    `@Entity`,
    `@Table(name = "${tableName(entity)}")`,
    `public class ${entity.name} extends ${entity.name}Base {`,
    `    // Your business logic goes here.`,
    `}`,
    ``,
  ].join('\n');
}

function buildRepository(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const lines: string[] = [
    `package ${pkg};`,
    ``,
  ];
  if (ctx.multiUser) {
    lines.push(
      `import java.util.List;`,
      `import java.util.Optional;`,
      `import org.springframework.data.jpa.repository.JpaRepository;`,
    );
  } else {
    lines.push(`import org.springframework.data.jpa.repository.JpaRepository;`);
  }
  lines.push(
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` */`,
    `public interface ${entity.name}Repository extends JpaRepository<${entity.name}, Long> {`,
  );
  if (ctx.multiUser) {
    lines.push(
      ``,
      `    // Owner-scoped lookups (multi-user, ADR-005).`,
      `    List<${entity.name}> findAllByOwnerId(Long ownerId);`,
      ``,
      `    Optional<${entity.name}> findByIdAndOwnerId(Long id, Long ownerId);`,
    );
  }
  lines.push(`}`, ``);
  return lines.join('\n');
}

function buildDto(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;

  const belongsTo = belongsToRels(entity);

  // Validation annotations used, collected for imports (sorted, de-duplicated).
  const validationImports = new Set<string>();
  for (const f of entity.fields) {
    if (f.required) {
      validationImports.add(isStringType(f.type) ? 'jakarta.validation.constraints.NotBlank' : 'jakarta.validation.constraints.NotNull');
    }
    if (isStringType(f.type)) validationImports.add('jakarta.validation.constraints.Size');
  }
  for (const r of belongsTo) {
    if (r.required) validationImports.add('jakarta.validation.constraints.NotNull');
  }
  // Day 12: only when a declared field's wire key differs from its Java field name
  // do we emit @JsonProperty (and its import). Under 'default' — and for any
  // single-word field — nothing is emitted, so output stays byte-identical.
  const needJsonProperty =
    entity.fields.some((f) => wireKey(f, ctx) !== f.name) ||
    belongsTo.some((r) => applyNaming(fkFieldName(r), ctx.naming) !== fkFieldName(r)); // Day 29: FK wire key
  // Exact decimal (Day 27): serialize BigDecimal as a STRING on the wire (Jackson emits it
  // as a JSON number by default) — gated, so a Decimal-free DTO is byte-identical.
  const needDecimal = entity.fields.some((f) => f.type === 'Decimal');
  const imports = [
    ...(needJsonProperty ? ['import com.fasterxml.jackson.annotation.JsonProperty;'] : []),
    ...(needDecimal
      ? ['import com.fasterxml.jackson.databind.annotation.JsonSerialize;', 'import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;']
      : []),
    ...[...validationImports].sort().map((i) => `import ${i};`),
    ...typeImports(entity.fields, ['java.time.OffsetDateTime']),
  ];

  // Fields: id (read), entity fields (validated), FK(s) (writable), owner + audit (read).
  const fieldDecls: string[] = [`    private Long id;`];
  for (const f of entity.fields) {
    const ann: string[] = [];
    // @JsonProperty sets ONLY the wire key; the Java field name (and thus the
    // getters/setters, fromEntity, applyTo, and the @Column mapping) is unchanged.
    const wire = wireKey(f, ctx);
    if (wire !== f.name) ann.push(`    @JsonProperty("${wire}")`);
    if (f.required) ann.push(isStringType(f.type) ? `    @NotBlank` : `    @NotNull`);
    if (isStringType(f.type)) ann.push(`    @Size(max = ${maxLengthOf(f)})`);
    // Exact decimal (Day 27): BigDecimal → String on the wire (Jackson would emit a number).
    if (f.type === 'Decimal') ann.push(`    @JsonSerialize(using = ToStringSerializer.class)`);
    const decl = `    private ${javaTypeOf(f.type).name} ${f.name};`;
    fieldDecls.push([...ann, decl].join('\n'));
  }
  for (const r of belongsTo) {
    const ann = r.required ? [`    @NotNull`] : [];
    // Day 29 (field-key consistency): the FK WIRE key follows the naming convention via
    // @JsonProperty (the SAME pattern declared fields use) — only when it differs from the
    // Java field name (default/camelCase ⇒ no annotation, byte-identical; snake_case ⇒ team_id).
    const fkWire = applyNaming(fkFieldName(r), ctx.naming);
    if (fkWire !== fkFieldName(r)) ann.push(`    @JsonProperty("${fkWire}")`);
    fieldDecls.push([...ann, `    private Long ${fkFieldName(r)};`].join('\n'));
  }
  fieldDecls.push(`    private Long ownerId;`);
  fieldDecls.push(`    private OffsetDateTime createdAt;`);
  fieldDecls.push(`    private OffsetDateTime updatedAt;`);

  // fromEntity: copy everything for responses.
  const fromBody: string[] = [
    `        ${entity.name}Dto dto = new ${entity.name}Dto();`,
    `        dto.setId(entity.getId());`,
  ];
  for (const f of entity.fields) {
    fromBody.push(`        dto.set${capitalize(f.name)}(entity.get${capitalize(f.name)}());`);
  }
  for (const r of belongsTo) {
    const cap = capitalize(fkFieldName(r));
    fromBody.push(`        dto.set${cap}(entity.get${cap}());`);
  }
  fromBody.push(
    `        dto.setOwnerId(entity.getOwnerId());`,
    `        dto.setCreatedAt(entity.getCreatedAt());`,
    `        dto.setUpdatedAt(entity.getUpdatedAt());`,
    `        return dto;`,
  );

  // applyTo: copy the writable properties (id/owner/audit are managed). The FK
  // is writable so a create/update can set the parent id.
  const applyBody = [
    ...entity.fields.map((f) => `        entity.set${capitalize(f.name)}(this.${f.name});`),
    ...belongsTo.map((r) => `        entity.set${capitalize(fkFieldName(r))}(this.${fkFieldName(r)});`),
  ];

  // Accessors for all DTO properties.
  const allProps: { name: string; type: string }[] = [
    { name: 'id', type: 'Long' },
    ...entity.fields.map((f) => ({ name: f.name, type: javaTypeOf(f.type).name })),
    ...belongsTo.map((r) => ({ name: fkFieldName(r), type: 'Long' })),
    { name: 'ownerId', type: 'Long' },
    { name: 'createdAt', type: 'OffsetDateTime' },
    { name: 'updatedAt', type: 'OffsetDateTime' },
  ];
  const accessorBlocks = allProps.map(({ name, type }) => {
    const cap = capitalize(name);
    return [
      `    public ${type} get${cap}() {`,
      `        return ${name};`,
      `    }`,
      ``,
      `    public void set${cap}(${type} ${name}) {`,
      `        this.${name} = ${name};`,
      `    }`,
    ].join('\n');
  });

  return [
    `package ${pkg};`,
    ``,
    ...imports,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * Data transfer object for ${entity.name}, with validation derived from the`,
    ` * field rules. Used for request bodies (create/update) and responses.`,
    ` */`,
    `public class ${entity.name}Dto {`,
    ``,
    fieldDecls.join('\n\n'),
    ``,
    `    /** Build a DTO from a persisted entity (for responses). */`,
    `    public static ${entity.name}Dto fromEntity(${entity.name} entity) {`,
    fromBody.join('\n'),
    `    }`,
    ``,
    `    /** Copy the writable fields from this DTO onto an entity. */`,
    `    public void applyTo(${entity.name} entity) {`,
    applyBody.join('\n'),
    `    }`,
    ``,
    accessorBlocks.join('\n\n'),
    `}`,
    ``,
  ].join('\n');
}

function buildServiceBase(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const name = entity.name;

  if (ctx.multiUser) {
    return [
      `package ${pkg};`,
      ``,
      `import ${ctx.packageName}.common.CurrentUserProvider;`,
      `import java.util.List;`,
      `import org.springframework.beans.factory.annotation.Autowired;`,
      `import org.springframework.http.HttpStatus;`,
      `import org.springframework.transaction.annotation.Transactional;`,
      `import org.springframework.web.server.ResponseStatusException;`,
      ``,
      `/**`,
      ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
      ` *`,
      ` * Standard CRUD for ${name}, scoped to the current user (multi-user,`,
      ` * ADR-005). Your business logic belongs in ${name}Service, which extends`,
      ` * this class.`,
      ` */`,
      `public abstract class ${name}ServiceBase {`,
      ``,
      `    @Autowired`,
      `    protected ${name}Repository repository;`,
      ``,
      `    @Autowired`,
      `    protected CurrentUserProvider currentUser;`,
      ``,
      `    @Transactional(readOnly = true)`,
      `    public List<${name}> list() {`,
      `        return repository.findAllByOwnerId(currentUser.requireCurrentUserId());`,
      `    }`,
      ``,
      `    @Transactional(readOnly = true)`,
      `    public ${name} get(Long id) {`,
      `        return repository.findByIdAndOwnerId(id, currentUser.requireCurrentUserId())`,
      `                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "${name} " + id + " not found"));`,
      `    }`,
      ``,
      `    @Transactional`,
      `    public ${name} create(${name}Dto dto) {`,
      `        ${name} entity = new ${name}();`,
      `        dto.applyTo(entity);`,
      `        entity.setOwnerId(currentUser.requireCurrentUserId());`,
      `        return repository.save(entity);`,
      `    }`,
      ``,
      `    @Transactional`,
      `    public ${name} update(Long id, ${name}Dto dto) {`,
      `        ${name} entity = get(id);`,
      `        dto.applyTo(entity);`,
      `        return repository.save(entity);`,
      `    }`,
      ``,
      `    @Transactional`,
      `    public void delete(Long id) {`,
      `        repository.delete(get(id));`,
      `    }`,
      `}`,
      ``,
    ].join('\n');
  }

  // Single-user variant (no owner scoping). Not exercised by DemoApp, but kept
  // correct so the generator is general.
  return [
    `package ${pkg};`,
    ``,
    `import java.util.List;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.http.HttpStatus;`,
    `import org.springframework.transaction.annotation.Transactional;`,
    `import org.springframework.web.server.ResponseStatusException;`,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` */`,
    `public abstract class ${name}ServiceBase {`,
    ``,
    `    @Autowired`,
    `    protected ${name}Repository repository;`,
    ``,
    `    @Transactional(readOnly = true)`,
    `    public List<${name}> list() {`,
    `        return repository.findAll();`,
    `    }`,
    ``,
    `    @Transactional(readOnly = true)`,
    `    public ${name} get(Long id) {`,
    `        return repository.findById(id)`,
    `                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "${name} " + id + " not found"));`,
    `    }`,
    ``,
    `    @Transactional`,
    `    public ${name} create(${name}Dto dto) {`,
    `        ${name} entity = new ${name}();`,
    `        dto.applyTo(entity);`,
    `        return repository.save(entity);`,
    `    }`,
    ``,
    `    @Transactional`,
    `    public ${name} update(Long id, ${name}Dto dto) {`,
    `        ${name} entity = get(id);`,
    `        dto.applyTo(entity);`,
    `        return repository.save(entity);`,
    `    }`,
    ``,
    `    @Transactional`,
    `    public void delete(Long id) {`,
    `        repository.delete(get(id));`,
    `    }`,
    `}`,
    ``,
  ].join('\n');
}

function buildServiceClass(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  return [
    `package ${pkg};`,
    ``,
    `import org.springframework.stereotype.Service;`,
    ``,
    `/**`,
    ` * DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ` *`,
    ` * Add your business logic for ${entity.name} here. The standard CRUD lives`,
    ` * in ${entity.name}ServiceBase (Thraksha-owned). This class is safe to edit;`,
    ` * regeneration will not touch it.`,
    ` */`,
    `@Service`,
    `public class ${entity.name}Service extends ${entity.name}ServiceBase {`,
    `    // Your business logic goes here.`,
    `}`,
    ``,
  ].join('\n');
}

function buildControllerBase(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const name = entity.name;
  return [
    `package ${pkg};`,
    ``,
    `import jakarta.validation.Valid;`,
    `import java.util.List;`,
    // has-many (Day 25): the reverse endpoints return generic rows via JdbcTemplate (gated —
    // a has-many-free entity imports nothing new, so it stays byte-identical).
    ...(hasManyRels(entity).length > 0
      ? [
          `import java.util.Map;`,
          `import org.springframework.jdbc.core.JdbcTemplate;`,
          ...(ctx.multiUser ? [`import ${ctx.packageName}.common.CurrentUserProvider;`] : []),
        ]
      : []),
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.http.HttpStatus;`,
    `import org.springframework.web.bind.annotation.DeleteMapping;`,
    `import org.springframework.web.bind.annotation.GetMapping;`,
    `import org.springframework.web.bind.annotation.PathVariable;`,
    `import org.springframework.web.bind.annotation.PostMapping;`,
    `import org.springframework.web.bind.annotation.PutMapping;`,
    `import org.springframework.web.bind.annotation.RequestBody;`,
    `import org.springframework.web.bind.annotation.ResponseStatus;`,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * Standard CRUD endpoints for ${name}. The concrete @RestController`,
    ` * (${name}Controller) extends this and carries the @RequestMapping; add your`,
    ` * own endpoints there.`,
    ` */`,
    `public abstract class ${name}ControllerBase {`,
    ``,
    `    @Autowired`,
    `    protected ${name}Service service;`,
    ``,
    // has-many (Day 25): gated beans for the reverse-collection endpoints (JdbcTemplate is a
    // Spring Boot autoconfigured bean; currentUser scopes the query when multi-user).
    ...(hasManyRels(entity).length > 0
      ? [
          `    @Autowired`,
          `    protected JdbcTemplate jdbcTemplate;`,
          ``,
          ...(ctx.multiUser ? [`    @Autowired`, `    protected CurrentUserProvider currentUser;`, ``] : []),
        ]
      : []),
    `    @GetMapping`,
    `    public List<${name}Dto> list() {`,
    `        return service.list().stream().map(${name}Dto::fromEntity).toList();`,
    `    }`,
    ``,
    `    @GetMapping("/{id}")`,
    `    public ${name}Dto get(@PathVariable Long id) {`,
    `        return ${name}Dto.fromEntity(service.get(id));`,
    `    }`,
    ``,
    `    @PostMapping`,
    `    @ResponseStatus(HttpStatus.CREATED)`,
    `    public ${name}Dto create(@Valid @RequestBody ${name}Dto dto) {`,
    `        return ${name}Dto.fromEntity(service.create(dto));`,
    `    }`,
    ``,
    `    @PutMapping("/{id}")`,
    `    public ${name}Dto update(@PathVariable Long id, @Valid @RequestBody ${name}Dto dto) {`,
    `        return ${name}Dto.fromEntity(service.update(id, dto));`,
    `    }`,
    ``,
    `    @DeleteMapping("/{id}")`,
    `    @ResponseStatus(HttpStatus.NO_CONTENT)`,
    `    public void delete(@PathVariable Long id) {`,
    `        service.delete(id);`,
    `    }`,
    ...reverseSpringMethods(entity, ctx),
    `}`,
    ``,
  ].join('\n');
}

function buildControllerClass(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const path = `/api/${tableName(entity)}`;
  return [
    `package ${pkg};`,
    ``,
    `import org.springframework.web.bind.annotation.RequestMapping;`,
    `import org.springframework.web.bind.annotation.RestController;`,
    ``,
    `/**`,
    ` * DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ` *`,
    ` * Add custom endpoints for ${entity.name} here. The standard CRUD lives in`,
    ` * ${entity.name}ControllerBase (Thraksha-owned). This class is safe to edit;`,
    ` * regeneration will not touch it.`,
    ` */`,
    `@RestController`,
    `@RequestMapping("${path}")`,
    `public class ${entity.name}Controller extends ${entity.name}ControllerBase {`,
    `    // Your custom endpoints go here.`,
    `}`,
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
    cols.push(`    ${columnName(f)} ${ctx.sql.columnType(f.type, { maxLength: maxLengthOf(f), precision: decimalPrecision(f), scale: decimalScale(f) })}${notNull}`);
  }
  // Foreign-key columns for belongs-to relationships (authored order).
  for (const r of belongsToRels(entity)) {
    const notNull = r.required ? ' NOT NULL' : '';
    cols.push(`    ${fkColumnName(r)} ${ctx.sql.bigInt()}${notNull}`);
  }
  // Multi-user-ready foundation columns (mirror BaseOwnedEntity).
  cols.push(`    owner_id    ${ctx.sql.bigInt()}`);
  cols.push(`    created_at  ${ctx.sql.timestampDefaultNow()}`);
  cols.push(`    updated_at  ${ctx.sql.timestampDefaultNow()}`);
  lines.push(cols.join(',\n'));
  lines.push(`);`);

  // Unique indexes for unique fields.
  for (const f of entity.fields) {
    if (f.unique) {
      lines.push(``, ctx.sql.index(`ux_${table}_${columnName(f)}`, table, columnName(f), true));
    }
  }
  // Foreign-key constraints + indexes (the referenced table precedes this one).
  for (const r of belongsToRels(entity)) {
    const col = fkColumnName(r);
    lines.push(``, ctx.sql.foreignKey(table, `fk_${table}_${snakeCase(r.target)}`, col, fkRefTable(r)));
    lines.push(``, ctx.sql.index(`idx_${table}_${col}`, table, col, false));
  }
  // Owner index for per-user scoping.
  if (ctx.multiUser) {
    lines.push(``, ctx.sql.index(`idx_${table}_owner_id`, table, 'owner_id', false));
  }
  lines.push(``);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Worker archetypes (Day 34, pass 2) — cron-worker + queue-consumer. Both REUSE
// the domain layer BYTE-IDENTICALLY (<Name>Base/Repository/Dto/ServiceBase + the
// migration + the developer <Name>.java/<Name>Service.java) and swap ONLY the HTTP
// controller layer (<Name>ControllerBase + the dev <Name>Controller) for a worker:
//   - cron:  <Name>Job.java      — a @Scheduled bean scanning the repository (idempotent).
//   - queue: <Name>Listener.java — a @RabbitListener consuming into the Dto + repository.
// Both are component-scanned (the worker analog of an auto-registered @RestController),
// so no explicit table is generated. They reuse the domain REPOSITORY + DTO directly
// (not the request-scoped service, which needs a SecurityContext a worker lacks) —
// JpaRepository.findAll()/save() are the same persistence the HTTP service uses.
// ---------------------------------------------------------------------------

/** The idempotent cron job for one entity (<Name>Job.java) — a @Scheduled scan over the repository. */
function buildCronJob(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const name = entity.name;
  return [
    `package ${pkg};`,
    ``,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.scheduling.annotation.Scheduled;`,
    `import org.springframework.stereotype.Component;`,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * Cron job for ${name}: an idempotent scan over the SAME repository the HTTP`,
    ` * API's service uses (${name}Repository). No HTTP endpoint — @Scheduled fires`,
    ` * run() on an interval (component-scanned, the worker analog of an`,
    ` * auto-registered @RestController). Re-running is idempotent by design.`,
    ` */`,
    `@Component`,
    `public class ${name}Job {`,
    ``,
    `    @Autowired`,
    `    protected ${name}Repository repository;`,
    ``,
    `    @Scheduled(fixedDelayString = "\${cron.interval.ms:60000}")`,
    `    public int run() {`,
    `        int count = 0;`,
    `        for (${name} item : repository.findAll()) {`,
    `            processItem(item);`,
    `            count++;`,
    `        }`,
    `        return count;`,
    `    }`,
    ``,
    `    protected void processItem(${name} item) {`,
    `        // Idempotent per-item work goes here (default: a no-op scan).`,
    `    }`,
    `}`,
    ``,
  ].join('\n');
}

/** The queue listener for one entity (<Name>Listener.java) — @RabbitListener into the Dto + repository. */
function buildQueueListener(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const name = entity.name;
  const slug = entitySegment(entity);
  const ownerLine = ctx.multiUser
    ? [`        entity.setOwnerId(0L); // system owner (a consumer has no request user); narrow as needed`]
    : [];
  return [
    `package ${pkg};`,
    ``,
    `import org.springframework.amqp.rabbit.annotation.RabbitListener;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.stereotype.Component;`,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * Queue listener for ${name}: consumes "${slug}.created" and creates through the`,
    ` * SAME ${name}Dto + ${name}Repository the HTTP API's service uses. No HTTP`,
    ` * endpoint. Spring AMQP's listener container provides ack (on normal return),`,
    ` * redelivery/retry (on exception), and dead-letter (via a broker DLX) — the`,
    ` * declarative equivalent of the ack/retry/dead-letter loop the other stacks`,
    ` * hand-roll. Component-scanned, like an auto-registered @RestController.`,
    ` */`,
    `@Component`,
    `public class ${name}Listener {`,
    ``,
    `    @Autowired`,
    `    protected ${name}Repository repository;`,
    ``,
    `    @RabbitListener(queues = "${slug}.created")`,
    `    public void onCreated(${name}Dto dto) {`,
    `        ${name} entity = new ${name}();`,
    `        dto.applyTo(entity);`,
    ...ownerLine,
    `        repository.save(entity);`,
    `    }`,
    `}`,
    ``,
  ].join('\n');
}

/**
 * The worker entity file set (Day 34): the domain layer BYTE-IDENTICAL to the
 * default/api-only file set (<Name>Base/Repository/Dto/ServiceBase + migration +
 * the developer <Name>.java/<Name>Service.java), MINUS the HTTP controller layer
 * (<Name>ControllerBase + the dev <Name>Controller), PLUS the worker bean.
 */
export function generateWorkerEntityFiles(
  entity: Entity,
  ctx: EntityCodegenContext,
  kind: 'cron' | 'queue',
): GeneratedFile[] {
  const javaDir = `backend/src/main/java/${ctx.packagePath}/${entitySegment(entity)}`;
  const migrationDir = `backend/src/main/resources/db/migration`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  const workerLayer: GeneratedFile[] =
    kind === 'cron'
      ? [{ relPath: `${javaDir}/${entity.name}Job.java`, content: buildCronJob(entity, ctx), ownership: 'thraksha' }]
      : [{ relPath: `${javaDir}/${entity.name}Listener.java`, content: buildQueueListener(entity, ctx), ownership: 'thraksha' }];

  return [
    // Domain layer — BYTE-IDENTICAL to the api-only twin (same builders/ctx).
    { relPath: `${javaDir}/${entity.name}Base.java`, content: buildEntityBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}Repository.java`, content: buildRepository(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}Dto.java`, content: buildDto(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}ServiceBase.java`, content: buildServiceBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${migrationDir}/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },
    // The developer entity + service seam — reused unchanged.
    { relPath: `${javaDir}/${entity.name}.java`, content: buildEntityClass(entity, ctx), ownership: 'developer' },
    { relPath: `${javaDir}/${entity.name}Service.java`, content: buildServiceClass(entity, ctx), ownership: 'developer' },
    // Swapped: the worker bean replaces <Name>ControllerBase + the dev <Name>Controller.
    ...workerLayer,
  ];
}

// ---------------------------------------------------------------------------
// CLI + GraphQL archetypes (Day 36, pass 2) — reuse the domain BYTE-IDENTICALLY and
// swap the HTTP controller layer (<Name>ControllerBase + the dev <Name>Controller) for:
//   - CLI:     <Name>Command.java — an EntityCommand @Component (CommandLineRunner
//              dispatch), CRUD over the SAME repository + Dto the REST API used. No dep.
//   - GraphQL: <Name>GraphqlController.java — a @Controller with @QueryMapping /
//              @MutationMapping over the repository + Dto (spring-graphql, SDL-first).
// Both are component-scanned (the worker analog of an auto-registered @RestController).
// They reuse the domain REPOSITORY + DTO directly (not the request-scoped service,
// which needs a SecurityContext a CLI/GraphQL system context lacks).
// ---------------------------------------------------------------------------

/** GraphQL query/mutation field names — MUST match core/graphql-sdl.ts. */
function springGraphqlNames(entity: Entity): { single: string; plural: string } {
  const single = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
  return { single, plural: `${single}s` };
}

/** The GraphQL resolver controller for one entity (<Name>GraphqlController.java). */
function buildGraphqlController(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const name = entity.name;
  const { single, plural } = springGraphqlNames(entity);
  const ownerLine = ctx.multiUser ? [`        entity.setOwnerId(0L); // system context (no request user); narrow as needed`] : [];
  return [
    `package ${pkg};`,
    ``,
    `import java.util.List;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.graphql.data.method.annotation.Argument;`,
    `import org.springframework.graphql.data.method.annotation.MutationMapping;`,
    `import org.springframework.graphql.data.method.annotation.QueryMapping;`,
    `import org.springframework.stereotype.Controller;`,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * GraphQL resolvers for ${name}: @QueryMapping / @MutationMapping over the SAME`,
    ` * ${name}Repository + ${name}Dto the HTTP API's service uses. No REST endpoint. The`,
    ` * SDL is the shared schema.graphql (backend/src/main/resources/graphql). Component-`,
    ` * scanned, like an auto-registered @RestController.`,
    ` */`,
    `@Controller`,
    `public class ${name}GraphqlController {`,
    ``,
    `    @Autowired`,
    `    protected ${name}Repository repository;`,
    ``,
    `    @QueryMapping`,
    `    public List<${name}> ${plural}() {`,
    `        return repository.findAll();`,
    `    }`,
    ``,
    `    @QueryMapping`,
    `    public ${name} ${single}(@Argument Long id) {`,
    `        return repository.findById(id).orElse(null);`,
    `    }`,
    ``,
    `    @MutationMapping`,
    `    public ${name} create${name}(@Argument ${name}Dto input) {`,
    `        ${name} entity = new ${name}();`,
    `        input.applyTo(entity);`,
    ...ownerLine,
    `        return repository.save(entity);`,
    `    }`,
    ``,
    `    @MutationMapping`,
    `    public ${name} update${name}(@Argument Long id, @Argument ${name}Dto input) {`,
    `        ${name} entity = repository.findById(id).orElseThrow();`,
    `        input.applyTo(entity);`,
    `        return repository.save(entity);`,
    `    }`,
    ``,
    `    @MutationMapping`,
    `    public boolean delete${name}(@Argument Long id) {`,
    `        repository.deleteById(id);`,
    `        return true;`,
    `    }`,
    `}`,
    ``,
  ].join('\n');
}

/** The CLI command for one entity (<Name>Command.java) — an EntityCommand @Component. */
function buildCliCommand(entity: Entity, ctx: EntityCodegenContext): string {
  const pkg = `${ctx.packageName}.${entitySegment(entity)}`;
  const name = entity.name;
  const slug = entitySegment(entity);
  const ownerLine = ctx.multiUser ? [`                entity.setOwnerId(0L); // system context (no request user); narrow as needed`] : [];
  return [
    `package ${pkg};`,
    ``,
    `import java.util.Map;`,
    `import com.fasterxml.jackson.databind.ObjectMapper;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.stereotype.Component;`,
    ``,
    `import ${ctx.packageName}.cli.EntityCommand;`,
    ``,
    `/**`,
    ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ` *`,
    ` * CLI command for ${name}: CRUD over the SAME ${name}Repository + ${name}Dto the HTTP`,
    ` * API's service uses. Dispatched by CliRunner (\`<entity> <op>\`); no REST endpoint.`,
    ` */`,
    `@Component`,
    `public class ${name}Command implements EntityCommand {`,
    ``,
    `    @Autowired`,
    `    protected ${name}Repository repository;`,
    ``,
    `    private final ObjectMapper mapper = new ObjectMapper();`,
    ``,
    `    @Override`,
    `    public String name() {`,
    `        return "${slug}";`,
    `    }`,
    ``,
    `    @Override`,
    `    public Object run(String op, Map<String, String> args) throws Exception {`,
    `        switch (op) {`,
    `            case "list":`,
    `                return repository.findAll();`,
    `            case "get":`,
    `                return repository.findById(Long.parseLong(args.get("id"))).orElse(null);`,
    `            case "create": {`,
    `                ${name}Dto dto = mapper.readValue(args.getOrDefault("json", "{}"), ${name}Dto.class);`,
    `                ${name} entity = new ${name}();`,
    `                dto.applyTo(entity);`,
    ...ownerLine,
    `                return repository.save(entity);`,
    `            }`,
    `            case "update": {`,
    `                ${name} entity = repository.findById(Long.parseLong(args.get("id"))).orElseThrow();`,
    `                ${name}Dto dto = mapper.readValue(args.getOrDefault("json", "{}"), ${name}Dto.class);`,
    `                dto.applyTo(entity);`,
    `                return repository.save(entity);`,
    `            }`,
    `            case "delete":`,
    `                repository.deleteById(Long.parseLong(args.get("id")));`,
    `                return Map.of("deleted", args.get("id"));`,
    `            default:`,
    `                throw new IllegalArgumentException("unknown op: " + op);`,
    `        }`,
    `    }`,
    `}`,
    ``,
  ].join('\n');
}

/** Domain files shared by CLI/GraphQL (byte-identical to the api-only twin). */
function springDomainEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  const javaDir = `backend/src/main/java/${ctx.packagePath}/${entitySegment(entity)}`;
  const migrationDir = `backend/src/main/resources/db/migration`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);
  return [
    { relPath: `${javaDir}/${entity.name}Base.java`, content: buildEntityBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}Repository.java`, content: buildRepository(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}Dto.java`, content: buildDto(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}ServiceBase.java`, content: buildServiceBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${migrationDir}/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}.java`, content: buildEntityClass(entity, ctx), ownership: 'developer' },
    { relPath: `${javaDir}/${entity.name}Service.java`, content: buildServiceClass(entity, ctx), ownership: 'developer' },
  ];
}

/** CLI entity file set (Day 36): domain (byte-identical) + <Name>Command.java. */
export function generateCliEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  const javaDir = `backend/src/main/java/${ctx.packagePath}/${entitySegment(entity)}`;
  return [
    ...springDomainEntityFiles(entity, ctx),
    { relPath: `${javaDir}/${entity.name}Command.java`, content: buildCliCommand(entity, ctx), ownership: 'thraksha' },
  ];
}

/** GraphQL entity file set (Day 36): domain (byte-identical) + <Name>GraphqlController.java. */
export function generateGraphqlEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  const javaDir = `backend/src/main/java/${ctx.packagePath}/${entitySegment(entity)}`;
  return [
    ...springDomainEntityFiles(entity, ctx),
    { relPath: `${javaDir}/${entity.name}GraphqlController.java`, content: buildGraphqlController(entity, ctx), ownership: 'thraksha' },
  ];
}

/**
 * Generate all files for one entity, each tagged with its ownership (ADR-002).
 * Pure and deterministic — same Entity + context always yields the same files.
 */
export function generateEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  const javaDir = `backend/src/main/java/${ctx.packagePath}/${entitySegment(entity)}`;
  const migrationDir = `backend/src/main/resources/db/migration`;
  const v = ctx.migrationVersion;
  const table = tableName(entity);

  return [
    // THRAKSHA-OWNED — regenerated freely.
    { relPath: `${javaDir}/${entity.name}Base.java`, content: buildEntityBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}Repository.java`, content: buildRepository(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}Dto.java`, content: buildDto(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}ServiceBase.java`, content: buildServiceBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${javaDir}/${entity.name}ControllerBase.java`, content: buildControllerBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${migrationDir}/V${v}__create_${table}.sql`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again.
    { relPath: `${javaDir}/${entity.name}.java`, content: buildEntityClass(entity, ctx), ownership: 'developer' },
    { relPath: `${javaDir}/${entity.name}Service.java`, content: buildServiceClass(entity, ctx), ownership: 'developer' },
    { relPath: `${javaDir}/${entity.name}Controller.java`, content: buildControllerClass(entity, ctx), ownership: 'developer' },
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
  // has-many (Day 25) — the reverse projection: a parent-side collection endpoint over the
  // child's existing FK. No schema change.
  for (const r of hasManyRels(entity)) {
    lines.push(`${entity.name} has-many ${r.target}: GET /api/${tableName(entity)}/{id}/${childTable(r)} (reverse of ${reverseFkColumn(entity)}, no schema change)`);
  }
  return lines;
}

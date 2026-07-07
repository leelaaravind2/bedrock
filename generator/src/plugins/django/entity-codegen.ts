/*
 * Thraksha — Python (Django) entity code generator.
 *
 * The Django counterpart of the Spring / Express / FastAPI entity codegens: it
 * turns one Entity from the Project Model into a working CRUD REST slice for a
 * Django + Django REST Framework backend. Same model in; idiomatic Django out
 * (a Django model + DRF ModelSerializer + ModelViewSet + an initial migration).
 *
 * Django is a SECOND Python framework, a peer of FastAPI — not a replacement.
 *
 * BINDING RULES (identical obligations to the other plugins):
 *   ADR-001  No AI. Pure, total functions of the Entity.
 *   ADR-002  Each file is tagged THRAKSHA (regenerated) or DEVELOPER (created
 *            once, then never touched). The developer's viewset/urls survive
 *            regeneration; the generated bases are rewritten freely.
 *   ADR-003  Deterministic: field order follows the model; no timestamps, no
 *            randomness.
 *   ADR-004  Defaults (required->optional, unique->no, String length 255) are
 *            applied here and reported via describeEntityDefaults().
 *   Laws 19-21  Ordinary Django — no Thraksha markers the project needs to run.
 *
 * NOTE (scope): multi-user owner scoping and the deeper file-separation proof are
 * Django Step 2. Step 1 generates plain CRUD, matching how the FastAPI rollout
 * was staged.
 */

import type { Entity, Field, Relationship } from '../../core/project-model.js';
import type { GeneratedFile } from '../../core/plugin.js';
import { applyNaming, type NamingConvention } from '../../core/style.js';

const DEFAULT_STRING_LENGTH = 255;
const SUPPORTED_TYPES = 'String, Text, Integer, Long, Decimal, Boolean, Date, DateTime';

/** Context the Django plugin derives from the agnostic EntityGenerationContext. */
export interface EntityCodegenContext {
  /** When true, entities are owner-scoped (owner FK + filtered queries, ADR-005). */
  multiUser: boolean;
  /**
   * Coding-style: the wire-key naming convention for declared fields (Day 12).
   * 'default' is a bypass. The wire key is set via an explicit DRF serializer
   * field with source="<attr>"; the model attribute/column is NOT renamed (Risk 1).
   */
  naming: NamingConvention;
}

// ---------------------------------------------------------------------------
// Naming helpers (deterministic, total) — same conventions as the other plugins.
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

/** The Django app / directory segment for an entity, e.g. "ticket". */
function entitySlug(entity: Entity): string {
  return entity.name.toLowerCase();
}

function tableName(entity: Entity): string {
  return pluralize(snakeCase(entity.name));
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
// Type mapping (Django model field). Unsupported types block clearly (ADR-004).
// ---------------------------------------------------------------------------

/** The Django field class + its type-specific constructor args (before flags). */
function djangoFieldParts(field: Field): { cls: string; typeArgs: string[] } {
  switch (field.type) {
    case 'String':
      return { cls: 'CharField', typeArgs: [`max_length=${maxLengthOf(field)}`] };
    case 'Text':
      return { cls: 'TextField', typeArgs: [] };
    case 'Integer':
      return { cls: 'IntegerField', typeArgs: [] };
    case 'Long':
      return { cls: 'BigIntegerField', typeArgs: [] };
    case 'Decimal':
      return { cls: 'DecimalField', typeArgs: ['max_digits=19', 'decimal_places=2'] };
    case 'Boolean':
      return { cls: 'BooleanField', typeArgs: [] };
    case 'Date':
      return { cls: 'DateField', typeArgs: [] };
    case 'DateTime':
      return { cls: 'DateTimeField', typeArgs: [] };
    default:
      throw new Error(`Unsupported field type "${field.type}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`);
  }
}

/** Full `models.XxxField(...)` expression for a field (deterministic kwarg order). */
function fieldExpr(field: Field): string {
  const { cls, typeArgs } = djangoFieldParts(field);
  const args = [...typeArgs];
  if (field.unique) args.push('unique=True');
  if (!field.required) args.push('null=True', 'blank=True'); // optional (ADR-004 default)
  return `models.${cls}(${args.join(', ')})`;
}

function assertSupported(field: Field): void {
  djangoFieldParts(field); // throws on unsupported type
}

// ---------------------------------------------------------------------------
// Relationship helpers (belongs-to only). Django's idiom is a real ForeignKey
// (like the existing owner FK): a field named <snake(target)> auto-produces the
// column <snake(target)>_id and a real DB FK constraint + index. Emission is
// always a loop over these, so relationship-free entities are byte-identical.
// ---------------------------------------------------------------------------

/** The belongs-to relationships on an entity, in authored order (deterministic). */
function belongsToRels(entity: Entity): Relationship[] {
  return entity.relationships.filter((r) => r.kind === 'belongs-to');
}

// has-many (Day 25) — the REVERSE projection of a belongs-to FK. NO schema change: the
// child already carries `<parent>_id` (its ForeignKey). has-many adds ONLY a parent-side
// collection endpoint — a DRF @action(detail=True) that filters the child by the existing
// FK. Emission loops over hasManyRels, so has-many-free entities are byte-identical. The
// child model is reached via apps.get_model (no cross-import; related_name="+" is untouched).

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
 * The reverse-collection @action methods for a parent's has-many rels (empty for a
 * has-many-free entity — byte-identical). detail=True gives GET /api/<parents>/{pk}/<children>/.
 * The child is reached via apps.get_model (no import); filtered by the existing FK column,
 * owner-scoped when multi-user; .values() returns dict rows.
 */
function reverseDjangoActions(entity: Entity, ctx: EntityCodegenContext): string[] {
  const rels = hasManyRels(entity);
  if (rels.length === 0) return [];
  const fk = reverseFkColumn(entity);
  const lines: string[] = [];
  for (const r of rels) {
    const ct = childTable(r);
    const filter = ctx.multiUser ? `${fk}=pk, owner=request.user` : `${fk}=pk`;
    lines.push(
      ``,
      `    @action(detail=True, url_path="${ct}")`,
      `    def ${ct}(self, request, pk=None):`,
      `        # has-many ${entity.name} -> ${r.target}: the parent's ${ct} (reverse of the ${fk} FK).`,
      `        child = apps.get_model("${fkTargetApp(r)}", "${r.target}")`,
      `        rows = child.objects.filter(${filter}).order_by("id").values()`,
      `        return Response(list(rows))`,
    );
  }
  return lines;
}

/** Django model field name for the FK, e.g. Application -> application. */
function fkFieldName(rel: Relationship): string {
  return snakeCase(rel.target);
}

/** The DB column Django derives from the field, e.g. Application -> application_id. */
function fkColumnName(rel: Relationship): string {
  return `${snakeCase(rel.target)}_id`;
}

/** The target app label (= the entity slug), e.g. Application -> application. */
function fkTargetApp(rel: Relationship): string {
  return rel.target.toLowerCase();
}

/** Model-file reference "<app>.<Model>", e.g. application.Application. */
function fkTargetRef(rel: Relationship): string {
  return `${fkTargetApp(rel)}.${rel.target}`;
}

/** Migration reference "<app>.<model_lower>", matching makemigrations style. */
function fkTargetRefMig(rel: Relationship): string {
  return `${fkTargetApp(rel)}.${rel.target.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// File builders.
// ---------------------------------------------------------------------------

function buildApps(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit."""`,
    `from django.apps import AppConfig`,
    ``,
    ``,
    `class ${name}Config(AppConfig):`,
    `    default_auto_field = "django.db.models.BigAutoField"`,
    `    name = "entities.${slug}"`,
    ``,
  ].join('\n');
}

function buildModels(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  // The Django model ATTRIBUTE is the snake_case column (Option A): Django derives
  // the DB column from the attribute, so this keeps columns snake_case cross-stack
  // (byte-identical for single-word fields). The wire key is set in the serializer
  // via source= (Day 12) — never by renaming the attribute/column (Risk 1).
  const fieldLines = entity.fields.map((f) => `    ${snakeCase(f.name)} = ${fieldExpr(f)}`);
  const imports = ctx.multiUser
    ? [`from django.conf import settings`, `from django.db import models`]
    : [`from django.db import models`];
  // belongs-to FKs mirror the owner FK idiom (real ForeignKey). Field <snake(target)>
  // → column <snake(target)>_id + a real DB FK constraint + index (Django auto).
  const fkLines = belongsToRels(entity).map((r) => {
    const nulls = r.required ? '' : ', null=True, blank=True';
    return `    ${fkFieldName(r)} = models.ForeignKey("${fkTargetRef(r)}", on_delete=models.PROTECT, related_name="+"${nulls})`;
  });
  const ownerLine = ctx.multiUser
    ? [`    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")`]
    : [];
  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Django data model for the ${name} entity. Columns match the model's fields.`,
    ...(ctx.multiUser ? [`owner ties each row to its owning user (multi-user, ADR-005).`] : []),
    `"""`,
    ...imports,
    ``,
    ``,
    `class ${name}(models.Model):`,
    ...fieldLines,
    ...fkLines,
    ...ownerLine,
    `    created_at = models.DateTimeField(auto_now_add=True)`,
    `    updated_at = models.DateTimeField(auto_now=True)`,
    ``,
    `    class Meta:`,
    `        db_table = "${tableName(entity)}"`,
    ``,
  ].join('\n');
}

/** The DRF serializer field class for a logical field type. */
function drfFieldClass(field: Field): string {
  switch (field.type) {
    case 'String':
    case 'Text':
      return 'CharField';
    case 'Integer':
    case 'Long':
      return 'IntegerField';
    case 'Decimal':
      return 'DecimalField';
    case 'Boolean':
      return 'BooleanField';
    case 'Date':
      return 'DateField';
    case 'DateTime':
      return 'DateTimeField';
    default:
      throw new Error(`Unsupported field type "${field.type}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`);
  }
}

/**
 * An explicit DRF serializer field that renames ONLY the wire key: it is named
 * `<wire>` and reads/writes the model attribute via source="<attr>". Validation
 * flags mirror the model field (required/allow_null, max_length, decimal args).
 */
function drfFieldExpr(field: Field, attr: string): string {
  const args = [`source="${attr}"`];
  if (field.type === 'Decimal') args.push('max_digits=19', 'decimal_places=2');
  if (field.type === 'String') args.push(`max_length=${maxLengthOf(field)}`);
  if (!field.required) args.push('required=False', 'allow_null=True');
  return `serializers.${drfFieldClass(field)}(${args.join(', ')})`;
}

function buildSerializer(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const owner = ctx.multiUser ? ['owner'] : [];
  // belongs-to FKs are writable (so a create/update can set the parent id); they
  // sit with the entity fields and are NOT in read_only_fields.
  const fks = belongsToRels(entity).map(fkFieldName);
  // Day 12: when a declared field's wire key differs from its snake_case model
  // attribute, declare an explicit serializer field named <wire> with
  // source="<attr>" and list <wire> in Meta.fields (DRF forbids source == field
  // name, so this is emitted ONLY when wire !== attr). Under 'default' — and for
  // any single-word field — nothing is declared, so output is byte-identical.
  const declaredFieldDecls: string[] = [];
  const declaredFieldNames = entity.fields.map((f) => {
    const attr = snakeCase(f.name);
    const wire = applyNaming(f.name, ctx.naming);
    if (wire !== attr) {
      declaredFieldDecls.push(`    ${wire} = ${drfFieldExpr(f, attr)}`);
      return wire;
    }
    return attr;
  });
  const fieldNames = ['id', ...declaredFieldNames, ...fks, ...owner, 'created_at', 'updated_at'];
  const readOnly = ['id', ...owner, 'created_at', 'updated_at'];
  const quoted = (names: string[]) => names.map((n) => `"${n}"`).join(', ');
  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `DRF serializer for ${name}. Validation (required, max_length, unique) is`,
    `derived from the model fields.${ctx.multiUser ? ' owner is set server-side (read-only).' : ''}`,
    `"""`,
    `from rest_framework import serializers`,
    ``,
    `from .models import ${name}`,
    ``,
    ``,
    `class ${name}Serializer(serializers.ModelSerializer):`,
    ...declaredFieldDecls,
    ...(declaredFieldDecls.length > 0 ? [``] : []),
    `    class Meta:`,
    `        model = ${name}`,
    `        fields = [${quoted(fieldNames)}]`,
    `        read_only_fields = [${quoted(readOnly)}]`,
    ``,
  ].join('\n');
}

function buildViewsBase(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  if (ctx.multiUser) {
    return [
      `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
      ``,
      `Standard CRUD (list/create/retrieve/update/destroy) for ${name}, scoped to the`,
      `current user (multi-user, ADR-005): every read/write is filtered to the`,
      `requesting user, and new rows are owned by them. Your business logic belongs`,
      `in ${name}ViewSet, which extends this class.`,
      `"""`,
      `from rest_framework import viewsets`,
      ...(hasManyRels(entity).length > 0
        ? [`from rest_framework.decorators import action`, `from rest_framework.response import Response`, `from django.apps import apps`]
        : []),
      ``,
      `from .models import ${name}`,
      `from .serializers import ${name}Serializer`,
      ``,
      ``,
      `class ${name}ViewSetBase(viewsets.ModelViewSet):`,
      `    serializer_class = ${name}Serializer`,
      ``,
      `    def get_queryset(self):`,
      `        return ${name}.objects.filter(owner=self.request.user).order_by("id")`,
      ``,
      `    def perform_create(self, serializer):`,
      `        serializer.save(owner=self.request.user)`,
      ...reverseDjangoActions(entity, ctx),
      ``,
    ].join('\n');
  }
  return [
    `"""THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    ``,
    `Standard CRUD (list/create/retrieve/update/destroy) for ${name}. Your business`,
    `logic belongs in ${name}ViewSet, which extends this class.`,
    `"""`,
    `from rest_framework import viewsets`,
    ...(hasManyRels(entity).length > 0
      ? [`from rest_framework.decorators import action`, `from rest_framework.response import Response`, `from django.apps import apps`]
      : []),
    ``,
    `from .models import ${name}`,
    `from .serializers import ${name}Serializer`,
    ``,
    ``,
    `class ${name}ViewSetBase(viewsets.ModelViewSet):`,
    `    queryset = ${name}.objects.all().order_by("id")`,
    `    serializer_class = ${name}Serializer`,
    ...reverseDjangoActions(entity, ctx),
    ``,
  ].join('\n');
}

function buildMigration(entity: Entity, ctx: EntityCodegenContext): string {
  const name = entity.name;
  const fkRels = belongsToRels(entity);
  const fieldTuples = entity.fields.map((f) => `                ("${snakeCase(f.name)}", ${fieldExpr(f)}),`);

  // deletion import is needed whenever a ForeignKey tuple is emitted (owner or
  // belongs-to); settings only when multi-user (swappable dependency + owner to).
  const imports: string[] = [];
  if (ctx.multiUser) imports.push(`from django.conf import settings`);
  if (ctx.multiUser || fkRels.length > 0) imports.push(`import django.db.models.deletion`);
  imports.push(`from django.db import migrations, models`);

  // Each belongs-to adds a dependency on the target app's initial migration —
  // Django resolves migration order by this graph (not by filename/V-number).
  const depLines: string[] = [];
  if (ctx.multiUser) depLines.push(`        migrations.swappable_dependency(settings.AUTH_USER_MODEL),`);
  for (const r of fkRels) depLines.push(`        ("${fkTargetApp(r)}", "0001_initial"),`);
  const dependencies =
    depLines.length > 0 ? [`    dependencies = [`, ...depLines, `    ]`] : [`    dependencies = []`];

  // FK field tuples (authored order), after the entity fields, before owner.
  const fkTuples = fkRels.map((r) => {
    const nulls = r.required ? '' : ', null=True, blank=True';
    return `                ("${fkFieldName(r)}", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="+"${nulls}, to="${fkTargetRefMig(r)}")),`;
  });
  const ownerTuple = ctx.multiUser
    ? [`                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to=settings.AUTH_USER_MODEL)),`]
    : [];
  return [
    `# THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
    `# Initial migration for the ${name} entity.`,
    ...imports,
    ``,
    ``,
    `class Migration(migrations.Migration):`,
    ``,
    `    initial = True`,
    ``,
    ...dependencies,
    ``,
    `    operations = [`,
    `        migrations.CreateModel(`,
    `            name="${name}",`,
    `            fields=[`,
    `                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),`,
    ...fieldTuples,
    ...fkTuples,
    ...ownerTuple,
    `                ("created_at", models.DateTimeField(auto_now_add=True)),`,
    `                ("updated_at", models.DateTimeField(auto_now=True)),`,
    `            ],`,
    `            options={"db_table": "${tableName(entity)}"},`,
    `        ),`,
    `    ]`,
    ``,
  ].join('\n');
}

function buildViewsDev(entity: Entity): string {
  const name = entity.name;
  return [
    `"""DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ``,
    `Add your business logic for ${name} here. The standard CRUD lives in`,
    `views_base.py (Thraksha-owned). This file is safe to edit; regeneration will`,
    `not touch it.`,
    `"""`,
    `from .views_base import ${name}ViewSetBase`,
    ``,
    ``,
    `class ${name}ViewSet(${name}ViewSetBase):`,
    `    # Your business logic goes here (override a method, or add new ones).`,
    `    pass`,
    ``,
  ].join('\n');
}

function buildUrlsDev(entity: Entity): string {
  const name = entity.name;
  const slug = entitySlug(entity);
  const table = tableName(entity);
  return [
    `"""DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.`,
    ``,
    `Registers the ${name} CRUD routes. The standard viewset lives in views.py /`,
    `views_base.py. This file is safe to edit; regeneration will not touch it.`,
    `config/urls.py auto-includes this module's urlpatterns under /api/.`,
    `"""`,
    `from rest_framework.routers import DefaultRouter`,
    ``,
    `from .views import ${name}ViewSet`,
    ``,
    `router = DefaultRouter()`,
    `router.register(r"${table}", ${name}ViewSet, basename="${slug}")`,
    ``,
    `urlpatterns = router.urls`,
    ``,
    `# Your custom routes go here.`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/** Generate all Django files for one entity (its own app), tagged by ownership. */
export function generateEntityFiles(entity: Entity, ctx: EntityCodegenContext): GeneratedFile[] {
  for (const f of entity.fields) assertSupported(f);
  const slug = entitySlug(entity);
  const dir = `entities/${slug}`;

  return [
    // THRAKSHA-OWNED — regenerated freely.
    { relPath: `${dir}/__init__.py`, content: '', ownership: 'thraksha' },
    { relPath: `${dir}/apps.py`, content: buildApps(entity), ownership: 'thraksha' },
    { relPath: `${dir}/models.py`, content: buildModels(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/serializers.py`, content: buildSerializer(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/views_base.py`, content: buildViewsBase(entity, ctx), ownership: 'thraksha' },
    { relPath: `${dir}/migrations/__init__.py`, content: '', ownership: 'thraksha' },
    { relPath: `${dir}/migrations/0001_initial.py`, content: buildMigration(entity, ctx), ownership: 'thraksha' },

    // DEVELOPER-OWNED — created once, then never touched again.
    { relPath: `${dir}/views.py`, content: buildViewsDev(entity), ownership: 'developer' },
    { relPath: `${dir}/urls.py`, content: buildUrlsDev(entity), ownership: 'developer' },
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
  // has-many (Day 25) — the reverse projection: a parent-side collection @action over the
  // child's existing FK. No schema change.
  for (const r of hasManyRels(entity)) {
    lines.push(`${entity.name} has-many ${r.target}: GET /api/${tableName(entity)}/{id}/${childTable(r)}/ (reverse of ${reverseFkColumn(entity)}, no schema change)`);
  }
  return lines;
}

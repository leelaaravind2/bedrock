/*
 * Thraksha — Coding-style engine (technology-neutral core).
 *
 * A developer chooses a coding style AFTER setup; the generator applies it
 * DETERMINISTICALLY (ADR-003): same model + same style → byte-identical output,
 * always. Style options are finite, explicit switches — never probabilistic
 * "code personality", never anything that makes output unpredictable.
 *
 * The safety backstop: the DEFAULT style is a no-op. With the default, every
 * plugin emits exactly what it emits today, so all recorded hashes are reproduced
 * byte-for-byte. Style is therefore purely ADDITIVE — output changes only when a
 * developer explicitly picks a non-default option.
 *
 * The kernel stores style intent and knows nothing language-specific (Law 25);
 * plugins decide how (and to which files) a style applies. The helpers here are
 * generic string math, not per-language logic.
 *
 * Day 11: formatting (indentation). Naming (Day 12) and architecture depth
 * (Day 13) plug into this same CodingStyle shape later.
 */

/** Indentation width for generated code — a deterministic formatting switch. */
export type IndentStyle = 'default' | 'two-space' | 'four-space' | 'tab';

/**
 * The naming convention for the JSON API wire KEY of an entity's declared scalar
 * fields — a deterministic switch (Day 12). 'default' = each plugin emits exactly
 * the key its codegen produces today (the transform is bypassed). It governs the
 * wire key ONLY — never the DB column, never a language-forced internal
 * identifier, never the attribute↔column mapping.
 */
export type NamingConvention = 'default' | 'camelCase' | 'snake_case';

/**
 * How many layers the generated backend is split into — a deterministic switch
 * that BRANCHES THE FILE SET (Day 13), not just the contents of a file. 'default'
 * reproduces today's layered structure byte-for-byte (a literal bypass). 'simple'
 * emits a flatter file set (the data-access/repository layer is removed and the
 * remaining base layers merge into one CRUD module). Which files collapse is each
 * plugin's decision (Law 25); the kernel carries only this generic value. The
 * developer-owned seam (service/routes) exists and is stable in BOTH depths
 * (ADR-002).
 */
export type ArchitectureDepth = 'default' | 'simple';

/** The coding-style choices, applied by the plugins during generation. */
export interface CodingStyle {
  /** How generated code looks (whitespace/quotes) — never what it means. */
  readonly formatting: {
    /** Indentation of generated code files. 'default' = each plugin's idiom. */
    readonly indent: IndentStyle;
  };
  /**
   * The wire-key naming convention for declared scalar fields (Day 12). 'default'
   * reproduces current output byte-for-byte. Applied DURING codegen (it touches
   * identifiers), not as a post-pass. See applyNaming.
   */
  readonly namingConvention: NamingConvention;
  /**
   * How many layers the generated backend has (Day 13). 'default' = the current
   * layered structure (a literal bypass — the 20-hash backstop). 'simple' = a
   * flatter file set. The plugin branches its file set on this value.
   */
  readonly architectureDepth: ArchitectureDepth;
}

/** The default style — a no-op that reproduces current output exactly. */
export const defaultCodingStyle: CodingStyle = {
  formatting: { indent: 'default' },
  namingConvention: 'default',
  architectureDepth: 'default',
};

// ---------------------------------------------------------------------------
// Naming helpers (Day 12) — pure, generic string math. Law 25: the kernel holds
// NO per-language logic. A plugin decides WHERE (which serialization token, in
// which file) to apply these; the core only transforms a name string.
// ---------------------------------------------------------------------------

/**
 * A declared name → snake_case, e.g. dueDate → due_date, isUrgent → is_urgent.
 * Same string math the plugins already use for their DB columns, so the
 * "emit only when wire !== column" gates fire exactly (a single lowercase word
 * is its own snake_case, so single-word fields are invariant).
 */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * A declared name → camelCase, e.g. due_date → dueDate, dueDate → dueDate. Splits
 * on _/-/space, lowercases the first token, capitalizes the rest. A single
 * lowercase word maps to itself (single-word fields are invariant).
 */
export function toCamelCase(name: string): string {
  const parts = name.split(/[_\-\s]+/).filter((p) => p.length > 0);
  if (parts.length === 0) return name;
  return parts
    .map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');
}

/**
 * Apply a naming convention to a declared field name. 'default' is a literal
 * bypass (returns the name unchanged — the backstop). Pure and total.
 */
export function applyNaming(declaredName: string, convention: NamingConvention): string {
  switch (convention) {
    case 'camelCase':
      return toCamelCase(declaredName);
    case 'snake_case':
      return toSnakeCase(declaredName);
    default:
      return declaredName;
  }
}

/**
 * The indent-unit string a non-default indent style maps to. Returns '' for
 * 'default' (the caller treats '' as "apply no transform" — the backstop).
 */
export function indentUnitFor(indent: IndentStyle): string {
  switch (indent) {
    case 'two-space':
      return '  ';
    case 'four-space':
      return '    ';
    case 'tab':
      return '\t';
    default:
      return '';
  }
}

/**
 * Rewrite the LEADING whitespace of each line to a new indent unit, by indent
 * depth. Pure and total.
 *
 * Only the run of leading spaces (before the first non-space char) is touched —
 * never line content — so for a brace-delimited language (where leading
 * whitespace is non-semantic) the result is byte-different but behaviourally
 * identical by the language grammar.
 *
 * Each line's leading spaces must be a clean multiple of `sourceSpaces` (the
 * caller only formats files it has verified are cleanly indented); a non-multiple
 * line throws rather than silently producing a ragged/garbled indent. Blank or
 * whitespace-only lines pass through unchanged.
 */
export function reindent(content: string, sourceSpaces: number, unit: string): string {
  return content
    .split('\n')
    .map((line) => {
      const m = /^( +)(\S.*)$/.exec(line); // leading spaces + real content only
      if (!m) return line; // blank line, whitespace-only, or already flush-left
      const leading = m[1].length;
      if (leading % sourceSpaces !== 0) {
        throw new Error(
          `reindent: ${leading} leading spaces is not a multiple of ${sourceSpaces} — ` +
            `refusing to produce a ragged indent: ${JSON.stringify(line.slice(0, 60))}`,
        );
      }
      return unit.repeat(leading / sourceSpaces) + m[2];
    })
    .join('\n');
}

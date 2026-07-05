/*
 * Thraksha — Canonical JSON serialization (Eco-Day 8).
 *
 * A pure, dependency-free (no native module) canonical serializer for the persisted
 * blueprint. "Canonical" = object keys recursively SORTED and stable formatting, so
 * the SAME model always serializes to the SAME bytes regardless of construction
 * order. The local store (a SHELL concern — Tauri/Rust SQLite) persists these bytes;
 * the generator stays pure Node (ADR-003 / architecture §4).
 *
 * IMPORTANT determinism boundary (proven by the Day-8 saved→loaded→generated gate):
 * canonical KEY ORDER affects only the STORED bytes, NEVER generated output.
 * Generation reads the RECONSTRUCTED model — entity/field ARRAYS (order preserved,
 * never sorted) and phaseA by known keys — not the stored JSON's key order. So
 * sorting keys for storage cannot move a generated hash.
 *
 * This is ADDITIVE: it does not replace or alter versioning.ts's existing
 * serialization. It introduces no dependency and touches no generation logic.
 */

/**
 * Recursively canonicalize a JSON-serialisable value:
 *   - objects → keys sorted (ascending, code-unit order — matches the rest of the
 *     codebase, which uses default `<`/`>` comparison, never localeCompare);
 *   - ARRAYS ARE LEFT IN ORDER (entity/field order is meaningful and must survive);
 *   - primitives unchanged.
 * `undefined` object properties are dropped (JSON.stringify already omits them), so
 * the canonical form matches what a JSON round-trip would carry.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => canonicalize(v));
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (obj[key] === undefined) continue; // mirror JSON.stringify's omission
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  return value;
}

/**
 * Serialize a value to canonical JSON (sorted keys, stable). Default is compact
 * (no whitespace) so the stored bytes are minimal and hash-stable; pass `pretty`
 * for a 2-space indented form (same key order, still canonical).
 */
export function canonicalStringify(value: unknown, pretty = false): string {
  return JSON.stringify(canonicalize(value), null, pretty ? 2 : 0);
}

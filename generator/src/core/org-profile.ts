/*
 * Thraksha — Org-policy allow/ban layer (Eco-Day 13). ADR-004 made real.
 *
 * A PURE, VERSIONED INPUT-SHAPING layer that runs BEFORE the wizard/model. It
 * governs WHICH choices are available (allow/ban) and WHAT the defaults are
 * (force-default), with soft/hard enforcement. It operates ONLY on the option set
 * (input metadata) — it NEVER touches createProjectModel, the plugins, or
 * generation. So:
 *
 *   • profile-ABSENT ⇒ the generation path is LITERALLY UNCHANGED ⇒ the frozen
 *     43+10+MAXIMAL+version baselines reproduce byte-identical (a literal bypass
 *     BY CONSTRUCTION).
 *   • a forced default is resolved into the CONCRETE blueprint before generation
 *     (resolve-then-pin, Day 11) ⇒ the blueprint alone determines the output; the
 *     profile is PROVENANCE (the decision context), not the output key.
 *   • enforcement metadata (soft/hard tags, advisories, applied rules) is
 *     INPUT/WIZARD-SIDE — NEVER in the generated manifest (recording it there would
 *     move every frozen hash — the same rule versions and style follow).
 *
 * Pure Node, no dependency, no native module. Deterministic (sorted iteration, no
 * clock/RNG). Serialized canonically (canonical-json.ts) so a profile is reproducible.
 */

import { availableBackends } from '../plugins/registry.js';
import { availableDatabases } from '../plugins/database-registry.js';
import { DEFAULT_VERSIONS } from './versions.js';

// ── The versioned org-profile schema ───────────────────────────────────────────

/** One dimension's rule: allow-list / ban-list / forced default, soft or hard. */
export interface DimensionRule {
  /** If present, ONLY these values remain in the option set (allow-list). */
  allow?: string[];
  /** These values are removed from the option set (ban-list). */
  ban?: string[];
  /** The org-approved default for this dimension. */
  forceDefault?: string;
  /** hard = removed/locked; soft = advisory (flagged, still allowed). */
  enforcement: 'hard' | 'soft';
}

/**
 * A versioned org-profile. `profileVersion` is pinned like the blueprint — part of
 * the provenance tuple (blueprint version, profile version). Dimension keys are the
 * option-set dimensions, incl. dotted sub-keys `versions.<key>` and `style.<axis>`.
 */
export interface OrgProfile {
  profileVersion: string;
  id: string;
  dimensions: Record<string, DimensionRule>;
}

// ── The explicit option-set descriptor (was implicit in the registries) ─────────

/** The full set of choosable dimensions and their valid values (from the real registries). */
export type OptionSet = Record<string, string[]>;

/**
 * Build the FULL option set from the real sources of truth. Making the implicit
 * option set explicit (additive) is what the profile filters. Version dimensions are
 * emitted per key with the current default as a (single-value) baseline option — a
 * profile may allow/force other values (Day 11 proved non-default versions generate
 * deterministically).
 */
export function fullOptionSet(): OptionSet {
  const set: OptionSet = {
    projectType: ['Web App', 'API-only'],
    backend: availableBackends(),
    frontend: ['React', 'None'],
    database: availableDatabases(),
    multiUser: ['true', 'false'],
    auth: ['Simple login'],
    'style.indent': ['default', 'two-space', 'four-space', 'tab'],
    'style.namingConvention': ['default', 'camelCase', 'snake_case'],
    'style.architectureDepth': ['default', 'simple'],
  };
  // versions.<key> per stack — the current default value is the baseline option.
  for (const stack of Object.keys(DEFAULT_VERSIONS)) {
    for (const [key, value] of Object.entries(DEFAULT_VERSIONS[stack])) {
      const dim = `versions.${key}`;
      set[dim] = set[dim] ? Array.from(new Set([...set[dim], value])) : [value];
    }
  }
  return set;
}

/** The existing defaults (before any profile) — mirrors createProjectModel/PHASE_A_DEFAULTS. */
export function existingDefaults(): Record<string, string> {
  return { multiUser: 'true', auth: 'Simple login' };
  // (backend/database/projectType/frontend are mandatory — no built-in default; a
  //  profile may force one. versions default per-backend at model construction.)
}

// ── The application layer (the heart of Day 13) ─────────────────────────────────

/** A soft-rule advisory surfaced input-side (never in generated output). */
export interface SoftFlag {
  dimension: string;
  message: string;
}

/** The result of applying a profile: filtered options + effective defaults + advisories. */
export interface AppliedProfile {
  optionSet: OptionSet;
  defaults: Record<string, string>;
  advisories: SoftFlag[];
}

/**
 * Apply an org-profile to the full option set. PURE and deterministic (sorted
 * iteration; no clock/RNG). Profile-ABSENT ⇒ IDENTITY (full set, existing defaults,
 * no advisories) — the literal bypass at the option-set level. Produces METADATA,
 * never generated files.
 */
export function applyProfile(full: OptionSet, profile?: OrgProfile | null): AppliedProfile {
  const defaults: Record<string, string> = { ...existingDefaults() };
  const advisories: SoftFlag[] = [];
  const optionSet: OptionSet = {};

  for (const dim of Object.keys(full).sort()) {
    let values = [...full[dim]];
    const rule = profile?.dimensions[dim];
    if (rule) {
      if (rule.enforcement === 'hard') {
        // Hard: allow-list / ban-list REMOVE values from the selectable set.
        if (rule.allow) values = values.filter((v) => rule.allow!.includes(v));
        if (rule.ban) values = values.filter((v) => !rule.ban!.includes(v));
        // A hard forceDefault is guaranteed present in the (possibly narrowed) set.
        if (rule.forceDefault && !values.includes(rule.forceDefault)) values.push(rule.forceDefault);
      } else {
        // Soft: nothing is removed; banned/discouraged values raise an advisory.
        for (const v of rule.ban ?? []) if (values.includes(v)) advisories.push({ dimension: dim, message: `"${v}" is discouraged by org policy (soft).` });
        if (rule.allow) for (const v of values) if (!rule.allow.includes(v)) advisories.push({ dimension: dim, message: `"${v}" is outside the org-preferred set for ${dim} (soft).` });
      }
      if (rule.forceDefault) defaults[dim] = rule.forceDefault;
    }
    optionSet[dim] = values.sort();
  }
  advisories.sort((a, b) => (a.dimension + a.message < b.dimension + b.message ? -1 : 1));
  return { optionSet, defaults, advisories };
}

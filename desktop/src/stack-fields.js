// Bedrock wizard — the Stack screen's field↔selection-key mapping (Eco-Day 73, A73-1).
//
// The Day-73 regroup collapses the four separate settings steps (Backend / Frontend / Database /
// Auth) into ONE "Stack" screen with four fields. The UI==CLI harness proves the SERIALIZER's
// meaning (buildBlueprintChoices), but it never touches the DOM or the wizard STEPS — so it CANNOT
// catch a Stack screen that writes a field into the WRONG selection key (e.g. Database → auth).
// This PURE module fixes and NAMES that correspondence, and its unit test proves it — converting
// "wrong key" from a live-only risk into a mechanically-checked property (plan F4/F5).
//
// PURE: no DOM, no engine, no generation logic. It only declares the four fields and writes their
// values onto EXACTLY selections.{backend,frontend,database,auth}. The FRONTENDLESS type↔frontend
// nicety stays in the engine (buildBlueprintChoices) — this module never duplicates or moves it.

import { BACKENDS, FRONTENDS, DATABASES, AUTHS } from './wizard-choices.js';

// The four Stack fields, in order. Each binds ONE selection key to its choice set — the exact
// key buildBlueprintChoices reads. Reordering/renaming here is a reviewable, tested change.
export const STACK_FIELDS = [
  { key: 'backend',  label: 'Backend',  options: BACKENDS },
  { key: 'frontend', label: 'Frontend', options: FRONTENDS },
  { key: 'database', label: 'Database', options: DATABASES },
  { key: 'auth',     label: 'Auth',     options: AUTHS },
];

// PURE: write the Stack screen's collected values onto `selections`, each into its OWN key and
// nothing else. Only keys named in STACK_FIELDS are written; unrelated selection keys are left
// untouched. Returns the (mutated) selections for convenience.
export function applyStackFields(selections, values) {
  for (const f of STACK_FIELDS) {
    if (values && Object.prototype.hasOwnProperty.call(values, f.key)) selections[f.key] = values[f.key];
  }
  return selections;
}

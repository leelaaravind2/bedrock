// Bedrock shell — the PURE screen router (Eco-Day 75c, Task 2; extracted from main.js).
//
// WHY THIS EXISTS. Day 71 added the screen router INLINE in main.js, where showScreen touches
// `document` at call time — so, exactly like the pre-Day-73 Stack wiring, nothing about the
// router's STATE was headless-testable (F12-A/F17). This module extracts that pure state — which
// one screen is active; the null-project empty-vs-verbs decision — the SAME way Eco-Day 73
// extracted stack-fields.js. main.js imports it and keeps ALL DOM painting: the router DECIDES,
// main.js PAINTS. This is an EXTRACTION, not a rewrite — the state machine is byte-for-byte the
// one that was inline.
//
// PURE: no DOM, no engine, no dependency. Node can import it for the unit test (router.test.mjs).

// The three top-level screens. Exactly one is active at a time — main.js sets ONE `data-screen`
// attribute the CSS drives (index.html: main[data-screen="X"] #screen-X). The app opens on
// `welcome`; the top nav appears once you leave it.
export const SCREENS = new Set(['welcome', 'wizard', 'workspace']);

// The screen transition, as DATA. Given a requested screen name:
//   • unknown name → null: NO transition. main.js changes nothing, so the single current screen
//     stays active — never zero screens, never two.
//   • valid name → { screen, navHidden }: the ONE screen to activate, plus whether the top nav
//     hides (only on Welcome). Returning a single `screen` STRING is what makes "exactly one
//     active screen" structural — there is no shape here that could activate zero or two.
export function screenState(name) {
  if (!SCREENS.has(name)) return null;
  return { screen: name, navHidden: name === 'welcome' };
}

// The workspace's empty-vs-verbs decision, as DATA (the Day-72 invariant). With NO project the
// EMPTY state shows and the workspace body is hidden — and because #advanced-corner is CONTAINED
// in #workspace-body (index.html), the Advanced corner cannot render without a project. With a
// project the body (the verb bar + the Advanced corner it contains) shows. main.js paints
// body.hidden / empty.hidden from these booleans; it computes no visibility of its own.
export function workspaceState(currentProject) {
  const hasProject = !!currentProject;
  return { hasProject, showBody: hasProject, showEmpty: !hasProject };
}

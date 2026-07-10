// Unit test for the pure screen router (Eco-Day 75c, Task 2; the stack-fields.test.mjs shape).
// Proves the properties the UI==CLI harness cannot and Tauri-less inspection only NOTED: the
// SCREENS set, exactly-one-active-screen transitions, and the null-project → empty-state guard
// (the Day-72 Advanced-corner invariant). Run: node tools/router.test.mjs  (npm run test:router).
//
// SCOPE — say it plainly: this stays GREEN even if the wizard is unclickable inside Tauri. It
// converts the router's PURE STATE from inspected-in-a-plain-browser to PROVEN; it does NOT prove
// any live click. The in-Bedrock click remains PENDING (Leela).

import assert from 'node:assert/strict';
import { SCREENS, screenState, workspaceState } from '../src/router.js';

let n = 0;
const ok = (label) => { n++; process.stdout.write(`  OK   ${label}\n`); };

// 1) SCREENS is exactly {welcome, wizard, workspace}.
assert.deepEqual([...SCREENS].sort(), ['welcome', 'wizard', 'workspace']);
ok('SCREENS == {welcome, wizard, workspace} exactly');

// 2) each valid screen → EXACTLY ONE active screen (the one requested), a member of SCREENS.
for (const s of ['welcome', 'wizard', 'workspace']) {
  const st = screenState(s);
  assert.ok(st !== null && st.screen === s, `screenState('${s}') activates exactly '${s}'`);
  assert.ok(SCREENS.has(st.screen), 'the activated screen is a member of SCREENS');
}
ok('each valid screen activates exactly itself — one screen, never zero or two');

// 2b) an unknown target → null: NO transition (main.js changes nothing, so the single current
//     screen stays active). Never a silent activation of zero or of two screens.
for (const bad of ['', 'nope', 'Welcome', 'settings', 'wizard ', undefined, null, 0]) {
  assert.equal(screenState(bad), null, `unknown target ${JSON.stringify(bad)} → null`);
}
ok('an unknown target yields null — never zero, never two screens');

// 2c) the top nav hides ONLY on Welcome (it appears once you leave it).
assert.equal(screenState('welcome').navHidden, true);
assert.equal(screenState('wizard').navHidden, false);
assert.equal(screenState('workspace').navHidden, false);
ok('top nav hidden only on Welcome');

// 3) the Advanced corner is unreachable with no project. The null-project guard selects the EMPTY
//    state and HIDES the workspace body; because #advanced-corner is contained in #workspace-body
//    (index.html), a hidden body ⇒ a hidden Advanced corner. Assert the RELATION, not pixels.
{
  const none = workspaceState(null);
  assert.deepEqual(none, { hasProject: false, showBody: false, showEmpty: true });
  assert.equal(workspaceState(undefined).showBody, false);
  ok('null project → empty state; workspace body (⊇ Advanced corner) hidden — corner unreachable');
}

// 4) openWorkspace()'s state decision with currentProject === null selects the EMPTY state, not
//    the verb bar; a real project selects the verb bar (body shown, empty hidden).
{
  assert.equal(workspaceState(null).showEmpty, true);
  assert.equal(workspaceState(null).showBody, false); // NOT the verb bar
  const some = workspaceState({ name: 'X', choices: { settings: {} } });
  assert.deepEqual(some, { hasProject: true, showBody: true, showEmpty: false });
  ok('null project → empty state (not the verb bar); a project → verb bar (body shown)');
}

process.stdout.write(`\nrouter unit test: PASS (${n} checks)\n`);

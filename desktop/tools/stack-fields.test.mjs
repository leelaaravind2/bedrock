// Unit test for the Stack screen field↔key mapping (Eco-Day 73, A73-1).
// Proves the property the UI==CLI harness cannot: each Stack field writes its OWN selection key,
// no cross-wiring, no collateral writes. Run:  node tools/stack-fields.test.mjs  (npm run test:stack)

import assert from 'node:assert/strict';
import { STACK_FIELDS, applyStackFields } from '../src/stack-fields.js';
import { BACKENDS, FRONTENDS, DATABASES, AUTHS } from '../src/wizard-choices.js';

let n = 0;
const ok = (label) => { n++; process.stdout.write(`  OK   ${label}\n`); };

// 1) the four fields are exactly backend/frontend/database/auth, in order, with the right choice sets.
assert.deepEqual(STACK_FIELDS.map((f) => f.key), ['backend', 'frontend', 'database', 'auth']);
ok('STACK_FIELDS keys == [backend, frontend, database, auth] in order');
assert.deepEqual(STACK_FIELDS.find((f) => f.key === 'backend').options, BACKENDS);
assert.deepEqual(STACK_FIELDS.find((f) => f.key === 'frontend').options, FRONTENDS);
assert.deepEqual(STACK_FIELDS.find((f) => f.key === 'database').options, DATABASES);
assert.deepEqual(STACK_FIELDS.find((f) => f.key === 'auth').options, AUTHS);
ok('each field offers the certified choice set (BACKENDS/FRONTENDS/DATABASES/AUTHS)');

// 2) applyStackFields writes EXACTLY the four keys, each to its own value.
{
  const sel = {};
  applyStackFields(sel, { backend: 'Go', frontend: 'None', database: 'MySQL', auth: 'None' });
  assert.equal(sel.backend, 'Go');
  assert.equal(sel.frontend, 'None');
  assert.equal(sel.database, 'MySQL');
  assert.equal(sel.auth, 'None');
  assert.deepEqual(Object.keys(sel).sort(), ['auth', 'backend', 'database', 'frontend']);
  ok('applyStackFields writes each field to its own key, no extra keys');
}

// 3) THE wrong-key bug is caught: a value for `database` must NOT land in `auth` (or anywhere else).
{
  const sel = { auth: 'Simple login', backend: 'Express' };
  applyStackFields(sel, { database: 'MySQL' });
  assert.equal(sel.database, 'MySQL');
  assert.equal(sel.auth, 'Simple login'); // auth untouched — the F4 wrong-key failure would trip here
  assert.equal(sel.backend, 'Express');
  ok('database value lands in `database` only — auth/backend untouched (the F4 wrong-key guard)');
}

// 4) unrelated selection keys (projectName/projectType/entities) are never touched.
{
  const sel = { projectName: 'X', projectType: 'Web App', entities: [{ name: 'E' }] };
  applyStackFields(sel, { backend: 'FastAPI' });
  assert.equal(sel.projectName, 'X');
  assert.equal(sel.projectType, 'Web App');
  assert.deepEqual(sel.entities, [{ name: 'E' }]);
  assert.equal(sel.backend, 'FastAPI');
  ok('unrelated keys (projectName/projectType/entities) untouched');
}

// 5) a null/undefined values object is a harmless no-op.
{
  const sel = { backend: 'Express' };
  applyStackFields(sel, undefined);
  assert.equal(sel.backend, 'Express');
  ok('null/undefined values is a no-op');
}

process.stdout.write(`\nstack-fields unit test: PASS (${n} checks)\n`);

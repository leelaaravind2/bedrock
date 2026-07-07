/*
 * Thraksha — Creative slot FILL: the opt-in demo surface (Eco-Day 23).
 *
 * The honest opt-in surface for the detachable AI fill. It (1) GENERATES the shell FIRST —
 * proving generation runs completely and is unchanged (shell + empty slots, the Day-21
 * mechanism) — then (2) ATTEMPTS the fill via `fillViaEnv`, which is DEFAULT OFF: with no
 * THRAKSHA_AI_FILL_KEY it makes NO AI call and returns empty content. The fill's output is
 * SlotContent (the separate layer) — it is SHOWN, never written into the shell.
 *
 * Run:  npm run fill         (default OFF here — this machine has no developer key)
 *       THRAKSHA_AI_FILL_KEY=sk-... npm run fill    (the developer opts in, their key/bill)
 */

import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { fillViaEnv, aiConfigFromEnv } from './fill/fill-ai.js';
import type { SlotDecl } from './core/slots.js';

async function main(): Promise<void> {
  const decls: SlotDecl[] = [
    { id: 'hero.tagline', type: 'tagline' },
    { id: 'app.overview', type: 'overview' },
  ];
  const model = buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' });
  model.setSlots(decls);

  // (1) GENERATION ALWAYS RUNS FIRST — shell + empty slots, complete and valid, no AI.
  const files = await buildFileSet(model, selectBackendPlugin(model));
  const readme = files.find((f) => f.relPath === 'README.md');
  process.stdout.write(`=== Generation (AI-free, always first) ===\n`);
  process.stdout.write(`  shell generated: ${files.length} files; README carries ${decls.length} typed slot placeholders (empty — valid).\n`);
  process.stdout.write(`  slot markers present: ${/THRAKSHA-SLOT/.test(readme?.content ?? '')}\n`);

  // (2) The DETACHABLE fill — DEFAULT OFF (no key ⇒ no call, ever).
  const cfg = aiConfigFromEnv();
  process.stdout.write(`\n=== Creative slot fill (optional, detachable, developer-keyed) ===\n`);
  process.stdout.write(`  THRAKSHA_AI_FILL_KEY set? ${cfg ? 'yes' : 'NO'} → AI fill ${cfg ? 'ENABLED (' + cfg.model + ')' : 'OFF (no call made)'}\n`);

  const attempt = await fillViaEnv(model.getState(), decls);
  process.stdout.write(`  fill enabled: ${attempt.enabled}; content state: ${attempt.state}\n`);
  for (const d of decls) {
    const v = attempt.content[d.id]?.value ?? '';
    process.stdout.write(`    ${d.id.padEnd(14)} [${d.type}] → ${v ? JSON.stringify(v) : '(empty — fill it yourself, or configure a key)'}\n`);
  }
  process.stdout.write(`\n  The shell above is byte-identical whether the fill is off or on — content lives in the\n`);
  process.stdout.write(`  separate SlotContent layer, never in the shell. Delete this fill layer → generation is unchanged.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });

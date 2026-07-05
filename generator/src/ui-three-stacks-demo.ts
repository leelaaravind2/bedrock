/*
 * Thraksha — Step 3 proof: one model, three stacks, chosen by the UI dropdown.
 *
 * Drives the REAL UI server (server.ts) over HTTP exactly as the browser does:
 * for each backend the dropdown offers — Spring Boot, Express, FastAPI — it POSTs
 * the same Phase-A settings (differing only in the `backend` answer, which is the
 * dropdown value) + the same Ticket entity, then generates. It proves:
 *
 *   - the dropdown value routes to the right plugin (Spring/Express/Python);
 *   - each stack hashes its established, unchanged value (one model, three real
 *     backends);
 *   - the UI path is byte-for-byte identical to the CLI/engine path (the UI just
 *     calls the real engine — the matching hash proves it);
 *   - Python stays deterministic with its file separation intact.
 *
 * No AI (ADR-001). No randomness (ADR-003). Run:  npm run ui:demo
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Established baselines (full file-set hashes). If the UI or Python drifted these,
// the demo fails loudly.
const BASELINES: Record<string, string> = {
  'Spring Boot': '010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c',
  Express: 'a437a302cc597ed1809551bdf31fafea569176829db16122b0ea78c68ffd4d65',
  FastAPI: 'dca2254f86c532bb24af06f439b300613a6dc7918346063f704c68f98b1d5843',
  Django: '68601cc5c77e4938c162d04c1c58d976b808421a90c66e5f3fd2f215a63caa18',
  Go: 'd158529a241677905a4be97f14b6a6419de55e95bee999883beb9f661cb4d067',
};

// The exact DemoApp Ticket (mirrors demoapp-model.ts) so the UI-built model
// equals the canonical one.
const TICKET = {
  name: 'Ticket',
  fields: [
    { name: 'title', type: 'String', required: true },
    { name: 'code', type: 'String', unique: true },
    { name: 'priority', type: 'Integer' },
    { name: 'done', type: 'Boolean' },
  ],
};

function phaseA(backend: string) {
  return {
    projectName: 'DemoApp',
    projectType: 'Web App',
    backend,
    frontend: 'React',
    database: 'PostgreSQL',
    multiUser: true,
    auth: 'Simple login',
  };
}

/** Tree hash on disk — leading-slash convention, identical to two-stacks-demo. */
async function hashTree(dir: string): Promise<string> {
  const fulls: string[] = [];
  async function rec(d: string): Promise<void> {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else fulls.push(full);
    }
  }
  await rec(dir);
  fulls.sort((a, b) => {
    const sa = a.slice(dir.length);
    const sb = b.slice(dir.length);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  const h = crypto.createHash('sha256');
  for (const full of fulls) {
    const rel = full.slice(dir.length).split(path.sep).join('/');
    h.update(`${rel}\n`);
    h.update(await fs.readFile(full));
  }
  return h.digest('hex');
}

/** CLI/engine-path full hash from content (leading-slash), for the UI==CLI check. */
async function cliFullHash(backend: string): Promise<string> {
  const { buildDemoAppModel } = await import('./demoapp-model.js');
  const { buildFileSet } = await import('./core/regen.js');
  const { selectBackendPlugin } = await import('./plugins/registry.js');
  const model = buildDemoAppModel({ backend });
  const files = await buildFileSet(model, selectBackendPlugin(model));
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

async function main(): Promise<void> {
  const root = process.argv[2] || path.join(os.tmpdir(), 'thraksha-ui-demo');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  const outputRoot = path.join(root, 'output');
  const port = 4319 + Math.floor(0); // fixed; single-purpose demo

  // Point the REAL server at a throwaway output dir and start it in-process.
  process.env.THRAKSHA_UI_OUTPUT = outputRoot;
  process.env.THRAKSHA_UI_STORE = path.join(root, 'versions');
  process.env.PORT = String(port);
  await import('./server.js'); // starts listening (side effect, exactly like `npm run ui`)

  const BASE = `http://localhost:${port}`;
  const api = async (method: string, p: string, body?: unknown) => {
    const res = await fetch(`${BASE}${p}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    return data;
  };

  // Wait for the server to accept requests.
  for (let i = 0; i < 50; i++) {
    try { await api('GET', '/api/state'); break; } catch { await new Promise((r) => setTimeout(r, 40)); }
  }

  const projectDir = path.join(outputRoot, 'DemoApp');
  const results: { backend: string; uiHash: string; ok: boolean; uiEqualsCli: boolean }[] = [];

  process.stdout.write(`One model, five stacks — chosen by the UI backend dropdown value:\n\n`);
  for (const backend of ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go']) {
    // Fresh project dir so each stack's tree is hashed in isolation.
    await fs.rm(projectDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    // Exactly what the browser does: set settings (dropdown value = backend), add
    // the entity, then generate — all through the real server endpoints.
    await api('POST', '/api/settings', phaseA(backend));
    await api('POST', '/api/entities', TICKET);
    const gen = (await api('POST', '/api/generate')) as { projectDir: string };

    const uiHash = await hashTree(projectDir);
    const cliHash = await cliFullHash(backend);
    const ok = uiHash === BASELINES[backend];
    const uiEqualsCli = uiHash === cliHash;
    results.push({ backend, uiHash, ok, uiEqualsCli });

    process.stdout.write(`  dropdown "${backend}"  ->  ${gen.projectDir}\n`);
    process.stdout.write(`    UI hash : ${uiHash} ${ok ? '(== baseline OK)' : '(!! CHANGED)'}\n`);
    process.stdout.write(`    CLI hash: ${cliHash} ${uiEqualsCli ? '(UI == CLI OK)' : '(!! UI != CLI)'}\n\n`);
  }

  // Python determinism + file separation, through the UI, a second time.
  process.stdout.write(`Python via UI — deterministic + file separation (ADR-002/003):\n`);
  await fs.rm(projectDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  await api('POST', '/api/settings', phaseA('FastAPI'));
  await api('POST', '/api/entities', TICKET);
  await api('POST', '/api/generate');
  // Developer writes hand logic into a developer-owned Python file.
  const svc = path.join(projectDir, 'app/entities/ticket/service.py');
  const before = await fs.readFile(svc, 'utf8');
  await fs.writeFile(svc, before.replace('    pass', '    pass\n    def mine(self, db, owner_id):\n        return self.list(db, owner_id)\n'));
  const devBefore = crypto.createHash('sha256').update(await fs.readFile(svc)).digest('hex');
  // Regenerate through the UI twice.
  await api('POST', '/api/generate');
  await api('POST', '/api/generate');
  const devAfter = crypto.createHash('sha256').update(await fs.readFile(svc)).digest('hex');
  const devPresent = (await fs.readFile(svc, 'utf8')).includes('def mine');
  const sepOk = devBefore === devAfter && devPresent;
  process.stdout.write(`  developer service.py survived 2 UI regenerations: ${sepOk}\n\n`);

  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });

  const allOk = results.every((r) => r.ok && r.uiEqualsCli) && sepOk;
  process.stdout.write(`RESULT: ${allOk ? 'PASS — one model -> Spring/Express/FastAPI/Django/Go via the dropdown; UI == CLI for all five; Python deterministic + separated.' : 'FAIL'}\n`);
  // The server keeps the process alive; exit explicitly.
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

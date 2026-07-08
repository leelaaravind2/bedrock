/*
 * Thraksha — Python (Django) backend plugin.
 *
 * A PEER of the Spring, Express, and FastAPI plugins: it implements the exact
 * same BackendPlugin interface, so the core treats it identically and never
 * learns that Django is behind it (Constitution Laws 25–28). Django is a SECOND
 * Python framework — it sits ALONGSIDE FastAPI, it does not replace it. All
 * Django/DRF specifics live here and in entity-codegen.ts + the templates/ shell.
 *
 * No AI (ADR-001). Deterministic (ADR-003): fixed tokens, sorted walk, no
 * timestamps / randomness.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Entity, PhaseASettings, ProjectModel } from '../../core/project-model.js';
import { versionTokens } from '../../core/versions.js';
import type { BackendPlugin, EntityGenerationContext, GeneratedFile } from '../../core/plugin.js';
import type { DatabaseProvider } from '../../core/database.js';
import { postgresProvider } from '../database/postgres.js';
import {
  generateEntityFiles,
  generateWorkerEntityFiles,
  generateCliEntityFiles,
  generateGraphqlEntityFiles,
  describeEntityDefaults as describeDjangoEntityDefaults,
} from './entity-codegen.js';
import { buildCanonicalSdl } from '../../core/graphql-sdl.js';

// This file compiles to dist/plugins/django/django-plugin.js; its templates live
// at generator/plugins/django/templates (three levels up from dist/), so every
// caller resolves the same path through this one place.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'django', 'templates');

interface SubstitutionTokens {
  [token: string]: string;
}

function slugify(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function deriveTokens(inputs: PhaseASettings): SubstitutionTokens {
  const slug = slugify(inputs.projectName);
  return {
    __PROJECT_NAME__: inputs.projectName,
    __ARTIFACT_ID__: slug,
    __DB_NAME__: slug,
    __DB_USER__: slug,
    __DB_PASSWORD__: slug,
  };
}

function applyTokens(str: string, tokens: SubstitutionTokens): string {
  let out = str;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.split(k).join(v);
  }
  return out;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

// ---------------------------------------------------------------------------
// Worker archetypes (Day 34, pass 2). cron-worker + queue-consumer add a root
// worker entrypoint (python worker.py) that runs django.setup() then a scheduler
// loop (stdlib time — NO dep) or a broker consume loop. The entity HTTP view layer
// (views_base/views/urls) is swapped for a job/handler; the Django web scaffolding
// (manage.py/config) is RETAINED — Django needs it for the ORM + migrations
// (run via `python manage.py migrate`). A LITERAL BYPASS for 'Web App'/'API-only'.
// Generation-only (no Python toolchain booted here). pika is a GENERATED-PROJECT
// dep gated on the queue type (Thraksha core stays deps {}).
// ---------------------------------------------------------------------------

/** cron-worker entrypoint (worker.py): django.setup() → run once → time loop (stdlib). */
const CRON_WORKER_PY = [
  `"""Entry point (cron-worker): set up Django, then run the scheduler loop.`,
  ``,
  `Uses the standard library (time) — NO scheduler dependency. Apply migrations`,
  `first with: python manage.py migrate. Then run: python worker.py`,
  `"""`,
  `import os`,
  `import time`,
  ``,
  `import django`,
  ``,
  `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")`,
  `django.setup()`,
  ``,
  `from scheduler import run_all  # noqa: E402 (must follow django.setup())`,
  ``,
  `INTERVAL_SECONDS = 60`,
  ``,
  ``,
  `def main() -> None:`,
  `    run_all()  # run once at startup`,
  `    while True:`,
  `        time.sleep(INTERVAL_SECONDS)`,
  `        run_all()`,
  ``,
  ``,
  `if __name__ == "__main__":`,
  `    main()`,
  ``,
].join('\n');

/** cron-worker job table (scheduler.py): auto-discovers entities/<name>/job.py. */
const CRON_SCHEDULER_PY = [
  `"""The job table (auto-discovers entities/<name>/job.py) — the cron analog of the`,
  `URL auto-include. Runs each entity job in sorted (deterministic) order."""`,
  `import importlib`,
  `import os`,
  `from pathlib import Path`,
  ``,
  `BASE_DIR = Path(__file__).resolve().parent`,
  ``,
  ``,
  `def _load_jobs():`,
  `    jobs = []`,
  `    entities_dir = BASE_DIR / "entities"`,
  `    if entities_dir.is_dir():`,
  `        for name in sorted(os.listdir(entities_dir)):`,
  `            if (entities_dir / name / "job.py").is_file():`,
  `                module = importlib.import_module(f"entities.{name}.job")`,
  `                jobs.append((name, module))`,
  `    return jobs`,
  ``,
  ``,
  `def run_all() -> int:`,
  `    processed = 0`,
  `    for name, module in _load_jobs():`,
  `        n = module.run()`,
  `        processed += n or 0`,
  `        print(f"cron job {name} processed {n}")`,
  `    return processed`,
  ``,
].join('\n');

/** queue-consumer entrypoint (worker.py): django.setup() → consume. */
const QUEUE_WORKER_PY = [
  `"""Entry point (queue-consumer): set up Django, then consume.`,
  ``,
  `Apply migrations first with: python manage.py migrate. Then run: python worker.py`,
  `"""`,
  `import os`,
  ``,
  `import django`,
  ``,
  `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")`,
  `django.setup()`,
  ``,
  `from broker import consume  # noqa: E402 (must follow django.setup())`,
  ``,
  ``,
  `def main() -> None:`,
  `    consume()`,
  ``,
  ``,
  `if __name__ == "__main__":`,
  `    main()`,
  ``,
].join('\n');

/** queue-consumer dispatcher (dispatcher.py): topic→handler table + ack/retry/dead-letter. */
const QUEUE_DISPATCHER_PY = [
  `"""The topic→handler table (auto-discovers entities/<name>/handler.py) — the queue`,
  `analog of the URL auto-include — plus dispatch() with ack / retry / dead-letter`,
  `(broker-agnostic, so it is unit-testable with a stub broker)."""`,
  `import importlib`,
  `import os`,
  `from pathlib import Path`,
  ``,
  `BASE_DIR = Path(__file__).resolve().parent`,
  ``,
  `MAX_ATTEMPTS = 3`,
  ``,
  ``,
  `def load_handlers() -> dict:`,
  `    table = {}`,
  `    entities_dir = BASE_DIR / "entities"`,
  `    if entities_dir.is_dir():`,
  `        for name in sorted(os.listdir(entities_dir)):`,
  `            if (entities_dir / name / "handler.py").is_file():`,
  `                module = importlib.import_module(f"entities.{name}.handler")`,
  `                for topic in sorted(module.handlers):`,
  `                    table[topic] = module.handlers[topic]`,
  `    return table`,
  ``,
  ``,
  `HANDLERS = load_handlers()`,
  ``,
  ``,
  `def topics() -> list:`,
  `    return sorted(HANDLERS)`,
  ``,
  ``,
  `def dispatch(topic: str, payload: dict, broker, attempt: int = 0) -> str:`,
  `    """Run one message through its handler: success -> ack; a transient failure ->`,
  `    retry up to MAX_ATTEMPTS; a poison message (exhausted, or no handler) ->`,
  `    dead-letter. The broker supplies ack/retry/dead_letter."""`,
  `    handler = HANDLERS.get(topic)`,
  `    if handler is None:`,
  `        broker.dead_letter(topic, payload, "no handler for topic")`,
  `        return "dead-letter"`,
  `    attempt += 1`,
  `    try:`,
  `        handler(payload)`,
  `        broker.ack(topic, payload)`,
  `        return "ack"`,
  `    except Exception as exc:  # noqa: BLE001 (transient vs poison decided by attempt)`,
  `        if attempt < MAX_ATTEMPTS:`,
  `            broker.retry(topic, payload, attempt)`,
  `            return "retry"`,
  `        broker.dead_letter(topic, payload, str(exc))`,
  `        return "dead-letter"`,
  ``,
].join('\n');

/** queue-consumer broker (broker.py): pika connection, WIRED but INERT until QUEUE_URL set. */
const QUEUE_BROKER_PY = [
  `"""The broker connection (AMQP / RabbitMQ via pika). WIRED but INERT until`,
  `QUEUE_URL is set. The dispatch loop (dispatcher.py) is broker-agnostic. pika is a`,
  `GENERATED-PROJECT dependency (requirements.txt), never Thraksha's."""`,
  `import json`,
  `import os`,
  ``,
  `import pika`,
  ``,
  `from dispatcher import dispatch, topics`,
  ``,
  ``,
  `class _PikaBroker:`,
  `    def __init__(self, channel):`,
  `        self.channel = channel`,
  ``,
  `    def ack(self, topic, payload) -> None:`,
  `        pass  # the delivery is acked in _on_message`,
  ``,
  `    def retry(self, topic, payload, attempt) -> None:`,
  `        self.channel.basic_publish(`,
  `            exchange="", routing_key=topic, body=json.dumps(payload),`,
  `            properties=pika.BasicProperties(headers={"attempt": str(attempt)}),`,
  `        )`,
  ``,
  `    def dead_letter(self, topic, payload, reason) -> None:`,
  `        self.channel.queue_declare(queue=topic + ".dead", durable=True)`,
  `        self.channel.basic_publish(`,
  `            exchange="", routing_key=topic + ".dead",`,
  `            body=json.dumps({"payload": payload, "reason": reason}),`,
  `        )`,
  ``,
  ``,
  `def _on_message(broker, topic, method, props, body) -> None:`,
  `    payload = json.loads(body)`,
  `    attempt = 0`,
  `    if props.headers and "attempt" in props.headers:`,
  `        attempt = int(props.headers["attempt"])`,
  `    dispatch(topic, payload, broker, attempt)`,
  `    broker.channel.basic_ack(method.delivery_tag)`,
  ``,
  ``,
  `def consume() -> None:`,
  `    url = os.environ.get("QUEUE_URL", "")`,
  `    if not url:`,
  `        raise RuntimeError("Queue is not configured — set QUEUE_URL in the environment.")`,
  `    connection = pika.BlockingConnection(pika.URLParameters(url))`,
  `    channel = connection.channel()`,
  `    broker = _PikaBroker(channel)`,
  `    for topic in topics():`,
  `        channel.queue_declare(queue=topic, durable=True)`,
  `        channel.basic_consume(`,
  `            queue=topic,`,
  `            on_message_callback=lambda ch, method, props, body, _t=topic: _on_message(`,
  `                broker, _t, method, props, body`,
  `            ),`,
  `        )`,
  `    print(f"queue consumer started ({len(topics())} topics)")`,
  `    channel.start_consuming()`,
  ``,
].join('\n');

/** Add pika to requirements.txt (queue only) — a gated GENERATED-PROJECT dep. */
function addPikaRequire(raw: string): string {
  return raw.trimEnd() + '\n' + 'pika==1.3.2\n';
}

/** Append a truthful worker section to the Django README. */
function addWorkerReadmeDj(raw: string, kind: 'cron' | 'queue'): string {
  const lines =
    kind === 'cron'
      ? [
          ``,
          `## Cron worker (project type: Cron Worker)`,
          ``,
          `This is a **scheduler**, not a web server. Apply migrations with`,
          `\`python manage.py migrate\`, then run \`python worker.py\`: it calls`,
          `\`django.setup()\` and ticks every 60s via the standard library (\`time\`) —`,
          `**no scheduler dependency**. \`scheduler.py\` auto-discovers every`,
          `\`entities/<name>/job.py\` and runs its idempotent \`run()\` over the SAME ORM`,
          `models the HTTP API uses. (The Django web scaffolding is retained for the ORM.)`,
          ``,
        ]
      : [
          ``,
          `## Queue consumer (project type: Queue Consumer)`,
          ``,
          `This is a **message consumer**, not a web server. Apply migrations with`,
          `\`python manage.py migrate\`, then run \`python worker.py\`: it calls`,
          `\`django.setup()\` and connects to the broker (\`broker.py\`, AMQP/RabbitMQ via`,
          `\`pika\` — set \`QUEUE_URL\`). \`dispatcher.py\` is the topic→handler table: it routes`,
          `each message to its handler (\`entities/<name>/handler.py\`) with`,
          `**ack / retry / dead-letter**, using the SAME serializers + ORM models the HTTP`,
          `API uses. (The Django web scaffolding is retained for the ORM.)`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

export interface DjangoPluginOptions {
  /** Override the bundled templates directory (tests only). */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

// ---------------------------------------------------------------------------
// CLI + GraphQL archetypes (Day 36, pass 2). CLI = a Django management command per
// entity (`python manage.py <entity> <op>` — the idiomatic Django CLI; no dep, no
// root shell file). GraphQL = one /graphql view over the SHARED deterministic
// schema.graphql using ariadne (a GATED requirements dep). A LITERAL BYPASS
// otherwise. Generation-only. The Django web scaffolding is retained (the ORM needs it).
// ---------------------------------------------------------------------------

/** The GraphQL app (graphql_app.py): schema over the shared SDL + a /graphql Django view (ariadne). */
const GRAPHQL_APP_PY = [
  `"""The GraphQL app: one schema over the deterministic SDL (schema.graphql) using`,
  `ariadne, plus a Django view. Reuses the domain layer; there are no REST views. The`,
  `resolvers are auto-discovered from entities/<name>/graphql.py (sorted, deterministic)."""`,
  `import importlib`,
  `import json`,
  `import os`,
  `from pathlib import Path`,
  ``,
  `from ariadne import MutationType, QueryType, graphql_sync, make_executable_schema`,
  `from django.http import JsonResponse`,
  `from django.views.decorators.csrf import csrf_exempt`,
  ``,
  `BASE_DIR = Path(__file__).resolve().parent`,
  ``,
  `query = QueryType()`,
  `mutation = MutationType()`,
  ``,
  ``,
  `def _register_all():`,
  `    entities_dir = BASE_DIR / "entities"`,
  `    if entities_dir.is_dir():`,
  `        for name in sorted(os.listdir(entities_dir)):`,
  `            if (entities_dir / name / "graphql.py").is_file():`,
  `                module = importlib.import_module(f"entities.{name}.graphql")`,
  `                module.register(query, mutation)`,
  ``,
  ``,
  `_register_all()`,
  ``,
  `with open(BASE_DIR / "schema.graphql", encoding="utf-8") as _f:`,
  `    schema = make_executable_schema(_f.read(), query, mutation)`,
  ``,
  ``,
  `@csrf_exempt`,
  `def graphql_view(request):`,
  `    data = json.loads(request.body or "{}")`,
  `    ok, result = graphql_sync(schema, data, context_value={"request": request})`,
  `    return JsonResponse(result, status=200 if ok else 400)`,
  ``,
].join('\n');

/** Add ariadne to requirements.txt (GraphQL only) — a gated GENERATED-PROJECT dep. */
function addAriadneRequire(raw: string): string {
  return raw.trimEnd() + '\n' + 'ariadne==0.23.0\n';
}

/** Mount the /graphql view on config/urls.py (GraphQL only) — appended, deterministic. */
function addGraphqlUrl(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `# Day-36 GraphQL endpoint — one /graphql view over the deterministic schema.`,
    `from graphql_app import graphql_view  # noqa: E402`,
    ``,
    `urlpatterns.append(path("graphql/", graphql_view))`,
    ``,
  ].join('\n');
}

/** Append a truthful CLI/GraphQL section to the Django README. */
function addEndpointReadmeDj(raw: string, kind: 'cli' | 'graphql'): string {
  const lines =
    kind === 'cli'
      ? [
          ``,
          `## CLI (project type: CLI)`,
          ``,
          `This is a **command-line tool**, not a web server: each entity ships a Django`,
          `**management command**, so \`python manage.py <entity> <op> [--id N] [--json '{...}']\``,
          `runs CRUD over the SAME serializer + ORM model the HTTP API uses — **no dependency**`,
          `(Django's built-in command framework). Apply migrations first with`,
          `\`python manage.py migrate\`. Example: \`python manage.py ticket list\`.`,
          ``,
        ]
      : [
          ``,
          `## GraphQL API (project type: GraphQL API)`,
          ``,
          `This exposes **one GraphQL endpoint**, \`/graphql\`, instead of the REST routes.`,
          `\`schema.graphql\` is the deterministic SDL (shared across stacks); \`graphql_app.py\``,
          `builds an \`ariadne\` schema over it and exposes a \`graphql_view\` (mounted in`,
          `\`config/urls.py\`), and \`entities/<name>/graphql.py\` registers the per-entity`,
          `resolvers over the SAME serializer + ORM the HTTP API uses. Apply migrations with`,
          `\`python manage.py migrate\`, then \`python manage.py runserver\`.`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

/** Construct the Python (Django) backend plugin. */
export function createDjangoPlugin(options: DjangoPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'django',
    displayName: 'Django + PostgreSQL',

    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()), ...versionTokens(model.getVersions()) };
      // Day 34: worker types add a root worker entrypoint + a scheduler/dispatcher
      // table; the Django web scaffolding is retained (the ORM needs it). A LITERAL
      // BYPASS otherwise — the entity view layer is swapped in generateEntity.
      const projectType = model.getPhaseASettings().projectType;
      const workerKind: 'cron' | 'queue' | null =
        projectType === 'Cron Worker' ? 'cron' : projectType === 'Queue Consumer' ? 'queue' : null;
      // Day 36: CLI is a Django management command per entity (no root shell file —
      // manage.py IS the entrypoint); GraphQL adds a /graphql view + schema.graphql +
      // graphql_app.py (ariadne). A LITERAL BYPASS otherwise. Web scaffolding retained.
      const endpointKind: 'cli' | 'graphql' | null =
        projectType === 'CLI' ? 'cli' : projectType === 'GraphQL API' ? 'graphql' : null;
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (workerKind) {
          if (relRaw === 'requirements.txt' && workerKind === 'queue') raw = addPikaRequire(raw);
          else if (relRaw === 'README.md') raw = addWorkerReadmeDj(raw, workerKind);
        }
        if (endpointKind) {
          if (relRaw === 'requirements.txt' && endpointKind === 'graphql') raw = addAriadneRequire(raw);
          else if (relRaw === 'config/urls.py' && endpointKind === 'graphql') raw = addGraphqlUrl(raw);
          else if (relRaw === 'README.md') raw = addEndpointReadmeDj(raw, endpointKind);
        }
        const relOut = applyTokens(relRaw, tokens);
        const content = applyTokens(raw, tokens);
        files.push({ relPath: relOut, content, ownership: 'thraksha' });
      }
      // Day 34: the worker entrypoint + route/handler-table shell (root modules).
      // The per-entity job/handler comes from generateEntity.
      if (workerKind === 'cron') {
        files.push({ relPath: 'worker.py', content: applyTokens(CRON_WORKER_PY, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'scheduler.py', content: applyTokens(CRON_SCHEDULER_PY, tokens), ownership: 'thraksha' });
      } else if (workerKind === 'queue') {
        files.push({ relPath: 'worker.py', content: applyTokens(QUEUE_WORKER_PY, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'dispatcher.py', content: applyTokens(QUEUE_DISPATCHER_PY, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'broker.py', content: applyTokens(QUEUE_BROKER_PY, tokens), ownership: 'thraksha' });
      }
      // Day 36: GraphQL adds the schema (shared SDL) + the ariadne app + view (root).
      // CLI adds nothing at the shell — the per-entity management commands are the CLI.
      if (endpointKind === 'graphql') {
        files.push({ relPath: 'graphql_app.py', content: applyTokens(GRAPHQL_APP_PY, tokens), ownership: 'thraksha' });
        files.push({
          relPath: 'schema.graphql',
          content: buildCanonicalSdl(model.getEntities(), { multiUser: model.getPhaseASettings().multiUser === true, naming: model.getStyle().namingConvention }),
          ownership: 'thraksha',
        });
      }
      return files;
    },

    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      // Multi-user owner scoping is applied when the project is multi-user (ADR-005).
      const ctx = {
        multiUser: context.multiUser,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      };
      // Day 34: worker types swap the entity HTTP view layer for a job/handler,
      // reusing the domain files byte-identically. A LITERAL BYPASS otherwise.
      if (context.projectType === 'Cron Worker') return generateWorkerEntityFiles(entity, ctx, 'cron');
      if (context.projectType === 'Queue Consumer') return generateWorkerEntityFiles(entity, ctx, 'queue');
      // Day 36: CLI adds a management command; GraphQL adds ariadne resolvers —
      // both reuse the domain (models/serializers) byte-identically.
      if (context.projectType === 'CLI') return generateCliEntityFiles(entity, ctx);
      if (context.projectType === 'GraphQL API') return generateGraphqlEntityFiles(entity, ctx);
      return generateEntityFiles(entity, ctx);
    },

    // Day 38: the neutral CI facts (the core renders the workflow). Python runtime; the
    // pinned python version comes from getVersions().python (Day-11), read by the core.
    // `manage.py check` is Django's deterministic validation (no full test suite ships).
    ciProfile() {
      return {
        runtimeKey: 'python' as const,
        setupAction: 'actions/setup-python',
        versionInput: 'python-version',
        buildCommands: ['pip install -r requirements.txt'],
        testCommands: ['python manage.py check'],
        dockerfile: 'Dockerfile',
      };
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describeDjangoEntityDefaults(entity);
    },
  };
}

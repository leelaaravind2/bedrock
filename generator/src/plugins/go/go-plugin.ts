/*
 * Thraksha — Go backend plugin.
 *
 * A PEER of the Spring/Express/FastAPI/Django plugins: it implements the exact same
 * BackendPlugin interface, so the core treats it identically and never learns that
 * Go is behind it (Constitution Laws 25–28). All Go/net-http/database-sql specifics
 * live here and in entity-codegen.ts + the templates/ shell. Database dialect and
 * connection facts come from the injected DatabaseProvider (the same seam the other
 * backends use) — nothing here hardcodes one database.
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
  buildEntityRegister,
  buildWorkerRegister,
  buildCommandRegister,
  buildGraphqlResolver,
  describeEntityDefaults as describeGoEntityDefaults,
  type EntityCodegenContext,
} from './entity-codegen.js';
import { buildCanonicalSdl } from '../../core/graphql-sdl.js';

// This file compiles to dist/plugins/go/go-plugin.js; its templates live at
// generator/plugins/go/templates (three levels up from dist/), so every caller
// resolves the same path through this one place.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'go', 'templates');

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
// Worker archetypes (Day 34, pass 2). cron-worker + queue-consumer are
// ENTRYPOINT/LIFECYCLE projections reusing the domain layer unchanged and
// swapping only the HTTP entrypoint (main.go + internal/entities/register.go —
// the route table) for a scheduler (time.Ticker — stdlib, NO dep) or a
// broker+consume-loop. A LITERAL BYPASS for 'Web App'/'API-only'. Generation-only
// here (no Go toolchain to compile/boot). amqp091-go is a GENERATED-PROJECT dep
// gated on the queue type (Thraksha core stays deps {}).
// ---------------------------------------------------------------------------

/** cron-worker entrypoint (main.go): migrate → seed → run once → time.Ticker (stdlib). */
const CRON_MAIN_GO = [
  `// __PROJECT_NAME__ — Go cron worker (time.Ticker, standard library — NO dependency).`,
  `//`,
  `// Startup: load config, open the database, apply migrations, seed the default`,
  `// user, run every entity job once, then tick on an interval. Each job is`,
  `// idempotent (safe to re-run). No HTTP server.`,
  `package main`,
  ``,
  `import (`,
  `\t"log"`,
  `\t"time"`,
  ``,
  `\t"app/internal/config"`,
  `\t"app/internal/db"`,
  `\t"app/internal/migrate"`,
  `\t"app/internal/seed"`,
  `\t"app/internal/worker"`,
  `)`,
  ``,
  `func main() {`,
  `\tcfg := config.Load()`,
  ``,
  `\tdatabase, err := db.Open(cfg)`,
  `\tif err != nil {`,
  `\t\tlog.Fatalf("database: %v", err)`,
  `\t}`,
  `\tdefer database.Close()`,
  ``,
  `\tif err := migrate.Run(database); err != nil {`,
  `\t\tlog.Fatalf("migrate: %v", err)`,
  `\t}`,
  `\tif err := seed.Run(database); err != nil {`,
  `\t\tlog.Fatalf("seed: %v", err)`,
  `\t}`,
  ``,
  `\tworker.RunAll(database) // run once at startup`,
  `\tticker := time.NewTicker(60 * time.Second)`,
  `\tdefer ticker.Stop()`,
  `\tlog.Println("__PROJECT_NAME__ cron worker started (interval 60s)")`,
  `\tfor range ticker.C {`,
  `\t\tworker.RunAll(database)`,
  `\t}`,
  `}`,
  ``,
].join('\n');

/** queue-consumer entrypoint (main.go): migrate → seed → broker consume loop. */
const QUEUE_MAIN_GO = [
  `// __PROJECT_NAME__ — Go queue consumer.`,
  `//`,
  `// Startup: load config, open the database, apply migrations, seed the default`,
  `// user, then connect to the broker and consume (ack/retry/dead-letter). No HTTP`,
  `// server. The broker driver (amqp091-go) is a project dependency (go.mod).`,
  `package main`,
  ``,
  `import (`,
  `\t"log"`,
  ``,
  `\t"app/internal/config"`,
  `\t"app/internal/db"`,
  `\t"app/internal/migrate"`,
  `\t"app/internal/seed"`,
  `\t"app/internal/worker"`,
  `)`,
  ``,
  `func main() {`,
  `\tcfg := config.Load()`,
  ``,
  `\tdatabase, err := db.Open(cfg)`,
  `\tif err != nil {`,
  `\t\tlog.Fatalf("database: %v", err)`,
  `\t}`,
  `\tdefer database.Close()`,
  ``,
  `\tif err := migrate.Run(database); err != nil {`,
  `\t\tlog.Fatalf("migrate: %v", err)`,
  `\t}`,
  `\tif err := seed.Run(database); err != nil {`,
  `\t\tlog.Fatalf("seed: %v", err)`,
  `\t}`,
  ``,
  `\tif err := worker.Consume(database); err != nil {`,
  `\t\tlog.Fatalf("consume: %v", err)`,
  `\t}`,
  `}`,
  ``,
].join('\n');

/** queue-consumer broker + consume loop (internal/worker/broker.go). amqp091-go = gated project dep. */
const QUEUE_BROKER_GO = [
  `// THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
  `// The broker connection + consume loop (AMQP / RabbitMQ via amqp091-go). WIRED`,
  `// but INERT until QUEUE_URL is set. dispatch() is broker-agnostic over the`,
  `// generated Handlers table, with ack / retry / dead-letter. amqp091-go is a`,
  `// GENERATED-PROJECT dependency (go.mod), never Thraksha core.`,
  `package worker`,
  ``,
  `import (`,
  `\t"database/sql"`,
  `\t"errors"`,
  `\t"log"`,
  `\t"os"`,
  `\t"strconv"`,
  ``,
  `\tamqp "github.com/rabbitmq/amqp091-go"`,
  `)`,
  ``,
  `const maxAttempts = 3`,
  ``,
  `// Consume connects to the broker and consumes each topic queue, dispatching to`,
  `// the generated handler table. Returns an error if QUEUE_URL is unset (inert).`,
  `func Consume(db *sql.DB) error {`,
  `\turl := os.Getenv("QUEUE_URL")`,
  `\tif url == "" {`,
  `\t\treturn errors.New("queue is not configured — set QUEUE_URL in the environment")`,
  `\t}`,
  `\tconn, err := amqp.Dial(url)`,
  `\tif err != nil {`,
  `\t\treturn err`,
  `\t}`,
  `\tdefer conn.Close()`,
  `\tch, err := conn.Channel()`,
  `\tif err != nil {`,
  `\t\treturn err`,
  `\t}`,
  `\tdefer ch.Close()`,
  ``,
  `\ttable := Handlers(db)`,
  `\tfor topic, handler := range table {`,
  `\t\tq, err := ch.QueueDeclare(topic, true, false, false, false, nil)`,
  `\t\tif err != nil {`,
  `\t\t\treturn err`,
  `\t\t}`,
  `\t\tmsgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)`,
  `\t\tif err != nil {`,
  `\t\t\treturn err`,
  `\t\t}`,
  `\t\tgo func(topic string, handler func([]byte) error, msgs <-chan amqp.Delivery) {`,
  `\t\t\tfor d := range msgs {`,
  `\t\t\t\tdispatch(ch, topic, handler, d)`,
  `\t\t\t}`,
  `\t\t}(topic, handler, msgs)`,
  `\t}`,
  `\tlog.Printf("__PROJECT_NAME__ queue consumer started (%d topics)", len(table))`,
  `\tselect {}`,
  `}`,
  ``,
  `// dispatch runs one delivery through its handler: success -> ack; a transient`,
  `// failure -> retry (requeue with an incremented attempt) up to maxAttempts; a`,
  `// poison message (exhausted) -> dead-letter. Always acks the current delivery.`,
  `func dispatch(ch *amqp.Channel, topic string, handler func([]byte) error, d amqp.Delivery) {`,
  `\tattempt := 1`,
  `\tif v, ok := d.Headers["attempt"]; ok {`,
  `\t\tif s, ok := v.(string); ok {`,
  `\t\t\tif n, err := strconv.Atoi(s); err == nil {`,
  `\t\t\t\tattempt = n + 1`,
  `\t\t\t}`,
  `\t\t}`,
  `\t}`,
  `\tif err := handler(d.Body); err != nil {`,
  `\t\tif attempt < maxAttempts {`,
  `\t\t\t_ = ch.Publish("", topic, false, false, amqp.Publishing{`,
  `\t\t\t\tBody:    d.Body,`,
  `\t\t\t\tHeaders: amqp.Table{"attempt": strconv.Itoa(attempt)},`,
  `\t\t\t})`,
  `\t\t} else {`,
  `\t\t\t_ = ch.Publish("", topic+".dead", false, false, amqp.Publishing{Body: d.Body})`,
  `\t\t}`,
  `\t\t_ = d.Ack(false)`,
  `\t\treturn`,
  `\t}`,
  `\t_ = d.Ack(false)`,
  `}`,
  ``,
].join('\n');

/** Add the amqp091-go broker driver to go.mod (queue only) — a gated GENERATED-PROJECT dep. */
function addAmqpRequire(raw: string): string {
  return raw.replace(
    `\tgolang.org/x/crypto v0.31.0`,
    `\tgithub.com/rabbitmq/amqp091-go v1.10.0\n\tgolang.org/x/crypto v0.31.0`,
  );
}

/** Append a truthful worker section to the Go README. */
function addWorkerReadmeGo(raw: string, kind: 'cron' | 'queue'): string {
  const lines =
    kind === 'cron'
      ? [
          ``,
          `## Cron worker (project type: Cron Worker)`,
          ``,
          `This is a **scheduler**, not an HTTP server: \`main.go\` runs migrations + seed,`,
          `then ticks every 60s via the standard-library \`time.Ticker\` — **no scheduler`,
          `dependency**. \`internal/worker/register.go\` runs every entity's idempotent`,
          `\`RunJob\` (in \`internal/entities/<name>/job.go\`), reusing the SAME domain`,
          `services the HTTP API would. Run with \`go run .\`.`,
          ``,
        ]
      : [
          ``,
          `## Queue consumer (project type: Queue Consumer)`,
          ``,
          `This is a **message consumer**, not an HTTP server: \`main.go\` runs migrations +`,
          `seed, then connects to the broker (\`internal/worker/broker.go\`, AMQP/RabbitMQ`,
          `via \`amqp091-go\` — set \`QUEUE_URL\`) and consumes. The topic→handler table`,
          `(\`internal/worker/register.go\`) routes each message to its handler`,
          `(\`internal/entities/<name>/handler.go\`) with **ack / retry / dead-letter**,`,
          `reusing the SAME domain services the HTTP API would. Run with \`go run .\`.`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI + GraphQL archetypes (Day 36, pass 2). Both swap the HTTP entrypoint
// (main.go + internal/entities/register.go) for a CLI (stdlib flag/os.Args — NO
// dep) or a GraphQL server (graph-gophers/graphql-go — a GATED go.mod dep) over the
// SHARED deterministic schema.graphql. A LITERAL BYPASS otherwise. Generation-only.
// ---------------------------------------------------------------------------

/** CLI entrypoint (main.go): parse "<entity> <op> [--json '{...}']", dispatch, run-to-exit (stdlib). */
const CLI_MAIN_GO = [
  `// __PROJECT_NAME__ — Go CLI. Parse "go run . <entity> <op> [id] [--json '{...}']",`,
  `// dispatch, print the JSON result, and exit. Stdlib flag/os.Args — NO dependency.`,
  `package main`,
  ``,
  `import (`,
  `\t"encoding/json"`,
  `\t"fmt"`,
  `\t"log"`,
  `\t"os"`,
  ``,
  `\t"app/internal/commands"`,
  `\t"app/internal/config"`,
  `\t"app/internal/db"`,
  `\t"app/internal/migrate"`,
  `\t"app/internal/seed"`,
  `)`,
  ``,
  `func main() {`,
  `\tif len(os.Args) < 3 {`,
  `\t\tfmt.Fprintln(os.Stderr, "usage: <entity> <list|get|create|update|delete> [id] [--json '{...}']")`,
  `\t\tos.Exit(2)`,
  `\t}`,
  `\tentity, op := os.Args[1], os.Args[2]`,
  `\trest := os.Args[3:]`,
  ``,
  `\tcfg := config.Load()`,
  `\tdatabase, err := db.Open(cfg)`,
  `\tif err != nil {`,
  `\t\tlog.Fatalf("database: %v", err)`,
  `\t}`,
  `\tdefer database.Close()`,
  `\tif err := migrate.Run(database); err != nil {`,
  `\t\tlog.Fatalf("migrate: %v", err)`,
  `\t}`,
  `\tif err := seed.Run(database); err != nil {`,
  `\t\tlog.Fatalf("seed: %v", err)`,
  `\t}`,
  ``,
  `\tresult, err := commands.Run(database, entity, op, rest)`,
  `\tif err != nil {`,
  `\t\tlog.Fatalf("error: %v", err)`,
  `\t}`,
  `\tout, _ := json.MarshalIndent(result, "", "  ")`,
  `\tfmt.Println(string(out))`,
  `}`,
  ``,
].join('\n');

/** GraphQL entrypoint (main.go): ONE /graphql endpoint over the shared SDL (graph-gophers). */
const GRAPHQL_MAIN_GO = [
  `// __PROJECT_NAME__ — Go GraphQL API. ONE /graphql endpoint over the deterministic`,
  `// SDL (schema.graphql) using graph-gophers/graphql-go. Reuses the domain layer;`,
  `// there are NO REST route/controller files.`,
  `package main`,
  ``,
  `import (`,
  `\t"log"`,
  `\t"net/http"`,
  `\t"os"`,
  ``,
  `\tgraphql "github.com/graph-gophers/graphql-go"`,
  `\t"github.com/graph-gophers/graphql-go/relay"`,
  ``,
  `\t"app/internal/config"`,
  `\t"app/internal/db"`,
  `\tappgraphql "app/internal/graphql"`,
  `\t"app/internal/migrate"`,
  `\t"app/internal/seed"`,
  `)`,
  ``,
  `func main() {`,
  `\tcfg := config.Load()`,
  `\tdatabase, err := db.Open(cfg)`,
  `\tif err != nil {`,
  `\t\tlog.Fatalf("database: %v", err)`,
  `\t}`,
  `\tdefer database.Close()`,
  `\tif err := migrate.Run(database); err != nil {`,
  `\t\tlog.Fatalf("migrate: %v", err)`,
  `\t}`,
  `\tif err := seed.Run(database); err != nil {`,
  `\t\tlog.Fatalf("seed: %v", err)`,
  `\t}`,
  ``,
  `\tsdl, err := os.ReadFile("schema.graphql")`,
  `\tif err != nil {`,
  `\t\tlog.Fatalf("schema: %v", err)`,
  `\t}`,
  `\t// UseFieldResolvers maps the domain entity structs' exported fields to GraphQL fields.`,
  `\tschema := graphql.MustParseSchema(string(sdl), &appgraphql.Resolver{DB: database}, graphql.UseFieldResolvers())`,
  ``,
  `\thttp.Handle("/graphql", &relay.Handler{Schema: schema})`,
  `\tlog.Println("__PROJECT_NAME__ GraphQL API listening on :8080 (POST /graphql)")`,
  `\tif err := http.ListenAndServe(":8080", nil); err != nil {`,
  `\t\tlog.Fatal(err)`,
  `\t}`,
  `}`,
  ``,
].join('\n');

/** Add the graph-gophers/graphql-go runtime to go.mod (GraphQL) — a gated GENERATED-PROJECT dep. */
function addGraphqlRequire(raw: string): string {
  return raw.replace(
    `\tgolang.org/x/crypto v0.31.0`,
    `\tgithub.com/graph-gophers/graphql-go v1.5.0\n\tgolang.org/x/crypto v0.31.0`,
  );
}

/** Append a truthful CLI/GraphQL section to the Go README. */
function addEndpointReadmeGo(raw: string, kind: 'cli' | 'graphql'): string {
  const lines =
    kind === 'cli'
      ? [
          ``,
          `## CLI (project type: CLI)`,
          ``,
          `This is a **command-line tool**, not an HTTP server: \`main.go\` parses`,
          `\`go run . <entity> <op> [id] [--json '{...}']\` (stdlib \`flag\`/\`os.Args\` — **no`,
          `dependency**), runs migrations + seed, dispatches via \`internal/commands/register.go\``,
          `to the entity's \`RunCommand\` (\`internal/entities/<name>/commands.go\`), prints the`,
          `JSON result, and exits. Commands reuse the SAME domain services the REST API would.`,
          ``,
        ]
      : [
          ``,
          `## GraphQL API (project type: GraphQL API)`,
          ``,
          `This exposes **one GraphQL endpoint**, \`POST /graphql\`, instead of the REST routes.`,
          `\`schema.graphql\` is the deterministic SDL (shared across stacks); \`main.go\` serves it`,
          `via \`graph-gophers/graphql-go\` with \`UseFieldResolvers()\`, and`,
          `\`internal/graphql/resolver.go\` delegates each field to the entity package's exported`,
          `\`Graphql*\` funcs (\`internal/entities/<name>/graphql.go\`), reusing the SAME domain`,
          `services the REST API would. Note: custom scalars (\`DateTime\`, \`Decimal\`) may need a`,
          `scalar type wired to your runtime.`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

export interface GoPluginOptions {
  /** Override the bundled templates directory (tests only). */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

/** Construct the Go backend plugin. */
export function createGoPlugin(options: GoPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'go',
    displayName: 'Go + PostgreSQL',

    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()), ...versionTokens(model.getVersions()) };
      // Day 34: worker types swap the HTTP entrypoint (main.go + the entity route
      // table) for a scheduler / broker consume loop. A LITERAL BYPASS otherwise.
      const projectType = model.getPhaseASettings().projectType;
      const workerKind: 'cron' | 'queue' | null =
        projectType === 'Cron Worker' ? 'cron' : projectType === 'Queue Consumer' ? 'queue' : null;
      // Day 36: CLI + GraphQL are also entrypoint/route-table projections that swap
      // main.go + register.go. A LITERAL BYPASS otherwise.
      const endpointKind: 'cli' | 'graphql' | null =
        projectType === 'CLI' ? 'cli' : projectType === 'GraphQL API' ? 'graphql' : null;
      const swapsEntrypoint = workerKind !== null || endpointKind !== null;
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        // Worker/CLI/GraphQL types replace main.go (the HTTP entrypoint).
        if (swapsEntrypoint && relRaw === 'main.go') continue;
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (workerKind) {
          if (relRaw === 'go.mod' && workerKind === 'queue') raw = addAmqpRequire(raw);
          else if (relRaw === 'README.md') raw = addWorkerReadmeGo(raw, workerKind);
        }
        if (endpointKind) {
          if (relRaw === 'go.mod' && endpointKind === 'graphql') raw = addGraphqlRequire(raw);
          else if (relRaw === 'README.md') raw = addEndpointReadmeGo(raw, endpointKind);
        }
        const relOut = applyTokens(relRaw, tokens);
        const content = applyTokens(raw, tokens);
        files.push({ relPath: relOut, content, ownership: 'thraksha' });
      }
      if (workerKind) {
        // Worker entrypoint (main.go) + the worker "table" (internal/worker/register.go,
        // the analog of the HTTP register.go). Go is compiled → explicit, generated wiring.
        files.push({ relPath: 'main.go', content: applyTokens(workerKind === 'cron' ? CRON_MAIN_GO : QUEUE_MAIN_GO, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'internal/worker/register.go', content: buildWorkerRegister(model.getEntities(), workerKind), ownership: 'thraksha' });
        if (workerKind === 'queue') {
          files.push({ relPath: 'internal/worker/broker.go', content: applyTokens(QUEUE_BROKER_GO, tokens), ownership: 'thraksha' });
        }
        return files;
      }
      if (endpointKind === 'cli') {
        // CLI entrypoint (main.go) + the command table (internal/commands/register.go).
        files.push({ relPath: 'main.go', content: applyTokens(CLI_MAIN_GO, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'internal/commands/register.go', content: buildCommandRegister(model.getEntities()), ownership: 'thraksha' });
        return files;
      }
      if (endpointKind === 'graphql') {
        // GraphQL entrypoint (main.go) + the root resolver (internal/graphql/resolver.go)
        // + the SHARED deterministic SDL (schema.graphql).
        files.push({ relPath: 'main.go', content: applyTokens(GRAPHQL_MAIN_GO, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'internal/graphql/resolver.go', content: buildGraphqlResolver(model.getEntities()), ownership: 'thraksha' });
        files.push({
          relPath: 'schema.graphql',
          content: buildCanonicalSdl(model.getEntities(), { multiUser: model.getPhaseASettings().multiUser === true, naming: model.getStyle().namingConvention }),
          ownership: 'thraksha',
        });
        return files;
      }
      // Go is compiled: entity route wiring must be an explicit, generated file
      // (it cannot be discovered at runtime). Built from the full, ordered model.
      files.push({
        relPath: 'internal/entities/register.go',
        content: buildEntityRegister(model.getEntities()),
        ownership: 'thraksha',
      });
      return files;
    },

    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      const ctx: EntityCodegenContext = {
        multiUser: context.multiUser,
        migrationVersion: context.index + 2, // V1 is the users table from the shell
        sql: database.sql,
        supportsReturning: database.runtime.supportsReturning,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      };
      // Day 34: worker types swap the entity HTTP handler layer for a job/handler,
      // reusing the domain files byte-identically. A LITERAL BYPASS otherwise.
      if (context.projectType === 'Cron Worker') return generateWorkerEntityFiles(entity, ctx, 'cron');
      if (context.projectType === 'Queue Consumer') return generateWorkerEntityFiles(entity, ctx, 'queue');
      // Day 36: CLI + GraphQL swap the entity HTTP handler layer for a command /
      // resolver slice, reusing the domain files byte-identically.
      if (context.projectType === 'CLI') return generateCliEntityFiles(entity, ctx);
      if (context.projectType === 'GraphQL API') return generateGraphqlEntityFiles(entity, ctx);
      return generateEntityFiles(entity, ctx);
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describeGoEntityDefaults(entity);
    },
  };
}

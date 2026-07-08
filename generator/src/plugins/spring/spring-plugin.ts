/*
 * Thraksha — Spring Boot backend plugin.
 *
 * This holds EVERYTHING technology-specific that used to be tangled into the
 * generator: the Java package naming, the token substitution for the project
 * shell, the Spring/React/PostgreSQL template directory, the Flyway migration
 * numbering, and (via entity-codegen) the @Entity / JpaRepository / DTO /
 * controller / migration code itself. None of this lives in the core anymore
 * (Constitution Laws 25–28). The core talks to it ONLY through BackendPlugin.
 *
 * A future Express plugin would implement the same BackendPlugin interface and
 * sit beside this one — with no change to the core.
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
  describeEntityDefaults as describeSpringEntityDefaults,
  type EntityCodegenContext,
} from './entity-codegen.js';
import { buildCanonicalSdl } from '../../core/graphql-sdl.js';

// The Spring plugin owns its own template shell and resolves it relative to its
// compiled location, so EVERY caller (the CLI and the UI server) gets the same
// path through this one place — they can't drift apart. This file compiles to
// dist/plugins/spring/spring-plugin.js, and the templates live at
// generator/plugins/spring/templates, i.e. three levels up from dist/.
const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../generator/dist/plugins/spring
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'spring', 'templates');

/** A map of template tokens to their substituted values (Spring-specific). */
interface SubstitutionTokens {
  [token: string]: string;
}

/** projectName -> artifact slug, e.g. "DemoApp" -> "demoapp". */
function slugify(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The Java/Spring token map derived deterministically from the Phase-A answers. */
function deriveTokens(inputs: PhaseASettings): SubstitutionTokens {
  const slug = slugify(inputs.projectName);
  return {
    __PROJECT_NAME__: inputs.projectName,
    __ARTIFACT_ID__: slug,
    __PACKAGE__: `com.${slug}`,
    __PACKAGE_PATH__: `com/${slug}`,
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

// ---------------------------------------------------------------------------
// API-only frontend subtraction (Day 15). Spring is the ONLY stack that
// scaffolds a frontend, so it is the only one that subtracts one. The subtraction
// is keyed on frontend === 'None' (which projectType 'API-only' forces) and is a
// LITERAL BYPASS for frontend !== 'None' — so Web-App output is byte-identical and
// the 4 Spring hashes stay frozen. These transforms run on the RAW template text
// (before token substitution): the frontend fragments carry no tokens (except the
// header's __DB_DISPLAY_NAME__, kept intact), so the transforms are exact.
// ---------------------------------------------------------------------------

/** True when the project has no frontend (API-only, or Web-App + frontend None). */
function isFrontendless(model: ProjectModel): boolean {
  return model.getSetting('frontend') === 'None';
}

/** Is this template path the frontend subtree that api-only omits entirely? */
function isFrontendFile(relRaw: string): boolean {
  return relRaw === 'frontend' || relRaw.startsWith('frontend/');
}

/** Remove the compose `frontend:` service block + adjust the header (raw text). */
function stripComposeFrontend(raw: string): string {
  const FRONTEND_SERVICE =
    '  frontend:\n' +
    '    build: ./frontend\n' +
    '    depends_on:\n' +
    '      - backend\n' +
    '    ports:\n' +
    '      - "3000:80"\n\n';
  return raw
    .replace('full stack: __DB_DISPLAY_NAME__ + Spring Boot + React (nginx)', 'backend-only API: __DB_DISPLAY_NAME__ + Spring Boot')
    .replace(FRONTEND_SERVICE, '');
}

/** Rewrite the README's frontend references to a coherent API-only run (raw text). */
function apiOnlyReadme(raw: string): string {
  const TREE_WEB =
    '__PROJECT_NAME__/\n' +
    '├── docker-compose.yml      # db + backend + frontend\n' +
    '├── backend/                # Spring Boot service\n' +
    '│   ├── Dockerfile\n' +
    '│   ├── pom.xml\n' +
    '│   └── src/main/...\n' +
    '└── frontend/               # React app served by nginx\n' +
    '    ├── Dockerfile\n' +
    '    ├── nginx.conf\n' +
    '    └── src/...';
  const TREE_API =
    '__PROJECT_NAME__/\n' +
    '├── docker-compose.yml      # db + backend\n' +
    '└── backend/                # Spring Boot service\n' +
    '    ├── Dockerfile\n' +
    '    ├── pom.xml\n' +
    '    └── src/main/...';
  return raw
    .replace('A multi-user-ready web application shell.', 'A multi-user-ready backend API shell (no frontend).')
    .replace('| Frontend | React (Vite) |\n', '')
    .replace('- Frontend: <http://localhost:3000>\n', '')
    .replace(
      'The frontend page shows the backend health status, proving the full stack\n(frontend → nginx → backend → database) is wired up.',
      'The backend serves a JSON API; hit the health endpoint above to confirm the\nstack (backend → database) is wired up.',
    )
    .replace(TREE_WEB, TREE_API)
    .replace('- Frontend: `cd frontend && npm install && npm run dev`.\n', '');
}

/** Recursive directory walk with a STABLE (sorted) ordering for determinism. */
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
// Worker archetypes (Day 34, pass 2). cron-worker + queue-consumer swap the HTTP
// controller layer for a @Scheduled job (cron) / @RabbitListener (queue) — both
// component-scanned, the worker analog of an auto-registered @RestController — so
// the shell change is small: cron adds @EnableScheduling to the application class;
// queue adds spring-boot-starter-amqp (a GATED generated-project dependency in
// pom.xml). Workers are frontendless (isFrontendless is already true → the Day-15
// frontend subtraction applies), so the worker shell = the api-only shell + these
// hooks. A LITERAL BYPASS for 'Web App'/'API-only'. Generation-only (no JDK here).
// ---------------------------------------------------------------------------

/** Add @EnableScheduling to the Spring application class (cron-worker). */
function enableScheduling(raw: string): string {
  return raw
    .replace(
      `import org.springframework.boot.autoconfigure.SpringBootApplication;`,
      `import org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.scheduling.annotation.EnableScheduling;`,
    )
    .replace(`@SpringBootApplication\npublic class`, `@SpringBootApplication\n@EnableScheduling\npublic class`);
}

/** Add spring-boot-starter-amqp to pom.xml (queue-consumer) — a gated GENERATED-PROJECT dep. */
function addAmqpStarter(raw: string): string {
  return raw.replace(
    `        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-actuator</artifactId>\n        </dependency>`,
    `        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-actuator</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-amqp</artifactId>\n        </dependency>`,
  );
}

/** Append a truthful worker section to the Spring README. */
function addWorkerReadmeSpring(raw: string, kind: 'cron' | 'queue'): string {
  const lines =
    kind === 'cron'
      ? [
          ``,
          `## Cron worker (project type: Cron Worker)`,
          ``,
          `This backend is a **scheduler**: the application class is annotated`,
          `\`@EnableScheduling\`, and each entity ships a \`<Name>Job\` \`@Component\` whose`,
          `\`@Scheduled\` \`run()\` scans the SAME \`<Name>Repository\` the HTTP API's service`,
          `uses (\`spring.datasource.*\` still drives the DB). No REST controllers are`,
          `generated. Interval: \`cron.interval.ms\` (default 60000).`,
          ``,
        ]
      : [
          ``,
          `## Queue consumer (project type: Queue Consumer)`,
          ``,
          `This backend is a **message consumer**: it adds \`spring-boot-starter-amqp\`,`,
          `and each entity ships a \`<Name>Listener\` \`@Component\` whose \`@RabbitListener\``,
          `consumes \`<name>.created\` into the SAME \`<Name>Dto\` + \`<Name>Repository\` the`,
          `HTTP API's service uses. Spring AMQP provides **ack / retry (redelivery) /`,
          `dead-letter (DLX)** declaratively. Configure the broker via`,
          `\`spring.rabbitmq.*\`. No REST controllers are generated.`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

// ---------------------------------------------------------------------------
// static-site+API archetype (Day 36). UNLIKE the entrypoint-swap archetypes, this
// is an ADDITIVE build stage on top of the web-app projection: the frontend is KEPT
// (Static Site + API is NOT in the frontendless set), and a deterministic static-
// build script is added that renders the React frontend to static assets
// (frontend/dist) servable by any static host / CDN, alongside the Spring API.
// Spring is the only stack that scaffolds a frontend, so this archetype is
// Spring-centric; generation-only here (no JDK / node build to run it).
// ---------------------------------------------------------------------------

/** The static-output build stage — renders the React frontend to static assets (deterministic). */
const STATIC_BUILD_SH = [
  `#!/usr/bin/env sh`,
  `# __PROJECT_NAME__ — Static Site + API: the static-output build stage.`,
  `#`,
  `# Renders the React frontend to static assets (frontend/dist via \`vite build\`) that`,
  `# any static host or CDN can serve, alongside the Spring Boot API (which runs`,
  `# separately). Deterministic: dependency versions are pinned by frontend/package-lock`,
  `# (\`npm ci\`). Run in CI or before deploy.`,
  `set -e`,
  `cd frontend`,
  `npm ci`,
  `npm run build   # vite build -> frontend/dist (static assets)`,
  `echo "Static site built to frontend/dist — deploy it to any static host; the API runs separately."`,
  ``,
].join('\n');

/** Append a truthful Static Site + API section to the Spring README. */
function addStaticSiteReadme(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `## Static Site + API (project type: Static Site + API)`,
    ``,
    `This project is the full web-app (Spring Boot API + React frontend) PLUS a`,
    `**static-output build stage**: \`static-build.sh\` runs \`vite build\` to render the`,
    `frontend into \`frontend/dist\` — a set of static assets any static host or CDN can`,
    `serve. The API runs separately (\`docker compose up --build\`), and the static site`,
    `talks to it. The frontend is retained (this type keeps its frontend, unlike the`,
    `API-only / worker / CLI / GraphQL types). Nothing in the API or domain changes.`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// CLI + GraphQL archetypes (Day 36, pass 2). CLI = a CommandLineRunner + an
// EntityCommand interface (per-entity @Component commands) — no dep. GraphQL =
// spring-boot-starter-graphql (a GATED pom dep) over the SHARED schema.graphqls
// (backend/src/main/resources/graphql) + per-entity @Controller resolvers. Both are
// frontendless (isFrontendless true → the frontend is subtracted like api-only).
// A LITERAL BYPASS otherwise. Generation-only (no JDK here).
// ---------------------------------------------------------------------------

/** The EntityCommand interface (com.<slug>.cli.EntityCommand) — one entity's CLI surface. */
const CLI_ENTITY_COMMAND_JAVA = [
  `package __PACKAGE__.cli;`,
  ``,
  `import java.util.Map;`,
  ``,
  `/**`,
  ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
  ` *`,
  ` * One entity's CLI command surface, implemented per entity (<Name>Command) and`,
  ` * dispatched by CliRunner. Reuses the domain repository + Dto (no HTTP).`,
  ` */`,
  `public interface EntityCommand {`,
  `    String name();`,
  ``,
  `    Object run(String op, Map<String, String> args) throws Exception;`,
  `}`,
  ``,
].join('\n');

/** The CLI entrypoint (com.<slug>.cli.CliRunner) — a CommandLineRunner dispatching to EntityCommands. */
const CLI_RUNNER_JAVA = [
  `package __PACKAGE__.cli;`,
  ``,
  `import java.util.HashMap;`,
  `import java.util.List;`,
  `import java.util.Map;`,
  `import com.fasterxml.jackson.databind.ObjectMapper;`,
  `import org.springframework.boot.CommandLineRunner;`,
  `import org.springframework.stereotype.Component;`,
  ``,
  `/**`,
  ` * THRAKSHA-OWNED — regenerated on every run. Do not edit.`,
  ` *`,
  ` * The CLI entrypoint: dispatch "<entity> <op> [--id N] [--json '{...}']" to the`,
  ` * matching EntityCommand (all @Component EntityCommands are injected), print the`,
  ` * JSON result, and exit. Run with: mvn spring-boot:run -Dspring-boot.run.arguments="ticket list".`,
  ` * (For a pure CLI, set spring.main.web-application-type=none.)`,
  ` */`,
  `@Component`,
  `public class CliRunner implements CommandLineRunner {`,
  ``,
  `    private final Map<String, EntityCommand> commands = new HashMap<>();`,
  `    private final ObjectMapper mapper = new ObjectMapper();`,
  ``,
  `    public CliRunner(List<EntityCommand> beans) {`,
  `        for (EntityCommand c : beans) {`,
  `            commands.put(c.name(), c);`,
  `        }`,
  `    }`,
  ``,
  `    @Override`,
  `    public void run(String... argv) throws Exception {`,
  `        if (argv.length < 2) {`,
  `            System.err.println("usage: <entity> <op> [--id N] [--json '{...}']");`,
  `            return;`,
  `        }`,
  `        String entity = argv[0];`,
  `        String op = argv[1];`,
  `        Map<String, String> args = new HashMap<>();`,
  `        for (int i = 2; i < argv.length - 1; i++) {`,
  `            if (argv[i].startsWith("--")) {`,
  `                args.put(argv[i].substring(2), argv[i + 1]);`,
  `                i++;`,
  `            }`,
  `        }`,
  `        EntityCommand cmd = commands.get(entity);`,
  `        if (cmd == null) {`,
  `            System.err.println("unknown entity: " + entity);`,
  `            return;`,
  `        }`,
  `        Object result = cmd.run(op, args);`,
  `        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));`,
  `    }`,
  `}`,
  ``,
].join('\n');

/** Add spring-boot-starter-graphql to pom.xml (GraphQL) — a gated GENERATED-PROJECT dep. */
function addGraphqlStarter(raw: string): string {
  return raw.replace(
    `        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-actuator</artifactId>\n        </dependency>`,
    `        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-actuator</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-graphql</artifactId>\n        </dependency>`,
  );
}

/** Append a truthful CLI/GraphQL section to the Spring README. */
function addEndpointReadmeSpring(raw: string, kind: 'cli' | 'graphql'): string {
  const lines =
    kind === 'cli'
      ? [
          ``,
          `## CLI (project type: CLI)`,
          ``,
          `This backend is a **command-line tool**: \`CliRunner\` (a \`CommandLineRunner\`) dispatches`,
          `\`<entity> <op> [--id N] [--json '{...}']\` to the matching \`<Name>Command\` \`@Component\`,`,
          `which runs CRUD over the SAME \`<Name>Repository\` + \`<Name>Dto\` the HTTP API's service`,
          `uses — **no CLI dependency** (Jackson is already on the classpath). Run e.g.`,
          `\`mvn spring-boot:run -Dspring-boot.run.arguments="ticket list"\`. For a pure CLI, set`,
          `\`spring.main.web-application-type=none\`. No REST controllers are generated.`,
          ``,
        ]
      : [
          ``,
          `## GraphQL API (project type: GraphQL API)`,
          ``,
          `This backend exposes **GraphQL** (one endpoint) instead of REST: it adds`,
          `\`spring-boot-starter-graphql\`, ships the deterministic SDL at`,
          `\`backend/src/main/resources/graphql/schema.graphqls\` (shared across stacks), and each`,
          `entity ships a \`<Name>GraphqlController\` \`@Controller\` whose \`@QueryMapping\` /`,
          `\`@MutationMapping\` methods run over the SAME \`<Name>Repository\` + \`<Name>Dto\` the HTTP`,
          `API's service uses. No REST controllers are generated. (Custom scalars \`DateTime\` /`,
          `\`Decimal\` may need a runtime registration.)`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

export interface SpringPluginOptions {
  /**
   * Absolute path to this plugin's template shell directory. Optional — when
   * omitted, the plugin resolves its own bundled templates (the normal case, so
   * the CLI and UI server always agree). Provide it only to point at a different
   * template set, e.g. in tests.
   */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

/** Construct the Spring Boot backend plugin. */
export function createSpringPlugin(options: SpringPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'spring-boot',
    displayName: 'Spring Boot + React + PostgreSQL',

    /** The runnable project shell: every template file, token-substituted. */
    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()), ...versionTokens(model.getVersions()) };
      // Day 15: API-only (frontend === 'None') subtracts the frontend slice. This
      // is a LITERAL BYPASS otherwise — Web-App runs the exact original walk.
      const apiOnly = isFrontendless(model);
      // Day 34: worker types (also frontendless → apiOnly true) add a small hook to
      // the shell: cron → @EnableScheduling on the application class; queue →
      // spring-boot-starter-amqp in pom.xml. A LITERAL BYPASS otherwise. The entity
      // controller layer is swapped for a @Scheduled/@RabbitListener in generateEntity.
      const projectType = model.getPhaseASettings().projectType;
      const workerKind: 'cron' | 'queue' | null =
        projectType === 'Cron Worker' ? 'cron' : projectType === 'Queue Consumer' ? 'queue' : null;
      // Day 36: 'Static Site + API' is the web-app projection (frontend KEPT — apiOnly
      // is false) + an ADDITIVE static-output build stage. It swaps nothing; it adds a
      // static-build script + a README note. A LITERAL BYPASS otherwise.
      const staticSite = projectType === 'Static Site + API';
      // Day 36: CLI (a CommandLineRunner + EntityCommands) / GraphQL (spring-graphql +
      // the shared SDL). Both frontendless (apiOnly true → frontend subtracted). A
      // LITERAL BYPASS otherwise. The entity controller layer is swapped in generateEntity.
      const endpointKind: 'cli' | 'graphql' | null =
        projectType === 'CLI' ? 'cli' : projectType === 'GraphQL API' ? 'graphql' : null;
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        if (apiOnly && isFrontendFile(relRaw)) continue; // omit the frontend/** subtree
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (apiOnly && relRaw === 'docker-compose.yml') raw = stripComposeFrontend(raw);
        if (apiOnly && relRaw === 'README.md') raw = apiOnlyReadme(raw);
        if (workerKind) {
          if (workerKind === 'cron' && relRaw.endsWith('Application.java')) raw = enableScheduling(raw);
          else if (workerKind === 'queue' && relRaw === 'backend/pom.xml') raw = addAmqpStarter(raw);
          else if (relRaw === 'README.md') raw = addWorkerReadmeSpring(raw, workerKind);
        }
        if (staticSite && relRaw === 'README.md') raw = addStaticSiteReadme(raw);
        if (endpointKind) {
          if (endpointKind === 'graphql' && relRaw === 'backend/pom.xml') raw = addGraphqlStarter(raw);
          else if (relRaw === 'README.md') raw = addEndpointReadmeSpring(raw, endpointKind);
        }
        const relOut = applyTokens(relRaw, tokens);
        const content = applyTokens(raw, tokens);
        files.push({ relPath: relOut, content, ownership: 'thraksha' });
      }
      if (staticSite) {
        // The additive static-output build stage: a deterministic build script that
        // renders the React frontend to static assets (frontend/dist) any static host
        // can serve, alongside the Spring API. Frontend + API are both retained.
        files.push({ relPath: 'static-build.sh', content: applyTokens(STATIC_BUILD_SH, tokens), ownership: 'thraksha' });
      }
      if (endpointKind === 'cli') {
        // The CLI entrypoint (CommandLineRunner) + the EntityCommand interface the
        // per-entity commands implement (component-scanned).
        files.push({ relPath: `backend/src/main/java/${tokens.__PACKAGE_PATH__}/cli/EntityCommand.java`, content: applyTokens(CLI_ENTITY_COMMAND_JAVA, tokens), ownership: 'thraksha' });
        files.push({ relPath: `backend/src/main/java/${tokens.__PACKAGE_PATH__}/cli/CliRunner.java`, content: applyTokens(CLI_RUNNER_JAVA, tokens), ownership: 'thraksha' });
      } else if (endpointKind === 'graphql') {
        // The SHARED deterministic SDL, at Spring's schema location (resources/graphql).
        files.push({
          relPath: 'backend/src/main/resources/graphql/schema.graphqls',
          content: buildCanonicalSdl(model.getEntities(), { multiUser: model.getPhaseASettings().multiUser === true, naming: model.getStyle().namingConvention }),
          ownership: 'thraksha',
        });
      }
      return files;
    },

    /** One entity's full CRUD slice. Derives Java package + migration version. */
    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      const slug = slugify(context.projectName);
      const ctx: EntityCodegenContext = {
        packageName: `com.${slug}`,
        packagePath: `com/${slug}`,
        multiUser: context.multiUser,
        migrationVersion: context.index + 2, // V1 is the users table from the shell
        sql: database.sql,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      };
      // Day 34: worker types swap the entity controller layer for a @Scheduled job
      // / @RabbitListener, reusing the domain files byte-identically. Bypass otherwise.
      if (context.projectType === 'Cron Worker') return generateWorkerEntityFiles(entity, ctx, 'cron');
      if (context.projectType === 'Queue Consumer') return generateWorkerEntityFiles(entity, ctx, 'queue');
      // Day 36: CLI adds a per-entity command; GraphQL a per-entity @Controller —
      // both reuse the domain (Base/Repository/Dto/ServiceBase) byte-identically.
      if (context.projectType === 'CLI') return generateCliEntityFiles(entity, ctx);
      if (context.projectType === 'GraphQL API') return generateGraphqlEntityFiles(entity, ctx);
      return generateEntityFiles(entity, ctx);
    },

    // Day 38: the neutral CI facts (the core renders the workflow). Java runtime (temurin);
    // the pinned java version comes from getVersions().java (Day-11), read by the core. The
    // build is under backend/ (the Maven project), so the docker context is backend/Dockerfile.
    ciProfile() {
      return {
        runtimeKey: 'java' as const,
        setupAction: 'actions/setup-java',
        versionInput: 'java-version',
        distribution: 'temurin',
        buildCommands: ['mvn -B -f backend/pom.xml -DskipTests package'],
        testCommands: ['mvn -B -f backend/pom.xml test'],
        dockerfile: 'backend/Dockerfile',
      };
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describeSpringEntityDefaults(entity);
    },
  };
}

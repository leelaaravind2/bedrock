/*
 * Thraksha — Backend plugin registry (composition layer, NOT the kernel).
 *
 * This is where the host application declares which backend plugins are
 * installed and picks one based on the project's `backend` answer. The CORE
 * never does this — it only ever receives a BackendPlugin and calls the
 * interface (Laws 25–28). Selecting a plugin by the model's chosen backend is an
 * application concern, so it lives here, beside the plugins.
 *
 * Adding a third backend later = add one line here. No core change.
 */

import type { BackendPlugin } from '../core/plugin.js';
import type { DatabaseProvider } from '../core/database.js';
import type { ProjectModel } from '../core/project-model.js';
import { createSpringPlugin } from './spring/spring-plugin.js';
import { createExpressPlugin } from './express/express-plugin.js';
import { createPythonPlugin } from './python/python-plugin.js';
import { createDjangoPlugin } from './django/django-plugin.js';
import { createGoPlugin } from './go/go-plugin.js';
import { selectDatabaseProvider } from './database-registry.js';

/** Options every backend factory accepts (the database provider is injected here). */
interface BackendFactoryOptions {
  database: DatabaseProvider;
}

/** The installed backend plugins, keyed by the Phase-A `backend` answer. */
const BACKENDS: Record<string, (opts: BackendFactoryOptions) => BackendPlugin> = {
  'Spring Boot': createSpringPlugin,
  Express: createExpressPlugin,
  FastAPI: createPythonPlugin,
  Django: createDjangoPlugin,
  Go: createGoPlugin,
};

/** Pick the backend plugin the model's `backend` setting asks for. */
export function selectBackendPlugin(model: ProjectModel): BackendPlugin {
  const backend = model.getSetting('backend');
  const factory = BACKENDS[backend];
  if (!factory) {
    throw new Error(
      `No backend plugin is installed for "${backend}". Installed backends: ${Object.keys(BACKENDS).join(', ')}.`,
    );
  }
  // The database answer picks the provider the backend generates against (Law 25:
  // the backend receives a provider; it never learns which database).
  return factory({ database: selectDatabaseProvider(model) });
}

/** The list of installed backend names (for UIs / diagnostics). */
export function availableBackends(): string[] {
  return Object.keys(BACKENDS);
}

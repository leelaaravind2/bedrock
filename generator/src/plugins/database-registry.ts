/*
 * Thraksha — Database provider registry (composition layer, NOT the kernel).
 *
 * Maps the Phase-A `database` answer to a DatabaseProvider, exactly as the backend
 * registry maps the `backend` answer to a BackendPlugin. The core never does this;
 * it only ever receives a DatabaseProvider (Law 25).
 *
 * Day 5a: Postgres is the sole provider. Adding MySQL later = one line here.
 */

import type { DatabaseProvider } from '../core/database.js';
import type { ProjectModel } from '../core/project-model.js';
import { postgresProvider } from './database/postgres.js';
import { mySqlProvider } from './database/mysql.js';

/** Installed database providers, keyed by the Phase-A `database` answer. */
const DATABASES: Record<string, DatabaseProvider> = {
  PostgreSQL: postgresProvider,
  MySQL: mySqlProvider,
};

/** The default provider (used when a caller does not specify a database). */
export const defaultDatabaseProvider: DatabaseProvider = postgresProvider;

/** Pick the database provider the model's `database` setting asks for. */
export function selectDatabaseProvider(model: ProjectModel): DatabaseProvider {
  const database = model.getSetting('database');
  const provider = DATABASES[database];
  if (!provider) {
    throw new Error(
      `No database provider is installed for "${database}". Installed databases: ${Object.keys(DATABASES).join(', ')}.`,
    );
  }
  return provider;
}

/** The installed database names (for UIs / the option-set descriptor). */
export function availableDatabases(): string[] {
  return Object.keys(DATABASES);
}

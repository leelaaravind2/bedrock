/*
 * Thraksha — MySQL database provider (Day 5b).
 *
 * The second DatabaseProvider, added behind the Day-5a seam with NO change to the
 * core contract (Law 25) and NO change to any backend's logic — it only supplies
 * the MySQL dialect strings and shell tokens the SQL-migration backends and shells
 * already ask the provider for. Selecting `database='MySQL'` routes here.
 *
 * Same LOGICAL schema as Postgres (same tables, columns, order, relationships);
 * different SQL DIALECT. Honest MySQL notes:
 *   - DATETIME (chosen over TIMESTAMP) has no timezone — the app stores UTC.
 *   - Column defaults use CURRENT_TIMESTAMP (a column default cannot be now()).
 *   - updated_at is left app-managed (no ON UPDATE CURRENT_TIMESTAMP) so the
 *     semantics match Postgres exactly.
 *   - FK enforcement needs InnoDB, which is the MySQL 8 default (no ENGINE clause).
 *   - BOOLEAN is emitted as its stored type TINYINT(1); NUMERIC as DECIMAL.
 *
 * No AI (ADR-001). Deterministic (ADR-003): fixed strings, no randomness.
 */

import type { DatabaseProvider } from '../../core/database.js';

const SUPPORTED_TYPES = 'String, Text, Integer, Long, Decimal, Boolean, Date, DateTime';

/** The users-table DDL (shared by Spring/Express/FastAPI V1 migrations), MySQL dialect. */
const USERS_TABLE_DDL = [
  'CREATE TABLE users (',
  '    id            BIGINT AUTO_INCREMENT PRIMARY KEY,',
  '    username      VARCHAR(100) NOT NULL UNIQUE,',
  '    password_hash VARCHAR(255) NOT NULL,',
  '    enabled       TINYINT(1)   NOT NULL DEFAULT TRUE,',
  '    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP',
  ');',
].join('\n');

// The docker-compose `db` service's MySQL fragments. The MySQL image initialises
// with MYSQL_* env vars (and requires a root password) and stores data under
// /var/lib/mysql. These reference the shell's project tokens, resolved after the
// provider tokens (see the substitution note in core/database.ts).
const COMPOSE_DB_ENV = [
  'MYSQL_DATABASE: __DB_NAME__',
  '      MYSQL_USER: __DB_USER__',
  '      MYSQL_PASSWORD: __DB_PASSWORD__',
  '      MYSQL_ROOT_PASSWORD: __DB_PASSWORD__',
].join('\n');
const COMPOSE_HEALTHCHECK =
  '["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u __DB_USER__ -p__DB_PASSWORD__ --silent"]';

export const mySqlProvider: DatabaseProvider = {
  id: 'mysql',
  displayName: 'MySQL',

  // MySQL 8 has no RETURNING, so hand-SQL backends insert/update and then select
  // the row back by its new id.
  runtime: { supportsReturning: false },

  sql: {
    columnType(logicalType, opts) {
      switch (logicalType) {
        case 'String':
          return `VARCHAR(${opts?.maxLength ?? 255})`;
        case 'Text':
          return 'TEXT';
        case 'Integer':
          return 'INTEGER';
        case 'Long':
          return 'BIGINT';
        case 'Decimal':
          return 'DECIMAL(19, 2)';
        case 'Boolean':
          return 'TINYINT(1)';
        case 'Date':
          return 'DATE';
        case 'DateTime':
          return 'DATETIME';
        default:
          throw new Error(`Unsupported field type "${logicalType}". INTAKE-SPEC supports: ${SUPPORTED_TYPES}.`);
      }
    },
    identityPrimaryKey: () => 'BIGINT AUTO_INCREMENT PRIMARY KEY',
    bigInt: () => 'BIGINT',
    timestampDefaultNow: () => 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    // FK and index SQL are byte-for-byte the same as Postgres (standard SQL);
    // MySQL 8 defaults to InnoDB so foreign keys are enforced.
    foreignKey: (table, name, column, refTable) =>
      `ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${refTable} (id);`,
    index: (name, table, column, unique) =>
      `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${name} ON ${table} (${column});`,
  },

  tokens: () => ({
    // Docker
    __DB_IMAGE__: 'mysql:8',
    __DB_PORT__: '3306',
    __DB_VOLUME_PATH__: '/var/lib/mysql',
    __DB_COMPOSE_DB_ENV__: COMPOSE_DB_ENV,
    __DB_COMPOSE_HEALTHCHECK__: COMPOSE_HEALTHCHECK,
    // Human-readable database name (README / comments prose)
    __DB_DISPLAY_NAME__: 'MySQL',
    // DDL fragments (shell V1 users table + migrate-runner bookkeeping timestamp)
    __DB_USERS_TABLE_DDL__: USERS_TABLE_DDL,
    __DB_SCHEMA_MIGRATIONS_TS__: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    // Drivers / connection — Node (Express)
    __DB_NODE_DRIVER__: 'mysql2',
    __DB_NODE_DRIVER_VERSION__: '3.11.5',
    // Python — FastAPI (SQLAlchemy) uses PyMySQL; Django uses mysqlclient.
    __DB_PY_DRIVER__: 'PyMySQL==1.1.1',
    __DB_SQLALCHEMY_URL_SCHEME__: 'mysql+pymysql',
    __DB_DJANGO_DRIVER__: 'mysqlclient==2.2.4',
    __DB_DJANGO_ENGINE__: 'django.db.backends.mysql',
    // Java (Spring) — Hibernate auto-detects the dialect from the JDBC URL.
    __DB_JDBC_SCHEME__: 'jdbc:mysql',
    __DB_JDBC_GROUP__: 'com.mysql',
    __DB_JDBC_ARTIFACT__: 'mysql-connector-j',
    __DB_FLYWAY_ARTIFACT__: 'flyway-mysql',
    // Go (database/sql): MySQL driver facts (consumed by Go from Day 9; present
    // here so the seam is symmetric). DSN args: user, password, host, port, database.
    __DB_GO_DRIVER_IMPORT__: 'github.com/go-sql-driver/mysql',
    __DB_GO_DRIVER_NAME__: 'mysql',
    __DB_GO_DRIVER_REQUIRE__: 'github.com/go-sql-driver/mysql v1.8.1',
    __DB_GO_DSN_FORMAT__: '%s:%s@tcp(%s:%s)/%s?parseTime=true&multiStatements=true',
    // Positional placeholders for hand-written shell SQL (Go): ? for MySQL.
    __DB_PH1__: '?',
    __DB_PH2__: '?',
  }),
};

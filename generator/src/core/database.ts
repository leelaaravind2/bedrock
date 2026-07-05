/*
 * Thraksha — Database provider seam (technology-neutral).
 *
 * The core knows only that "a database provider" supplies the SQL dialect and the
 * connection/driver facts a generated project needs — never whether it is Postgres,
 * MySQL, or anything else (Constitution Law 25). Backend plugins ask a
 * DatabaseProvider for database-specific pieces instead of hardcoding one database.
 *
 * A second database (e.g. MySQL) is added later by implementing this same interface
 * — with NO change to the core (analogous to how a second backend is added through
 * BackendPlugin).
 *
 * No AI (ADR-001). Deterministic (ADR-003): providers return fixed strings.
 */

/** The SQL-dialect pieces the SQL-migration backends assemble their DDL from. */
export interface SqlDialect {
  /** Column type for a logical field type (String/Text/Integer/Long/Decimal/Boolean/Date/DateTime). */
  columnType(logicalType: string, opts?: { maxLength?: number }): string;
  /** The auto-increment primary-key column definition (type + identity + PK). */
  identityPrimaryKey(): string;
  /** The plain 64-bit integer type used for FK / owner columns. */
  bigInt(): string;
  /** The created_at/updated_at column type + default (e.g. "TIMESTAMPTZ NOT NULL DEFAULT now()"). */
  timestampDefaultNow(): string;
  /** A foreign-key constraint statement referencing <refTable>(id). */
  foreignKey(table: string, name: string, column: string, refTable: string): string;
  /** A (unique) index statement. */
  index(name: string, table: string, column: string, unique: boolean): string;
}

/**
 * Runtime SQL facts a backend that writes its queries BY HAND needs (as opposed
 * to backends whose runtime SQL is abstracted by an ORM). Technology-neutral: it
 * states capabilities, never a dialect name.
 *
 * Only hand-SQL backends (e.g. Express) consume this; ORM-abstracted backends
 * (Spring/FastAPI/Django) ignore it.
 */
export interface RuntimeSqlDialect {
  /**
   * Can an INSERT/UPDATE read the affected row back in the same statement
   * (e.g. RETURNING)? When false, the backend inserts/updates and then selects
   * the row back (using the new row's id).
   */
  readonly supportsReturning: boolean;
}

/**
 * A database provider: the SQL dialect, the runtime SQL facts, plus the shell
 * substitution tokens (docker image, driver dependency, connection URL/engine,
 * and the DDL fragments for the users table and the migration-bookkeeping table).
 * The Postgres provider is the first implementation.
 */
export interface DatabaseProvider {
  /** Stable identifier, e.g. "postgres". */
  readonly id: string;
  /** Human-readable name, e.g. "PostgreSQL". */
  readonly displayName: string;
  /** The SQL dialect the SQL-migration backends consume. */
  readonly sql: SqlDialect;
  /** Runtime SQL facts a hand-SQL backend (e.g. Express) consumes. */
  readonly runtime: RuntimeSqlDialect;
  /**
   * Shell substitution tokens merged into a backend's template tokenisation.
   * Each backend's shell references only the tokens it needs. A token value MAY
   * embed the shell's own project tokens (e.g. __DB_NAME__/__DB_USER__ inside a
   * docker-compose fragment); the backend substitutes provider tokens before its
   * project tokens so those resolve. Provider tokens never embed other provider
   * tokens.
   */
  tokens(): Record<string, string>;
}

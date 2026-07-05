/*
 * Thraksha — Versioning + rollback (Step 5).
 *
 * What gets versioned: the PROJECT MODEL (the small source of truth). Because
 * generation is deterministic (ADR-003), any past version's generated output
 * can be reproduced from its saved model — so we store the tiny model snapshot,
 * not a copy of every version's files.
 *
 * Developer-owned files (ADR-002) are NOT part of the model and cannot be
 * regenerated, so rollback must preserve them. It does, by construction:
 * rollback regenerates the target model with applyPlan(), which writes Thraksha
 * files but NEVER opens an existing developer file. Orphaned Thraksha files
 * (from entities that existed in a later version but not the target) are removed
 * — and only ever Thraksha-owned paths, never developer paths (Law 34).
 *
 * BINDING RULES:
 *   ADR-001  No AI. Pure file IO + deterministic regeneration.
 *   ADR-002  Developer files are preserved through rollback (never overwritten).
 *   ADR-003  Version snapshots use sequence numbers, never wall-clock time, and
 *            contain only the model — so rolling back to vN reproduces vN's
 *            exact generated output. Nothing here leaks into generated output.
 *   Law 11   Every action returns a structured, explainable result.
 *   Law 32   The Project Model has its own independent version history.
 *   Law 34   Rollback preserves consistency (Thraksha reverted, developer kept).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { restoreProjectModel, type ProjectModel, type ProjectSnapshot } from './project-model.js';
import { buildFileSet, applyPlan, type ApplyOutcome } from './regen.js';
import type { BackendPlugin } from './plugin.js';

/** A lightweight entry in the version history (no timestamps — ADR-003). */
export interface VersionRef {
  version: number;
  note: string;
}

/** A full saved version: its sequence number, a note, and the model snapshot. */
export interface VersionRecord extends VersionRef {
  model: ProjectSnapshot;
}

interface VersionIndex {
  head: number; // the currently-active version (0 = none yet)
  versions: VersionRef[];
}

export interface RollbackResult {
  from: number;
  to: number;
  orphansRemoved: string[]; // Thraksha-only files deleted because the target doesn't produce them
  outcome: ApplyOutcome; // what regeneration did (developer files appear under "untouched")
}

function pad(n: number): string {
  return String(n).padStart(4, '0');
}

/** A local, on-disk store of model versions. Simple files; no database. */
export class VersionStore {
  constructor(private readonly storeDir: string) {}

  private indexPath(): string {
    return path.join(this.storeDir, 'index.json');
  }

  private versionPath(n: number): string {
    return path.join(this.storeDir, `v${pad(n)}.json`);
  }

  private async readIndex(): Promise<VersionIndex> {
    try {
      return JSON.parse(await fs.readFile(this.indexPath(), 'utf8')) as VersionIndex;
    } catch {
      return { head: 0, versions: [] };
    }
  }

  private async writeIndex(index: VersionIndex): Promise<void> {
    await fs.mkdir(this.storeDir, { recursive: true });
    await fs.writeFile(this.indexPath(), `${JSON.stringify(index, null, 2)}\n`);
  }

  /** Save the model as the next sequential version and make it the head. */
  async saveVersion(model: ProjectModel, note: string): Promise<VersionRef> {
    const index = await this.readIndex();
    const version = index.versions.length + 1; // deterministic sequence number
    const record: VersionRecord = { version, note, model: model.getState() };
    await fs.mkdir(this.storeDir, { recursive: true });
    await fs.writeFile(this.versionPath(version), `${JSON.stringify(record, null, 2)}\n`);
    index.versions.push({ version, note });
    index.head = version;
    await this.writeIndex(index);
    return { version, note };
  }

  /** The version history and which version is currently active (head). */
  async listVersions(): Promise<VersionIndex> {
    return this.readIndex();
  }

  async getRecord(version: number): Promise<VersionRecord> {
    return JSON.parse(await fs.readFile(this.versionPath(version), 'utf8')) as VersionRecord;
  }

  /** Reconstruct the Project Model saved at a given version. */
  async getModel(version: number): Promise<ProjectModel> {
    const record = await this.getRecord(version);
    return restoreProjectModel(record.model);
  }

  /**
   * Roll back to a previous version: restore its model and regenerate its
   * output into projectDir, preserving developer-owned files.
   */
  async rollback(version: number, projectDir: string, plugin: BackendPlugin): Promise<RollbackResult> {
    const index = await this.readIndex();
    if (!index.versions.some((v) => v.version === version)) {
      throw new Error(`Version ${version} does not exist.`);
    }
    const from = index.head;

    const targetModel = await this.getModel(version);
    const targetFiles = await buildFileSet(targetModel, plugin);
    const targetPaths = new Set(targetFiles.map((f) => f.relPath));

    // Remove Thraksha files the target version does not produce (e.g. files of
    // an entity added in a later version). These are definitively Thraksha-owned
    // — developer files are never in this set, so are never deleted (ADR-002).
    let orphansRemoved: string[] = [];
    if (from !== 0) {
      const currentModel = await this.getModel(from);
      const currentFiles = await buildFileSet(currentModel, plugin);
      orphansRemoved = currentFiles
        .filter((f) => f.ownership === 'thraksha' && !targetPaths.has(f.relPath))
        .map((f) => f.relPath)
        .sort();
      for (const rel of orphansRemoved) {
        await fs.rm(path.join(projectDir, rel), { force: true, maxRetries: 10, retryDelay: 200 });
      }
    }

    // Regenerate the target version. applyPlan overwrites Thraksha files and
    // leaves existing developer files untouched.
    const outcome = await applyPlan(projectDir, targetFiles);

    index.head = version;
    await this.writeIndex(index);
    return { from, to: version, orphansRemoved, outcome };
  }
}

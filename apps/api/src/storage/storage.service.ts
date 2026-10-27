import { mkdir, open, rename, rm, truncate } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '@/config/env.validation';

/** Folder under the root for files still being written; moved out of it when complete. */
const TEMP_DIR = 'tmp';

/**
 * Files on the api's local disk, under `UPLOADS_DIR`. Callers address them by a relative storage
 * key (what goes into the DB), never by absolute path, so the root can move between deployments.
 * Unfinished files live in `tmp/` on the same filesystem, so finishing one is an atomic `rename`.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly root: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.root = path.resolve(config.get('UPLOADS_DIR', { infer: true }));
  }

  async onModuleInit() {
    await mkdir(path.join(this.root, TEMP_DIR), { recursive: true });
  }

  /** Creates an empty temporary file for `id`, replacing any left over from before. */
  async createTemp(id: string): Promise<void> {
    const handle = await open(this.tempPath(id), 'w');
    await handle.close();
  }

  /**
   * Streams `source` into the temporary file of `id`, starting at byte `offset`, without buffering
   * it in memory. If the stream fails, the file is cut back to `offset`, so a retry of the same
   * chunk starts from a clean state.
   *
   * @returns the number of bytes written.
   */
  async writeTemp(id: string, offset: number, source: Readable): Promise<number> {
    const target = createWriteStream(this.tempPath(id), { flags: 'r+', start: offset });
    try {
      await pipeline(source, target);
    } catch (error) {
      await truncate(this.tempPath(id), offset);
      throw error;
    }
    return target.bytesWritten;
  }

  /** Moves the temporary file of `id` to its final place under `key`. */
  async commitTemp(id: string, key: string): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await rename(this.tempPath(id), target);
  }

  async removeTemp(id: string): Promise<void> {
    await rm(this.tempPath(id), { force: true });
  }

  /** The absolute path of a stored file. */
  resolve(key: string): string {
    const resolved = path.resolve(this.root, key);
    // Keys are built by the api from ids, but never let one point outside the root.
    if (!resolved.startsWith(this.root + path.sep)) {
      throw new Error(`Storage key escapes the uploads directory: ${key}`);
    }
    return resolved;
  }

  private tempPath(id: string): string {
    return this.resolve(path.join(TEMP_DIR, `${id}.part`));
  }
}

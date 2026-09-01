/**
 * The model as a file on disk - the same JSON the app downloads and uploads.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class LocalFileBackend {
  constructor(filePath) {
    this.path = resolve(filePath);
    this.kind = 'file';
  }

  describe() {
    return { kind: 'file', path: this.path, exists: existsSync(this.path) };
  }

  async read() {
    if (!existsSync(this.path)) {
      return { payload: null, revision: null };
    }
    const raw = await readFile(this.path, 'utf8');
    if (!raw.trim()) {
      return { payload: null, revision: null };
    }
    try {
      return { payload: JSON.parse(raw), revision: null };
    } catch (error) {
      throw new Error(`${this.path} is not valid JSON: ${error.message}`);
    }
  }

  async write(payload) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    return { written: this.path };
  }
}

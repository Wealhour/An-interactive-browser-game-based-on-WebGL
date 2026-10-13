import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../original/', import.meta.url);
const manifest = JSON.parse((await readFile(new URL('../docs/original-manifest.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
for (const entry of manifest) {
  const bytes = await readFile(new URL(entry.path, root));
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256 || bytes.length !== entry.bytes) throw new Error(`Archive changed: ${entry.path}`);
}
const count = (await readdir(root, { recursive: true, withFileTypes: true })).filter(f => f.isFile()).length;
if (count !== manifest.length) throw new Error('Archive file count changed');
console.log(`Original preserved: all ${count} files match their original SHA-256 hashes.`);

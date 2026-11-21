import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { list } from 'tar';

const REGISTRY = 'https://registry.npmjs.org';
// The first public @opencode/plugin version with the Desktop GUI API was 2.2.0.
const GUI_FIRST_PUBLISHED = '2026-10-27';
const MiB = 1024 * 1024;

/** Only probe packages that can use the legacy package-subpath resolver. */
export function desktopArchive(manifest, publishedAt) {
  if (manifest?.exports != null || !publishedAt || publishedAt < GUI_FIRST_PUBLISHED) return null;
  const url = URL.parse(manifest?.dist?.tarball ?? '');
  return url?.origin === REGISTRY && !url.username && !url.password ? url.href : null;
}

function limitBytes(limit) {
  let bytes = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > limit) return callback(new Error('Desktop archive size limit exceeded'));
      callback(null, chunk);
    },
  });
}

/** List the registry archive without installing, extracting, or executing anything.
 * Returns null (not false) if the result cannot be verified. */
export async function hasRootGuiBundle(url, {
  budget, request = fetch, compressedLimit = 4 * MiB, expandedLimit = 24 * MiB,
} = {}) {
  const timeout = AbortSignal.timeout(5_000);
  const signal = budget ? AbortSignal.any([budget, timeout]) : timeout;
  try {
    signal.throwIfAborted();
    const response = await request(url, { signal, redirect: 'error' });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      return null;
    }
    let found = false;
    const entries = list({
      strict: true,
      onReadEntry(entry) {
        if (entry.type === 'File' && /^package\/gui-experimental\.c?js$/.test(entry.path)) found = true;
      },
    });
    await pipeline(
      Readable.fromWeb(response.body), limitBytes(compressedLimit),
      createGunzip(), limitBytes(expandedLimit), entries, { signal },
    );
    return found;
  } catch {
    return null;
  }
}

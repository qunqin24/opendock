import type { SearchDoc } from './plugins';

/**
 * Undoes the avatar trimming of /plugins-index.json (see `compactDocs`).
 * Its own module so the explorer island can use it without importing
 * plugins.ts, which would bundle the whole dataset.
 */
export const AVATAR_HOST = 'https://avatars.githubusercontent.com/';

export function expandDoc(d: SearchDoc): SearchDoc {
  return d.ownerAvatar && !d.ownerAvatar.startsWith('http') ? { ...d, ownerAvatar: AVATAR_HOST + d.ownerAvatar } : d;
}

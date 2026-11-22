// Fetches GitHub profiles (name, bio, company, ...) for every plugin owner and
// writes src/data/authors.json. Best effort: on any failure it warns, keeps the
// existing file and exits 0 so the daily refresh never fails because of this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { graphql } from './lib/http.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginsFile = path.join(root, 'src/data/plugins.json');
const outFile = path.join(root, 'src/data/authors.json');
const BATCH = 100;

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function collectOwners(plugins) {
  const seen = new Map();
  for (const p of plugins) {
    const owner = typeof p.repoSlug === 'string' ? p.repoSlug.split('/')[0] : '';
    if (owner && !seen.has(owner.toLowerCase())) seen.set(owner.toLowerCase(), owner);
  }
  return [...seen.values()];
}

function buildQuery(logins) {
  const fields = logins
    .map((login, i) => `a${i}: repositoryOwner(login: ${JSON.stringify(login)}) {
    __typename login
    ... on User { name bio company location websiteUrl twitterUsername }
    ... on Organization { name description websiteUrl twitterUsername }
  }`)
    .join('\n');
  return `query {\n${fields}\n}`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
  const plugins = Array.isArray(data) ? data : data.plugins ?? [];
  const owners = collectOwners(plugins);
  const authors = {};

  for (let i = 0; i < owners.length; i += BATCH) {
    const chunk = owners.slice(i, i + BATCH);
    const res = await graphql(buildQuery(chunk));
    chunk.forEach((_, j) => {
      const r = res[`a${j}`];
      if (!r) return; // renamed or deleted account
      const isOrg = r.__typename === 'Organization';
      authors[r.login.toLowerCase()] = {
        login: r.login,
        type: isOrg ? 'org' : 'user',
        name: clean(r.name),
        bio: clean(isOrg ? r.description : r.bio),
        company: isOrg ? null : clean(r.company),
        location: isOrg ? null : clean(r.location),
        website: clean(r.websiteUrl),
        twitter: clean(r.twitterUsername),
      };
    });
  }

  fs.writeFileSync(outFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), authors }, null, 2)}\n`);
  const list = Object.values(authors);
  console.log(`authors: queried ${owners.length}, resolved ${list.length}, with bio ${list.filter((a) => a.bio).length}`);
}

try {
  await main();
} catch (err) {
  console.warn(`authors: skipped (${err?.message ?? err}); keeping existing authors.json`);
}

import { plugins, type HealthLevel, type OpencodeTarget } from './plugins';

/**
 * What the opencode.json checker needs to know about every listed plugin,
 * served as /facts.json and fetched only by that page. Short keys: ~2600
 * entries.
 */
export interface Fact {
  /** slug */
  s: string;
  /** title */
  t: string;
  /** npm name */
  n: string;
  /** latest version */
  v: string | null;
  h: HealthLevel;
  oc: OpencodeTarget;
  /** deprecated on npm */
  dp: boolean;
  /** repo archived */
  ar: boolean;
}

export function factsResponse(): Response {
  const facts: Fact[] = plugins.map((p) => ({
    s: p.slug,
    t: p.title,
    n: p.name,
    v: p.version,
    h: p.healthLevel,
    oc: p.opencode ?? null,
    dp: p.deprecated,
    ar: p.archived,
  }));
  return new Response(JSON.stringify(facts), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-robots-tag': 'noindex',
    },
  });
}

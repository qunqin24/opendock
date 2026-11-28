import { getDb, hasDatabase, installEvents } from '@opendock/db';
import { body, clientKey, fail } from '@/lib/api';
import { getAnyPlugin } from '@/lib/data';
import { rateLimit } from '@/lib/rate-limit';

const ACTIONS = ['install', 'update', 'uninstall'] as const;
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;

/**
 * Opt-in, anonymous install events from the OpenDock plugin. Stores only the
 * plugin name, the action, the day and the OpenCode/plugin versions. No
 * cookies, no IP (the address is used in memory for rate limiting only).
 */
export async function POST(req: Request) {
  if (!hasDatabase()) return new Response(null, { status: 204 });
  if (!rateLimit(`telemetry:${clientKey(req)}`, 60, 60 * 60_000)) return fail(429, 'Too many events.');
  const input = await body<{ plugin?: string; action?: string; opencodeVersion?: string; clientVersion?: string }>(req);
  const action = ACTIONS.find((a) => a === input?.action);
  if (!input?.plugin || !action || !getAnyPlugin(input.plugin)) return fail(400, 'Unknown plugin or action.');
  await getDb()
    .insert(installEvents)
    .values({
      packageName: input.plugin,
      action,
      opencodeVersion: input.opencodeVersion && VERSION.test(input.opencodeVersion) ? input.opencodeVersion : null,
      clientVersion: input.clientVersion && VERSION.test(input.clientVersion) ? input.clientVersion : null,
    });
  return new Response(null, { status: 204 });
}

/**
 * Where a plugin goes depends on the OpenCode major and on which hosts load
 * it (same rules as the legacy InstallSnippet.astro):
 *
 *   V1  server → opencode.json "plugin"    TUI only → tui.json "plugin"
 *   V2  server → opencode.json "plugins"   TUI only → cli.json "plugins"
 *
 * V2 also has `opencode plugin add`, which installs into the global config.
 * Source: opencode.ai/docs/plugins and /docs/cli/plugins.
 */
import type { Plugin } from './data';

/** `getTranslations('install')` or `useTranslations('install')`. */
type T = (key: string, values?: Record<string, string>) => string;

export interface InstallOption {
  id: string;
  /** Tab label. */
  label: string;
  /** Where the snippet goes: "terminal" or a config file path. */
  where: string;
  /** One sentence telling a newcomer what to do with the snippet. */
  hint: string;
  code: string;
}

const json = (schema: string, key: string, spec: string) =>
  `{\n  "$schema": "${schema}",\n  "${key}": ["${spec}"]\n}`;

export function installOptions(p: Pick<Plugin, 'name' | 'opencode' | 'surfaces'>, t: T): {
  options: InstallOption[];
  note: string | null;
} {
  const tuiOnly = p.surfaces?.length === 1 && p.surfaces[0] === 'tui';
  if (p.opencode === 'v1') {
    const file = tuiOnly ? 'tui.json' : 'opencode.json';
    const schema = `https://opencode.ai/${tuiOnly ? 'tui' : 'config'}.json`;
    return {
      options: [
        {
          id: 'project',
          label: t('thisProject'),
          where: tuiOnly ? '.opencode/tui.json' : 'opencode.json',
          hint: t('hint.v1Project', { file: tuiOnly ? '.opencode/tui.json' : 'opencode.json' }),
          code: json(schema, 'plugin', p.name),
        },
        {
          id: 'global',
          label: t('allProjects'),
          where: `~/.config/opencode/${file}`,
          hint: t('hint.v1Global', { file: `~/.config/opencode/${file}` }),
          code: json(schema, 'plugin', p.name),
        },
      ],
      note: t('note.v1'),
    };
  }
  const options: InstallOption[] = [
    {
      id: 'cli',
      label: t('terminal'),
      where: 'terminal',
      hint: t('hint.cli'),
      code: `opencode plugin add ${p.name}`,
    },
    tuiOnly
      ? {
          id: 'global',
          label: 'cli.json',
          where: '~/.config/opencode/cli.json',
          hint: t('hint.cliJson'),
          code: json('https://opencode.ai/v2/cli.json', 'plugins', p.name),
        }
      : {
          id: 'project',
          label: t('thisProject'),
          where: 'opencode.json',
          hint: t('hint.project'),
          code: json('https://opencode.ai/config.json', 'plugins', p.name),
        },
  ];
  return {
    options,
    note: p.opencode === null ? t('note.unknown') : null,
  };
}

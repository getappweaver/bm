import type { SubcommandDefinition } from '@src/system/command-definition';

export const searchDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'search',
  summary:
    'Search published bookmarks, paginate results, or import a hit (see help search).',
  aliases: [],
  arguments: [
    {
      name: 'args',
      summary:
        'Subcommand and parameters (e.g. title, import <id>, next, prev, page <n>).',
      kind: 'string',
      variadic: true,
    },
  ],
  options: [],
  examples: [
    `${prefix}${alias} search rust`,
    `${prefix}${alias} search import 2`,
    `${prefix}${alias} search next`,
  ],
});

import type { SubcommandDefinition } from '@src/system/command-definition';

export const addDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'add',
  summary:
    'Explains that bookmarks are added via ai drafts (no direct add here).',
  aliases: [],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} add`],
});

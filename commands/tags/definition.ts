import type { SubcommandDefinition } from '@src/system/command-definition';

export const tagsDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'tags',
  summary: 'List tags with bookmark counts.',
  aliases: [],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} tags`],
});

import type { SubcommandDefinition } from '@src/system/command-definition';

export const contextDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'context',
  summary: 'Show tags, categories, and media types for ai context.',
  aliases: [],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} context`],
});

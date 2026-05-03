import type { SubcommandDefinition } from '@src/system/command-definition';

export const catsDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'cats',
  summary: 'List categories with bookmark counts.',
  aliases: ['categories'],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} cats`],
});

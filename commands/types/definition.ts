import type { SubcommandDefinition } from '@src/system/command-definition';

export const typesDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'types',
  summary: 'List media types with bookmark counts.',
  aliases: ['media-types'],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} types`],
});

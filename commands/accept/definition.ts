import type { SubcommandDefinition } from '@src/system/command-definition';

export const acceptDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'accept',
  summary: 'Accept a draft (or all pending drafts).',
  aliases: [],
  arguments: [
    {
      name: 'target',
      summary: 'Draft id or the word all.',
      kind: 'string',
      required: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} accept 2`, `${prefix}${alias} accept all`],
});

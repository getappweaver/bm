import type { SubcommandDefinition } from '@src/system/command-definition';

export const declineDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'decline',
  summary: 'Discard a draft.',
  aliases: [],
  arguments: [
    {
      name: 'draft_id',
      summary: 'Draft id.',
      kind: 'integer',
      required: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} decline 2`],
});

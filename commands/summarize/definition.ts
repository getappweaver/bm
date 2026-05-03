import type { SubcommandDefinition } from '@src/system/command-definition';

export const summarizeDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'summarize',
  summary: 'Fetch a bookmark URL and save a summary (agent).',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Bookmark id.',
      kind: 'integer',
      required: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} summarize 3`],
});

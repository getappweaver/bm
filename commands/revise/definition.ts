import type { SubcommandDefinition } from '@src/system/command-definition';

export const reviseDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'revise',
  summary: 'Revise a draft with natural-language corrections (agent).',
  aliases: [],
  arguments: [
    {
      name: 'draft_id',
      summary: 'Draft id.',
      kind: 'integer',
      required: true,
    },
    {
      name: 'corrections',
      summary: 'What to change.',
      kind: 'string',
      required: true,
      variadic: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} revise 1 use category tech/rust`],
});

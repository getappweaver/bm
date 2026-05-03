import type { SubcommandDefinition } from '@src/system/command-definition';

export const aiDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'ai',
  summary:
    'Create bookmark drafts from natural language (accept / revise / decline).',
  aliases: [],
  arguments: [
    {
      name: 'prompt',
      summary: 'What to bookmark or change.',
      kind: 'string',
      required: true,
      variadic: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} ai rust async book for weekend reading`],
});

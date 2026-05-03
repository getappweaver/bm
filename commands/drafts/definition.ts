import type { SubcommandDefinition } from '@src/system/command-definition';

export const draftsDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'drafts',
  summary: 'List drafts or show one draft by id.',
  aliases: [],
  arguments: [
    {
      name: 'draft_id',
      summary: 'Optional draft id to show.',
      kind: 'integer',
    },
  ],
  options: [],
  examples: [`${prefix}${alias} drafts`, `${prefix}${alias} drafts 1`],
});

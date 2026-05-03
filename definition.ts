import { createHelpSubcommandDefinition } from '@src/commands/help/command';
import type { CommandDefinition } from '@src/system/command-definition';

import { acceptDefinition } from './commands/accept/definition';
import { addDefinition } from './commands/add/definition';
import { aiDefinition } from './commands/ai/definition';
import { catsDefinition } from './commands/cats/definition';
import { contextDefinition } from './commands/context/definition';
import { declineDefinition } from './commands/decline/definition';
import { deleteDefinition } from './commands/delete/definition';
import { doneDefinition } from './commands/done/definition';
import { draftsDefinition } from './commands/drafts/definition';
import { listDefinition } from './commands/list/definition';
import { nextDefinition } from './commands/next/definition';
import { publishDefinition } from './commands/publish/definition';
import { queueDefinition } from './commands/queue/definition';
import { reviseDefinition } from './commands/revise/definition';
import { searchDefinition } from './commands/search/definition';
import { showDefinition } from './commands/show/definition';
import { summarizeDefinition } from './commands/summarize/definition';
import { tagsDefinition } from './commands/tags/definition';
import { typesDefinition } from './commands/types/definition';
import { updateDefinition } from './commands/update/definition';

export const commandDefinition = (
  prefix: string,
  alias: string,
): CommandDefinition => ({
  name: alias,
  summary:
    'Bookmarks: structured links with categories, tags, media types, drafts, and publish.',
  aliases: [],
  subcommands: [
    createHelpSubcommandDefinition(prefix, alias, {
      topicArgSummary: 'Optional subcommand name (e.g. list, search, ai).',
      exampleTopics: ['list', 'search', 'ai'],
    }),
    aiDefinition(prefix, alias),
    summarizeDefinition(prefix, alias),
    nextDefinition(prefix, alias),
    doneDefinition(prefix, alias),
    queueDefinition(prefix, alias),
    addDefinition(prefix, alias),
    listDefinition(prefix, alias),
    searchDefinition(prefix, alias),
    tagsDefinition(prefix, alias),
    catsDefinition(prefix, alias),
    typesDefinition(prefix, alias),
    contextDefinition(prefix, alias),
    showDefinition(prefix, alias),
    publishDefinition(prefix, alias),
    updateDefinition(prefix, alias),
    deleteDefinition(prefix, alias),
    draftsDefinition(prefix, alias),
    acceptDefinition(prefix, alias),
    reviseDefinition(prefix, alias),
    declineDefinition(prefix, alias),
  ],
});

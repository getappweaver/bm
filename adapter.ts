import type { Database } from 'bun:sqlite';
import type { EventTemplate, NostrEvent } from 'nostr-tools';

import type {
  PluginAgentService,
  PluginContext,
  PromptFn,
  SendReplyFn,
} from '@src/core/plugin';
import type { MessageSource } from '@src/messaging';
import { getSubcommandDefinition } from '@src/system/command-definition';
import type { WebNodeRoot } from '@src/web/ui-schema';

import { adaptAcceptCommand } from './commands/accept/adapter';
import { adaptAddCommand } from './commands/add/adapter';
import { adaptAiCommand } from './commands/ai/adapter';
import { adaptCatsCommand } from './commands/cats/adapter';
import { adaptContextCommand } from './commands/context/adapter';
import { adaptDeclineCommand } from './commands/decline/adapter';
import { adaptDeleteCommand } from './commands/delete/adapter';
import { adaptDoneCommand } from './commands/done/adapter';
import { adaptDraftsCommand } from './commands/drafts/adapter';
import { adaptHelpCommand } from './commands/help/adapter';
import { adaptListCommand } from './commands/list/adapter';
import { adaptNextCommand } from './commands/next/adapter';
import { adaptPublishCommand } from './commands/publish/adapter';
import { adaptQueueCommand } from './commands/queue/adapter';
import { adaptReviseCommand } from './commands/revise/adapter';
import { adaptSearchCommand } from './commands/search/adapter';
import { adaptShowCommand } from './commands/show/adapter';
import { adaptSummarizeCommand } from './commands/summarize/adapter';
import { adaptTagsCommand } from './commands/tags/adapter';
import { adaptTypesCommand } from './commands/types/adapter';
import { adaptUpdateCommand } from './commands/update/adapter';
import { getBmCommandDefinition } from './help';

export type HandleBmProps = {
  args: string[];
  db: Database;
  identity: {
    alias: string;
    name: string;
    version: string;
    description?: string;
  };
  prefix: string;
  source: MessageSource;
  pool: PluginContext['pool'];
  masterPubkey: string;
  agent: PluginAgentService;
  sendReply: SendReplyFn;
  promptFn: PromptFn;
  getWotScore: (pubkey: string, rootPubkey?: string) => number | null;
  signWithBunker: (
    eventTemplate: EventTemplate,
    bunkerName?: string,
  ) => Promise<NostrEvent>;
  helpText: (alias: string, prefix: string) => string[];
};

export type HandleBmCommandProps = HandleBmProps & {
  command: ReturnType<typeof getBmCommandDefinition>;
  rest: string[];
};

export type BmCommandAdapter = (
  params: HandleBmCommandProps,
) => string | WebNodeRoot | Promise<string | WebNodeRoot>;

type BmSubcommand =
  | 'help'
  | 'ai'
  | 'summarize'
  | 'next'
  | 'done'
  | 'queue'
  | 'add'
  | 'list'
  | 'search'
  | 'tags'
  | 'cats'
  | 'types'
  | 'context'
  | 'show'
  | 'publish'
  | 'update'
  | 'delete'
  | 'drafts'
  | 'accept'
  | 'revise'
  | 'decline';

const normalizedDefinitions = new Map<
  string,
  ReturnType<typeof getBmCommandDefinition>
>();

const subcommandAdapters: Record<BmSubcommand, BmCommandAdapter> = {
  help: adaptHelpCommand,
  ai: adaptAiCommand,
  summarize: adaptSummarizeCommand,
  next: adaptNextCommand,
  done: adaptDoneCommand,
  queue: adaptQueueCommand,
  add: adaptAddCommand,
  list: adaptListCommand,
  search: adaptSearchCommand,
  tags: adaptTagsCommand,
  cats: adaptCatsCommand,
  types: adaptTypesCommand,
  context: adaptContextCommand,
  show: adaptShowCommand,
  publish: adaptPublishCommand,
  update: adaptUpdateCommand,
  delete: adaptDeleteCommand,
  drafts: adaptDraftsCommand,
  accept: adaptAcceptCommand,
  revise: adaptReviseCommand,
  decline: adaptDeclineCommand,
};

function getDefinitionKey(prefix: string, alias: string): string {
  return `${prefix}:${alias}`;
}

function getNormalizedDefinition(prefix: string, alias: string) {
  const key = getDefinitionKey(prefix, alias);
  const cached = normalizedDefinitions.get(key);

  if (cached) {
    return cached;
  }

  const normalized = getBmCommandDefinition(prefix, alias);

  normalizedDefinitions.set(key, normalized);

  return normalized;
}

function isBmSubcommand(value: string): value is BmSubcommand {
  return value in subcommandAdapters;
}

export async function handleBm(
  params: HandleBmProps,
): Promise<string | WebNodeRoot> {
  const normalizedArgs = params.args.length === 0 ? ['help'] : params.args;
  const subcommandToken = normalizedArgs[0]?.toLowerCase() ?? 'help';
  const command = getNormalizedDefinition(params.prefix, params.identity.alias);
  const definition = getSubcommandDefinition(command, subcommandToken);
  const subcommand = definition?.name ?? null;

  if (!subcommand || !isBmSubcommand(subcommand)) {
    return `Unknown subcommand: ${subcommandToken}. Use ${params.prefix}${params.identity.alias} help.`;
  }

  const adapter = subcommandAdapters[subcommand];

  return await adapter({
    ...params,
    command,
    rest: normalizedArgs.slice(1),
  });
}

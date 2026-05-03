// ---------------------------------------------------------------------------
// plugins/bm/init.ts — BmPlugin definition
//
// This file wires the plugin into the bot. Replace helpText with your real
// command list once you implement commands in commands.ts.
// ---------------------------------------------------------------------------

import { basename } from 'path';

import type { Database } from 'bun:sqlite';

import {
  parsePluginPackageJson,
  type BotPlugin,
  type PluginInvocationContext,
  type PluginContext,
} from '@src/core/plugin';
import type { WebNodeRoot } from '@src/web/ui-schema';

import { handleBm } from './adapter';
import { aiDefinition } from './ai';
import { openDb } from './db/open';
import { getBmCommandDefinition, getBmHelpLines } from './help';
import { bmStories } from './stories';

const pluginDir = import.meta.dir;
const alias = basename(pluginDir);

const bmPkg = parsePluginPackageJson({ pluginDir });

if (!bmPkg) {
  throw new Error(
    `Bm plugin: invalid or missing package.json. Required: name, version, dmBot.coreApiVersion, dmBot.description`,
  );
}

export let BmPluginContext: PluginContext | null = null;
export let BmPluginDb: Database | null = null;

export const BmPlugin: BotPlugin = {
  identity: {
    name: bmPkg.name,
    alias,
    version: bmPkg.version,
    description: bmPkg.description,
  },
  handler: (
    args: string[],
    context: PluginInvocationContext,
  ): Promise<string | WebNodeRoot> => {
    if (!BmPluginContext) {
      throw new Error('BmPlugin not initialized');
    }

    if (!BmPluginDb) {
      throw new Error('BmPluginDb not initialized');
    }

    return handleBm({
      args,
      db: BmPluginDb,
      identity: BmPlugin.identity,
      prefix: context.prefix,
      source: context.source,
      pool: BmPluginContext.pool,
      masterPubkey: BmPluginContext.masterPubkey,
      runAgent: context.runAgent,
      sendReply: context.sendReply ?? BmPluginContext.sendReply,
      promptFn: context.promptFn ?? BmPluginContext.promptFn,
      getWotScore: BmPluginContext.getWotScore,
      signWithBunker: BmPluginContext.signWithBunker,
      helpText: (a, p) => BmPlugin.helpText(a, p),
    });
  },
  onInit: (ctx: PluginContext) => {
    BmPluginContext = ctx;

    BmPluginDb = openDb();
  },
  helpText: (alias: string, prefix: string) => [
    `Bookmarks: structured links with category, tags, and media type—created only via ${prefix}${alias} ai (drafts: you accept or decline) so every field is filled reliably. Queue items for later, mark done, list and filter.`,
    '',
    `${prefix}${alias} help [subcommand]            — command help`,
    ...getBmHelpLines(prefix, alias),
  ],
  aiDefinition,
  commandDefinition: (prefix: string, pluginAlias: string) =>
    getBmCommandDefinition(prefix, pluginAlias),
  stories: bmStories,
};

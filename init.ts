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
  type PluginContext,
} from '@src/core/plugin';

import { handleBm } from './commands';
import { openDb } from './db';

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
  handler: (args: string[]) => {
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
      runAgent: BmPluginContext.runAgent,
      helpText: BmPlugin.helpText,
    });
  },
  onInit: (ctx: PluginContext) => {
    BmPluginContext = ctx;

    BmPluginDb = openDb();
  },
  // Replace with your real command help lines when you implement commands.
  helpText: (alias: string) => [
    `!${alias} help — this message`,
    `!${alias} ai <prompt> — create bookmark drafts with natural language`,
    `!${alias} summarize <id> — fetch URL and save summary on bookmark (agent)`,
    `!${alias} add <url> <title...> — add a bookmark`,
    `!${alias} list [filters] — list bookmarks (* = on reading list)`,
    `  --to-read | --no-to-read`,
    `  --tag <name> (repeat)  --tags a,b,c`,
    `  --category <path> (exact, subtree, or segment e.g. nostr → tech/nostr/nips)`,
    `  --title <substring>  --url <substring>`,
    `!${alias} tags — all tags with bookmark counts`,
    `!${alias} cats — categories with bookmark counts`,
    `!${alias} context — tags and categories with counts (same as !bm ai taxonomy context)`,
    `!${alias} show <id> — show one bookmark`,
    `!${alias} delete <id> — delete a bookmark`,
  ],
};

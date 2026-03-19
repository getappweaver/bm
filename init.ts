// ---------------------------------------------------------------------------
// plugins/bm/init.ts — BmPlugin definition
//
// This file wires the plugin into the bot. Replace helpText with your real
// command list once you implement commands in commands.ts.
// ---------------------------------------------------------------------------

import { basename, join } from 'path';

import { Database } from 'bun:sqlite';

import {
  parsePluginPackageJson,
  type BotPlugin,
  type PluginContext,
} from '@src/core/plugin';

import { handleBm } from './commands';
import { createBmTable } from './db';
import { createBmDraftsTable } from './drafts';

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

    BmPluginDb = new Database(join(pluginDir, 'db.sqlite'), { strict: true });

    createBmTable(BmPluginDb);
    createBmDraftsTable(BmPluginDb);
  },
  // Replace with your real command help lines when you implement commands.
  helpText: (alias: string) => [
    `!${alias} help — this message`,
    `!${alias} ai <prompt> — natural language (implement in ai.ts + tool.ts)`,
  ],
};

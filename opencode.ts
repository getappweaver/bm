// ---------------------------------------------------------------------------
// plugins/bm/opencode.ts — OpenCode tool definitions for the bm plugin
//
// createToolDefinitions(alias) is called by the generator; it must return
// the tool array for this plugin. agentInstructions(alias) is injected into
// AGENTS.md. Use tool.schema.* for args (Zod v3); use your Zod v4 schemas
// only inside execute for validation.
//
// Add tools your agent needs, e.g. list, create, update, delete. For
// draft/confirm: in execute, call storeDraft() and return a preview with
// Draft ID and formatDraftReply(); the user then runs !bm accept/revise/decline.
// ---------------------------------------------------------------------------

import { join } from 'path';

import { tool } from '@opencode-ai/plugin';
import { Database } from 'bun:sqlite';

import { dmBotRoot } from '../../src/paths';

import { createBmTable, getBm, listBms } from './db';
import { createBmDraftsTable, storeDraft } from './drafts';
import {
  formatCreateDraftTree,
  formatDraftReply,
  formatBmTree,
  hasDraftChildren,
} from './format';
import { CreateBmDraftSchema, UpdateBmInputSchema } from './types';

export function agentInstructions(alias: string): string {
  return `## Bm (${alias} tools)\n\nWhen the user asks to manage bms, use the ${alias}__* tools. List first to resolve IDs; use draft/confirm for mutations.`;
}

export function createToolDefinitions(alias: string) {
  const dbPath = join(dmBotRoot, 'plugins', alias, 'db.sqlite');
  const cmd = `!${alias}`;

  function openDb(): Database {
    const db = new Database(dbPath);
    db.run('PRAGMA foreign_keys = ON');
    createBmTable(db);
    createBmDraftsTable(db);

    return db;
  }

  const listArgs = {
    filter: tool.schema.string().optional().describe('Optional filter'),
  };

  const createArgs = {
    data: tool.schema.string().min(1).describe('Content for the new bm item'),
    original_prompt: tool.schema.string().describe('Original user request'),
  };

  const updateArgs = {
    id: tool.schema.number(),
    data: tool.schema.string().min(1).optional(),
    original_prompt: tool.schema.string(),
  };

  const deleteArgs = {
    id: tool.schema.number().int().positive(),
    original_prompt: tool.schema.string(),
  };

  return [
    {
      name: 'list',
      description: 'List current bms with IDs. Call before update/delete.',
      args: listArgs,
      execute: async (): Promise<string> => {
        const db = openDb();
        const items = listBms(db);

        return items.length === 0 ? 'No bms.' : formatBmTree(items);
      },
    },
    {
      name: 'create',
      description:
        'Propose a new bm (returns draft for user to accept/revise/decline).',
      args: createArgs,
      execute: async (args: {
        data: string;
        original_prompt: string;
      }): Promise<string> => {
        const db = openDb();
        const parsed = CreateBmDraftSchema.safeParse({ data: args.data });

        if (!parsed.success) {
          return `Validation error: ${parsed.error.message}`;
        }

        const draftId = storeDraft(db, {
          kind: 'create',
          input: parsed.data,
          originalPrompt: args.original_prompt,
        });

        const title = hasDraftChildren(parsed.data)
          ? 'Create the following:'
          : 'Create:';

        return [
          title,
          '',
          formatCreateDraftTree(parsed.data),
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'create'),
        ].join('\n');
      },
    },
    {
      name: 'update',
      description: 'Propose an update (returns draft).',
      args: updateArgs,
      execute: async (args: {
        id: number;
        data?: string;
        original_prompt: string;
      }): Promise<string> => {
        const db = openDb();

        const parsed = UpdateBmInputSchema.safeParse({
          id: args.id,
          data: args.data,
        });

        if (!parsed.success) {
          return `Validation error: ${parsed.error.message}`;
        }

        const existing = getBm(db, args.id);

        if (!existing) {
          return `Bm not found: ${args.id}. Call list first.`;
        }

        const draftId = storeDraft(db, {
          kind: 'update',
          input: parsed.data,
          originalPrompt: args.original_prompt,
        });

        return [
          `Update #${args.id}: "${existing.data}"`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'update'),
        ].join('\n');
      },
    },
    {
      name: 'delete',
      description: 'Propose deleting a bm (returns draft).',
      args: deleteArgs,
      execute: async (args: {
        id: number;
        original_prompt: string;
      }): Promise<string> => {
        const db = openDb();
        const item = getBm(db, args.id);

        if (!item) {
          return `Bm not found: ${args.id}. Call list first.`;
        }

        const draftId = storeDraft(db, {
          kind: 'delete',
          input: { id: args.id },
          originalPrompt: args.original_prompt,
        });

        return [
          `Delete #${args.id}: "${item.data}"`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'delete'),
        ].join('\n');
      },
    },
  ] as const;
}

export type ToolDefinitions = ReturnType<typeof createToolDefinitions>;
export type ToolDefinition = ToolDefinitions[number];

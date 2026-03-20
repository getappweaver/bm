// ---------------------------------------------------------------------------
// plugins/bm/commands.ts — !bm sub-command handler
//
// Implement each subcommand (add, list, show, delete, drafts, accept, revise,
// decline, ai) for your plugin. The stub below supports minimal add/list/show/
// delete and a single-item draft accept flow so the plugin runs; extend or
// replace for your use case (e.g. hierarchical items, status, priority).
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { AgentRunResult } from '@src/backends/types';
import type { PluginIdentity } from '@src/core/plugin';

import { handleBmAi, handleBmSummarize } from './ai';
import { buildBmPluginContextText } from './context';
import {
  createBm,
  deleteBm,
  getBm,
  listBmCategoryCounts,
  listBmTagCounts,
  listBms,
  updateBm,
} from './db';
import { deleteDraft, getDraft, listDrafts } from './drafts';
import {
  formatBmCategoryCounts,
  formatBmTagCounts,
  formatBms,
  formatBmDetail,
  formatCreateDraftList,
  formatDraftReply,
} from './format';
import { parseBmListCliArgs } from './list-args';
import type { CreateBmDraft, UpdateBmInput } from './types';
import { CreateBmInputSchema, normalizeCreateBmInput } from './types';

export type HandleBmProps = {
  args: string[];
  db: Database;
  identity: PluginIdentity;
  runAgent: ((prompt: string) => Promise<AgentRunResult>) | null;
  helpText: (alias: string) => string[];
};

export async function handleBm({
  args,
  db,
  identity,
  runAgent,
  helpText,
}: HandleBmProps): Promise<string> {
  const sub = args[0]?.toLowerCase();
  const rest = args.slice(1);
  const alias = identity.alias;

  if (!sub || sub === 'help') {
    return helpText(alias)
      .concat([`!${alias} help — this message`])
      .join('\n');
  }

  if (sub === 'ai') {
    if (!runAgent) {
      return `!${alias} ai requires an agent backend. Set backend and try again.`;
    }

    return handleBmAi({ args: rest, db, identity, runAgent });
  }

  if (sub === 'summarize') {
    if (!runAgent) {
      return `!${alias} summarize requires an agent backend. Set backend and try again.`;
    }

    const idRaw = rest[0]?.trim();

    if (!idRaw) {
      return `Usage: !${alias} summarize <id>`;
    }

    const id = parseInt(idRaw, 10);

    if (Number.isNaN(id)) {
      return `Usage: !${alias} summarize <id>`;
    }

    return handleBmSummarize({ id, db, identity, runAgent });
  }

  if (sub === 'add') {
    if (rest.length < 2) {
      return `Usage: !${alias} add <url> <title...>`;
    }

    const url = rest[0]!.trim();
    const title = rest.slice(1).join(' ').trim();

    const parsed = CreateBmInputSchema.safeParse({ url, title });

    if (!parsed.success) {
      return `Invalid input: ${parsed.error.message}`;
    }

    const item = createBm(db, normalizeCreateBmInput(parsed.data));

    return `Created #${item.id}\n${formatBmDetail(item)}`;
  }

  if (sub === 'list') {
    const parsed = parseBmListCliArgs(rest);

    if (!parsed.ok) {
      return parsed.error;
    }

    const items = listBms({ db, filters: parsed.filters });

    return items.length === 0 ? 'No bookmarks.' : formatBms(items);
  }

  if (sub === 'tags') {
    if (rest.length > 0) {
      return `Usage: !${alias} tags`;
    }

    const rows = listBmTagCounts(db);

    return rows.length === 0 ? 'No tags yet.' : formatBmTagCounts(rows);
  }

  if (sub === 'cats' || sub === 'categories') {
    if (rest.length > 0) {
      return `Usage: !${alias} cats`;
    }

    const rows = listBmCategoryCounts(db);

    return rows.length === 0
      ? 'No categories yet.'
      : formatBmCategoryCounts(rows);
  }

  if (sub === 'context') {
    if (rest.length > 0) {
      return `Usage: !${alias} context`;
    }

    return buildBmPluginContextText({ db });
  }

  if (sub === 'show') {
    const idRaw = rest[0]?.trim();

    if (!idRaw) {
      return `Usage: !${alias} show <id>`;
    }

    const id = parseInt(idRaw, 10);

    if (Number.isNaN(id)) {
      return `Usage: !${alias} show <id> (number required)`;
    }

    const item = getBm(db, id);

    if (!item) {
      return `Not found: #${id}`;
    }

    return formatBmDetail(item);
  }

  if (sub === 'delete') {
    const idRaw = rest[0]?.trim();

    if (!idRaw) {
      return `Usage: !${alias} delete <id>`;
    }

    const id = parseInt(idRaw, 10);

    if (Number.isNaN(id)) {
      return `Usage: !${alias} delete <id> (number required)`;
    }

    if (!deleteBm(db, id)) {
      return `Not found: #${id}`;
    }

    return `Deleted #${id}.`;
  }

  if (sub === 'drafts') {
    const idRaw = rest[0]?.trim();
    const drafts = listDrafts(db);

    if (idRaw) {
      const id = parseInt(idRaw, 10);

      if (Number.isNaN(id)) {
        return `Usage: !${alias} drafts [draft_id]`;
      }

      const entry = getDraft(db, id);

      if (!entry) {
        return `Draft not found: #${id}`;
      }

      const cmd = `!${alias}`;

      if (entry.kind === 'create') {
        return [
          `Draft #${id} [create]:`,
          '',
          formatCreateDraftList(entry.input as CreateBmDraft),
          '',
          formatDraftReply(cmd, id, 'create'),
        ].join('\n');
      }

      if (entry.kind === 'update') {
        return [
          `Draft #${id} [update]:`,
          `  target id: ${(entry.input as UpdateBmInput).id}`,
          '',
          formatDraftReply(cmd, id, 'update'),
        ].join('\n');
      }

      return [
        `Draft #${id} [delete]:`,
        `  target id: ${(entry.input as { id: number }).id}`,
        '',
        formatDraftReply(cmd, id, 'delete'),
      ].join('\n');
    }

    if (drafts.length === 0) {
      return 'No pending drafts.';
    }

    const cmd = `!${alias}`;
    const lines = drafts.map((d) => `#${d.id} [${d.kind}]`);

    return [
      'Pending drafts:',
      '',
      ...lines,
      '',
      `Accept all: ${cmd} accept all`,
    ].join('\n');
  }

  const draftIdRaw = rest[0]?.trim();
  const draftId = draftIdRaw ? parseInt(draftIdRaw, 10) : NaN;
  const draftIdInvalid = !draftIdRaw || Number.isNaN(draftId);

  if (sub === 'accept') {
    if (rest[0]?.toLowerCase() === 'all') {
      const drafts = listDrafts(db);

      if (drafts.length === 0) {
        return 'No pending drafts.';
      }

      const results: string[] = [];

      for (const draft of drafts) {
        deleteDraft(db, draft.id);

        if (draft.kind === 'create') {
          const created = createBm(db, draft.input as CreateBmDraft);
          results.push(`#${created.id} created`);
        } else if (draft.kind === 'update') {
          const updated = updateBm(db, draft.input as UpdateBmInput);

          results.push(
            updated ? `#${updated.id} updated` : `#${draft.input.id} not found`,
          );
        } else if (draft.kind === 'delete') {
          const ok = deleteBm(db, draft.input.id);

          results.push(
            ok ? `#${draft.input.id} deleted` : `#${draft.input.id} not found`,
          );
        }
      }

      return `Accepted ${results.length} draft(s):\n  ${results.join('\n  ')}`;
    }

    if (draftIdInvalid) {
      return `Usage: !${alias} accept <draft_id> | !${alias} accept all`;
    }

    const entry = getDraft(db, draftId);

    if (!entry) {
      return `Draft not found: #${draftId}`;
    }

    deleteDraft(db, draftId);

    if (entry.kind === 'create') {
      const created = createBm(db, entry.input as CreateBmDraft);

      return `Created #${created.id}\n${formatBmDetail(created)}`;
    }

    if (entry.kind === 'update') {
      const updated = updateBm(db, entry.input as UpdateBmInput);

      if (!updated) {
        return `Not found: #${entry.input.id}`;
      }

      return `Updated.\n${formatBmDetail(updated)}`;
    }

    if (entry.kind === 'delete') {
      const ok = deleteBm(db, entry.input.id);

      if (!ok) {
        return `Not found: #${entry.input.id}`;
      }

      return `Deleted #${entry.input.id}.`;
    }
  }

  if (sub === 'revise') {
    if (draftIdInvalid) {
      return `Usage: !${alias} revise <draft_id> <corrections>`;
    }

    const entry = getDraft(db, draftId);

    if (!entry) {
      return `Draft not found: #${draftId}`;
    }

    if (entry.kind !== 'create') {
      return `Revise only applies to create drafts. Use !${alias} decline ${draftId} and try again.`;
    }

    // Stub: no re-run of agent; prompt user to use ai again or accept/decline.
    return `To revise draft #${draftId}, use !${alias} decline ${draftId} then !${alias} ai <revised request>. Or implement revise in commands.ts (call runAgent and replace draft).`;
  }

  if (sub === 'decline') {
    if (draftIdInvalid) {
      return `Usage: !${alias} decline <draft_id>`;
    }

    if (!getDraft(db, draftId)) {
      return `Draft not found: #${draftId}`;
    }

    deleteDraft(db, draftId);

    return `Draft #${draftId} discarded.`;
  }

  return `Unknown subcommand: ${sub}. Use !${alias} help.`;
}

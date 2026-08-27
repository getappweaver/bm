import type { Database } from 'bun:sqlite';

import { getOutputString } from '@src/backends/types';
import type { PluginAgentService, PromptFn } from '@src/core/plugin';
import type { MessageSource } from '@src/messaging';
import { PROMPT_SESSION_EXIT } from '@src/prompt-session';

import { runBmAgent } from '../../agent';
import type { HandleBmCommandProps } from '../../command-context';
import { buildBmPluginContextText } from '../../context';
import { createBm, deleteBm, getBmByUrl, updateBm } from '../../db';
import {
  deleteDraft,
  getDraftBySessionIndex,
  listDraftsBySession,
  updateDraftEntry,
  type BmDraftRow,
} from '../../drafts/index';
import { formatBmDetail, formatCreateDraftList } from '../../format';
import {
  normalizeCreateBmInput,
  type CreateBmDraft,
  type UpdateBmInput,
} from '../../types';

import { parseBmToolCalls } from './parse-bm-tool-calls';
import { buildSystemPrompt } from './prompts';
import { createBmDraftReviewPrompt } from './renderers/web';
import type { BmToolCall } from './schemas';
import { formatExistingBookmarkDuplicate } from './tool-helpers';

function formatInteractiveDraftReply(id: number): string {
  return `Draft ID: ${id}`;
}

function formatDraftReview(params: {
  draft: BmDraftRow;
  index: number;
  total: number;
}): string {
  if (params.draft.kind !== 'create') {
    return `AI bookmark draft review ${params.index + 1}/${params.total}\nCurrent Draft: #${params.draft.id} [${params.draft.kind}]`;
  }

  return [
    `AI bookmark draft review ${params.index + 1}/${params.total}`,
    `Current Draft: #${params.draft.id} [${params.draft.kind}]`,
    '',
    formatCreateDraftList(params.draft.input),
    '',
    formatInteractiveDraftReply(params.draft.id),
    '',
    'a=accept, r=revise <corrections>, d=decline, s=skip, q=quit',
  ].join('\n');
}

export function renderDraftSessionReview(params: {
  db: Database;
  prefix: string;
  alias: string;
  sessionId: string;
  index: number;
}): string {
  const drafts = listDraftsBySession(params.db, params.sessionId);

  if (drafts.length === 0) {
    return 'Session complete. No drafts remaining.';
  }

  if (params.index >= drafts.length) {
    return `Session finished. ${drafts.length} skipped draft(s) remain. Review them later with ${params.prefix}${params.alias} drafts.`;
  }

  return formatDraftReview({
    draft: drafts[params.index]!,
    index: params.index,
    total: drafts.length,
  });
}

function parseInteractiveAction(input: string): {
  action: 'accept' | 'revise' | 'decline' | 'skip' | 'quit' | null;
  text: string;
} {
  const trimmed = input.trim();
  const [head, ...rest] = trimmed.split(/\s+/);
  const actionRaw = head?.toLowerCase() ?? '';
  const text = rest.join(' ').trim();

  const action =
    actionRaw === 'a' || actionRaw === 'accept'
      ? 'accept'
      : actionRaw === 'r' || actionRaw === 'revise'
        ? 'revise'
        : actionRaw === 'd' || actionRaw === 'decline'
          ? 'decline'
          : actionRaw === 's' || actionRaw === 'skip'
            ? 'skip'
            : actionRaw === 'q' || actionRaw === 'quit'
              ? 'quit'
              : null;

  return { action, text };
}

async function generateReplacementDraft(params: {
  draft: BmDraftRow;
  corrections: string;
  db: Database;
  agent: PluginAgentService;
}): Promise<
  | {
      input: CreateBmDraft;
      originalPrompt: string;
      agentSessionId: string;
    }
  | { error: string }
> {
  const context = buildBmPluginContextText({ db: params.db });
  const prompt = `${params.draft.originalPrompt}\n\nCorrection: ${params.corrections}`;

  const result = await runBmAgent({
    agent: params.agent,
    prompt: buildSystemPrompt(prompt, context),
    sessionId: params.draft.agentSessionId,
  });

  const raw = getOutputString(result).trim();

  if (!raw || raw === '(no output)') {
    return { error: 'Model returned no output. Try again or rephrase.' };
  }

  const fulfilled = parseBmToolCalls(raw).filter(
    (r): r is { status: 'fulfilled'; value: BmToolCall } =>
      r.status === 'fulfilled',
  );

  if (fulfilled.length !== 1) {
    return {
      error: 'Revise must return exactly one valid bookmark operation.',
    };
  }

  const call = fulfilled[0].value;

  if (call.type === 'create') {
    return {
      input: normalizeCreateBmInput(call.input),
      originalPrompt: call.original_prompt,
      agentSessionId: result.sessionId,
    };
  }

  return { error: 'Revise must return a create bookmark draft.' };
}

export async function applyDraftSessionAction(
  cmd: HandleBmCommandProps & {
    sessionId: string;
    index: number;
    action: 'accept' | 'revise' | 'decline' | 'skip' | 'quit';
    input?: string;
  },
): Promise<string> {
  const { db, prefix, identity, sessionId, index, action } = cmd;
  const alias = identity.alias;

  if (action === 'quit') {
    return `Session finished. Remaining drafts can be reviewed later with ${prefix}${alias} drafts.`;
  }

  const draft = getDraftBySessionIndex(db, sessionId, index);

  if (!draft) {
    return renderDraftSessionReview({ db, prefix, alias, sessionId, index });
  }

  if (action === 'skip') {
    return renderDraftSessionReview({
      db,
      prefix,
      alias,
      sessionId,
      index: index + 1,
    });
  }

  if (action === 'decline') {
    deleteDraft(db, draft.id);

    return renderDraftSessionReview({ db, prefix, alias, sessionId, index });
  }

  if (action === 'revise') {
    const corrections = cmd.input?.trim();

    if (!corrections) {
      return 'Revise requires correction text.';
    }

    if (draft.kind !== 'create') {
      return `Revise only applies to create drafts. Use ${prefix}${alias} decline ${draft.id} and try again.`;
    }

    const nextDraft = await generateReplacementDraft({
      draft,
      corrections,
      db,
      agent: cmd.agent,
    });

    if ('error' in nextDraft) {
      return nextDraft.error;
    }

    updateDraftEntry(db, draft.id, {
      sessionId: draft.sessionId,
      agentSessionId: nextDraft.agentSessionId,
      kind: 'create',
      input: nextDraft.input,
      originalPrompt: `${nextDraft.originalPrompt} (revised: ${corrections})`,
    });

    return renderDraftSessionReview({ db, prefix, alias, sessionId, index });
  }

  if (draft.kind === 'create') {
    const existing = getBmByUrl(db, draft.input.url);

    if (existing) {
      deleteDraft(db, draft.id);

      return [
        formatExistingBookmarkDuplicate({ existing, resultId: draft.id }),
        '',
        renderDraftSessionReview({ db, prefix, alias, sessionId, index }),
      ].join('\n');
    }

    const created = createBm(db, draft.input);
    deleteDraft(db, draft.id);

    const next = renderDraftSessionReview({
      db,
      prefix,
      alias,
      sessionId,
      index,
    });

    return next === 'Session complete. No drafts remaining.'
      ? `Created #${created.id}\n${formatBmDetail(created)}`
      : [`Created #${created.id}`, formatBmDetail(created), '', next].join(
          '\n',
        );
  }

  if (draft.kind === 'update') {
    const updated = updateBm(db, draft.input as UpdateBmInput);
    deleteDraft(db, draft.id);

    if (!updated) {
      return `Not found: #${draft.input.id}`;
    }

    const next = renderDraftSessionReview({
      db,
      prefix,
      alias,
      sessionId,
      index,
    });

    return next === 'Session complete. No drafts remaining.'
      ? `Updated.\n${formatBmDetail(updated)}`
      : [`Updated.`, formatBmDetail(updated), '', next].join('\n');
  }

  const ok = deleteBm(db, draft.input.id);
  deleteDraft(db, draft.id);

  const next = renderDraftSessionReview({
    db,
    prefix,
    alias,
    sessionId,
    index,
  });

  const resultText = ok
    ? `Deleted #${draft.input.id}.`
    : `Not found: #${draft.input.id}`;

  return next === 'Session complete. No drafts remaining.'
    ? resultText
    : [resultText, '', next].join('\n');
}

export async function runDraftSessionInteractive(
  cmd: HandleBmCommandProps & {
    sessionId: string;
    source: MessageSource;
    promptFn: PromptFn;
  },
): Promise<string> {
  let index = 0;
  const alias = cmd.identity.alias;

  while (true) {
    const view = renderDraftSessionReview({
      db: cmd.db,
      prefix: cmd.prefix,
      alias,
      sessionId: cmd.sessionId,
      index,
    });

    if (
      view === 'Session complete. No drafts remaining.' ||
      view.startsWith('Session finished.')
    ) {
      return view;
    }

    const answer = await cmd.promptFn(
      createBmDraftReviewPrompt({
        source: cmd.source,
        command: cmd.identity.alias,
        subcommand: 'ai',
        text: view,
      }),
    );

    if (answer === PROMPT_SESSION_EXIT) {
      return `Session finished. Remaining drafts can be reviewed later with ${cmd.prefix}${alias} drafts.`;
    }

    const parsed = parseInteractiveAction(answer);

    if (!parsed.action) {
      continue;
    }

    const result = await applyDraftSessionAction({
      ...cmd,
      sessionId: cmd.sessionId,
      index,
      action: parsed.action,
      input: parsed.text,
    });

    if (parsed.action === 'quit') {
      return result;
    }

    if (
      result === 'Session complete. No drafts remaining.' ||
      result.startsWith('Session finished.')
    ) {
      return result;
    }

    if (parsed.action === 'skip') {
      index += 1;
    }
  }
}

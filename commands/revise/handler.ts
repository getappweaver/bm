// ---------------------------------------------------------------------------
// plugins/bm/commands/revise/handler.ts
// ---------------------------------------------------------------------------

import { getOutputString } from '@src/backends/types';

import type { HandleBmCommandProps } from '../../command-context';
import { buildBmPluginContextText } from '../../context';
import { getDraft, updateDraftEntry } from '../../drafts/index';
import { normalizeCreateBmInput } from '../../types';

import { parseBmToolCalls } from '../ai/parse-bm-tool-calls';
import { buildSystemPrompt } from '../ai/prompts';
import type { BmToolCall } from '../ai/schemas';

export async function handleReviseCommand(
  cmd: HandleBmCommandProps,
): Promise<string> {
  const { db, rest, identity, prefix, runAgent } = cmd;
  const alias = identity.alias;

  const draftIdRaw = rest[0]?.trim();
  const draftId = draftIdRaw ? parseInt(draftIdRaw, 10) : NaN;
  const draftIdInvalid = !draftIdRaw || Number.isNaN(draftId);

  if (draftIdInvalid) {
    return `Usage: ${prefix}${alias} revise <draft_id> <corrections>`;
  }

  const corrections = rest.slice(1).join(' ').trim();

  if (!corrections) {
    return `Usage: ${prefix}${alias} revise <draft_id> <corrections>`;
  }

  if (!runAgent) {
    return `${prefix}${alias} revise requires an agent backend. Set backend and try again.`;
  }

  const entry = getDraft(db, draftId);

  if (!entry) {
    return `Draft not found: #${draftId}`;
  }

  if (entry.kind !== 'create') {
    return `Revise only applies to create drafts. Use ${prefix}${alias} decline ${draftId} and try again.`;
  }

  const context = buildBmPluginContextText({ db });
  const prompt = `${entry.originalPrompt}\n\nCorrection: ${corrections}`;

  const raw = getOutputString(
    await runAgent(buildSystemPrompt(prompt, context)),
  ).trim();

  if (!raw || raw === '(no output)') {
    return 'Model returned no output. Try again or rephrase.';
  }

  const fulfilled = parseBmToolCalls(raw).filter(
    (r): r is { status: 'fulfilled'; value: BmToolCall } =>
      r.status === 'fulfilled',
  );

  if (fulfilled.length !== 1) {
    return 'Revise must return exactly one valid bookmark operation.';
  }

  const call = fulfilled[0].value;

  if (call.type !== 'create') {
    return 'Revise must return a create bookmark draft.';
  }

  updateDraftEntry(db, draftId, {
    sessionId: entry.sessionId,
    kind: 'create',
    input: normalizeCreateBmInput(call.input),
    originalPrompt: `${call.original_prompt} (revised: ${corrections})`,
  });

  return `Draft #${draftId} revised in place.`;
}

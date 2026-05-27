// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/prompts.ts — system prompt for !bm ai
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { BmToolCallSchema } from './schemas';

export function buildSystemPrompt(userPrompt: string, context: string): string {
  const schema = z.toJSONSchema(BmToolCallSchema);

  const createRules = [
    'For type "create": you MUST fetch the URL first when it is fetchable (https/http raw files, READMEs, etc.)—use your web or fetch capability before emitting the tool call.',
    'Fill title, description, category, and tags from the fetched body: real heading or first meaningful line for title; slash categories and comma-separated tags aligned with context below.',
    'Include input.summary ONLY when the user clearly asked for a page summary (e.g. summarize, tl;dr, overview). Otherwise omit summary entirely—do not fill it by default.',
    'Only skip fetching if the URL scheme cannot be retrieved (e.g. nostr:, intent-only links); then infer conservatively from the URL text and user message.',
    'Every `create` call MUST include `input.category` (non-empty path/label), `input.tags` (comma-separated, at least one tag), `input.media_type` (non-empty string), and `input.in_queue` (boolean) explicitly.',
    'Set in_queue true when the user wants backlog / save for later; false for reference-only.',
    'Set input.media_type to a single lowercase label (e.g. read, watch, listen) inferred from URL and intent; prefer existing media types from context when they fit.',
    'Infer category and tags from the page and user message; prefer existing categories and tags from the context snapshot.',
    'For type "list": when suggesting unconsumed reads/watch, use consumed: false plus category/tags/media_type as needed. You may omit in_queue or set it true—the server tries queued items first, then the same filters without requiring queue if nothing matched. Use in_queue: false only when the user wants items not in the queue.',
    'For type "published_search": use it when the user wants bookmarks from Nostr relays instead of the local database. Tags are the main relay-side narrowing signal; title/category/media are soft client-side hints.',
    'Published bookmark data is often sparse. Do not rely on the custom media_type tag (`m`) as a required server-side filter; many good bookmarks omit it even when they are clearly something to read/watch/listen.',
    'If a published search returns only a small result set, trust the returned candidates instead of over-filtering them client-side.',
    'For type "published_search_page": use the returned session_id to move to next/previous pages or a specific page.',
    'For type "create_from_published_search": use the returned session_id and result_id to create a local create draft from a published search result. Include input_overrides when you want to improve title/category/tags/media_type before drafting.',
    'Imported published bookmarks preserve source metadata like nostr_naddr when possible; prefer create_from_published_search over manual re-creation so this source link is kept.',
    'Prefer "published_search" for discovery, recommendation, browsing, search, or find requests like "find me something to read/watch/listen", "search bookmarks", or "recommend something", unless the user clearly says local/my/saved bookmarks or asks about queue/consumed status.',
    'Use "list" only for local inventory requests like "show my bookmarks", "what is in my queue", "what have I saved", or when the user needs local ids.',
    'For change requests, list/context/published_search calls are only intermediate discovery. The final answer must include draft-producing calls: create, update, delete, or create_from_published_search.',
    'When the user asks to add a URL while moving related existing bookmarks into a category, emit both an update call for the existing bookmark id and a create call for the new URL using the same chosen category.',
    'For discovery or retrieval requests, emit a single best retrieval call first (usually one "published_search" or one "list"), not multiple alternative retrieval calls in one response.',
    'When you recommend published bookmarks to the user, include the URL for every recommended item, not just the title.',
  ].join('\n');

  return `You are helping the user manage bookmarks. Current state:\n${context}\n\nUser request: "${userPrompt}"\n\n${createRules}\n\nOutput one or more JSON objects matching this schema (one per line for multiple). No markdown.\n\n${JSON.stringify(schema, null, 2)}`;
}

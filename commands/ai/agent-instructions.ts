// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/agent-instructions.ts — SKILL.md / codegen prose
// ---------------------------------------------------------------------------

export function agentInstructions(alias: string, prefix: string): string {
  return `## Bookmark (${alias} tools)

Use the CLI tools for list/show/create/update/delete bookmark flows.
Run \`bun src/cli.ts bm context\` (tool \`context\`) to print the same tag/category snapshot (with counts) as \`${prefix}${alias} ai\`; use \`bm list\` when you need local bookmark ids or titles.
For published bookmark discovery, use \`published_search\`, then \`published_search_page\` as needed, then \`create_from_published_search\` to create a local draft from a chosen result.
Use \`published_search\` when the user wants recommendations, bookmarks from relays, discovery beyond the local DB, or uses words like search/find/discover/recommend. The call returns a search session; keep its \`session_id\` and page through results with \`published_search_page\` instead of re-running the search.
Published bookmark data is often sparse. Tags are the strongest relay-side signal. Do not rely on the custom \`m\` media_type tag as a required server-side filter; many good bookmarks omit it.
If a published search returns only a small result set, trust those candidates instead of over-filtering them client-side.
For requests like "find me something to read/watch/listen", "find me an app", or general discovery, prefer \`published_search\` unless the user clearly says local/my/saved bookmarks or asks for queue/consumed/local-id information.
Use \`list\` only for the local collection.
For a retrieval request, emit one best retrieval call first rather than multiple competing \`list\` or \`published_search\` calls.
When you recommend published bookmarks to the user, include the URL for every recommended item.
When you find a good published result, prefer \`create_from_published_search\` so the bookmark is turned into a local draft the user can accept, revise, or decline. Use \`input_overrides\` to improve weak metadata like title, category, tags, or media_type before drafting.
If the user wants you to keep browsing, continue using the same \`session_id\` and move through pages rather than starting over.
For \`list\`, pass explicit filter fields when the user narrows results: \`tags_all\` (every tag required, AND), \`category\` (exact path, subtree prefix, or segment anywhere in the path e.g. \`nostr\` matches \`tech/nostr/nips\`), \`title_contains\`, \`url_contains\`, \`in_queue\`, \`consumed\`, \`media_type\`. Combine filters when appropriate. For unconsumed suggestions (\`consumed: false\`), the server lists queued matches first and only then the same filters without requiring queue—unless \`in_queue: false\` (non-queue only).
For mutating calls (create/update/delete), include \`original_prompt\` at the top level with the user request verbatim.
For \`update\`: when the user asks to change a field on an existing bookmark (title, category, tags, media_type, url, summary, description, in_queue), emit an \`update\` call with only the changed fields. Always call \`list\` first if you do not already have the bookmark id. Do not emit \`create\` for edits on existing bookmarks.
For \`create\`: fetch http/https when possible; fill \`input.title\`, \`description\`, \`category\`, \`tags\` from content (category and tags are required on every create). Set \`input.summary\` only if the user explicitly asked for a summary; otherwise omit it. Always include explicit \`input.media_type\` and \`input.in_queue\` (see system prompt).
For a live summary on an existing row, the user runs chat \`${prefix}${alias} summarize <id>\` (agent backend required)—not a CLI tool schema branch.

After a mutating call returns a draft:
- \`${prefix}${alias} accept <draft_id>\`
- \`${prefix}${alias} revise <draft_id> <corrections>\`
- \`${prefix}${alias} decline <draft_id>\`
`;
}

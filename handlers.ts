// ---------------------------------------------------------------------------
// plugins/bm/handlers.ts — re-exports (handlers live under commands/<name>/handler.ts)
// ---------------------------------------------------------------------------

export type { HandleBmCommandProps, HandleBmProps } from './command-context';

export { handleAcceptCommand } from './commands/accept/handler';
export { handleAddCommand } from './commands/add/handler';
export { handleAiCommand } from './commands/ai/handler';
export { handleCatsCommand } from './commands/cats/handler';
export { handleContextCommand } from './commands/context/handler';
export { handleDeclineCommand } from './commands/decline/handler';
export { handleDeleteCommand } from './commands/delete/handler';
export { handleDoneCommand } from './commands/done/handler';
export { handleDraftsCommand } from './commands/drafts/handler';
export { handleHelpCommand } from './commands/help/handler';
export { handleListCommand } from './commands/list/handler';
export { handleNextCommand } from './commands/next/handler';
export { handlePublishCommand } from './commands/publish/handler';
export { handleQueueCommand } from './commands/queue/handler';
export { handleReviseCommand } from './commands/revise/handler';
export { handleSearchCommand } from './commands/search/handler';
export { handleShowCommand } from './commands/show/handler';
export { handleSummarizeCommand } from './commands/summarize/handler';
export { handleTagsCommand } from './commands/tags/handler';
export { handleTypesCommand } from './commands/types/handler';
export { handleUpdateCommand } from './commands/update/handler';

import type { BmCommandAdapter } from '../../adapter';

import { handleTagsCommand } from './handler';

export const adaptTagsCommand: BmCommandAdapter = (params) =>
  handleTagsCommand(params);

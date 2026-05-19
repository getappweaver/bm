import type { BmStoredSearchSession } from './search-session';

export type SearchCommandResult =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'session';
      text: string;
      session: BmStoredSearchSession;
    };

import type {
  StoryChatState,
  StoryDefinition,
} from '@src/system/story-definition';
import { draftReviewPrompt } from '@src/web/widgets';

import { renderListWeb } from './commands/list/renderers/web';
import { createListRepresentation } from './commands/list/representation/builder';
import type { Bm } from './types';

type BmStoryState = {
  chat: StoryChatState;
  items: Bm[];
};

const emptyItems = [] satisfies Bm[];

const savedBookmark = {
  id: 401,
  url: 'https://nostr.com/',
  title: 'Nostr',
  summary:
    'A simple, open protocol for censorship-resistant social networking and interoperable apps.',
  description:
    'Saved from the AppWeaver demo as a queued resource for learning the Nostr app ecosystem.',
  category: 'tech/nostr',
  tags: 'appweaver, nostr, protocol',
  media_type: 'read',
  in_queue: true,
  consumed_at: null,
  created_at: 1714006000,
  nostr_naddr: null,
  published_at: null,
} satisfies Bm;

const aiPromptText =
  'Save https://nostr.com/ as a queued reading bookmark, summarize it, and tag it for nostr and appweaver.';

const aiDraftReviewText = `AI drafted this bookmark:

URL:  https://nostr.com/
Title: Nostr
Summary: A simple, open protocol for censorship-resistant social networking and interoperable apps.
Description: Saved from the AppWeaver demo as a queued resource for learning the Nostr app ecosystem.
Category: tech/nostr
Tags: appweaver, nostr, protocol
Media type: read
In queue: yes

Draft ID: demo-bm-draft-1
a=accept, r=revise, d=decline, s=skip, q=quit`;

function buildBmListStoryCommandOutput(params: {
  alias: string;
  items: Bm[];
}): NonNullable<StoryDefinition<BmStoryState>['commandOutput']> {
  const representation = createListRepresentation({
    command: params.alias,
    subcommand: 'list',
    groupBy: 'cats',
    listInvocation: {
      arguments: {},
      options: { by: 'cats' },
    },
    items: params.items,
  });

  return {
    text: null,
    web: renderListWeb(representation),
    clientView: null,
  };
}

function buildSaveBookmarkStory(params: {
  prefix: string;
  alias: string;
}): StoryDefinition<BmStoryState> {
  const story: StoryDefinition<BmStoryState> = {
    id: 'bm-save-ai',
    title: 'Save a bookmark with AI',
    description:
      'Use the Bookmarks widget AI prompt to save, summarize, categorize, and queue a resource.',
    showcase: {
      title: 'Knowledge capture becomes structured data',
      description:
        'Paste a URL, let the plugin draft metadata, then accept the bookmark only after review.',
      timing: {
        initialDelayMs: 900,
        stepDelayMs: 2100,
        storyDelayMs: 2800,
      },
    },
    kind: 'ai',
    initialState: {
      chat: { messages: [] },
      items: emptyItems,
    },
    sandbox: {
      bm: {
        items: emptyItems,
      },
      __outputs: {
        [`${params.alias}:list`]: [
          buildBmListStoryCommandOutput({
            alias: params.alias,
            items: emptyItems,
          }).web,
          buildBmListStoryCommandOutput({
            alias: params.alias,
            items: [savedBookmark],
          }).web,
        ],
      },
      __prompts: {
        [`${params.alias}:ai`]: {
          type: 'web-prompt',
          value: draftReviewPrompt({
            command: params.alias,
            subcommand: 'ai',
            body: aiDraftReviewText,
          }),
        },
      },
      __transitions: [
        {
          on: { command: params.alias, subcommand: 'ai' },
          answer: 'a',
          advanceOutput: { command: params.alias, subcommand: 'list' },
        },
      ],
    },
    steps: [
      {
        type: 'seed_sandbox',
        state: {
          bm: {
            items: emptyItems,
          },
        },
      },
      {
        type: 'instruction',
        text: 'Open the Bookmarks widget from the header to save a resource.',
        showcase: {
          title: 'Installed apps can capture useful context',
          description:
            'Bookmarks are stored as structured records with category, tags, media type, queue state, and summaries.',
        },
      },
      {
        type: 'focus_target',
        target: {
          type: 'header_widget',
          command: params.alias,
          subcommand: 'list',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'widget_opened',
          command: params.alias,
          subcommand: 'list',
        },
      },
      {
        type: 'instruction',
        text: 'Click Fill to enter the URL and save instructions.',
      },
      {
        type: 'fill_form',
        targetId: 'bm-ai-prompt-text',
        showcase: {
          title: 'One prompt becomes complete bookmark metadata',
          description:
            'The bookmark plugin fills the title, summary, category, tags, media type, and queue state together.',
        },
        values: {
          arguments: { prompt: aiPromptText },
          options: {},
        },
      },
      {
        type: 'instruction',
        text: 'Click Run AI to draft the bookmark.',
        showcase: {
          title: 'Draft first, write later',
          description:
            'AI-created bookmarks are proposed for review before they change the collection.',
          delayMs: 1500,
        },
      },
      {
        type: 'focus_target',
        target: {
          type: 'web_node',
          targetId: 'bm-ai-prompt-submit',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'target_clicked',
          targetId: 'bm-ai-prompt-submit',
        },
      },
      {
        type: 'instruction',
        text: 'Click Accept on the draft review to save the bookmark.',
        showcase: {
          title: 'Humans stay in control of the knowledge base',
          description:
            'Accept, revise, or decline the draft before it becomes app data.',
        },
      },
      {
        type: 'focus_target',
        target: {
          type: 'web_node',
          targetId: 'draft-review-accept',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'target_clicked',
          targetId: 'draft-review-accept',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'command_completed',
          command: params.alias,
          subcommand: 'ai',
        },
      },
      {
        type: 'wait_for_action',
        match: {
          type: 'command_completed',
          command: params.alias,
          subcommand: 'list',
        },
      },
      {
        type: 'complete',
        cleanup: {
          closeWidgets: [
            {
              command: params.alias,
              subcommand: 'list',
            },
          ],
        },
      },
    ],
  };

  story.commandOutput = buildBmListStoryCommandOutput({
    alias: params.alias,
    items: [savedBookmark],
  });

  return story;
}

export function bmStories(
  prefix: string,
  alias: string,
): StoryDefinition<unknown>[] {
  return [buildSaveBookmarkStory({ prefix, alias })];
}

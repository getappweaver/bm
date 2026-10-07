import type { PluginLandingDefinition } from '../../apps/landing/content-types';

export const landingPage: PluginLandingDefinition = {
  route: '/apps/bookmark-manager',
  name: 'Bookmark Manager',
  shortName: 'Bookmark',
  description: 'Save, search, categorize, and publish bookmark collections.',
  features: [
    'Your local bookmarks, accessible from anywhere you use AppWeaver.',
    'Ask AI to inspect a link or search for something, then draft a bookmark with a useful description, tags, and category.',
    'Publish selected bookmark sets only when you deliberately choose to share.',
  ],
  hasInteractiveDemo: true,
  installScreenshot: 'landing/assets/bookmark-manager.png',
  assetAliases: [
    {
      source: 'landing/assets/overview.png',
      publicPath: '/screenshots/bookmark-manager.png',
    },
  ],
  demoStories: [
    {
      id: 'bookmark-add-new-ai',
      label: 'AI-assisted bookmark capture',
      variants: [
        {
          view: 'desktop',
          src: 'landing/assets/bookmark-add-new-ai.gif',
          alt: 'Bookmark Manager creating a new bookmark with AI help',
          durationMs: 29260,
        },
        {
          view: 'mobile',
          src: 'landing/assets/bookmark-add-new-ai-mobile.gif',
          alt: 'Bookmark Manager creating a new bookmark with AI help',
          durationMs: 42760,
        },
      ],
    },
  ],
  presentation: null,
  roadmapRepoId: 'bm',
};

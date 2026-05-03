import type { Database } from 'bun:sqlite';
import type { EventTemplate, NostrEvent, VerifiedEvent } from 'nostr-tools';
import { nip19 } from 'nostr-tools';

import type { PluginContext, SendReplyFn } from '@src/core/plugin';
import { fetchNip65WriteRelays } from '@src/nostr/nip65';
import {
  publishSignedEventToRelays,
  summarizeRelayOutcomes,
} from '@src/nostr/relay-publish';
import { normalizePubkeyInput } from '@src/nostr/wot';

import { getBm, setBmPublishedNaddr } from './db';
import { formatBmDetail } from './format';

const BM_BOOKMARK_KIND = 39701;

function getBookmarkIdentifier(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

function buildBmEventTemplate(
  bookmark: ReturnType<typeof getBm> extends infer T ? Exclude<T, null> : never,
): EventTemplate {
  const publishedAtSeconds = Math.floor(Date.now() / 1000);

  const topicTags = bookmark.tags
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allTags = [...new Set([...topicTags, bookmark.media_type.trim()])];

  const tags: string[][] = [
    ['d', getBookmarkIdentifier(bookmark.url)],
    ['published_at', String(publishedAtSeconds)],
    ['title', bookmark.title],
    ['m', bookmark.media_type],
    ['category', bookmark.category],
  ];

  for (const tag of allTags) {
    tags.push(['t', tag]);
  }

  return {
    kind: BM_BOOKMARK_KIND,
    created_at: publishedAtSeconds,
    tags,
    content: bookmark.description ?? bookmark.summary ?? '',
  };
}

export type PublishBmProps = {
  db: Database;
  id: number;
  sendReply: SendReplyFn;
  signWithBunker: (
    eventTemplate: EventTemplate,
    bunkerName?: string,
  ) => Promise<NostrEvent>;
  pool: PluginContext['pool'];
};

export async function publishBm({
  db,
  id,
  sendReply,
  signWithBunker,
  pool,
}: PublishBmProps): Promise<string> {
  const bookmark = getBm(db, id);

  if (!bookmark) {
    return `Not found: #${id}`;
  }

  await sendReply(`Selected bookmark:\n\n${formatBmDetail(bookmark)}`);

  const eventTemplate = buildBmEventTemplate(bookmark);
  const signedEvent = await signWithBunker(eventTemplate);

  const writeRelays = await fetchNip65WriteRelays({
    pool,
    authorPubkey: normalizePubkeyInput(signedEvent.pubkey),
  });

  const outcomes = await publishSignedEventToRelays(
    writeRelays,
    signedEvent as VerifiedEvent,
  );

  const { accepted, rejected } = summarizeRelayOutcomes(outcomes);

  if (accepted.length === 0) {
    const rejectedSummary = rejected
      .map((item) => `${item.relay}: ${item.error}`)
      .join('\n');

    return `Publish failed for #${id}.\n${rejectedSummary}`;
  }

  const naddr = nip19.naddrEncode({
    identifier: getBookmarkIdentifier(bookmark.url),
    pubkey: signedEvent.pubkey,
    kind: BM_BOOKMARK_KIND,
    relays: accepted.map((item) => item.relay),
  });

  const updated = setBmPublishedNaddr({
    db,
    id,
    nostrNaddr: naddr,
    publishedAt: signedEvent.created_at * 1000,
  });

  const lines = [
    `Published #${id}.`,
    `naddr: ${naddr}`,
    `Accepted relays: ${accepted.map((item) => item.relay).join(', ')}`,
  ];

  if (rejected.length > 0) {
    lines.push(
      '',
      'Rejected relays:',
      ...rejected.map((item) => `- ${item.relay}: ${item.error}`),
    );
  }

  if (updated) {
    lines.push('', formatBmDetail(updated));
  }

  return lines.join('\n');
}

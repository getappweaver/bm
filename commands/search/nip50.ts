import type { SimplePool } from 'nostr-tools/pool';

import { ensureWss } from '@src/env';
import { debug } from '@src/logger';

const NIP11_CACHE_TTL_MS = 60 * 60 * 1000;

type Nip11CacheEntry = {
  checkedAt: number;
  supportsNip50: boolean;
};

export type BmNip50RelaySupport = {
  readRelays: string[];
  supportedRelays: string[];
};

const nip11SupportCache = new Map<string, Nip11CacheEntry>();

function relayInfoUrl(relay: string): string | null {
  try {
    const url = new URL(ensureWss(relay));
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';

    return url.toString();
  } catch {
    return null;
  }
}

async function fetchRelaySupportsNip50(relay: string): Promise<boolean> {
  const normalizedRelay = ensureWss(relay);
  const cached = nip11SupportCache.get(normalizedRelay);
  const now = Date.now();

  if (cached && now - cached.checkedAt < NIP11_CACHE_TTL_MS) {
    debug('bm NIP-11 cache hit', {
      relay: normalizedRelay,
      supportsNip50: cached.supportsNip50,
    });

    return cached.supportsNip50;
  }

  const infoUrl = relayInfoUrl(normalizedRelay);

  if (!infoUrl) {
    debug('bm NIP-11 invalid relay URL', { relay: normalizedRelay });

    nip11SupportCache.set(normalizedRelay, {
      checkedAt: now,
      supportsNip50: false,
    });

    return false;
  }

  try {
    debug('bm NIP-11 GET', { relay: normalizedRelay, url: infoUrl });

    const response = await fetch(infoUrl, {
      headers: { Accept: 'application/nostr+json' },
      signal: AbortSignal.timeout(3_000),
    });

    const responseText = await response.text();

    debug('bm NIP-11 response', {
      relay: normalizedRelay,
      url: infoUrl,
      status: response.status,
      ok: response.ok,
      body: responseText.slice(0, 2_000),
    });

    if (!response.ok) {
      throw new Error(`NIP-11 failed: ${response.status}`);
    }

    const json = JSON.parse(responseText) as { supported_nips?: unknown };

    const supportsNip50 =
      Array.isArray(json.supported_nips) && json.supported_nips.includes(50);

    nip11SupportCache.set(normalizedRelay, {
      checkedAt: now,
      supportsNip50,
    });

    debug('bm NIP-11 support result', {
      relay: normalizedRelay,
      supportsNip50,
    });

    return supportsNip50;
  } catch (err) {
    debug('bm NIP-11 error', {
      relay: normalizedRelay,
      url: infoUrl,
      error: err instanceof Error ? err.message : String(err),
    });

    nip11SupportCache.set(normalizedRelay, {
      checkedAt: now,
      supportsNip50: false,
    });

    return false;
  }
}

export async function getBmNip50RelaySupport(props: {
  pool: SimplePool;
  masterPubkey: string;
  relays: string[];
}): Promise<BmNip50RelaySupport> {
  const readRelays = props.relays;

  debug('bm search relays for NIP-50', {
    masterPubkey: props.masterPubkey,
    source: props.relays.length > 0 ? 'client-provided' : 'none',
    relayCount: readRelays.length,
    relays: readRelays,
  });

  if (readRelays.length === 0) {
    debug('bm NIP-50 skipped: no client-provided search relays', {
      masterPubkey: props.masterPubkey,
    });

    return {
      readRelays,
      supportedRelays: [],
    };
  }

  const checks = await Promise.all(
    readRelays.map(async (relay) => ({
      relay,
      supportsNip50: await fetchRelaySupportsNip50(relay),
    })),
  );

  const supportedRelays = checks
    .filter((check) => check.supportsNip50)
    .map((check) => check.relay);

  debug('bm NIP-50 supported relays', {
    relayCount: supportedRelays.length,
    relays: supportedRelays,
  });

  return {
    readRelays,
    supportedRelays,
  };
}

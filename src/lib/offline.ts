// Offline layer for the Supabase REST API, plugged in as the client's `fetch`.
// - GET responses are cached per user and served from the cache when the network is unreachable.
// - Writes made while offline are queued, applied optimistically to the cached reads, and replayed in order later.
// Auth, RPC and any non-REST calls pass straight through.

export interface OfflineStorage {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<unknown>;
  removeItem(k: string): Promise<unknown>;
  getAllKeys(): Promise<readonly string[]>;
}

export interface OfflineDeps {
  storage: OfflineStorage;
  baseFetch: typeof fetch;
  // User id from the locally stored session, used when the access token is missing or expired (offline).
  storedUser: () => Promise<string | null>;
}

interface Queued {
  qid: string;
  user: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

type Row = Record<string, any>;

const QUEUE_KEY = 'oq:queue';
const CACHE = 'oc:';
const PK: Record<string, string[]> = {
  prayer_logs: ['rule_id', 'day'],
  checkins: ['user_id', 'day'],
  fast_overrides: ['user_id', 'day'],
  fast_rules: ['user_id', 'kind', 'key'],
};
const HAS_CREATED_AT = new Set(['journal_entries', 'cycle_entries', 'prayer_rules']);
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

const pkOf = (table: string) => PK[table] ?? ['id'];

export function jwtSub(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).sub ?? null;
  } catch {
    return null;
  }
}

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// Only simple `col=eq.value` filters are understood; anything else returns null (leave the cache untouched).
function matcher(params: URLSearchParams): ((r: Row) => boolean) | null {
  const conds: [string, string][] = [];
  for (const [k, v] of params) {
    if (RESERVED.has(k)) continue;
    if (!v.startsWith('eq.')) return null;
    conds.push([k, v.slice(3)]);
  }
  return (r) => conds.every(([k, v]) => String(r[k]) === v);
}

function sortRows(rows: Row[], order: string | null): Row[] {
  if (!order) return rows;
  const keys = order.split(',').map((p) => {
    const [col, dir] = p.split('.');
    return { col, sign: dir === 'desc' ? -1 : 1 };
  });
  return rows.slice().sort((a, b) => {
    for (const { col, sign } of keys) {
      const x = a[col] ?? '';
      const y = b[col] ?? '';
      if (x < y) return -sign;
      if (x > y) return sign;
    }
    return 0;
  });
}

export function applyMutation(
  rows: Row[],
  table: string,
  method: string,
  mutParams: URLSearchParams,
  body: any,
  cacheParams: URLSearchParams,
): Row[] {
  if (method === 'POST') {
    const incoming: Row[] = Array.isArray(body) ? body : [body];
    const keep = matcher(cacheParams);
    const pk = pkOf(table);
    const out = rows.slice();
    for (const raw of incoming) {
      const row: Row = HAS_CREATED_AT.has(table) ? { created_at: new Date().toISOString(), ...raw } : { ...raw };
      if (keep && !keep(row)) continue;
      const i = out.findIndex((r) => pk.every((k) => r[k] === row[k]));
      if (i >= 0) out[i] = { ...out[i], ...row };
      else out.push(row);
    }
    return sortRows(out, cacheParams.get('order'));
  }
  const m = matcher(mutParams);
  if (!m) return rows;
  if (method === 'DELETE') return rows.filter((r) => !m(r));
  if (method === 'PATCH' || method === 'PUT') return rows.map((r) => (m(r) ? { ...r, ...body } : r));
  return rows;
}

export function createOffline({ storage, baseFetch, storedUser }: OfflineDeps) {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  // Serialises every read-modify-write of the queue.
  let chain: Promise<unknown> = Promise.resolve();
  const withQueue = <T>(fn: (q: Queued[]) => { q?: Queued[]; out: T }): Promise<T> => {
    const run = chain.then(async () => {
      const raw = await storage.getItem(QUEUE_KEY);
      const q: Queued[] = raw ? JSON.parse(raw) : [];
      const { q: next, out } = fn(q);
      if (next) await storage.setItem(QUEUE_KEY, JSON.stringify(next));
      return out;
    });
    chain = run.catch(() => undefined);
    return run;
  };

  const pending = () => withQueue((q) => ({ out: q.length }));
  const pendingFor = (user: string) => withQueue((q) => ({ out: q.filter((i) => i.user === user).length }));
  const enqueue = (item: Queued) => withQueue((q) => ({ q: [...q, item], out: undefined }));
  const dequeue = (qid: string) => withQueue((q) => ({ q: q.filter((i) => i.qid !== qid), out: undefined }));
  const firstFor = (user: string) => withQueue((q) => ({ out: q.find((i) => i.user === user) ?? null }));

  let flushing: Promise<void> | null = null;

  // Replays queued writes for the signed-in user in order. Stops at the first network failure.
  function flush(token: string | null): Promise<void> {
    const user = jwtSub(token);
    if (!token || !user) return Promise.resolve();
    if (flushing) return flushing;
    flushing = (async () => {
      try {
        for (;;) {
          const item = await firstFor(user);
          if (!item) break;
          let res: Response;
          try {
            res = await baseFetch(item.url, {
              method: item.method,
              headers: { ...item.headers, authorization: `Bearer ${token}` },
              body: item.body,
            });
          } catch {
            break;
          }
          const permanent = res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status);
          if (res.ok || permanent) await dequeue(item.qid);
          else break;
        }
      } finally {
        flushing = null;
        notify();
      }
    })();
    return flushing;
  }

  async function patchCaches(user: string, table: string, method: string, url: URL, body: any) {
    const keys = await storage.getAllKeys();
    const tableRe = new RegExp(`/rest/v1/${table}(\\?|$)`);
    for (const key of keys) {
      if (!key.startsWith(`${CACHE}${user}:`) || !tableRe.test(key)) continue;
      const raw = await storage.getItem(key);
      if (raw === null) continue;
      let cached: any;
      try { cached = JSON.parse(raw); } catch { continue; }
      const isArray = Array.isArray(cached);
      const rows: Row[] = isArray ? cached : cached ? [cached] : [];
      const cacheUrl = new URL(key.slice(key.indexOf('http')));
      const next = applyMutation(rows, table, method, url.searchParams, body, cacheUrl.searchParams);
      await storage.setItem(key, JSON.stringify(isArray ? next : next[0] ?? cached));
    }
  }

  async function offlineFetch(input: any, init?: RequestInit): Promise<Response> {
    if (typeof input !== 'string' && !(input instanceof URL)) return baseFetch(input, init);
    const url = String(input);
    const u = new URL(url);
    const m = /^\/rest\/v1\/([^/]+)$/.exec(u.pathname);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (!m) return baseFetch(input, init);
    const table = m[1];

    const headers = new Headers(init?.headers);
    const bearer = (headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const token = jwtSub(bearer) ? bearer : null;
    const user = jwtSub(bearer) ?? (await storedUser());
    if (!user) return baseFetch(input, init);
    const kind = (headers.get('accept') ?? '').includes('pgrst.object') ? 'o' : 'a';

    if (method === 'GET') {
      if (token) await flush(token);
      const key = `${CACHE}${user}:${kind}:${url}`;
      try {
        const res = await baseFetch(input, init);
        if (res.ok) {
          const text = await res.clone().text();
          await Promise.resolve(storage.setItem(key, text)).catch(() => undefined);
        }
        return res;
      } catch (e) {
        const hit = await storage.getItem(key);
        if (hit !== null) return new Response(hit, { status: 200, headers: { 'Content-Type': 'application/json' } });
        throw e;
      }
    }

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return baseFetch(input, init);

    let bodyText = typeof init?.body === 'string' ? init.body : null;
    let parsed: any = null;
    if (bodyText) {
      try {
        parsed = JSON.parse(bodyText);
        if (method === 'POST' && pkOf(table).join() === 'id') {
          const add = (r: Row) => (r && typeof r === 'object' && !r.id ? { ...r, id: uuid() } : r);
          parsed = Array.isArray(parsed) ? parsed.map(add) : add(parsed);
          bodyText = JSON.stringify(parsed);
        }
      } catch {
        parsed = null;
      }
    }
    const prefer = headers.get('prefer') ?? '';

    if (token) await flush(token);
    if (token && (await pendingFor(user)) === 0) {
      try {
        const res = await baseFetch(input, { ...init, body: bodyText });
        if (res.ok) await patchCaches(user, table, method, u, parsed);
        return res;
      } catch {
        // unreachable: fall through and queue
      }
    }

    const stored: Record<string, string> = {};
    headers.forEach((v, k) => { if (k !== 'authorization') stored[k] = v; });
    await enqueue({ qid: uuid(), user, method, url, headers: stored, body: bodyText });
    await patchCaches(user, table, method, u, parsed);
    notify();

    if (method === 'POST' && /return=representation/.test(prefer)) {
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return new Response(JSON.stringify(kind === 'o' ? rows[0] : rows), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(null, { status: method === 'POST' ? 201 : 204 });
  }

  return {
    fetch: offlineFetch as typeof fetch,
    flush,
    pending,
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

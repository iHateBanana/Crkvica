import { beforeEach, describe, expect, it } from 'vitest';
import { createOffline, jwtSub } from '../src/lib/offline';

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (sub: string) => `${b64({ alg: 'HS256' })}.${b64({ sub, role: 'authenticated' })}.sig`;
const BASE = 'https://x.supabase.co/rest/v1';

function setup() {
  const mem = new Map<string, string>();
  const storage = {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => { mem.set(k, v); },
    removeItem: async (k: string) => { mem.delete(k); },
    getAllKeys: async () => [...mem.keys()],
  };
  const env = { online: true, status: 200, calls: [] as { url: string; method: string; auth: string | null; body: any }[], server: [] as any[] };
  const baseFetch = (async (url: any, init?: RequestInit) => {
    if (!env.online) throw new TypeError('Failed to fetch');
    const method = (init?.method ?? 'GET').toUpperCase();
    env.calls.push({ url: String(url), method, auth: new Headers(init?.headers).get('authorization'), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (env.status !== 200) return new Response('{}', { status: env.status });
    if (method === 'GET') return new Response(JSON.stringify(env.server), { status: 200 });
    return new Response(null, { status: 201 });
  }) as typeof fetch;
  const off = createOffline({ storage, baseFetch, storedUser: async () => 'u1' });
  const hdr = (token: string, extra: Record<string, string> = {}) => ({ authorization: `Bearer ${token}`, apikey: 'k', ...extra });
  return { mem, env, off, hdr };
}

describe('jwtSub', () => {
  it('reads sub, ignores junk', () => {
    expect(jwtSub(jwt('abc'))).toBe('abc');
    expect(jwtSub('nope')).toBeNull();
    expect(jwtSub(null)).toBeNull();
  });
});

describe('offline reads', () => {
  let t: ReturnType<typeof setup>;
  const url = `${BASE}/journal_entries?select=*&order=day.desc&order=created_at.desc`;
  beforeEach(() => { t = setup(); });

  it('caches online reads and serves them when offline', async () => {
    t.env.server = [{ id: 'a', day: '2026-10-27', body: 'x' }];
    await t.off.fetch(url, { headers: t.hdr(jwt('u1')) });
    t.env.online = false;
    const res = await t.off.fetch(url, { headers: t.hdr(jwt('u1')) });
    expect(await res.json()).toEqual(t.env.server);
  });

  it('does not serve one user\'s cache to another', async () => {
    t.env.server = [{ id: 'a' }];
    await t.off.fetch(url, { headers: t.hdr(jwt('u1')) });
    t.env.online = false;
    await expect(t.off.fetch(url, { headers: t.hdr(jwt('u2')) })).rejects.toThrow();
  });

  it('uses the stored user when the token is only the anon key', async () => {
    t.env.server = [{ id: 'a' }];
    await t.off.fetch(url, { headers: t.hdr(jwt('u1')) });
    t.env.online = false;
    const res = await t.off.fetch(url, { headers: t.hdr('anon.key.value') });
    expect(await res.json()).toEqual([{ id: 'a' }]);
  });

  it('passes non-REST and rpc calls through', async () => {
    await t.off.fetch('https://x.supabase.co/auth/v1/user', { headers: t.hdr(jwt('u1')) });
    await t.off.fetch(`${BASE}/rpc/delete_my_account`, { method: 'POST', headers: t.hdr(jwt('u1')) });
    expect(t.env.calls.map((c) => c.method)).toEqual(['GET', 'POST']);
    expect(await t.off.pending()).toBe(0);
  });
});

describe('offline writes', () => {
  let t: ReturnType<typeof setup>;
  const listUrl = `${BASE}/journal_entries?select=*&order=day.desc&order=created_at.desc`;
  beforeEach(async () => {
    t = setup();
    t.env.server = [{ id: 'old', day: '2026-10-20', body: 'old', created_at: '2026-10-20T10:00:00Z' }];
    await t.off.fetch(listUrl, { headers: t.hdr(jwt('u1')) });
    t.env.calls.length = 0;
    t.env.online = false;
  });

  const insert = (body: any) =>
    t.off.fetch(`${BASE}/journal_entries`, { method: 'POST', headers: t.hdr(jwt('u1'), { prefer: 'return=minimal' }), body: JSON.stringify(body) });

  it('queues an insert, shows it in the cached list newest first, and gives it an id', async () => {
    const res = await insert({ user_id: 'u1', day: '2026-10-28', body: 'new' });
    expect(res.status).toBe(201);
    expect(await t.off.pending()).toBe(1);
    const list = await (await t.off.fetch(listUrl, { headers: t.hdr(jwt('u1')) })).json();
    expect(list.map((r: any) => r.body)).toEqual(['new', 'old']);
    expect(list[0].id).toBeTruthy();
  });

  it('applies an offline delete to the cached list', async () => {
    const res = await t.off.fetch(`${BASE}/journal_entries?id=eq.old`, { method: 'DELETE', headers: t.hdr(jwt('u1')) });
    expect(res.status).toBe(204);
    const list = await (await t.off.fetch(listUrl, { headers: t.hdr(jwt('u1')) })).json();
    expect(list).toEqual([]);
  });

  it('replays queued writes in order with a fresh token, then empties the queue', async () => {
    await insert({ user_id: 'u1', day: '2026-10-28', body: 'one' });
    await t.off.fetch(`${BASE}/journal_entries?id=eq.old`, { method: 'DELETE', headers: t.hdr(jwt('u1')) });
    t.env.online = true;
    const fresh = jwt('u1') + 'x';
    await t.off.flush(fresh);
    expect(t.env.calls.map((c) => c.method)).toEqual(['POST', 'DELETE']);
    expect(t.env.calls.every((c) => c.auth === `Bearer ${fresh}`)).toBe(true);
    expect(t.env.calls[0].body.id).toBeTruthy();
    expect(await t.off.pending()).toBe(0);
  });

  it('keeps the queue while the network is down and when the server is erroring', async () => {
    await insert({ user_id: 'u1', day: '2026-10-28', body: 'one' });
    await t.off.flush(jwt('u1'));
    expect(await t.off.pending()).toBe(1);
    t.env.online = true;
    t.env.status = 503;
    await t.off.flush(jwt('u1'));
    expect(await t.off.pending()).toBe(1);
  });

  it('drops a write the server permanently rejects', async () => {
    await insert({ user_id: 'u1', day: '2026-10-28', body: 'one' });
    t.env.online = true;
    t.env.status = 409;
    await t.off.flush(jwt('u1'));
    expect(await t.off.pending()).toBe(0);
  });

  it('does not replay another user\'s writes', async () => {
    await insert({ user_id: 'u1', day: '2026-10-28', body: 'one' });
    t.env.online = true;
    await t.off.flush(jwt('u2'));
    expect(t.env.calls).toHaveLength(0);
    expect(await t.off.pending()).toBe(1);
  });

  it('writes made online go straight through, after pending ones are flushed first', async () => {
    await insert({ user_id: 'u1', day: '2026-10-28', body: 'queued' });
    t.env.online = true;
    await t.off.fetch(`${BASE}/journal_entries`, { method: 'POST', headers: t.hdr(jwt('u1')), body: JSON.stringify({ user_id: 'u1', day: '2026-10-29', body: 'live' }) });
    expect(t.env.calls.map((c) => c.body.body)).toEqual(['queued', 'live']);
    expect(await t.off.pending()).toBe(0);
  });
});

describe('composite-key tables', () => {
  it('toggles a prayer log offline without duplicating rows', async () => {
    const t = setup();
    const url = `${BASE}/prayer_logs?select=rule_id%2Cday`;
    t.env.server = [{ rule_id: 'r1', day: '2026-10-27' }];
    await t.off.fetch(url, { headers: t.hdr(jwt('u1')) });
    t.env.online = false;
    const h = t.hdr(jwt('u1'));
    await t.off.fetch(`${BASE}/prayer_logs`, { method: 'POST', headers: h, body: JSON.stringify({ rule_id: 'r1', user_id: 'u1', day: '2026-10-27' }) });
    await t.off.fetch(`${BASE}/prayer_logs`, { method: 'POST', headers: h, body: JSON.stringify({ rule_id: 'r1', user_id: 'u1', day: '2026-10-28' }) });
    await t.off.fetch(`${BASE}/prayer_logs?rule_id=eq.r1&day=eq.2026-10-27`, { method: 'DELETE', headers: h });
    const list = await (await t.off.fetch(url, { headers: h })).json();
    expect(list.map((r: any) => r.day)).toEqual(['2026-10-28']);
  });
});

import { isAllowedRpcUrl } from '@/lib/urlAllowlist';

export type JsonRpcResult<T = unknown> = {
  ok: boolean;
  ms: number;
  result?: T;
  error?: string;
};

export async function callJsonRpc<T = unknown>(
  rpcUrl: string,
  method: string,
  params?: unknown[] | Record<string, unknown>
): Promise<JsonRpcResult<T>> {
  if (!isAllowedRpcUrl(rpcUrl)) {
    return { ok: false, ms: 0, error: 'RPC URL not allowed' };
  }
  const t0 = performance.now();
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 20_000);
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        ...(params !== undefined ? { params } : {})
      }),
      signal: ac.signal,
      cache: 'no-store'
    });
    const ms = Math.round(performance.now() - t0);
    const data = (await res.json()) as { result?: T; error?: { message: string } };
    if (!res.ok) return { ok: false, ms, error: `HTTP ${res.status}` };
    if (data.error) return { ok: false, ms, error: data.error.message };
    return { ok: true, ms, result: data.result };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t0), error: e instanceof Error ? e.message : 'fetch failed' };
  } finally {
    clearTimeout(tid);
  }
}

export function hexToDec(hex: string | undefined): number | null {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.startsWith('0x') ? hex : `0x${hex}`;
  const n = parseInt(h, 16);
  return Number.isFinite(n) ? n : null;
}

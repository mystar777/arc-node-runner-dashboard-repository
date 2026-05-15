import { NextResponse } from 'next/server';
import { isAllowedRpcUrl } from '@/lib/urlAllowlist';

const ALLOWED_METHODS = new Set([
  'eth_blockNumber',
  'eth_chainId',
  'eth_syncing',
  'net_version',
  'web3_clientVersion',
  'eth_gasPrice',
  'eth_getBlockByNumber',
  'eth_getBalance',
  'eth_call',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt'
]);

type Body = {
  url: string;
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const method = typeof body.method === 'string' ? body.method.trim() : '';

  if (!url || !isAllowedRpcUrl(url)) {
    return NextResponse.json(
      { error: '허용되지 않은 RPC URL입니다. localhost/127.0.0.1 또는 *.arc.network 만 가능합니다.' },
      { status: 400 }
    );
  }
  if (!method || !ALLOWED_METHODS.has(method)) {
    return NextResponse.json(
      { error: `허용되지 않은 RPC 메서드입니다. 허용: ${[...ALLOWED_METHODS].join(', ')}` },
      { status: 400 }
    );
  }

  const rpcBody = {
    jsonrpc: '2.0' as const,
    id: Date.now(),
    method,
    ...(body.params !== undefined ? { params: body.params } : {})
  };

  const t0 = performance.now();
  let res: Response;
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 25_000);
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcBody),
      signal: ac.signal
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '네트워크 오류';
    return NextResponse.json({ ok: false, error: message, ms: Math.round(performance.now() - t0) }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
  const ms = Math.round(performance.now() - t0);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `HTTP ${res.status}`, ms, body: data },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, ms, data });
}

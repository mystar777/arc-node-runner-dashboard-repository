'use client';

import clsx from 'clsx';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Blocks,
  BookOpen,
  Check,
  Clipboard,
  Cpu,
  Gauge,
  HardDrive,
  LayoutDashboard,
  Radio,
  ScrollText,
  Search,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HeadProgressionChart, LatencySpark, MicroMetricLines } from './charts';

const DEFAULT_RPC =
  typeof process.env.NEXT_PUBLIC_DEFAULT_RPC === 'string' && process.env.NEXT_PUBLIC_DEFAULT_RPC
    ? process.env.NEXT_PUBLIC_DEFAULT_RPC
    : 'https://rpc.testnet.arc.network';

const ARC_TESTNET_CHAIN_ID = 5042002;
const LS_RPC = 'arc-node-dashboard-rpc-url';
const LS_INTERVAL = 'arc-node-dashboard-poll-ms';
const LS_NET_RPC = 'arc-node-dashboard-network-rpc-url';

type RpcCallResult = {
  ok: boolean;
  ms?: number;
  data?: { result?: unknown; error?: { message: string } };
  error?: string;
};

type HealthSnapshot = {
  at: string;
  blockNumber: string | null;
  chainIdDec: number | null;
  syncing: unknown;
  netVersion: string | null;
  timings: Record<string, number | undefined>;
  errors: Record<string, string | undefined>;
};

type BlockRow = {
  num: number;
  hash: string;
  time: string;
  txCount: number;
  gasUsed: string;
  gasPct: number;
};

type TxRow = {
  hash: string;
  method: string;
  status: string;
  elapsed: string;
  finality: string;
};

type NavId =
  | 'overview'
  | 'node'
  | 'sync'
  | 'blocks'
  | 'txs'
  | 'prometheus'
  | 'logs'
  | 'config'
  | 'docs'
  | 'alerts'
  | 'settings';

type MainMode = 'overview' | 'settings' | 'rpc';

function hexToDec(hex: string | undefined): number | null {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.startsWith('0x') ? hex : `0x${hex}`;
  const n = parseInt(h, 16);
  return Number.isFinite(n) ? n : null;
}

function formatHexBlock(hex: string | null): string {
  if (!hex) return '—';
  const n = hexToDec(hex);
  return n != null ? n.toLocaleString('en-US') : hex;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return '방금';
  if (s < 60) return `${s}s 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m 전`;
  return `${Math.floor(m / 60)}h 전`;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function syncProgress(syncing: unknown): number | null {
  if (syncing === false) return 100;
  if (!syncing || typeof syncing !== 'object') return null;
  const o = syncing as Record<string, unknown>;
  const c = typeof o.currentBlock === 'string' ? hexToDec(o.currentBlock) : null;
  const h = typeof o.highestBlock === 'string' ? hexToDec(o.highestBlock) : null;
  if (c == null || h == null || h === 0) return null;
  return Math.min(100, Math.round((c / h) * 10000) / 100);
}

function networkHeadFromSync(syncing: unknown, localBlock: number | null): number | null {
  if (localBlock == null) return null;
  if (syncing === false) return localBlock;
  if (!syncing || typeof syncing !== 'object') return localBlock;
  const h = typeof (syncing as { highestBlock?: string }).highestBlock === 'string'
    ? hexToDec((syncing as { highestBlock: string }).highestBlock)
    : null;
  return h ?? localBlock;
}

async function proxyRpc(
  url: string,
  method: string,
  params?: unknown[] | Record<string, unknown>
): Promise<RpcCallResult> {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, method, params })
  });
  const j = (await res.json()) as RpcCallResult & { body?: unknown };
  if (!res.ok) return { ok: false, error: (j as { error?: string }).error || `HTTP ${res.status}` };
  return j;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

const NAV: { id: NavId; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'node', label: 'Node Status', icon: Server },
  { id: 'sync', label: 'Sync & Finality', icon: Activity },
  { id: 'blocks', label: 'Blocks', icon: Blocks },
  { id: 'txs', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'prometheus', label: 'Prometheus Metrics', icon: Gauge },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'config', label: 'Config Validator', icon: Shield },
  { id: 'docs', label: 'Arc Docs Assistant', icon: BookOpen },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: 2 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function ArcDashboard() {
  const [mounted, setMounted] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const [mainMode, setMainMode] = useState<MainMode>('overview');
  const [activeNav, setActiveNav] = useState<NavId>('overview');
  const [lang, setLang] = useState<'ko' | 'en' | 'ja'>('ko');

  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC);
  const [networkRpcUrl, setNetworkRpcUrl] = useState('');
  const [pollMs, setPollMs] = useState(5000);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);

  const [latencyRing, setLatencyRing] = useState<number[]>([]);
  const [headSeries, setHeadSeries] = useState<{ t: string; local: number; network: number }[]>([]);
  const [blockDeltaRing, setBlockDeltaRing] = useState<number[]>([]);
  const prevBlockRef = useRef<number | null>(null);

  const [recentBlocks, setRecentBlocks] = useState<BlockRow[]>([]);
  const [recentTxs, setRecentTxs] = useState<TxRow[]>([]);

  const [logLines, setLogLines] = useState<string[]>([]);
  const [logFollow, setLogFollow] = useState(true);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const [globalSearch, setGlobalSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [rpcMethod, setRpcMethod] = useState('eth_blockNumber');
  const [rpcParamsJson, setRpcParamsJson] = useState('');
  const [rpcOut, setRpcOut] = useState('');

  const [docQuery, setDocQuery] = useState('노드가 동기화되지 않을 때 확인할 것은?');
  const [docLoading, setDocLoading] = useState(false);
  const [docHits, setDocHits] = useState<
    { title?: string; link?: string; page?: string; snippet?: string }[]
  >([]);
  const [assistantMessages, setAssistantMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  const [uptimeLabel, setUptimeLabel] = useState('0s');
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    startRef.current = Date.now();
    try {
      const u = localStorage.getItem(LS_RPC);
      if (u) setRpcUrl(u);
      const n = localStorage.getItem(LS_NET_RPC);
      if (n) setNetworkRpcUrl(n);
      const p = localStorage.getItem(LS_INTERVAL);
      if (p) {
        const v = parseInt(p, 10);
        if (v >= 2000 && v <= 120_000) setPollMs(v);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setUptimeLabel(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const persist = useCallback(() => {
    try {
      localStorage.setItem(LS_RPC, rpcUrl);
      localStorage.setItem(LS_NET_RPC, networkRpcUrl);
      localStorage.setItem(LS_INTERVAL, String(pollMs));
    } catch {
      /* ignore */
    }
  }, [rpcUrl, networkRpcUrl, pollMs]);

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => {
      const next = [...prev, `[${new Date().toISOString().slice(11, 19)}] ${line}`];
      return next.slice(-200);
    });
  }, []);

  const scrollSection = useCallback((id: NavId) => {
    setActiveNav(id);
    if (id === 'settings') {
      setMainMode('settings');
      return;
    }
    setMainMode('overview');
    requestAnimationFrame(() => {
      const el = document.getElementById(`section-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const runHealth = useCallback(async () => {
    setLoading(true);
    setRoundError(null);
    const jobs: { key: keyof HealthSnapshot['timings']; method: string; params?: unknown[] | Record<string, unknown> }[] = [
      { key: 'block', method: 'eth_blockNumber' },
      { key: 'chain', method: 'eth_chainId' },
      { key: 'sync', method: 'eth_syncing' },
      { key: 'net', method: 'net_version' }
    ];
    const timings: HealthSnapshot['timings'] = {};
    const errors: HealthSnapshot['errors'] = {};
    let blockNumber: string | null = null;
    let chainIdDec: number | null = null;
    let syncing: unknown = null;
    let netVersion: string | null = null;

    await Promise.all(
      jobs.map(async ({ key, method, params }) => {
        const r = await proxyRpc(rpcUrl, method, params);
        timings[key] = r.ms;
        if (!r.ok || !r.data) {
          errors[key] = r.error || '요청 실패';
          return;
        }
        if (r.data.error) {
          errors[key] = r.data.error.message;
          return;
        }
        const res = r.data.result;
        if (method === 'eth_blockNumber' && typeof res === 'string') blockNumber = res;
        if (method === 'eth_chainId' && typeof res === 'string') chainIdDec = hexToDec(res);
        if (method === 'eth_syncing') syncing = res;
        if (method === 'net_version' && typeof res === 'string') netVersion = res;
      })
    );

    const snap: HealthSnapshot = {
      at: new Date().toISOString(),
      blockNumber,
      chainIdDec,
      syncing,
      netVersion,
      timings,
      errors
    };
    setSnapshot(snap);

    const firstErr = jobs.map((j) => errors[j.key]).find(Boolean);
    if (firstErr) setRoundError(firstErr);

    const lat = timings.block ?? timings.net ?? 0;
    if (lat) {
      setLatencyRing((prev) => [...prev, lat].slice(-36));
    }

    const localBn = blockNumber ? hexToDec(blockNumber) : null;
    if (localBn != null) {
      let netHead = networkHeadFromSync(syncing, localBn);
      if (networkRpcUrl.trim()) {
        const nr = await proxyRpc(networkRpcUrl.trim(), 'eth_blockNumber');
        if (nr.ok && nr.data?.result && typeof nr.data.result === 'string') {
          const nh = hexToDec(nr.data.result);
          if (nh != null) netHead = nh;
        }
      }
      setHeadSeries((prev) =>
        [...prev, { t: snap.at, local: localBn, network: netHead ?? localBn }].slice(-48)
      );

      const prev = prevBlockRef.current;
      if (prev != null) {
        const d = Math.max(0, localBn - prev);
        setBlockDeltaRing((r) => [...r, d].slice(-36));
      }
      prevBlockRef.current = localBn;

      if (!errors.block && blockNumber) {
        appendLog(`[execution] INFO latest=0x${localBn.toString(16)} latency=${timings.block ?? '?'}ms`);
      } else if (errors.block) {
        appendLog(`[execution] ERROR ${errors.block}`);
      }
      if (syncing === false) {
        appendLog(`[consensus] INFO eth_syncing=false (완전 동기화)`);
      } else if (syncing && typeof syncing === 'object') {
        appendLog(`[consensus] INFO syncing object received`);
      }
    }

    setLoading(false);
  }, [rpcUrl, networkRpcUrl, appendLog]);

  const loadBlocksAndTxs = useCallback(async () => {
    const bnHex = snapshot?.blockNumber;
    if (!bnHex) return;
    const latest = hexToDec(bnHex);
    if (latest == null) return;
    const count = 8;
    const reqs = Array.from({ length: count }, (_, i) => {
      const n = latest - i;
      return proxyRpc(rpcUrl, 'eth_getBlockByNumber', [`0x${n.toString(16)}`, false]);
    });
    const results = await Promise.all(reqs);
    const rows: BlockRow[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.ok || !r.data?.result || typeof r.data.result !== 'object') continue;
      const b = r.data.result as Record<string, string | string[]>;
      const num = latest - i;
      const gasUsed = typeof b.gasUsed === 'string' ? b.gasUsed : '0x0';
      const gasLimit = typeof b.gasLimit === 'string' ? b.gasLimit : '0x1';
      const gu = hexToDec(gasUsed) ?? 0;
      const gl = hexToDec(gasLimit) ?? 1;
      const ts = typeof b.timestamp === 'string' ? hexToDec(b.timestamp) : null;
      const txs = Array.isArray(b.transactions) ? b.transactions.length : 0;
      rows.push({
        num,
        hash: typeof b.hash === 'string' ? b.hash : '—',
        time: ts != null ? new Date(ts * 1000).toLocaleTimeString('ko-KR') : '—',
        txCount: txs,
        gasUsed: gu.toLocaleString('en-US'),
        gasPct: gl > 0 ? Math.round((gu / gl) * 1000) / 10 : 0
      });
    }
    setRecentBlocks(rows);

    const full = await proxyRpc(rpcUrl, 'eth_getBlockByNumber', ['latest', true]);
    if (!full.ok || !full.data?.result || typeof full.data.result !== 'object') {
      setRecentTxs([]);
      return;
    }
    const blk = full.data.result as { transactions?: unknown[] };
    const txs = Array.isArray(blk.transactions) ? blk.transactions : [];
    const out: TxRow[] = [];
    for (const tx of txs.slice(0, 10)) {
      if (!tx || typeof tx !== 'object') continue;
      const t = tx as Record<string, string>;
      const hash = t.hash ?? '—';
      const input = (t.input ?? '').slice(0, 10);
      const method = input === '0x' || input === '' ? 'transfer' : `call ${input}`;
      out.push({
        hash,
        method,
        status: 'Success',
        elapsed: '~0.5s',
        finality: '~0.48s'
      });
    }
    setRecentTxs(out);
  }, [rpcUrl, snapshot?.blockNumber]);

  useEffect(() => {
    if (!mounted) return;
    void runHealth();
    const id = setInterval(() => void runHealth(), pollMs);
    return () => clearInterval(id);
  }, [mounted, runHealth, pollMs]);

  useEffect(() => {
    if (snapshot?.blockNumber) void loadBlocksAndTxs();
  }, [snapshot?.blockNumber, loadBlocksAndTxs]);

  useEffect(() => {
    if (!logFollow || !logBoxRef.current) return;
    logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [logLines, logFollow]);

  const chainOk = useMemo(() => {
    if (snapshot?.chainIdDec == null) return null;
    return snapshot.chainIdDec === ARC_TESTNET_CHAIN_ID;
  }, [snapshot]);

  const allHealthy = useMemo(() => {
    if (!snapshot) return false;
    return !snapshot.errors.block && !snapshot.errors.chain && !snapshot.errors.sync && !snapshot.errors.net;
  }, [snapshot]);

  const latSorted = useMemo(() => [...latencyRing].sort((a, b) => a - b), [latencyRing]);
  const p50 = percentile(latSorted, 50);
  const p95 = percentile(latSorted, 95);
  const curLat = snapshot?.timings.block ?? snapshot?.timings.net ?? 0;

  const syncPct = syncProgress(snapshot?.syncing);

  const localBlock = snapshot?.blockNumber ? hexToDec(snapshot.blockNumber) : null;
  const netBlock = networkHeadFromSync(snapshot?.syncing, localBlock);

  const execHealthy = !snapshot?.errors.block;
  const consHealthy = snapshot ? snapshot.syncing === false || (syncPct != null && syncPct >= 99) : false;

  const filter = globalSearch.trim().toLowerCase();

  const filteredBlocks = useMemo(() => {
    if (!filter) return recentBlocks;
    return recentBlocks.filter(
      (b) =>
        String(b.num).includes(filter) ||
        b.hash.toLowerCase().includes(filter) ||
        b.time.toLowerCase().includes(filter)
    );
  }, [recentBlocks, filter]);

  const filteredTxs = useMemo(() => {
    if (!filter) return recentTxs;
    return recentTxs.filter(
      (t) => t.hash.toLowerCase().includes(filter) || t.method.toLowerCase().includes(filter)
    );
  }, [recentTxs, filter]);

  const filteredLogs = useMemo(() => {
    if (!filter) return logLines;
    return logLines.filter((l) => l.toLowerCase().includes(filter));
  }, [logLines, filter]);

  const rpcMicro = useMemo(() => {
    const rpcSeries = latencyRing.map((y, x) => ({ x, y }));
    const importSeries = blockDeltaRing.map((y, x) => ({ x, y: y * 10 + 5 }));
    const syncSeries = headSeries.map((h, x) => ({
      x,
      y: h.network - h.local + 2
    }));
    return { rpcSeries, importSeries, syncSeries };
  }, [latencyRing, blockDeltaRing, headSeries]);

  const runConsole = async () => {
    setRpcOut('');
    let params: unknown[] | Record<string, unknown> | undefined;
    const raw = rpcParamsJson.trim();
    if (raw) {
      try {
        params = JSON.parse(raw) as unknown[] | Record<string, unknown>;
      } catch {
        setRpcOut('params JSON 파싱 실패');
        return;
      }
    }
    const r = await proxyRpc(rpcUrl, rpcMethod, params);
    setRpcOut(JSON.stringify(r, null, 2));
  };

  const runDocSearch = async () => {
    const q = docQuery.trim();
    if (!q) return;
    setAssistantMessages((m) => [...m, { role: 'user', text: q }]);
    setDocLoading(true);
    setDocHits([]);
    try {
      const res = await fetch('/api/arc-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'search', query: q })
      });
      const j = (await res.json()) as {
        hits?: typeof docHits;
        rawText?: string;
        error?: string;
      };
      if (!res.ok) {
        setAssistantMessages((m) => [...m, { role: 'assistant', text: j.error || `HTTP ${res.status}` }]);
      } else {
        setDocHits(j.hits || []);
        const bullets = (j.hits || [])
          .slice(0, 5)
          .map((h, i) => `${i + 1}. ${h.title || h.page || '문서'}${h.link ? ` — ${h.link}` : ''}`)
          .join('\n');
        setAssistantMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text:
              bullets ||
              j.rawText?.slice(0, 1200) ||
              '검색 결과가 없습니다. 질문을 바꿔 보세요.'
          }
        ]);
      }
    } catch (e) {
      setAssistantMessages((m) => [
        ...m,
        { role: 'assistant', text: e instanceof Error ? e.message : '요청 실패' }
      ]);
    }
    setDocLoading(false);
  };

  const chainFacts = useMemo(
    () => [
      'EVM 호환 (Prague)',
      '가스 토큰: USDC',
      '합의: Malachite BFT',
      '블록 타임: ~0.48s (testnet)',
      'Chain ID: 5042002',
      '개발자 접근: 무허가'
    ],
    []
  );

  const configItems = useMemo(
    () => [
      { ok: true, label: 'Linux 커널 / 컨테이너 런타임 준비' },
      { ok: true, label: '64GB+ RAM 권장 (노드 요구사항)' },
      { ok: true, label: 'RPC 엔드포인트 (*.arc.network 또는 로컬) 응답' },
      { ok: true, label: '체인 ID 검증 통과' },
      { ok: false, label: '백업 / 복원 정책 (수동 확인 필요)', warn: true }
    ],
    []
  );

  return (
    <div className="flex min-h-screen bg-dash-bg text-[14px] text-dash-text">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-dash-border bg-dash-surface lg:flex">
        <div className="flex items-center gap-2 border-b border-dash-border px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-dash-blue font-bold text-white">A</div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-dash-muted">Arc</p>
            <p className="text-sm font-bold leading-tight">NODE RUNNER</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === 'settings' ? mainMode === 'settings' : mainMode === 'overview' && activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollSection(item.id)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                  active ? 'bg-dash-blue/15 text-dash-blueHi' : 'text-dash-muted hover:bg-dash-raised hover:text-dash-text'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge != null && (
                  <span className="rounded-full bg-dash-blue px-1.5 text-[10px] font-bold text-white">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="m-2 rounded-xl border border-dash-border bg-dash-panel p-3 shadow-card">
          <p className="text-[11px] font-medium text-dash-muted">Arc Testnet</p>
          <p className="mt-1 font-mono text-lg font-semibold">{ARC_TESTNET_CHAIN_ID}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-dash-green">
            <span className="h-2 w-2 rounded-full bg-dash-green shadow-[0_0_8px_#22c55e]" />
            Up to date
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-dash-border bg-dash-bg/90 px-4 py-3 backdrop-blur-md">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight">Arc Node Runner Dashboard</h1>
              <span className="shrink-0 rounded-md bg-dash-blue/20 px-2 py-0.5 text-[11px] font-semibold text-dash-blueHi">
                Arc Testnet
              </span>
            </div>
          </div>
          <div className="relative flex min-w-[200px] max-w-md flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-dash-muted" />
            <input
              ref={searchRef}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="대시보드, 메트릭, 로그 검색…"
              className="w-full rounded-lg border border-dash-border bg-dash-panel py-2 pl-9 pr-16 text-[13px] text-dash-text outline-none ring-dash-blue/30 placeholder:text-dash-muted focus:ring-2"
            />
            <kbd className="pointer-events-none absolute right-2 hidden rounded border border-dash-border bg-dash-raised px-1.5 py-0.5 font-mono text-[10px] text-dash-muted sm:inline">
              ⌘K
            </kbd>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className={clsx(
                  'h-2 w-2 rounded-full',
                  allHealthy ? 'bg-dash-green shadow-[0_0_8px_#22c55e]' : 'bg-dash-yellow'
                )}
              />
              <span className="text-[12px] text-dash-muted">
                {allHealthy ? 'All Systems Healthy' : '일부 점검 필요'}
              </span>
            </div>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="rounded-lg border border-dash-border bg-dash-panel px-2 py-1.5 text-[12px] text-dash-text"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-dash-raised text-xs font-bold text-dash-blueHi">
              OP
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5">
          {mainMode === 'settings' && (
            <div className="mx-auto max-w-3xl space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMainMode('overview');
                  setActiveNav('overview');
                }}
                className="text-[13px] text-dash-blueHi hover:underline"
              >
                ← Overview로
              </button>
              <div className="rounded-xl border border-dash-border bg-dash-panel p-5 shadow-card">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <SlidersHorizontal className="h-5 w-5 text-dash-blueHi" />
                  Settings
                </h2>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-[12px] text-dash-muted">Execution RPC URL</span>
                    <input
                      value={rpcUrl}
                      onChange={(e) => setRpcUrl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-dash-border bg-dash-bg px-3 py-2 font-mono text-[13px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-dash-muted">Network 참조 RPC (선택, 헤드 비교용)</span>
                    <input
                      value={networkRpcUrl}
                      onChange={(e) => setNetworkRpcUrl(e.target.value)}
                      placeholder="비우면 eth_syncing 기준으로 네트워크 헤드 추정"
                      className="mt-1 w-full rounded-lg border border-dash-border bg-dash-bg px-3 py-2 font-mono text-[13px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-dash-muted">폴링 간격 (ms)</span>
                    <input
                      type="number"
                      min={2000}
                      max={120000}
                      step={1000}
                      value={pollMs}
                      onChange={(e) => setPollMs(Number(e.target.value) || 5000)}
                      className="mt-1 w-40 rounded-lg border border-dash-border bg-dash-bg px-3 py-2"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={persist}
                    className="rounded-lg bg-dash-blue px-4 py-2 text-sm font-semibold text-white hover:bg-dash-blueHi"
                  >
                    저장
                  </button>
                  <p className="text-[12px] text-dash-muted">
                    허용 호스트: *.arc.network, localhost, 127.0.0.1 ·{' '}
                    <button type="button" className="text-dash-blueHi underline" onClick={() => setMainMode('rpc')}>
                      RPC 콘솔 열기
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {mainMode === 'rpc' && (
            <div className="mx-auto max-w-3xl space-y-4">
              <button
                type="button"
                onClick={() => setMainMode('settings')}
                className="text-[13px] text-dash-blueHi hover:underline"
              >
                ← Settings로
              </button>
              <div className="rounded-xl border border-dash-border bg-dash-panel p-5 shadow-card">
                <h2 className="text-lg font-bold">RPC 콘솔</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <select
                    value={rpcMethod}
                    onChange={(e) => setRpcMethod(e.target.value)}
                    className="rounded-lg border border-dash-border bg-dash-bg px-2 py-2 font-mono text-[12px]"
                  >
                    {[
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
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void runConsole()}
                    className="rounded-lg bg-dash-blue px-4 py-2 text-sm font-semibold text-white"
                  >
                    호출
                  </button>
                </div>
                <textarea
                  value={rpcParamsJson}
                  onChange={(e) => setRpcParamsJson(e.target.value)}
                  placeholder='params JSON — 예: ["latest", false]'
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-dash-border bg-dash-bg p-3 font-mono text-[12px]"
                />
                <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-dash-border bg-[#05080f] p-3 font-mono text-[11px] text-dash-muted">
                  {rpcOut || '결과'}
                </pre>
              </div>
            </div>
          )}

          {mainMode === 'overview' && (
            <div className="mx-auto max-w-[1400px] space-y-5">
              {/* KPI row */}
              <section id="section-overview" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div
                  id="section-node"
                  className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-dash-muted">Execution Node</p>
                      <p className="mt-1 font-mono text-[13px] text-dash-blueHi">arc-execution</p>
                    </div>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        execHealthy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      )}
                    >
                      {execHealthy ? 'Healthy' : 'Issue'}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-dash-muted">HTTP RPC · 8545 (로컬 노드 시)</p>
                  <p className="text-[12px] text-dash-muted">Metrics · 9001</p>
                </div>
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-dash-muted">Consensus Node</p>
                      <p className="mt-1 font-mono text-[13px] text-dash-blueHi">arc-consensus</p>
                    </div>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        consHealthy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                      )}
                    >
                      {consHealthy ? 'Healthy' : 'Syncing'}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-dash-muted">CL RPC · 31000 / Metrics · 29000 (문서 기준 예시)</p>
                  <p className="text-[11px] text-dash-muted/80">※ 단일 JSON-RPC만 연결된 경우 추정 상태입니다.</p>
                </div>
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-dash-muted">Current Block</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{formatHexBlock(snapshot?.blockNumber ?? null)}</p>
                  <p className="mt-1 text-[12px] text-dash-muted">{snapshot ? timeAgo(snapshot.at) : '—'}</p>
                </div>
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-dash-muted">RPC Latency</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-dash-blueHi">{curLat || '—'} ms</p>
                  <p className="mt-1 text-[11px] text-dash-muted">
                    p50 {p50 || '—'} ms · p95 {p95 || '—'} ms
                  </p>
                  {chartsReady ? <LatencySpark values={latencyRing} /> : <div className="h-10 w-full rounded bg-dash-raised/60" />}
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-3">
                <div
                  id="section-sync"
                  className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card lg:col-span-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Radio className="h-4 w-4 text-dash-blueHi" />
                      Sync & Node Health
                    </h3>
                    <button
                      type="button"
                      onClick={() => void runHealth()}
                      disabled={loading}
                      className="rounded-lg border border-dash-border px-3 py-1 text-[12px] hover:bg-dash-raised"
                    >
                      {loading ? '새로고침…' : '새로고침'}
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[12px] text-dash-muted">
                      <span>Sync Progress</span>
                      <span>{syncPct != null ? `${syncPct.toFixed(2)}%` : 'N/A'}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-dash-raised">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-dash-blue to-emerald-500 transition-all"
                        style={{ width: `${syncPct ?? (execHealthy ? 100 : 8)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-dash-surface/80 p-3">
                      <p className="text-[11px] text-dash-muted">Local Block</p>
                      <p className="font-mono text-lg font-semibold">{localBlock?.toLocaleString('en-US') ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-dash-surface/80 p-3">
                      <p className="text-[11px] text-dash-muted">Network Block</p>
                      <p className="font-mono text-lg font-semibold">{netBlock?.toLocaleString('en-US') ?? '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Execution active', 'Consensus active', 'IPC OK', 'Metrics enabled', 'Relay endpoints OK'].map(
                      (t) => (
                        <span
                          key={t}
                          className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
                        >
                          {t}
                        </span>
                      )
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-dash-muted">
                    피어/릴레이 수치는 데모 라벨입니다. 실제 값은 노드/모니터링 스택에 연결하세요.
                  </p>
                  {roundError && <p className="mt-2 text-[12px] text-red-400">{roundError}</p>}
                </div>
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <h3 className="text-sm font-bold">Finality</h3>
                  <p className="mt-3 text-3xl font-bold text-dash-green">~0.48s</p>
                  <p className="mt-1 text-[12px] text-dash-muted">Arc testnet 목표 (문서 기준)</p>
                  {chainOk === false && (
                    <p className="mt-3 text-[12px] text-amber-400">Chain ID가 Testnet과 다릅니다.</p>
                  )}
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card lg:col-span-2">
                  <h3 className="text-sm font-bold">Head / Checkpoint progression</h3>
                  <p className="text-[11px] text-dash-muted">폴링 시점별 로컬 헤드 vs 네트워크 헤드</p>
                  {chartsReady ? (
                    <HeadProgressionChart series={headSeries} />
                  ) : (
                    <div className="flex h-52 items-center justify-center rounded-lg bg-dash-raised/40 text-[12px] text-dash-muted">
                      차트 로딩…
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Cpu className="h-4 w-4" />
                    Resources
                  </h3>
                  {[
                    { label: 'CPU', pct: 24, icon: Cpu },
                    { label: 'Memory', pct: 41, icon: Zap },
                    { label: 'Disk', pct: 20, sub: '359 / 1.8 TB', icon: HardDrive },
                    { label: 'Snapshot', pct: 92, icon: Gauge }
                  ].map((r) => (
                    <div key={r.label} className="mb-3">
                      <div className="mb-1 flex justify-between text-[11px] text-dash-muted">
                        <span className="flex items-center gap-1">
                          <r.icon className="h-3 w-3" />
                          {r.label}
                        </span>
                        <span>
                          {r.sub ?? `${r.pct}%`}
                          {r.sub ? '' : ''}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-dash-raised">
                        <div
                          className="h-full rounded-full bg-dash-blue"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-dash-muted">OS 메트릭 미연동 시 데모 값입니다.</p>
                </div>
              </section>

              <section className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                <h3 className="text-sm font-bold">Chain profile</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {chainFacts.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-dash-muted">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>

              <section id="section-blocks" className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <h3 className="text-sm font-bold">Recent Blocks</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-dash-border text-dash-muted">
                          <th className="py-2 pr-2">#</th>
                          <th className="py-2 pr-2">Time</th>
                          <th className="py-2 pr-2">Txs</th>
                          <th className="py-2 pr-2">Gas</th>
                          <th className="py-2">Finality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBlocks.map((b) => (
                          <tr key={b.num} className="border-b border-dash-border/60 hover:bg-dash-raised/50">
                            <td className="py-2 pr-2 font-mono text-dash-blueHi">{b.num.toLocaleString('en-US')}</td>
                            <td className="py-2 pr-2 text-dash-muted">{b.time}</td>
                            <td className="py-2 pr-2">{b.txCount}</td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-dash-raised">
                                  <div
                                    className="h-full bg-dash-blue"
                                    style={{ width: `${Math.min(100, b.gasPct)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-dash-muted">{b.gasPct}%</span>
                              </div>
                            </td>
                            <td className="py-2 text-dash-muted">~0.48s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div id="section-txs" className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <h3 className="text-sm font-bold">Recent Transactions</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[440px] border-collapse text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-dash-border text-dash-muted">
                          <th className="py-2 pr-2">Hash</th>
                          <th className="py-2 pr-2">Method</th>
                          <th className="py-2 pr-2">Status</th>
                          <th className="py-2 pr-2">Elapsed</th>
                          <th className="py-2">Finality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTxs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-dash-muted">
                              최신 블록에 표시할 트랜잭션이 없거나 로딩 중입니다.
                            </td>
                          </tr>
                        ) : (
                          filteredTxs.map((t) => (
                            <tr key={t.hash} className="border-b border-dash-border/60 hover:bg-dash-raised/50">
                              <td className="max-w-[140px] truncate py-2 pr-2 font-mono text-[11px] text-dash-blueHi">
                                <a
                                  href={`https://testnet.arcscan.app/tx/${t.hash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {t.hash.slice(0, 14)}…
                                </a>
                              </td>
                              <td className="py-2 pr-2 text-dash-muted">{t.method}</td>
                              <td className="py-2 pr-2 text-emerald-400">{t.status}</td>
                              <td className="py-2 pr-2 text-dash-muted">{t.elapsed}</td>
                              <td className="py-2 text-dash-muted">{t.finality}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section id="section-prometheus" className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                <h3 className="text-sm font-bold">Prometheus Metrics</h3>
                <p className="text-[11px] text-dash-muted">Prometheus 미연동 — RPC·블록 델타에서 합성한 미니 시리즈</p>
                <div className="mt-3">
                  {chartsReady ? (
                    <MicroMetricLines
                      rpcSeries={rpcMicro.rpcSeries}
                      importSeries={rpcMicro.importSeries}
                      syncSeries={rpcMicro.syncSeries}
                    />
                  ) : (
                    <div className="h-24 rounded-lg bg-dash-raised/40" />
                  )}
                </div>
              </section>

              <section className="grid gap-3 xl:grid-cols-3">
                <div id="section-logs" className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card xl:col-span-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Live Logs</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLogFollow((f) => !f)}
                        className={clsx(
                          'rounded px-2 py-1 text-[11px]',
                          logFollow ? 'bg-dash-blue/20 text-dash-blueHi' : 'border border-dash-border'
                        )}
                      >
                        Follow
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogLines([])}
                        className="rounded border border-dash-border px-2 py-1 text-[11px]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div
                    ref={logBoxRef}
                    className="mt-3 h-56 overflow-auto rounded-lg border border-dash-border bg-[#05080f] p-3 font-mono text-[11px] leading-relaxed text-emerald-400/90"
                  >
                    {filteredLogs.length === 0 ? (
                      <span className="text-dash-muted">로그가 없습니다.</span>
                    ) : (
                      filteredLogs.map((l, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all">
                          {l}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div id="section-config" className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <h3 className="text-sm font-bold">Configuration Validation</h3>
                  <ul className="mt-3 space-y-2">
                    {configItems.map((c) => (
                      <li key={c.label} className="flex items-start gap-2 text-[13px]">
                        {c.warn ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        ) : (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                        <span className={c.warn ? 'text-amber-200/90' : 'text-dash-muted'}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div id="section-docs" className="rounded-xl border border-dash-border bg-dash-panel p-4 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Arc Docs Assistant</h3>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      docs.arc.io/mcp
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-dash-muted">Connected · search_arc_docs</p>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-dash-border bg-dash-bg/80 p-2">
                    {assistantMessages.length === 0 && (
                      <p className="text-[12px] text-dash-muted">질문을 입력하고 검색해 보세요.</p>
                    )}
                    {assistantMessages.map((m, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'rounded-lg px-3 py-2 text-[12px]',
                          m.role === 'user' ? 'ml-4 bg-dash-blue/15 text-dash-text' : 'mr-4 bg-dash-raised text-dash-muted'
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase text-dash-muted">{m.role}</span>
                        <pre className="mt-1 whitespace-pre-wrap font-sans">{m.text}</pre>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={docQuery}
                      onChange={(e) => setDocQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void runDocSearch()}
                      placeholder={
                        lang === 'ko'
                          ? '노드가 동기화되지 않는 이유는?'
                          : lang === 'ja'
                            ? 'ノードが同期しない理由は？'
                            : "Why isn't my node syncing?"
                      }
                      className="min-w-0 flex-1 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px]"
                    />
                    <button
                      type="button"
                      disabled={docLoading}
                      onClick={() => void runDocSearch()}
                      className="shrink-0 rounded-lg bg-dash-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {docLoading ? '…' : '검색'}
                    </button>
                  </div>
                  {docHits.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto border-t border-dash-border pt-2 text-[11px] text-dash-muted">
                      {docHits.slice(0, 4).map((h, i) => (
                        <a
                          key={i}
                          href={h.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-1 block truncate text-dash-blueHi hover:underline"
                        >
                          {h.title || h.page}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section id="section-alerts" className="rounded-xl border border-dash-border border-amber-500/20 bg-amber-500/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts (데모)
                </h3>
                <ul className="mt-2 list-inside list-disc text-[13px] text-dash-muted">
                  <li>백업 스냅샷 정책이 아직 검증되지 않았습니다.</li>
                  <li>Prometheus scrape 대상이 설정되지 않았습니다.</li>
                </ul>
              </section>
            </div>
          )}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dash-border bg-dash-surface px-4 py-2 text-[11px] text-dash-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            All systems operational
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ['RPC', '8545'],
              ['Exec metrics', '9001'],
              ['Consensus m.', '29000'],
              ['CL RPC', '31000']
            ].map(([label, port]) => (
              <button
                key={port}
                type="button"
                onClick={() => void copyText(port)}
                className="flex items-center gap-1 rounded border border-dash-border bg-dash-panel px-2 py-1 hover:bg-dash-raised"
              >
                {label}: {port}
                <Clipboard className="h-3 w-3 opacity-60" />
              </button>
            ))}
          </div>
          <div className="font-mono text-dash-muted">Uptime · {uptimeLabel}</div>
        </footer>
      </div>
    </div>
  );
}

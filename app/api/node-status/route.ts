import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { statfs } from 'node:fs/promises';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { NODE_ENV_DEFAULTS } from '@/lib/nodeEnv';
import { fetchPrometheus, findMetric } from '@/lib/prometheus';
import { callJsonRpc, hexToDec } from '@/lib/rpcClient';
import { isAllowedMetricsUrl, isAllowedRpcUrl } from '@/lib/urlAllowlist';

export const dynamic = 'force-dynamic';

const ARC_TESTNET_CHAIN_ID = 5042002;

function syncProgress(syncing: unknown): number | null {
  if (syncing === false) return 100;
  if (!syncing || typeof syncing !== 'object') return null;
  const o = syncing as Record<string, unknown>;
  const c = typeof o.currentBlock === 'string' ? hexToDec(o.currentBlock) : null;
  const h = typeof o.highestBlock === 'string' ? hexToDec(o.highestBlock) : null;
  if (c == null || h == null || h === 0) return null;
  return Math.min(100, Math.round((c / h) * 10000) / 100);
}

function systemdUnitActive(unit: string): boolean | null {
  if (process.platform !== 'linux') return null;
  try {
    const s = execSync(`systemctl is-active ${unit}`, { encoding: 'utf8', timeout: 3000 }).trim();
    return s === 'active';
  } catch {
    return false;
  }
}

async function diskUsageForPath(dir: string): Promise<{ usedPct: number; label: string } | null> {
  if (process.platform !== 'linux') return null;
  try {
    const st = await statfs(dir);
    const total = st.blocks * st.bsize;
    const free = st.bavail * st.bsize;
    const used = total - free;
    if (total <= 0) return null;
    const usedPct = Math.round((used / total) * 1000) / 10;
    const gb = (n: number) => `${(n / 1024 ** 3).toFixed(0)} GB`;
    return { usedPct, label: `${gb(used)} / ${gb(total)}` };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rpcUrl = (searchParams.get('rpcUrl') || NODE_ENV_DEFAULTS.rpcUrl).trim();
  const networkRpcUrl = (searchParams.get('networkRpcUrl') || NODE_ENV_DEFAULTS.networkRpcUrl).trim();
  const execMetricsUrl = (searchParams.get('execMetrics') || NODE_ENV_DEFAULTS.execMetricsUrl).trim();
  const consMetricsUrl = (searchParams.get('consMetrics') || NODE_ENV_DEFAULTS.consMetricsUrl).trim();
  const dataDir = (searchParams.get('dataDir') || NODE_ENV_DEFAULTS.arcDataDir).trim();

  if (!isAllowedRpcUrl(rpcUrl)) {
    return NextResponse.json({ ok: false, error: 'Invalid rpcUrl' }, { status: 400 });
  }

  const [block, chain, syncingR, net, client] = await Promise.all([
    callJsonRpc<string>(rpcUrl, 'eth_blockNumber'),
    callJsonRpc<string>(rpcUrl, 'eth_chainId'),
    callJsonRpc<unknown>(rpcUrl, 'eth_syncing'),
    callJsonRpc<string>(rpcUrl, 'net_version'),
    callJsonRpc<string>(rpcUrl, 'web3_clientVersion')
  ]);

  let networkBlock: number | null = null;
  if (networkRpcUrl && isAllowedRpcUrl(networkRpcUrl)) {
    const nb = await callJsonRpc<string>(networkRpcUrl, 'eth_blockNumber');
    if (nb.ok && typeof nb.result === 'string') networkBlock = hexToDec(nb.result);
  }

  const localBlock = block.ok && typeof block.result === 'string' ? hexToDec(block.result) : null;
  const syncing = syncingR.ok ? syncingR.result : null;
  const syncPct = syncProgress(syncing);
  if (networkBlock == null && localBlock != null) {
    if (syncing === false) networkBlock = localBlock;
    else if (syncing && typeof syncing === 'object') {
      const h = (syncing as { highestBlock?: string }).highestBlock;
      networkBlock = typeof h === 'string' ? hexToDec(h) : localBlock;
    }
  }

  const execMetrics = isAllowedMetricsUrl(execMetricsUrl) ? await fetchPrometheus(execMetricsUrl) : null;
  const consMetrics = isAllowedMetricsUrl(consMetricsUrl) ? await fetchPrometheus(consMetricsUrl) : null;

  const execSystemd = systemdUnitActive('arc-execution');
  const consSystemd = systemdUnitActive('arc-consensus');

  const ipcReth = existsSync('/run/arc/reth.ipc');
  const ipcAuth = existsSync('/run/arc/auth.ipc');

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memPct = Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10;
  const load = os.loadavg();
  const cpuCount = os.cpus().length;
  const cpuPct = Math.min(100, Math.round((load[0] / Math.max(cpuCount, 1)) * 1000) / 10);

  const diskExec = await diskUsageForPath(`${dataDir}/execution`);
  const diskCons = await diskUsageForPath(`${dataDir}/consensus`);

  const chainIdDec = chain.ok && typeof chain.result === 'string' ? hexToDec(chain.result) : null;

  const execHealthy = block.ok && (execSystemd === null ? true : execSystemd);
  const consHealthy =
    consSystemd === true ||
    (consSystemd === null && consMetrics != null) ||
    syncing === false;

  const pills = {
    executionActive: execHealthy,
    consensusActive: consHealthy,
    ipcOk: process.platform === 'linux' ? ipcReth && ipcAuth : null,
    metricsExec: execMetrics != null,
    metricsCons: consMetrics != null,
    relayFollow: consHealthy
  };

  const alerts: string[] = [];
  if (!block.ok) alerts.push(`Execution RPC unreachable: ${block.error}`);
  if (chainIdDec != null && chainIdDec !== ARC_TESTNET_CHAIN_ID) alerts.push(`Chain ID ${chainIdDec} != Arc Testnet ${ARC_TESTNET_CHAIN_ID}`);
  if (syncPct != null && syncPct < 99.9) alerts.push(`Sync in progress: ${syncPct.toFixed(2)}%`);
  if (process.platform === 'linux' && execSystemd === false) alerts.push('arc-execution systemd unit not active');
  if (process.platform === 'linux' && consSystemd === false) alerts.push('arc-consensus systemd unit not active');
  if (execMetrics == null) alerts.push('Execution Prometheus (9001) not reachable from dashboard host');
  if (consMetrics == null) alerts.push('Consensus Prometheus (29000) not reachable from dashboard host');

  let promBlockHeight: number | null = null;
  if (execMetrics) {
    promBlockHeight =
      findMetric(execMetrics, ['canonical', 'height']) ??
      findMetric(execMetrics, ['block', 'height']) ??
      findMetric(execMetrics, ['chain', 'height']);
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    rpcUrl,
    rpc: {
      blockNumber: block.result ?? null,
      localBlock,
      networkBlock,
      chainIdDec,
      syncing,
      syncPct,
      netVersion: net.result ?? null,
      clientVersion: client.result ?? null,
      latencyMs: block.ms
    },
    layers: {
      execution: {
        healthy: execHealthy,
        systemd: execSystemd,
        metricsUp: execMetrics != null,
        clientVersion: client.result ?? null
      },
      consensus: {
        healthy: consHealthy,
        systemd: consSystemd,
        metricsUp: consMetrics != null
      }
    },
    pills,
    resources: {
      cpuPct,
      memoryPct: memPct,
      memoryLabel: `${((totalMem - freeMem) / 1024 ** 3).toFixed(1)} / ${(totalMem / 1024 ** 3).toFixed(1)} GB`,
      diskExec,
      diskCons,
      snapshotPct: diskExec?.usedPct ?? null
    },
    prometheus: {
      execSample: promBlockHeight,
      execMetricCount: execMetrics ? Object.keys(execMetrics).length : 0,
      consMetricCount: consMetrics ? Object.keys(consMetrics).length : 0
    },
    alerts,
    isLocalNode: rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost')
  });
}

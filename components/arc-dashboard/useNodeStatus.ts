'use client';

import { useCallback, useEffect, useState } from 'react';

export type NodeStatusPayload = {
  ok: boolean;
  at: string;
  rpcUrl: string;
  rpc: {
    blockNumber: string | null;
    localBlock: number | null;
    networkBlock: number | null;
    chainIdDec: number | null;
    syncing: unknown;
    syncPct: number | null;
    netVersion: string | null;
    clientVersion: string | null;
    latencyMs: number;
  };
  layers: {
    execution: { healthy: boolean; systemd: boolean | null; metricsUp: boolean; clientVersion: string | null };
    consensus: { healthy: boolean; systemd: boolean | null; metricsUp: boolean };
  };
  pills: {
    executionActive: boolean;
    consensusActive: boolean;
    ipcOk: boolean | null;
    metricsExec: boolean;
    metricsCons: boolean;
    relayFollow: boolean;
  };
  resources: {
    cpuPct: number;
    memoryPct: number;
    memoryLabel: string;
    diskExec: { usedPct: number; label: string } | null;
    diskCons: { usedPct: number; label: string } | null;
    snapshotPct: number | null;
  };
  prometheus: {
    execSample: number | null;
    execMetricCount: number;
    consMetricCount: number;
  };
  alerts: string[];
  isLocalNode: boolean;
  error?: string;
};

export function useNodeStatus(
  rpcUrl: string,
  networkRpcUrl: string,
  pollMs: number,
  enabled: boolean
) {
  const [status, setStatus] = useState<NodeStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ rpcUrl });
      if (networkRpcUrl.trim()) q.set('networkRpcUrl', networkRpcUrl.trim());
      const res = await fetch(`/api/node-status?${q}`, { cache: 'no-store' });
      const j = (await res.json()) as NodeStatusPayload;
      setStatus(j);
    } catch {
      setStatus(null);
    }
    setLoading(false);
  }, [rpcUrl, networkRpcUrl, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), pollMs);
    return () => clearInterval(id);
  }, [enabled, fetchStatus, pollMs]);

  return { status, loading, refresh: fetchStatus };
}

export function useNodeLogs(enabled: boolean, pollMs: number) {
  const [lines, setLines] = useState<string[]>([]);

  const fetchLogs = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch('/api/logs?lines=100', { cache: 'no-store' });
      const j = (await res.json()) as { ok: boolean; lines?: string[]; error?: string };
      if (j.ok && j.lines) setLines(j.lines);
      else if (j.error) setLines([`[logs] ${j.error}`]);
    } catch (e) {
      setLines([`[logs] ${e instanceof Error ? e.message : 'fetch failed'}`]);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void fetchLogs();
    const id = setInterval(() => void fetchLogs(), pollMs);
    return () => clearInterval(id);
  }, [enabled, fetchLogs, pollMs]);

  return { lines, refresh: fetchLogs };
}

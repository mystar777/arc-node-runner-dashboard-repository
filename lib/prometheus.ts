/** 간단한 Prometheus text exposition 파서 (타입/라벨은 키에 포함) */

export function parsePrometheus(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const sp = t.lastIndexOf(' ');
    if (sp <= 0) continue;
    const key = t.slice(0, sp).trim();
    const val = parseFloat(t.slice(sp + 1));
    if (!Number.isNaN(val)) out[key] = val;
  }
  return out;
}

export function findMetric(
  metrics: Record<string, number>,
  includes: string[]
): number | null {
  for (const [k, v] of Object.entries(metrics)) {
    if (includes.every((s) => k.includes(s))) return v;
  }
  return null;
}

export async function fetchPrometheus(url: string, timeoutMs = 8000): Promise<Record<string, number> | null> {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    return parsePrometheus(text);
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

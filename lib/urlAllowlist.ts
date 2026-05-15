/** SSRF 방지: 프록시 URL 허용 목록 */

function parseHost(urlStr: string): URL | null {
  try {
    return new URL(urlStr.trim());
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function isAllowedRpcUrl(urlStr: string): boolean {
  const u = parseHost(urlStr);
  if (!u) return false;
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (isLocalHost(h)) return true;
  if (h.endsWith('.arc.network')) return true;
  return false;
}

/** Prometheus / CL RPC — 로컬 노드 메트릭만 프록시 */
export function isAllowedMetricsUrl(urlStr: string): boolean {
  const u = parseHost(urlStr);
  if (!u) return false;
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (!isLocalHost(u.hostname)) return false;
  const port = u.port ? parseInt(u.port, 10) : u.protocol === 'https:' ? 443 : 80;
  const allowed = new Set([9001, 29000, 31000, 8545]);
  return allowed.has(port);
}

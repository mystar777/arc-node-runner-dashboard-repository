/** SSRF 방지: 프록시 RPC URL 허용 목록 */

export function isAllowedRpcUrl(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true;
  if (h.endsWith('.arc.network')) return true;
  return false;
}

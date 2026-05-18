/** Human-readable RPC proxy / fetch errors (Node fetch, undici, etc.) */

export type RpcFetchErrorInfo = {
  code: 'timeout' | 'connection_refused' | 'dns' | 'http' | 'network';
  error: string;
  hint?: string;
};

const PUBLIC_TESTNET_RPC = 'https://rpc.testnet.arc.network';

function isLocalRpcHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function isLocalRpcUrl(urlStr: string): boolean {
  try {
    return isLocalRpcHost(new URL(urlStr.trim()).hostname);
  } catch {
    return false;
  }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  let c: unknown = error.cause;
  for (let i = 0; i < 4 && c; i++) {
    if (c instanceof Error) {
      parts.push(c.message);
      if ('code' in c && typeof (c as NodeJS.ErrnoException).code === 'string') {
        parts.push((c as NodeJS.ErrnoException).code as string);
      }
      c = c.cause;
    } else {
      parts.push(String(c));
      break;
    }
  }
  return parts.join(' ').toLowerCase();
}

export function describeRpcFetchError(error: unknown, rpcUrl: string): RpcFetchErrorInfo {
  const local = isLocalRpcUrl(rpcUrl);
  const text = errorText(error);
  const err = error instanceof Error ? error : new Error(String(error));

  if (err.name === 'AbortError' || text.includes('aborted') || text.includes('timeout')) {
    return {
      code: 'timeout',
      error: 'RPC request timed out (25s)',
      hint: local
        ? 'Check that arc-execution is running and responding on port 8545.'
        : 'Try another endpoint from https://docs.arc.io/arc/references/rpc-endpoints'
    };
  }

  if (
    text.includes('econnrefused') ||
    text.includes('connection refused') ||
    text.includes('connect econnrefused') ||
    (text.includes('fetch failed') && local)
  ) {
    return {
      code: 'connection_refused',
      error: `Connection refused — no RPC server is listening (${rpcUrl})`,
      hint: local
        ? `Local Arc node is not running on this machine. Start arc-execution (e.g. systemctl status arc-execution on Ubuntu), or set NEXT_PUBLIC_DEFAULT_RPC=${PUBLIC_TESTNET_RPC} in .env.local and restart the dashboard.`
        : `Verify the URL against https://docs.arc.io/arc/references/rpc-endpoints or use ${PUBLIC_TESTNET_RPC}.`
    };
  }

  if (text.includes('enotfound') || text.includes('getaddrinfo') || text.includes('eai_again')) {
    return {
      code: 'dns',
      error: 'Could not resolve RPC hostname',
      hint: 'Check the RPC URL for typos.'
    };
  }

  if (text.includes('econnreset') || text.includes('connection reset')) {
    return {
      code: 'network',
      error: 'RPC connection was reset',
      hint: local
        ? 'The node may be restarting. Retry in a few seconds.'
        : 'Try another testnet RPC provider.'
    };
  }

  return {
    code: 'network',
    error: err.message || 'Network error while calling RPC',
    hint: local
      ? `No local node detected at ${rpcUrl}. Use ${PUBLIC_TESTNET_RPC} if you are not running arc-node on this host.`
      : undefined
  };
}

export function formatRpcFetchError(info: RpcFetchErrorInfo): string {
  return info.hint ? `${info.error} — ${info.hint}` : info.error;
}

export function describeRpcHttpError(status: number, rpcUrl: string): RpcFetchErrorInfo {
  const local = isLocalRpcUrl(rpcUrl);
  return {
    code: 'http',
    error: `RPC HTTP ${status} from ${rpcUrl}`,
    hint: local
      ? 'Execution RPC returned an error. Check journalctl -u arc-execution.'
      : 'Upstream RPC returned an error. Try https://rpc.testnet.arc.network.'
  };
}

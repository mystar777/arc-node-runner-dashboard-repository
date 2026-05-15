export const NODE_ENV_DEFAULTS = {
  rpcUrl: process.env.ARC_RPC_URL || process.env.NEXT_PUBLIC_DEFAULT_RPC || 'http://127.0.0.1:8545',
  networkRpcUrl:
    process.env.ARC_NETWORK_RPC_URL ||
    process.env.NEXT_PUBLIC_NETWORK_RPC ||
    'https://rpc.testnet.arc.network',
  execMetricsUrl: process.env.ARC_EXEC_METRICS_URL || 'http://127.0.0.1:9001/metrics',
  consMetricsUrl: process.env.ARC_CONS_METRICS_URL || 'http://127.0.0.1:29000/metrics',
  arcDataDir: process.env.ARC_DATA_DIR || `${process.env.HOME || '/home/ubuntu'}/.arc`
};

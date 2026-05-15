#!/usr/bin/env bash
# Arc Testnet full node installer for Ubuntu 22.04+
# Docs: https://docs.arc.io/arc/concepts/running-a-node
#       https://docs.arc.io/arc/tutorials/run-an-arc-node
set -euo pipefail

ARC_NODE_VERSION="${ARC_NODE_VERSION:-v0.6.0}"
ARC_USER="${ARC_USER:-${SUDO_USER:-$USER}}"
ARC_HOME="$(eval echo "~${ARC_USER}")"
ARC_DATA="${ARC_DATA:-${ARC_HOME}/.arc}"
INSTALL_ROOT="${INSTALL_ROOT:-/usr/local}"
SKIP_SNAPSHOTS="${SKIP_SNAPSHOTS:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"
INSTALL_SYSTEMD="${INSTALL_SYSTEMD:-1}"
DASHBOARD_INSTALL="${DASHBOARD_INSTALL:-1}"
REPO_DIR="${REPO_DIR:-${ARC_HOME}/arc-node}"

log() { echo "[install-arc-node] $*"; }
die() { echo "[install-arc-node] ERROR: $*" >&2; exit 1; }

if [[ "$(id -u)" -ne 0 ]]; then
  die "Run as root: sudo bash scripts/install-arc-node.sh"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  die "Ubuntu/Debian with apt-get required."
fi

log "Installing system dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  build-essential pkg-config libssl-dev git curl jq \
  openssl ca-certificates \
  clang llvm-dev libclang-dev

if ! command -v cargo >/dev/null 2>&1; then
  log "Installing Rust..."
  sudo -u "$ARC_USER" bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
fi

sudo -u "$ARC_USER" bash -lc 'source "$HOME/.cargo/env" 2>/dev/null || true; cargo --version' || die "Rust install failed"

log "Cloning arc-node ${ARC_NODE_VERSION}..."
sudo -u "$ARC_USER" mkdir -p "$(dirname "$REPO_DIR")"
if [[ ! -d "${REPO_DIR}/.git" ]]; then
  sudo -u "$ARC_USER" git clone https://github.com/circlefin/arc-node.git "$REPO_DIR"
fi
sudo -u "$ARC_USER" bash -lc "
  set -e
  cd '$REPO_DIR'
  git fetch --tags
  git checkout '$ARC_NODE_VERSION'
  git submodule update --init --recursive
"

if [[ "$SKIP_BUILD" != "1" ]]; then
  log "Building binaries (this may take a while)..."
  sudo -u "$ARC_USER" bash -lc "
    set -e
    source \"\$HOME/.cargo/env\"
    cd '$REPO_DIR'
    cargo install --path crates/node --root '$INSTALL_ROOT' --locked
    cargo install --path crates/malachite-app --root '$INSTALL_ROOT' --locked
    cargo install --path crates/snapshots --root '$INSTALL_ROOT' --locked
  "
fi

for bin in arc-node-execution arc-node-consensus arc-snapshots; do
  [[ -x "${INSTALL_ROOT}/bin/${bin}" ]] || die "Missing ${INSTALL_ROOT}/bin/${bin}"
done

log "Creating data directories..."
sudo -u "$ARC_USER" mkdir -p "${ARC_DATA}/execution" "${ARC_DATA}/consensus"
install -d -o "$ARC_USER" -g "$ARC_USER" /run/arc 2>/dev/null || true

if [[ "$SKIP_SNAPSHOTS" != "1" ]]; then
  log "Downloading snapshots (~60GB download, 1-2h). Set SKIP_SNAPSHOTS=1 to skip."
  sudo -u "$ARC_USER" "${INSTALL_ROOT}/bin/arc-snapshots" download --chain=arc-testnet
else
  log "Skipping snapshots (SKIP_SNAPSHOTS=1). Sync from genesis will take much longer."
fi

if [[ "$INSTALL_SYSTEMD" == "1" ]]; then
  log "Installing systemd units..."
  cat > /etc/systemd/system/arc-execution.service <<EOF
[Unit]
Description=Arc Node - Execution Layer
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${ARC_USER}
Group=${ARC_USER}
RuntimeDirectory=arc
Environment=RUST_LOG=info
WorkingDirectory=${ARC_DATA}
ExecStart=${INSTALL_ROOT}/bin/arc-node-execution node \\
  --chain arc-testnet \\
  --datadir ${ARC_DATA}/execution \\
  --disable-discovery \\
  --ipcpath /run/arc/reth.ipc \\
  --auth-ipc \\
  --auth-ipc.path /run/arc/auth.ipc \\
  --http \\
  --http.addr 127.0.0.1 \\
  --http.port 8545 \\
  --http.api eth,net,web3,txpool,trace,debug \\
  --metrics 127.0.0.1:9001 \\
  --enable-arc-rpc \\
  --rpc.forwarder https://rpc.quicknode.testnet.arc.network/
Restart=always
RestartSec=10
KillSignal=SIGTERM
TimeoutStopSec=300
StandardOutput=journal
StandardError=journal
SyslogIdentifier=arc-execution
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/arc-consensus.service <<EOF
[Unit]
Description=Arc Node - Consensus Layer
After=arc-execution.service
Requires=arc-execution.service

[Service]
Type=simple
User=${ARC_USER}
Group=${ARC_USER}
Environment=RUST_LOG=info
WorkingDirectory=${ARC_DATA}
ExecStart=${INSTALL_ROOT}/bin/arc-node-consensus start \\
  --home ${ARC_DATA}/consensus \\
  --eth-socket /run/arc/reth.ipc \\
  --execution-socket /run/arc/auth.ipc \\
  --rpc.addr 127.0.0.1:31000 \\
  --follow \\
  --follow.endpoint https://rpc.drpc.testnet.arc.network,wss=rpc.drpc.testnet.arc.network \\
  --follow.endpoint https://rpc.quicknode.testnet.arc.network,wss=rpc.quicknode.testnet.arc.network \\
  --follow.endpoint https://rpc.blockdaemon.testnet.arc.network,wss=rpc.blockdaemon.testnet.arc.network \\
  --metrics 127.0.0.1:29000
Restart=always
RestartSec=10
KillSignal=SIGTERM
TimeoutStopSec=300
StandardOutput=journal
StandardError=journal
SyslogIdentifier=arc-consensus
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

  if [[ ! -f "${ARC_DATA}/consensus/config.toml" ]] && [[ ! -d "${ARC_DATA}/consensus/data" ]]; then
    log "Initializing consensus layer (one-time)..."
    sudo -u "$ARC_USER" "${INSTALL_ROOT}/bin/arc-node-consensus" init --home "${ARC_DATA}/consensus"
  fi

  systemctl daemon-reload
  systemctl enable arc-execution arc-consensus
  systemctl restart arc-execution
  sleep 5
  systemctl restart arc-consensus
  log "Services started. Check: systemctl status arc-execution arc-consensus"
fi

if [[ "$DASHBOARD_INSTALL" == "1" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  DASH_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  if [[ -f "${DASH_ROOT}/package.json" ]]; then
    log "Installing dashboard dependencies..."
    if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y -qq nodejs
    fi
    sudo -u "$ARC_USER" bash -lc "
      cd '$DASH_ROOT'
      npm install
      npm run setup:hooks || true
    "
    ENV_FILE="${DASH_ROOT}/.env.local"
    if [[ ! -f "$ENV_FILE" ]]; then
      cat > "$ENV_FILE" <<ENV
NEXT_PUBLIC_DEFAULT_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_NETWORK_RPC=https://rpc.testnet.arc.network
ARC_RPC_URL=http://127.0.0.1:8545
ARC_EXEC_METRICS_URL=http://127.0.0.1:9001/metrics
ARC_CONS_METRICS_URL=http://127.0.0.1:29000/metrics
ARC_DATA_DIR=${ARC_DATA}
ENV
      chown "$ARC_USER:$ARC_USER" "$ENV_FILE"
    fi
    log "Dashboard env written to ${ENV_FILE}"
    log "Start dashboard: cd ${DASH_ROOT} && npm run dev:local"
    log "Open http://127.0.0.1:3333 (SSH tunnel if remote)"
  fi
fi

log "Verifying RPC (may take time while syncing)..."
sleep 3
if command -v cast >/dev/null 2>&1; then
  cast block-number --rpc-url http://127.0.0.1:8545 || log "RPC not ready yet — wait for sync"
else
  curl -s -X POST http://127.0.0.1:8545 \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' | jq . || true
fi

log "Done. Arc node RPC: http://127.0.0.1:8545 | Metrics: :9001 (EL), :29000 (CL)"
log "Reference: https://docs.arc.io/arc/concepts/running-a-node"

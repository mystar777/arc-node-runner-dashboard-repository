# Arc Node Runner Dashboard

> **Languages:** [English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · [Русский](README.ru.md) · [Español](README.es.md)

A web dashboard for operating an Arc Testnet **full node** and monitoring RPC, sync status, Prometheus metrics, and system resources in one place.  
It integrates with the [official Arc Docs MCP](https://docs.arc.io/ai/mcp) (`https://docs.arc.io/mcp`) so you can search node operations docs via **Arc Docs Assistant**.

> Arc node architecture: [Running a node](https://docs.arc.io/arc/concepts/running-a-node) · Install: [Run an Arc node](https://docs.arc.io/arc/tutorials/run-an-arc-node) · Requirements: [Node requirements](https://docs.arc.io/arc/references/node-requirements)

---

## Features

| Area | Description |
|------|-------------|
| **Node health** | Poll `eth_blockNumber`, `eth_chainId`, `eth_syncing`, `net_version` |
| **EL / CL status** | Execution (Reth) & Consensus (Malachite) health, systemd, IPC, metrics |
| **Sync** | Local head vs network head, sync progress |
| **Blocks / txs** | Recent blocks and latest-block transactions (on-chain RPC) |
| **Prometheus** | EL `:9001`, CL `:29000` metrics proxy & charts |
| **Resources** | CPU, memory, `~/.arc` disk usage (dashboard and node on **same host**) |
| **Live logs** | `journalctl` — `arc-execution` / `arc-consensus` |
| **Arc Docs (MCP)** | `search_arc_docs` — official documentation search |
| **RPC console** | Proxy calls for allowed JSON-RPC methods |
| **UI languages** | English, 한국어, 日本語, 简体中文, Русский, Español (header selector; saved in browser) |

---

## Architecture

```mermaid
flowchart TB
  subgraph Ubuntu["Ubuntu server (recommended)"]
    EL["arc-node-execution\n:8545 RPC · :9001 metrics"]
    CL["arc-node-consensus\n:29000 metrics · :31000 CL RPC"]
    EL <-->|IPC /run/arc/*.ipc| CL
    DASH["Next.js Dashboard\n:3333"]
    DASH -->|JSON-RPC| EL
    DASH -->|/api/node-status| EL
    DASH -->|Prometheus| EL
    DASH -->|Prometheus| CL
    DASH -->|journalctl| CL
  end
  NET["Arc Testnet\n(relay / public RPC)"] --> CL
  MCP["docs.arc.io/mcp"] --> DASH
  USER["Browser"] --> DASH
```

**Data sources**

- **Live data**: RPC, block/tx tables, sync, systemd/IPC/metrics/OS resources (same host), journal logs, MCP doc search
- **Measured / estimated**: block interval (finality), RPC latency charts, head progress charts

---

## Requirements

### Dashboard only (public RPC)

- **Node.js** `>= 18.18` ([Next.js 15](https://nextjs.org/))
- npm 9+

### Full Ubuntu stack (node + dashboard)

| Item | Recommended |
|------|-------------|
| OS | Ubuntu 22.04+ / Debian 12+ |
| CPU | High clock speed (more important than core count) |
| RAM | **64 GB+** |
| Disk | **1 TB+ NVMe** (snapshots & chain data) |
| Network | Stable 24 Mbps+ |

Arc Testnet node binary: **v0.6.0** ([arc-node](https://github.com/circlefin/arc-node))

---

## Quick start

### 1) Clone the repository

```bash
git clone https://github.com/mystar777/arc-node-runner-dashboard-repository.git
cd arc-node-runner-dashboard-repository
```

### 2) Environment variables

```bash
cp .env.example .env.local
# edit as needed — see below
```

> **Windows / dashboard only (no local node):** defaults point at `http://127.0.0.1:8545`, which only works when [arc-node](https://github.com/circlefin/arc-node) is running on the same machine (typically Ubuntu). On Windows, set **public Testnet RPC** in `.env.local` (full example in [Environment variables](#environment-variables)), then **restart** the dev server.

### 3) Install dependencies and run

```bash
npm install
npm run dev:local
```

Open in browser: **http://127.0.0.1:3333**

> On `postinstall`, Git hooks are installed globally and locally to block Cursor `Co-authored-by` trailers. See [Git hooks](#block-cursor-co-authored-by-on-commits).

---

## Ubuntu: install node + dashboard (recommended)

Automated installer based on the official tutorial.

```bash
git clone https://github.com/mystar777/arc-node-runner-dashboard-repository.git
cd arc-node-runner-dashboard-repository
sudo bash scripts/install-arc-node.sh
```

### What the script does

1. Installs build tools and Rust  
2. Builds [arc-node](https://github.com/circlefin/arc-node) `v0.6.0` → `/usr/local/bin`  
3. Creates `~/.arc/execution`, `~/.arc/consensus`  
4. Runs `arc-snapshots download --chain=arc-testnet` (**1–2 hours**, large download)  
5. Registers and starts **systemd** services  
   - `arc-execution` — RPC `127.0.0.1:8545`, metrics `:9001`  
   - `arc-consensus` — metrics `:29000`, CL RPC `:31000`  
6. Runs dashboard `npm install` and creates `.env.local`  

### Install options (environment variables)

```bash
# Skip snapshot (sync takes much longer)
sudo SKIP_SNAPSHOTS=1 bash scripts/install-arc-node.sh

# When binaries are already built
sudo SKIP_BUILD=1 bash scripts/install-arc-node.sh

# Skip dashboard install only
sudo DASHBOARD_INSTALL=0 bash scripts/install-arc-node.sh
```

### Verify sync

```bash
sudo systemctl status arc-execution arc-consensus
journalctl -u arc-execution -f

# Foundry cast (optional)
cast block-number --rpc-url http://127.0.0.1:8545
```

### Start the dashboard (after install)

```bash
cd arc-node-runner-dashboard-repository
npm run dev:local
```

---

## Viewing the dashboard on a remote server

By default, `npm run dev:local` binds to **`127.0.0.1:3333` only**.  
You **cannot** open `http://111.222.333.444:3333` directly unless you change the bind address.

### Option A — SSH tunnel (recommended, secure)

Keep the server on localhost only; on your PC:

```bash
ssh -L 3333:127.0.0.1:3333 ubuntu@111.222.333.444
```

Browser: **http://127.0.0.1:3333**

### Option B — Direct access via public IP

```bash
npm run dev -- -H 0.0.0.0 -p 3333
# production: npm run build && npm start -- -H 0.0.0.0 -p 3333
```

Allow **3333/TCP** in firewall / security group:

```bash
sudo ufw allow 3333/tcp
```

Browser: **http://111.222.333.444:3333**

> If exposed on the public internet, add authentication (reverse proxy, VPN, Basic Auth).

### Option C — Production with HTTPS (Nginx + Let's Encrypt) **recommended for public access**

Automated script for **Ubuntu**: builds the app, runs it as `systemd` on `127.0.0.1:3333`, puts **Nginx** in front on ports **80/443**, and obtains a **Let's Encrypt** certificate for your **public IP or domain**.

```bash
cd arc-node-runner-dashboard-repository
# Edit .env.local first (RPC URLs, etc.)

sudo PUBLIC_HOST=203.0.113.10 \
     LE_EMAIL=you@example.com \
     bash scripts/setup-dashboard-https.sh
```

Open: **https://203.0.113.10/** (use your real public IP or DNS name).

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_HOST` | yes | Public **IPv4/IPv6** or **domain** that points to this server |
| `LE_EMAIL` | yes | Email for Let's Encrypt account / expiry notices |
| `REPO_DIR` | no | Repo path (default: script parent directory) |
| `DASHBOARD_USER` | no | Linux user running the app (default: `ubuntu`) |
| `ENABLE_BASIC_AUTH` | no | Set to `1` to require HTTP Basic Auth in Nginx |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | no | Basic Auth credentials (prompt if password unset) |
| `SKIP_BUILD` | no | `1` to skip `npm ci` / `npm run build` |
| `SKIP_CERTBOT` | no | `1` to reuse existing certs under `/etc/letsencrypt/live/$PUBLIC_HOST/` |

**Prerequisites**

- Ubuntu 22.04+ (same host as the Arc node is typical, but dashboard-only also works)
- **TCP 80 and 443** open in cloud security group / `ufw` (80 is used for ACME validation)
- `PUBLIC_HOST` must match what clients use in the browser (public IP or DNS A record)
- [Let's Encrypt IP certificates](https://letsencrypt.org/docs/ip-addresses/) are supported but **short-lived (~6 days)**; `certbot.timer` auto-renewal is enabled. A **domain name** gives standard 90-day certs and is preferred for production.

**What the script installs**

1. `nginx`, `certbot`, Node 20 if needed  
2. `npm ci` + `npm run build`  
3. `arc-dashboard.service` → `npm run start:prod` (`127.0.0.1:3333`)  
4. Let's Encrypt via `certbot certonly --webroot`  
5. Nginx site: HTTP → HTTPS redirect, TLS termination, proxy to the app  

**After install**

```bash
sudo systemctl status arc-dashboard nginx
sudo journalctl -u arc-dashboard -f
sudo certbot renew --dry-run
```

**Optional Basic Auth** (recommended on the public internet):

```bash
sudo ENABLE_BASIC_AUTH=1 BASIC_AUTH_USER=admin BASIC_AUTH_PASSWORD='your-secret' \
  PUBLIC_HOST=203.0.113.10 LE_EMAIL=you@example.com \
  bash scripts/setup-dashboard-https.sh
```

**Manual production (no TLS)** — not recommended externally:

```bash
npm run build
npm run start:prod   # 127.0.0.1:3333 only; use Nginx script above for HTTPS
```

Deploy files: `deploy/arc-dashboard.service`, `deploy/nginx/arc-dashboard.conf.template`, `scripts/setup-dashboard-https.sh`.

### Remote access vs node data

| Where the dashboard runs | RPC & blocks | Metrics, disk, journal |
|--------------------------|--------------|-------------------------|
| **Same Ubuntu as the node** | ✅ | ✅ |
| Other PC, public RPC only | ✅ | ❌ (warning in UI) |

Metrics (`9001`/`29000`), `journalctl`, and disk usage are live only when **Next.js runs on the same machine as the node**.

---

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEFAULT_RPC` | `http://127.0.0.1:8545` | Browser default RPC |
| `NEXT_PUBLIC_NETWORK_RPC` | `https://rpc.testnet.arc.network` | Network head comparison |
| `ARC_RPC_URL` | `http://127.0.0.1:8545` | Server `/api/node-status` |
| `ARC_NETWORK_RPC_URL` | public testnet RPC | Network block reference |
| `ARC_EXEC_METRICS_URL` | `http://127.0.0.1:9001/metrics` | EL Prometheus |
| `ARC_CONS_METRICS_URL` | `http://127.0.0.1:29000/metrics` | CL Prometheus |
| `ARC_DATA_DIR` | `/home/ubuntu/.arc` | Disk usage path |

**Dashboard only** (no local node — Windows, macOS, or remote UI):

```env
NEXT_PUBLIC_DEFAULT_RPC=https://rpc.testnet.arc.network
NEXT_PUBLIC_NETWORK_RPC=https://rpc.testnet.arc.network
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_NETWORK_RPC_URL=https://rpc.testnet.arc.network
```

After changing `.env.local`, restart `npm run dev:local`. You can also set the RPC URL under **Settings** in the UI (stored in `localStorage`).

Official Testnet HTTP RPC ([RPC endpoints](https://docs.arc.io/arc/references/rpc-endpoints)): `https://rpc.testnet.arc.network`

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (default `0.0.0.0:3000`) |
| `npm run dev:local` | `127.0.0.1:3333` — local / SSH tunnel |
| `npm run build` | Production build |
| `npm run start` | Production server (default port 3000) |
| `npm run start:prod` | Production on `127.0.0.1:3333` (for Nginx reverse proxy) |
| `npm run setup:hooks` | Install Git hooks blocking `Co-authored-by: Cursor` |
| `npm run commit:safe -- "message"` | Commit without Cursor wrapper |

On Windows PowerShell, if `npm.ps1` execution policy fails:

```powershell
npm.cmd run dev:local
# or
.\dev-local.bat
```

---

## Arc Docs MCP

The dashboard **Arc Docs Assistant** tab connects to [Arc MCP](https://docs.arc.io/ai/mcp).

- Endpoint: `https://docs.arc.io/mcp`
- Tools: `search_arc_docs`, `query_docs_filesystem_arc_docs`
- No authentication required

For Cursor IDE, see the `mcp.json` example in [Arc MCP docs](https://docs.arc.io/ai/mcp).

```json
{
  "mcpServers": {
    "arc-docs": {
      "url": "https://docs.arc.io/mcp"
    }
  }
}
```

---

## API (dashboard)

| Path | Method | Description |
|------|--------|-------------|
| `/api/rpc` | POST | JSON-RPC proxy (allowed URLs & methods only) |
| `/api/node-status` | GET | RPC, sync, systemd, metrics, resources, alerts |
| `/api/arc-mcp` | POST | Arc docs MCP search |
| `/api/logs` | GET | `journalctl` (Linux, same host) |

### RPC proxy allowed URLs

- `http://127.0.0.1:*`, `http://localhost:*`
- `https://*.arc.network`

### Allowed RPC methods (partial)

`eth_blockNumber`, `eth_chainId`, `eth_syncing`, `eth_getBlockByNumber`, `eth_gasPrice`, `web3_clientVersion`, etc. — see `app/api/rpc/route.ts`.

### `/api/rpc` errors (502)

The route proxies JSON-RPC to the URL in the request body. **502** means the dashboard could not reach that RPC endpoint (not a broken Next.js route).

| `code` | Typical cause |
|--------|----------------|
| `connection_refused` | Nothing listening on the URL (e.g. local `127.0.0.1:8545` without a running node) |
| `timeout` | RPC did not respond within 25s |
| `http` | Upstream returned a non-2xx HTTP status |

The JSON body includes `error`, `hint`, and `rpcUrl`. Example when the local node is stopped:

```json
{
  "ok": false,
  "code": "connection_refused",
  "error": "Connection refused — no RPC server is listening (http://127.0.0.1:8545) — …",
  "hint": "… set NEXT_PUBLIC_DEFAULT_RPC=https://rpc.testnet.arc.network in .env.local …"
}
```

Logic: `lib/rpcFetchError.ts`.

---

## Project structure

```
├── app/
│   ├── api/              # RPC, node-status, logs, arc-mcp
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── arc-dashboard/    # Dashboard UI, charts, i18n.ts
├── lib/                  # RPC, Prometheus, URL allowlist, rpcFetchError
├── deploy/
│   ├── arc-dashboard.service      # systemd unit template
│   └── nginx/arc-dashboard.conf.template
├── scripts/
│   ├── install-arc-node.sh        # Ubuntu node installer
│   ├── setup-dashboard-https.sh   # Nginx + Let's Encrypt HTTPS
│   ├── install-git-hooks.mjs
│   ├── git-commit-safe.mjs
│   └── ensure-node.mjs
├── .githooks/            # Block Co-authored-by
├── .env.example
└── dev-local.bat         # Windows dev:local
```

---

## Block Cursor `Co-authored-by` on commits

The Cursor terminal may append `Co-authored-by: Cursor <cursoragent@cursor.com>` to commits.

- **Global hooks**: `~/.githooks-global` (`npm run setup:hooks` / `postinstall`)
- **Safe commit**: `npm run commit:safe -- "message"`

Before push:

```bash
git log -1 --format=%B
```

---

## Arc Testnet reference

| Item | Value |
|------|-------|
| Chain ID | `5042002` |
| Gas token | USDC |
| Public RPC | `https://rpc.testnet.arc.network` |
| Explorer | [testnet.arcscan.app](https://testnet.arcscan.app/) |
| Faucet | [faucet.circle.com](https://faucet.circle.com/) |

Node ports ([Node requirements](https://docs.arc.io/arc/references/node-requirements)):

| Port | Use |
|------|-----|
| 8545 | Execution JSON-RPC |
| 9001 | Execution Prometheus |
| 29000 | Consensus Prometheus |
| 31000 | Consensus RPC |

---

## Troubleshooting

### `You are using Node.js 16.x` / Next.js version error

Install Node **18.18+** (recommended **20 LTS**) and retry.

```bash
node -v   # v20.x recommended
```

### PowerShell `npm.ps1` execution policy error

```powershell
npm.cmd run dev:local
```

### `/api/rpc` returns **502** or browser shows `fetch failed`

1. Open the failed request in DevTools → **Response**. Check `code` and `hint`.
2. If `connection_refused` and URL is `http://127.0.0.1:8545`: no Arc node on this machine. Use public RPC in `.env.local` (see [Environment variables](#environment-variables)) or start the node on Ubuntu.
3. Test the proxy directly:

```bash
curl -s -X POST http://127.0.0.1:3333/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"url":"https://rpc.testnet.arc.network","method":"eth_blockNumber"}'
```

Should return `"ok":true`. If public RPC works but local does not, your setup is correct for dashboard-only mode.

### RPC `connection refused` (local node)

- Is the node running? `systemctl status arc-execution`
- URL: `http://127.0.0.1:8545` (dashboard on **same server**)
- Confirm port 8545 is not exposed externally (default is localhost only)
- Arc Testnet RPC URLs: [RPC endpoints](https://docs.arc.io/arc/references/rpc-endpoints) (primary: `https://rpc.testnet.arc.network`)

### Metrics, logs, or disk empty

Run the dashboard on the **same Ubuntu host as the node**. On Windows with public RPC only, RPC and blocks are live; metrics/logs/disk are not.

### Snapshot download takes a long time

Expected (tens of GB, 1–2 hours). `SKIP_SNAPSHOTS=1` makes initial sync much longer.

### Chain ID mismatch

Confirm `.env` and node use **Arc Testnet** (`5042002`). Check genesis and `--chain arc-testnet` in [Run an Arc node](https://docs.arc.io/arc/tutorials/run-an-arc-node).

### Let's Encrypt / HTTPS fails

- Confirm **port 80** is reachable from the internet (`curl -I http://YOUR_IP/.well-known/acme-challenge/test` from outside).
- `PUBLIC_HOST` must be the **public** IP or hostname, not `127.0.0.1`.
- For **IP-only** certs, see [Let's Encrypt IP limits](https://letsencrypt.org/docs/ip-addresses/) (~6-day lifetime, frequent renewal).
- Logs: `sudo journalctl -u nginx -n 50`, `sudo cat /var/log/letsencrypt/letsencrypt.log`.
- Re-run after fixing firewall: same `setup-dashboard-https.sh` command (or `SKIP_BUILD=1` if already built).

### HTTPS works but dashboard shows RPC errors

- On the server, set `.env.local` to local `http://127.0.0.1:8545` if the Arc node runs there, or public RPC if not.
- Restart: `sudo systemctl restart arc-dashboard`.

---

## License

See [LICENSE](./LICENSE) for this repository.

Arc network and `arc-node` binaries follow Circle / Arc project terms and their repository licenses.

---

## Links

- [Arc Network](https://docs.arc.io/arc-chain)
- [Integrate with Arc](https://docs.arc.io/integrate)
- [Arc MCP server](https://docs.arc.io/ai/mcp)
- [RPC endpoints (Testnet)](https://docs.arc.io/arc/references/rpc-endpoints)
- [Deploy node as systemd service](https://docs.arc.io/arc/tutorials/deploy-node-as-service)
- [Monitor a node](https://docs.arc.io/arc/tutorials/monitor-a-node)

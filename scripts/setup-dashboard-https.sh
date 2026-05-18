#!/usr/bin/env bash
# Production dashboard: systemd + Nginx + Let's Encrypt (domain or IP.nip.io)
# If PUBLIC_HOST is an IPv4 address, the script issues the certificate for
# <PUBLIC_HOST>.nip.io and redirects plain HTTP on the IP to that HTTPS name.
# Docs: https://docs.arc.io/arc/references/rpc-endpoints
set -euo pipefail

PUBLIC_HOST="${PUBLIC_HOST:-}"
CERT_HOST="${CERT_HOST:-}"
LE_EMAIL="${LE_EMAIL:-}"
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DASHBOARD_USER="${DASHBOARD_USER:-${SUDO_USER:-ubuntu}}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3333}"
ENABLE_BASIC_AUTH="${ENABLE_BASIC_AUTH:-0}"
BASIC_AUTH_USER="${BASIC_AUTH_USER:-admin}"
SKIP_CERTBOT="${SKIP_CERTBOT:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

log() { echo "[setup-dashboard-https] $*"; }
die() { echo "[setup-dashboard-https] ERROR: $*" >&2; exit 1; }

if [[ "$(id -u)" -ne 0 ]]; then
  die "Run as root: sudo LE_EMAIL=you@example.com bash scripts/setup-dashboard-https.sh"
fi

[[ -n "$LE_EMAIL" ]] || die "Set LE_EMAIL for Let's Encrypt (e.g. LE_EMAIL=admin@example.com)"

if ! command -v apt-get >/dev/null 2>&1; then
  die "Ubuntu/Debian with apt-get required."
fi

if [[ ! -f "$REPO_DIR/package.json" ]]; then
  die "REPO_DIR does not look like the dashboard repo: $REPO_DIR"
fi

is_ipv4() {
  [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

detect_public_ipv4() {
  curl -4fsS --max-time 8 https://api.ipify.org 2>/dev/null \
    || curl -4fsS --max-time 8 https://ifconfig.me/ip 2>/dev/null \
    || true
}

if [[ -z "$PUBLIC_HOST" ]]; then
  PUBLIC_HOST="$(detect_public_ipv4)"
  [[ -n "$PUBLIC_HOST" ]] || die "Could not auto-detect public IPv4. Set PUBLIC_HOST=YOUR_PUBLIC_IP_OR_DOMAIN."
  log "Detected public IPv4: $PUBLIC_HOST"
fi

if [[ -z "$CERT_HOST" ]]; then
  if is_ipv4 "$PUBLIC_HOST"; then
    CERT_HOST="${PUBLIC_HOST}.nip.io"
  else
    CERT_HOST="$PUBLIC_HOST"
  fi
fi

SERVER_NAMES="$CERT_HOST"
if [[ "$PUBLIC_HOST" != "$CERT_HOST" ]]; then
  SERVER_NAMES="$PUBLIC_HOST $CERT_HOST"
fi

if is_ipv4 "$PUBLIC_HOST" && [[ "$CERT_HOST" == "$PUBLIC_HOST" ]]; then
  die "Pure IP HTTPS certificates are not supported by this script. Use CERT_HOST=${PUBLIC_HOST}.nip.io or attach a real domain."
fi

log "Public host: $PUBLIC_HOST"
log "Certificate host: $CERT_HOST"

export DEBIAN_FRONTEND=noninteractive
log "Installing nginx, certbot, Node prerequisites..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx apache2-utils gettext-base curl ca-certificates

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'parseInt(process.versions.node.split(".")[0], 10)')"
fi
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  log "Installing Node.js 20.x (NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

NPM_BIN="$(command -v npm)"

if [[ "$SKIP_BUILD" != "1" ]]; then
  log "Building Next.js app in $REPO_DIR ..."
  sudo -u "$DASHBOARD_USER" bash -c "cd '$REPO_DIR' && npm ci && npm run build"
else
  log "SKIP_BUILD=1 — skipping npm ci / build"
fi

if [[ ! -f "$REPO_DIR/.env.local" ]]; then
  log "No .env.local — copying .env.example (edit RPC URLs if needed)"
  sudo -u "$DASHBOARD_USER" cp "$REPO_DIR/.env.example" "$REPO_DIR/.env.local"
fi

log "Installing systemd unit arc-dashboard.service ..."
sed -e "s|%REPO_DIR%|$REPO_DIR|g" \
    -e "s|%DASHBOARD_USER%|$DASHBOARD_USER|g" \
    -e "s|%NPM_BIN%|$NPM_BIN|g" \
    "$REPO_DIR/deploy/arc-dashboard.service" > /etc/systemd/system/arc-dashboard.service

systemctl daemon-reload
systemctl enable arc-dashboard
systemctl restart arc-dashboard

log "Waiting for dashboard on 127.0.0.1:${DASHBOARD_PORT} ..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${DASHBOARD_PORT}/" >/dev/null 2>&1; then
    log "Dashboard is up."
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    die "Dashboard did not start. Check: journalctl -u arc-dashboard -n 50"
  fi
  sleep 2
done

mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

SSL_DIR="/etc/letsencrypt/live/${CERT_HOST}"
SSL_CERT="${SSL_DIR}/fullchain.pem"
SSL_KEY="${SSL_DIR}/privkey.pem"

if [[ "$SKIP_CERTBOT" != "1" ]]; then
  log "Requesting Let's Encrypt certificate for ${CERT_HOST} ..."
  log "Ports 80 and 443 must be reachable from the internet on this host."

  # Temporary HTTP-only site for ACME + certbot.
  cat > /etc/nginx/sites-available/arc-dashboard <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAMES};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://${CERT_HOST}\$request_uri;
    }
}
EOF
  ln -sf /etc/nginx/sites-available/arc-dashboard /etc/nginx/sites-enabled/arc-dashboard
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx

  certbot certonly --webroot -w /var/www/certbot \
    -d "$CERT_HOST" \
    --email "$LE_EMAIL" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring

  if [[ ! -f "$SSL_CERT" ]]; then
    die "Certificate not found at $SSL_CERT. Check DNS/firewall for $CERT_HOST and make sure port 80 is reachable."
  fi

  log "Enabling certbot renewal timer..."
  systemctl enable certbot.timer 2>/dev/null || true
  systemctl start certbot.timer 2>/dev/null || true
else
  log "SKIP_CERTBOT=1 — using existing certs at $SSL_DIR"
  [[ -f "$SSL_CERT" ]] || die "Missing $SSL_CERT"
fi

BASIC_AUTH_BLOCK=""
if [[ "$ENABLE_BASIC_AUTH" == "1" ]]; then
  HTPASSWD_FILE="/etc/nginx/.arc-dashboard-htpasswd"
  if [[ -n "${BASIC_AUTH_PASSWORD:-}" ]]; then
    htpasswd -bc "$HTPASSWD_FILE" "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD"
  else
    log "Enter password for HTTP Basic Auth user: $BASIC_AUTH_USER"
    htpasswd -c "$HTPASSWD_FILE" "$BASIC_AUTH_USER"
  fi
  chmod 640 "$HTPASSWD_FILE"
  chown root:www-data "$HTPASSWD_FILE"
  BASIC_AUTH_BLOCK=$'auth_basic "Arc Dashboard";\n    auth_basic_user_file /etc/nginx/.arc-dashboard-htpasswd;'
fi

export CERT_HOST SERVER_NAMES DASHBOARD_PORT SSL_CERT SSL_KEY BASIC_AUTH_BLOCK
envsubst '${CERT_HOST} ${SERVER_NAMES} ${DASHBOARD_PORT} ${SSL_CERT} ${SSL_KEY} ${BASIC_AUTH_BLOCK}' \
  < "$REPO_DIR/deploy/nginx/arc-dashboard.conf.template" \
  > /etc/nginx/sites-available/arc-dashboard

nginx -t
systemctl reload nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp comment 'arc-dashboard-http-acme' || true
  ufw allow 443/tcp comment 'arc-dashboard-https' || true
fi

log "Done."
log "  HTTPS:  https://${CERT_HOST}/"
if [[ "$PUBLIC_HOST" != "$CERT_HOST" ]]; then
  log "  HTTP:   http://${PUBLIC_HOST}/ redirects to https://${CERT_HOST}/"
  log "  Note:   https://${PUBLIC_HOST}/ may show a browser certificate warning because the certificate is for ${CERT_HOST}."
else
  log "  HTTP:   redirects to HTTPS"
fi
log "  App:    systemctl status arc-dashboard"
log "  Nginx:  systemctl status nginx"
log "  Renew:  sudo certbot renew --dry-run"
if is_ipv4 "$PUBLIC_HOST"; then
  log "  DNS:    ${CERT_HOST} is provided by nip.io and resolves to ${PUBLIC_HOST}."
fi

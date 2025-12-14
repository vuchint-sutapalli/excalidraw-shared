#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/nginx/sites-available/slategpt.conf"
ENABLED_FILE="/etc/nginx/sites-enabled/slategpt.conf"
DEFAULT_SITE="/etc/nginx/sites-enabled/default"

sudo DEBIAN_FRONTEND=noninteractive apt update -y
sudo DEBIAN_FRONTEND=noninteractive apt install -y nginx

sudo tee $CONFIG_FILE > /dev/null <<'EOF'
# Frontend – slategpt.app
server {
  listen 80;
  server_name slategpt.app www.slategpt.app;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# API – prod.api.slategpt.app
server {
  listen 80;
  server_name prod.api.slategpt.app;

  client_max_body_size 10m;

  location / {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# WebSocket – prod.ws.slategpt.app
server {
  listen 80;
  server_name prod.ws.slategpt.app;

  location / {
    proxy_pass http://localhost:3002;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo rm -f $DEFAULT_SITE
sudo ln -sf $CONFIG_FILE $ENABLED_FILE

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

sudo systemctl status nginx --no-pager
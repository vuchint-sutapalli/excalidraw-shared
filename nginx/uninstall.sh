#!/usr/bin/env bash
set -euo pipefail


sudo systemctl stop nginx || true
sudo systemctl disable nginx || true


sudo DEBIAN_FRONTEND=noninteractive apt-get purge -y \
nginx nginx-common nginx-core nginx-full || true


sudo rm -rf /etc/nginx /var/log/nginx /var/www/html || true


sudo apt-get autoremove -y
sudo apt-get clean


echo "✅ Nginx fully removed"
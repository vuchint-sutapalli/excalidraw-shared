# Nginx Reverse Proxy Setup & Health Check

This document outlines the Nginx reverse proxy setup for the Slategpt application and provides instructions for performing health checks.

---

## 🏗️ Setup Overview

### Services

| Name          | Port | Description                    |
| ------------- | ---- | ------------------------------ |
| `fe-server`   | 3000 | Frontend client (Next.js)      |
| `http-server` | 3001 | HTTP API server (Express/Node) |
| `ws-server`   | 3002 | WebSocket server (Node)        |

### Nginx Reverse Proxy

- Listens on **HTTP port 80** (HTTPS will be configured later with Certbot)
- Routes traffic to different internal services based on `Host` header:

| Host                           | Proxy Target                      |
| ------------------------------ | --------------------------------- |
| slategpt.app, www.slategpt.app | http://localhost:3000             |
| prod.api.slategpt.app          | http://localhost:3001             |
| prod.ws.slategpt.app           | http://localhost:3002 (WebSocket) |

- Common proxy headers:
  - `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- WebSocket-specific headers:
  - `Upgrade: websocket`, `Connection: upgrade`

---

## ⚙️ Nginx Commands

### Test Configuration

```bash
sudo nginx -t

#Reload Nginx
sudo systemctl reload nginx


#Check Service Status
sudo systemctl status nginx

#🩺 Health Check Instructions
1️⃣ Check Nginx is listening
sudo ss -tulpn | grep nginx
#Expected output:
tcp   LISTEN 0  511  0.0.0.0:80   0.0.0.0:*  users:(("nginx",pid=...,fd=...))
2️⃣ Verify application processes (PM2)
pm2 list

Ensure all 3 processes (fe-server, http-server, ws-server) are online.

3️⃣ Test HTTP routing
Frontend:

curl -I -H "Host: slategpt.app" http://127.0.0.1
Expected:

HTTP 200 or redirect (307) if using Next.js
x-nextjs-cache header should appear



API Server:
curl -I -H "Host: prod.api.slategpt.app" http://127.0.0.1
Expected:

HTTP 200

X-Powered-By: Express header


WebSocket Server:
curl -i \
  -H "Host: prod.ws.slategpt.app" \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://127.0.0.1


Expected:

HTTP 400 Bad Request if Sec-WebSocket-Key missing (normal behavior)

Indicates Nginx is correctly routing WebSocket traffic




4️⃣ Check Logs
Access logs
sudo tail -f /var/log/nginx/access.log
Error logs
sudo tail -f /var/log/nginx/error.log


5️⃣ (Future) HTTPS Check

Once Certbot certificates are issued:
curl -I https://slategpt.app
curl -I https://prod.api.slategpt.app
Expected:

HTTP/2 200

No certificate warnings (for production certs)

⚡ Notes

Only ports 80 (HTTP) and 443 (HTTPS) are exposed externally.

Internal service ports (3000, 3001, 3002) are not publicly exposed.

WebSocket server relies on correct Upgrade headers to function.
```

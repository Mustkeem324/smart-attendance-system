# APEX Electronics — Enterprise Web Production Deployment Guide

## 1. Production Architecture Overview

In production, APEX Electronics runs as a high-availability, containerized Next.js cluster fronted by an Nginx reverse proxy with TLS 1.3 termination, caching static assets and routing API requests to Node.js worker processes.

```
       [ Public Internet (Clients & Android Apps) ]
                          │
                          ▼
            [ Cloudflare / Route 53 DNS ]
                          │
                          ▼
           [ Nginx Reverse Proxy (Port 443) ]
           ├─ /sw.js, /manifest.json, /icons/* (Direct Cache)
           └─ /api/*, /* (Pass to Next.js Cluster)
                          │
                          ▼
      [ PM2 / Docker Next.js Cluster (Port 3000) ]
              ├── Worker 1 (Core 1)
              ├── Worker 2 (Core 2)
              └── Worker 3 (Core 3)
                     │          │
         ┌───────────┘          └───────────┐
         ▼                                  ▼
[ PostgreSQL 16 Replica Set ]      [ MongoDB 7.0 Replica Set ]
 (Users, Roles, HRMS, Audit)        (Catalogs, Orders, Visits, Ledger)
```

---

## 2. Dockerized Multi-Stage Container Setup

Create a `Dockerfile` in the project root:

```dockerfile
# Stage 1: Dependency resolution
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Production Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 3. Production Process Management via PM2

When deploying directly to Linux VMs (Ubuntu 22.04 / 24.04 LTS), use PM2 to manage clustering, zero-downtime reloads, and automatic crash recovery:

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'apex-distribution-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/home/nx-pro/smart-attendance-system',
      instances: 'max', // Scales across all CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

Launch with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 4. Nginx Reverse Proxy & SSL Configuration

Create `/etc/nginx/sites-available/apex-electronics.conf`:

```nginx
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name distribution.apex-electronics.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name distribution.apex-electronics.com;

    ssl_certificate /etc/letsencrypt/live/distribution.apex-electronics.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/distribution.apex-electronics.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip / Brotli Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # PWA Service Worker (Never Cache)
    location /sw.js {
        proxy_pass http://nextjs_upstream;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # Static Web Assets (Long-term Caching)
    location /_next/static/ {
        proxy_pass http://nextjs_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # App Shell & APIs
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

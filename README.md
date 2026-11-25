# KigaliPulse – Smart Weather and Air Quality Intelligence Platform

## 1. Project Overview

KigaliPulse is a web-based weather and air quality intelligence platform designed to help users make informed daily decisions using weather forecasts and air quality information.

The application retrieves real-time weather and air quality information from Open-Meteo APIs and presents it through an interactive dashboard.

## 2. Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js and Express.js
- **External APIs:** Open-Meteo Weather API, Air Quality API and Geocoding API
- **Caching:** NodeCache and browser localStorage
- **Web server:** NGINX
- **Load balancer:** HAProxy
- **Process management:** systemd
- **Deployment environment:** Ubuntu 20.04.6 LTS
- **Version control:** Git and GitHub

## 3. System Architecture

The application uses a multi-tier architecture consisting of one load balancer and two application servers.

### Infrastructure

| Server | Public IP | Responsibility |
|---|---|---|
| Lb01 | 18.170.216.16 | HAProxy load balancing |
| Web01 | 35.176.96.139 | KigaliPulse application |
| Web02 | 35.176.161.100 | KigaliPulse application |

### Request flow

1. Users access `https://www.tsungie.tech`.
2. HAProxy receives incoming HTTP/HTTPS requests.
3. HTTP requests are redirected to HTTPS.
4. HAProxy distributes requests using the Round Robin algorithm.
5. Requests are forwarded to Web01 or Web02.
6. NGINX on the selected server forwards requests to the Node.js application on port 3000.
7. Express processes requests and communicates with Open-Meteo APIs when required.

## 4. External API Integration

KigaliPulse uses the following Open-Meteo services:

| API | Purpose |
|---|---|
| Weather Forecast API | Current weather and forecasts |
| Air Quality API | Air quality and pollutant information |
| Geocoding API | City search and geographic coordinates |

API documentation:

- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/air-quality-api
- https://open-meteo.com/en/docs/geocoding-api

API attribution: Weather and air quality data are provided by Open-Meteo. Refer to its documentation and applicable data licensing terms.

## 5. Running Locally

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/tmachingur-code/kigalipulse.git
cd kigalipulse
```

Install dependencies:

```bash
npm ci
```

Create the environment file:

```bash
cp .env.example .env
```

Start the application:

```bash
npm run dev
```

Open:

`http://localhost:3000`

### Available scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the application |
| `npm run dev` | Start in development mode |
| `npm run check` | Check server JavaScript syntax |
| `npm test` | Run automated tests |

## 6. Deployment Instructions

The application was deployed on two Ubuntu application servers.

### Web01 and Web02

Install prerequisites:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
```

Install Node.js 22 using the NodeSource setup instructions.

Clone the application:

```bash
git clone https://github.com/tmachingur-code/kigalipulse.git
cd kigalipulse
```

Install dependencies:

```bash
npm ci
```

Create environment configuration:

```bash
cp .env.example .env
```

Validate the application:

```bash
npm run check
```

### NGINX configuration

NGINX acts as a reverse proxy on both application servers.

Configuration file:

`/etc/nginx/sites-available/default`

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### systemd service

Both application servers use systemd to keep KigaliPulse running.

Service file:

`/etc/systemd/system/kigalipulse.service`

```ini
[Unit]
Description=KigaliPulse Weather and Air Quality Platform
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/kigalipulse
EnvironmentFile=/home/ubuntu/kigalipulse/.env
ExecStart=/usr/bin/node /home/ubuntu/kigalipulse/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kigalipulse
sudo systemctl start kigalipulse
```

Check service status:

```bash
sudo systemctl status kigalipulse
```

## 7. HAProxy Configuration

HAProxy runs on Lb01 and distributes traffic between the two application servers.

Configuration file:

`/etc/haproxy/haproxy.cfg`

The backend uses Round Robin balancing and application-level health checks:

```haproxy
backend web_servers
        balance roundrobin

        option httpchk GET /api/health
        http-check expect status 200

        server web01 35.176.96.139:80 check inter 2s fall 2 rise 2
        server web02 35.176.161.100:80 check inter 2s fall 2 rise 2
```

The frontend listens on HTTP port 80 and HTTPS port 443. HTTP traffic is redirected to HTTPS.

Validate configuration:

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
```

Reload HAProxy:

```bash
sudo systemctl reload haproxy
```

Check service:

```bash
sudo systemctl status haproxy
```

## 8. Testing and Verification

The following deployment tests were performed.

| Test | Expected result | Observed result |
|---|---|---|
| Web01 health endpoint | HTTP 200 | Passed |
| Web02 health endpoint | HTTP 200 | Passed |
| NGINX reverse proxy | HTTP 200 | Passed |
| HTTP to HTTPS redirect | HTTP 301 | Passed |
| HTTPS domain access | HTTP 200 | Passed |
| HAProxy configuration validation | Valid | Passed |
| Round Robin distribution | Both servers receive traffic | Passed |
| Application-level health checks | Detect unhealthy backend | Passed |
| Failover test | Traffic continues through healthy server | Passed |

### Round Robin test

Ten requests were sent through HAProxy.

- Web01 handled 5 requests.
- Web02 handled 5 requests.

### Failover test

The KigaliPulse systemd service was temporarily stopped on Web01.

HAProxy detected the failed application health check and directed all six subsequent test requests to Web02.

All six requests returned HTTP 200.

Web01 was subsequently restored.

## 9. Production Access

Application URL:

https://www.tsungie.tech

Health endpoint:

https://www.tsungie.tech/api/health

GitHub repository:

https://github.com/tmachingur-code/kigalipulse

## 10. Environment Configuration

The application uses the following environment variables:

| Variable | Default value | Purpose |
|---|---|---|
| PORT | 3000 | Application port |
| HOST | 0.0.0.0 | Application host configuration |
| CACHE_TTL_SECONDS | 600 | Cache duration |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate-limit window |
| RATE_LIMIT_MAX_REQUESTS | 120 | Maximum requests per window |

Do not commit actual `.env` files or credentials to GitHub.

## 11. Project Repository

Source code and future updates:

https://github.com/tmachingur-code/kigalipulse

---

**Project:** KigaliPulse – Smart Weather and Air Quality Intelligence Platform

**Deployment architecture:** Two application servers behind an HAProxy load balancer.

## 12. Challenges Encountered and Solutions

During the development and deployment of KigaliPulse, several technical challenges were encountered.

### 1. Node.js was not installed on the provided servers

**Challenge:** Web01 and Web02 initially did not have Node.js or npm installed.

**Solution:** Installed Node.js 22 and npm on both Ubuntu servers to provide the runtime environment required by the application.

### 2. NGINX returned 502 Bad Gateway

**Challenge:** After configuring NGINX as a reverse proxy, requests returned 502 errors when the Node.js application was not running.

**Solution:** Verified the application process and configured systemd to run KigaliPulse continuously in the background, with automatic restart capabilities.

### 3. HAProxy did not initially detect application failure

**Challenge:** During failover testing, HAProxy continued sending traffic to Web01 even when the Node.js application had stopped. NGINX was still running, so the original TCP health check considered the server available.

**Solution:** Replaced basic TCP health checks with HTTP health checks against `/api/health`, requiring an HTTP 200 response. This allowed HAProxy to detect application-level failures and redirect traffic to Web02.

### 4. Maintaining application availability

**Challenge:** The application needed to remain available even when one application server became unavailable.

**Solution:** Deployed identical application instances on Web01 and Web02 and configured HAProxy to distribute requests using Round Robin balancing, with health checks and failover.

These improvements resulted in successful load distribution and failover tests.

## 13. Application Access

The KigaliPulse dashboard is publicly accessible through:

https://www.tsungie.tech

No application login or password is currently required to access the dashboard.

The application uses publicly accessible Open-Meteo API endpoints, which do not require an API key for the endpoints used in this project.

No SSH private keys, server passwords or other deployment secrets are included in this repository.

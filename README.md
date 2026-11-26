# KigaliPulse – Smart Weather and Air Quality Intelligence Platform

## 1. Project Overview

KigaliPulse is a web-based weather and air quality intelligence platform designed to help users make informed daily decisions using weather forecasts and air quality information.

The application retrieves weather and air quality information from external APIs and presents it through an interactive dashboard.

KigaliPulse also provides location search functionality for Kigali neighbourhoods and administrative areas through the Ahantu API. For international locations, the application uses Open-Meteo Geocoding as a fallback.

The platform is deployed using a multi-tier architecture with two application servers behind an HAProxy load balancer to support traffic distribution and application availability.

## 2. Technologies Used

| Category | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Weather API | Open-Meteo Weather Forecast API |
| Air quality API | Open-Meteo Air Quality API |
| Geocoding API | Open-Meteo Geocoding API |
| Kigali location search | Ahantu API |
| Caching | NodeCache, browser localStorage |
| Web server | NGINX |
| Load balancer | HAProxy |
| Process management | systemd |
| Operating system | Ubuntu 20.04.6 LTS |
| Version control | Git and GitHub |

## 3. System Architecture

KigaliPulse uses a multi-tier architecture consisting of one load balancer and two application servers.

### 3.1 Infrastructure

| Server | Public IP | Responsibility |
|---|---|---|
| Lb01 | 18.170.216.16 | HAProxy load balancing |
| Web01 | 35.176.96.139 | KigaliPulse application |
| Web02 | 35.176.161.100 | KigaliPulse application |

### 3.2 Request flow

1. Users access the application through `https://www.tsungie.tech`.
2. HAProxy receives incoming HTTP and HTTPS requests.
3. HTTP requests are redirected to HTTPS.
4. HAProxy distributes incoming requests using the Round Robin algorithm.
5. Requests are forwarded to either Web01 or Web02.
6. NGINX on the selected server acts as a reverse proxy and forwards requests to the Node.js application running on port 3000.
7. Express processes the requests and communicates with the relevant external APIs.
8. The application returns the requested information to the user.

### 3.3 Architecture diagram

```text
                  USERS
                    |
                    v
           www.tsungie.tech
                    |
                    v
             LB01 - HAProxy
            HTTPS / Round Robin
                    |
              +-----+-----+
              |           |
              v           v
            WEB01        WEB02
            NGINX        NGINX
              |           |
              v           v
          Node.js App  Node.js App
           Port 3000    Port 3000
              |           |
              +-----+-----+
                    |
                    v
              External APIs
             /      |       \
            /       |        \
       Open-Meteo  Open-Meteo  Ahantu
        Weather    Air Quality  API
       Geocoding
```

## 4. External API Integration

KigaliPulse integrates Open-Meteo and Ahantu to provide weather, air quality and location information.

### 4.1 Open-Meteo APIs

Open-Meteo provides the weather, air quality and geocoding data used by the application.

| API | Purpose |
|---|---|
| Weather Forecast API | Retrieves current weather and forecast information |
| Air Quality API | Retrieves air quality and pollutant information |
| Geocoding API | Searches for international locations and geographic coordinates |

Documentation:

- Weather API: https://open-meteo.com/en/docs
- Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- Geocoding API: https://open-meteo.com/en/docs/geocoding-api

### 4.2 Ahantu API

The Ahantu API provides location search functionality for Kigali neighbourhoods and administrative areas.

The integration retrieves location information including:

- Location name and address
- Province and district
- Sector, cell and village
- Latitude and longitude
- Location type and precision information

The application filters search results to the City of Kigali to avoid returning similarly named locations outside Kigali.

**Location search process:**

1. The user enters a location in the search field.
2. The backend sends a request to the Ahantu API.
3. Results belonging to the City of Kigali are filtered and prioritised.
4. If no matching Kigali locations are found, the application falls back to Open-Meteo Geocoding.
5. The selected location's coordinates are used to retrieve weather and air quality information.

Ahantu developer documentation: https://www.ahantu.rw/developers

The Ahantu API key is stored in the server-side `.env` file and is not exposed in frontend code.

## 5. Local Installation and Configuration

### 5.1 Prerequisites

Ensure that the following are installed:

- Node.js 22 or a compatible version
- npm
- Git

### 5.2 Clone the repository

```bash
git clone https://github.com/tmachingur-code/kigalipulse.git
cd kigalipulse
```

### 5.3 Install dependencies

```bash
npm ci
```

### 5.4 Configure environment variables

Create a local environment file:

```bash
cp .env.example .env
```

Configure the environment variables:

```env
PORT=3000
HOST=0.0.0.0
CACHE_TTL_SECONDS=600
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=120
AHANTU_API_KEY=your_actual_api_key
```

Replace the placeholder with a valid Ahantu API key.

Keep the actual key private. Never commit the `.env` file to GitHub.

### 5.5 Run the application

Start the development server:

```bash
npm run dev
```

Open the application in your browser:

`http://localhost:3000`

### 5.6 Available commands

| Command | Purpose |
|---|---|
| `npm start` | Starts the application |
| `npm run dev` | Starts the development server |
| `npm run check` | Checks server JavaScript syntax |
| `npm test` | Runs automated tests |

## 6. Application API Endpoints

The backend exposes REST API endpoints for application functionality.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Checks application health |
| `/api/connection` | GET | Checks external connectivity |
| `/api/city?name=Kigali` | GET | Searches for a city using geocoding |
| `/api/locations?q=Kimihurura` | GET | Searches Kigali locations using Ahantu |
| `/api/weather` | GET | Retrieves weather information |
| `/api/air-quality` | GET | Retrieves air quality information |

The weather and air quality endpoints use the location coordinates required by the backend. Refer to the route implementation in `src/routes/api.routes.js` for the exact request parameters.

## 7. Deployment Instructions

KigaliPulse was deployed on two Ubuntu application servers behind an HAProxy load balancer.

### 7.1 Application server setup

The following steps were performed on Web01 and Web02.

Install the required packages:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
```

Install Node.js 22 and npm using the official NodeSource installation instructions.

Clone the repository:

```bash
git clone https://github.com/tmachingur-code/kigalipulse.git
cd kigalipulse
```

Install dependencies:

```bash
npm ci
```

Configure the environment file:

```bash
nano .env
```

Add the required environment variables, including the Ahantu API key.

Secure the environment file:

```bash
chmod 600 .env
```

Validate the application:

```bash
npm run check
```

### 7.2 NGINX reverse proxy configuration

NGINX runs on both application servers and forwards incoming requests to the Node.js application on port 3000.

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

Validate and reload NGINX:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7.3 systemd service configuration

Both application servers use systemd to manage the KigaliPulse application process.

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

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kigalipulse
sudo systemctl start kigalipulse
```

Check the service status:

```bash
sudo systemctl status kigalipulse
```

### 7.4 HAProxy configuration

HAProxy runs on Lb01 and distributes incoming traffic between Web01 and Web02.

Configuration file:

`/etc/haproxy/haproxy.cfg`

The backend configuration uses Round Robin balancing and HTTP application-level health checks.

```haproxy
backend web_servers
        balance roundrobin

        option httpchk GET /api/health
        http-check expect status 200

        server web01 35.176.96.139:80 check inter 2s fall 2 rise 2
        server web02 35.176.161.100:80 check inter 2s fall 2 rise 2
```

The HAProxy frontend listens on HTTP port 80 and HTTPS port 443. HTTP traffic is redirected to HTTPS.

Validate the HAProxy configuration:

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
```

Reload HAProxy:

```bash
sudo systemctl reload haproxy
```

Check its status:

```bash
sudo systemctl status haproxy
```

### 7.5 Updating an existing deployment

To deploy future changes on each application server:

```bash
cd ~/kigalipulse
git pull origin main
npm ci
sudo systemctl restart kigalipulse
```

Check that the application is running:

```bash
sudo systemctl status kigalipulse
```

## 8. Testing and Verification

Automated and manual tests were performed to verify application functionality, external API integration and deployment infrastructure.

### 8.1 Automated testing

The automated test suite was executed using:

```bash
npm test
```

**Test results:**

| Metric | Result |
|---|---|
| Total tests | 23 |
| Passed | 23 |
| Failed | 0 |

The tests cover API functionality, Kigali location search, error handling and caching.

### 8.2 Application functionality tests

| Test | Expected result | Observed result |
|---|---|---|
| Kigali neighbourhood search | Relevant Kigali locations returned | Passed |
| International location search | International locations returned | Passed |
| Weather retrieval | Weather information displayed | Passed |
| Air quality retrieval | Air quality information displayed | Passed |
| Short search input | Search is not triggered unnecessarily | Passed |
| Invalid location search | Appropriate response displayed | Passed |
| Cached information | Previously cached data remains available | Passed |
| Offline behaviour | Cached information remains available where previously stored | Passed |

Manual searches were tested using Kimihurura, Remera, Nyamirambo, Kicukiro and Gikondo. International searches were also tested using London, Nairobi and Johannesburg.

### 8.3 Deployment tests

| Test | Expected result | Observed result |
|---|---|---|
| Web01 health endpoint | HTTP 200 | Passed |
| Web02 health endpoint | HTTP 200 | Passed |
| NGINX reverse proxy | HTTP 200 | Passed |
| HTTP to HTTPS redirect | HTTP 301 | Passed |
| Public HTTPS access | HTTP 200 | Passed |
| HAProxy configuration | Valid configuration | Passed |
| Application-level health checks | Detect unhealthy application server | Passed |
| Round Robin distribution | Traffic reaches both servers | Passed |
| Failover | Traffic continues through healthy server | Passed |
| Server recovery | Restored server rejoins backend pool | Passed |

### 8.4 Round Robin verification

Ten requests were sent through the public HAProxy endpoint.

Observed results:

- Web01 handled 5 requests.
- Web02 handled 5 requests.

This confirmed that traffic was distributed between both application servers.

### 8.5 Failover verification

The KigaliPulse systemd service was temporarily stopped on Web01 while NGINX remained running.

HAProxy detected the failed application-level health check and redirected traffic to Web02.

Six subsequent requests were sent through the public endpoint:

- Web02 handled all 6 requests.
- All 6 requests were successful.

Web01 was subsequently restarted and restored.

A further ten requests confirmed that both servers had rejoined the backend pool:

- Web01 handled 5 requests.
- Web02 handled 5 requests.

These tests demonstrated application-level health monitoring, failover and recovery.

## 9. Challenges Encountered and Solutions

Several technical challenges were encountered during the development and deployment of KigaliPulse.

### 9.1 Node.js was not installed on the provided servers

**Challenge:** Web01 and Web02 initially did not have Node.js or npm installed.

**Solution:** Installed Node.js 22 and npm on both Ubuntu servers to provide the runtime environment required by the application.

### 9.2 NGINX returned 502 Bad Gateway

**Challenge:** NGINX returned 502 errors when the Node.js application was not running.

**Solution:** Verified the application process and configured systemd to manage the application continuously, including automatic restart capabilities.

### 9.3 HAProxy did not initially detect application failure

**Challenge:** During failover testing, HAProxy continued sending traffic to Web01 even when the Node.js application had stopped. NGINX was still running, so the original TCP health check considered the server available.

**Solution:** Replaced basic TCP health checks with HTTP health checks against `/api/health`, requiring an HTTP 200 response. This allowed HAProxy to detect application-level failures and redirect traffic to Web02.

### 9.4 Maintaining application availability

**Challenge:** The application needed to remain available even when one application server became unavailable.

**Solution:** Deployed identical application instances on Web01 and Web02 and configured HAProxy to distribute requests using Round Robin balancing, with health checks and failover.

### 9.5 Integrating Kigali-specific location search

**Challenge:** General geocoding services may return similarly named locations outside Kigali, making it difficult to provide relevant local search results.

**Solution:** Integrated the Ahantu API to search Kigali neighbourhoods and administrative areas. The backend filters results to the City of Kigali and uses Open-Meteo Geocoding as a fallback for international searches.

## 10. API Attribution and References

KigaliPulse uses external services and open-source technologies.

| Provider or technology | Usage | Documentation |
|---|---|---|
| Open-Meteo | Weather, air quality and geocoding data | https://open-meteo.com |
| Ahantu | Kigali location search | https://www.ahantu.rw/developers |
| Express.js | Backend web framework | https://expressjs.com |
| Node.js | JavaScript runtime | https://nodejs.org |
| NGINX | Reverse proxy | https://nginx.org |
| HAProxy | Load balancing | https://www.haproxy.org |
| Ubuntu | Server operating system | https://ubuntu.com |

Weather and air quality data are provided by Open-Meteo. Kigali location search is powered by Ahantu.

Users should refer to the respective providers' documentation, attribution requirements and applicable usage terms.

## 11. Environment Configuration and Security

The application uses environment variables to manage configuration and external service credentials.

| Variable | Default value | Purpose |
|---|---|---|
| PORT | 3000 | Application port |
| HOST | 0.0.0.0 | Application host |
| CACHE_TTL_SECONDS | 600 | Cache duration |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate-limit window |
| RATE_LIMIT_MAX_REQUESTS | 120 | Maximum requests per window |
| AHANTU_API_KEY | No default | Authentication for Ahantu location search |

The `.env.example` file contains configuration placeholders for local setup.

The actual `.env` file is excluded from version control.

Security practices include:

- Keeping API credentials on the backend.
- Excluding `.env` files from Git commits.
- Restricting access to server environment files using file permissions.
- Using HTTPS for public application access.
- Applying HTTP security headers through the backend security middleware.

## 12. Project Structure

The main project structure is organised as follows:

```text
kigalipulse/
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
│
├── src/
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/
│   │   └── api.routes.js
│   ├── services/
│   │   ├── cache.service.js
│   │   ├── openMeteo.service.js
│   │   └── ahantu.service.js
│   ├── app.js
│   └── server.js
│
├── tests/
│   └── api.test.js
│
├── codevibe-reports/
│   └── summative-web-infrastructure.report.json
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

The `codevibe-reports/` directory contains the individual CodeVibe assignment reports generated by me. These reports are submitted as part of the infrastructure assignment deliverables.

## 13. Production Access and Repository

**Live application:** https://www.tsungie.tech

**Health endpoint:** https://www.tsungie.tech/api/health

**GitHub repository:** https://github.com/tmachingur-code/kigalipulse

**Demo Video:** https://youtu.be/T60-Qd1rUbg

The application dashboard is publicly accessible without an application login.

The application uses Open-Meteo endpoints for weather, air quality and international geocoding. The Ahantu location search requires a server-side API key.

No SSH private keys, server passwords or actual API credentials are included in the repository.

---

**Project:** KigaliPulse – Smart Weather and Air Quality Intelligence Platform

**Deployment architecture:** Two Ubuntu application servers behind an HAProxy load balancer.

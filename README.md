<div align="center">

# ⚡ UptimeSentinel

**Enterprise-Grade, Real-Time HTTP Endpoint Monitoring & Incident Automation Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![Pytest](https://img.shields.io/badge/Pytest-16%20Passed%20(100%25)-brightgreen.svg?style=flat&logo=pytest&logoColor=white)](https://docs.pytest.org)
[![CI Pipeline](https://img.shields.io/badge/CI-GitHub%20Actions-blue.svg?style=flat&logo=githubactions&logoColor=white)](https://github.com/Punithb2/Uptime-Sentiel/actions)
[![Email: Brevo HTTPS](https://img.shields.io/badge/Alerts-Brevo%20HTTPS%20(Port%20443)-orange.svg?style=flat)](https://www.brevo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Live Demo](#-production-deployment-guide-100-free-stack) • [Features](#-key-features) • [Architecture](#-system-architecture) • [Testing & CI](#-automated-testing--cicd) • [API Reference](#-api-reference) • [Local Setup](#-local-development-setup) • [Deployment](#-production-deployment-guide-100-free-stack)

</div>

---

## 📖 Overview

**UptimeSentinel** is a full-stack, distributed uptime monitoring and incident automation SaaS platform. It continuously evaluates the health, response latency, and availability of critical web endpoints and APIs.

Engineered with a **decoupled multi-process architecture**, UptimeSentinel features an asynchronous background polling engine powered by atomic PostgreSQL locking (`SELECT ... FOR UPDATE SKIP LOCKED`), multi-channel alerting (**Brevo HTTPS API** on port 443 & **Gmail SMTP** fallback, plus **Discord/Slack Webhooks**), a commit-first non-blocking notification pipeline, worker vitality heartbeats, and a responsive glassmorphic dashboard with interactive sparklines, latency curves, and public status pages.

---

## ✨ Key Features

### 📡 Advanced Monitoring & Custom Frequencies
* **Flexible Polling Intervals**: Choose from pre-configured intervals (`1m`, `3m`, `5m`, `10m`, `15m`, `30m`, `1h`) or set **any arbitrary custom interval** (from 60 seconds up to 24 hours).
* **Safe Protocol Probing**: Exclusively supports non-destructive HTTP methods (**`GET`**, **`HEAD`**, and **`POST`**) to prevent accidental database state modifications on target servers.
* **Granular HTTP Configuration**: Custom JSON request headers (e.g., Bearer tokens, custom user-agents), custom body payloads, configurable timeouts (1–60s), and customizable expected status codes (e.g., `200`, `201`, `204`).
* **Multi-Strike Failure Thresholds**: Avoid false alarms caused by transient network blips by setting failure thresholds (1–10 consecutive failed pings before triggering an incident).
* **Fair-Usage Safeguards**: Enforces a 15-monitor cap per tenant and a 60-second minimum polling interval to preserve free-tier serverless database storage limits (Neon 0.5 GB).

### ⚙️ Distributed Background Engine
* **Atomic Concurrency Control**: Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE SKIP LOCKED`) and asyncio semaphores to eliminate race conditions and duplicate pings across scaled worker instances.
* **Commit-First Notification Pipeline**: Checks and incident records are committed to PostgreSQL *before* external webhook or email network calls are executed. Slow or unresponsive external notification services never stall database transactions or block other monitoring tasks.
* **Worker Vitality Heartbeat**: The worker engine writes an atomic timestamped heartbeat file on every poll cycle. The `GET /health` endpoint inspects this heartbeat and reports real-time worker health (`worker: active` or `worker: offline`).
* **Automatic Database Pruning**: Built-in 30-day retention cleanup routine that periodically clears ping history to prevent unbounded database growth.
* **Instant "Check Now" & Pause/Resume**: Manually trigger an immediate health check on demand or pause monitoring during scheduled maintenance windows.

### 🚨 Multi-Channel Incident Alerting
* **Email Alerts via Brevo HTTPS API (Port 443)**: Native integration with Brevo's REST API dispatches formatted downtime and recovery alerts over HTTPS port 443. This **bypasses cloud hosting outbound SMTP blocks** (such as Render's free tier, which blocks ports 25, 465, and 587) and requires **no custom domain**—alerts deliver to any recipient using just a verified personal email (300 free emails/day).
* **SMTP Fallback**: Traditional Gmail SMTP (port 465) fallback is maintained for local development and self-hosted environments.
* **Webhook Integrations**: Dispatches real-time JSON payloads compatible with Discord, Slack, and custom webhook receivers.
* **Smart Alert Cooldown & Instant Recovery**: 15-minute alert rate-limiting prevents email storms during prolonged outages. Crucially, **recovery notifications deliver immediately with zero cooldown**, and any flapping service immediately resets its cooldown state upon recovery so subsequent outages trigger alerts without delay.

### 📊 Observability & Interactive UI
* **PostgreSQL Window Functions (N+1 Query Elimination)**: Sparkline telemetry retrieves recent checks using `ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY checked_at DESC)` in a single database roundtrip, reducing roundtrips from $O(N)$ to $O(1)$.
* **Interactive Latency Curves**: 100-check interactive Area Charts powered by Recharts with average latency benchmarking.
* **Real-time Sparklines**: 30-check visual sparklines with hover popovers showing exact timestamps, status codes, latency, and error details.
* **Client-Side Cache Isolation**: Complete React Query client cache invalidation (`queryClient.clear()`) on login and logout prevents stale cross-account state flashing.
* **Structured Production Logging**: Configurable `LOG_LEVEL` environment variable (default `INFO`) with routine `UP` pings demoted to `DEBUG`, keeping production container logs clean while preserving alerts and warnings.
* **Dark & Light Mode**: Curated glassmorphism design system with high-contrast states and micro-animations.

### 🌐 Public Status Pages
* **Tenant-Isolated Slugs**: Generate a shareable public status page URL (`/status/:slug`) with a single click.
* **Per-Monitor Privacy**: Granular visibility toggle allowing users to choose exactly which monitors appear on their public status page.

### 🛡️ Enterprise Security & Hardening
* **Multi-Layer SSRF & Async DNS Protection**: Non-blocking DNS resolution (`loop.getaddrinfo`) blocks loopbacks (`127.0.0.1`), private RFC1918 subnets (`10.x.x.x`, `172.16.x.x`, `192.168.x.x`), link-local IPs, cloud metadata endpoints (`169.254.169.254`), and DNS rebinding attacks.
* **Sanitized Diagnostics**: Error logs and public status pages record only the HTTP status code and standard reason phrase (e.g., `HTTP 502 (Bad Gateway)`), completely eliminating raw response body dumps to prevent internal data or secret leakage.
* **Sliding-Window Auth Rate Limiting**: In-memory sliding-window rate limiter on `/auth/register` and `/auth/login` (5 attempts / 60 seconds) blocks brute-force and credential-stuffing attacks.
* **Bounded Password Hashing**: Bcrypt hashing bounded between 6 and 72 characters to prevent DoS via CPU exhaustion.
* **Multi-Tenant Data Isolation (IDOR Defense)**: All database queries enforce strict `WHERE owner_id == current_user.id` scoping.
* **CORS Protection**: Scoped regex matching Vercel preview deployments alongside production origins.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Layer
        Browser["🖥️ React 19 Frontend<br/>(Vercel Global Edge CDN)"]
        PublicUser["👥 Public Visitors<br/>(/status/:slug)"]
    end

    subgraph Hosting / Container Layer
        FastAPI["🚀 FastAPI Web API<br/>(Port 8000)"]
        Worker["⚡ Background Monitoring Worker<br/>(python -m app.worker)"]
        Heartbeat["💓 Worker Heartbeat File<br/>(/tmp/worker_heartbeat.json)"]
    end

    subgraph Data & Persistence
        NeonDB[("🐘 Neon Serverless PostgreSQL<br/>(asyncpg + SQLAlchemy ORM)")]
    end

    subgraph External Systems
        TargetServices["🌐 Monitored Target Endpoints<br/>(GET / HEAD / POST)"]
        Brevo["📧 Brevo HTTPS API (Port 443)<br/>(Cloud Production Alerts)"]
        SMTP["📧 Gmail SMTP (Port 465)<br/>(Local Dev Fallback)"]
        Webhooks["💬 Discord / Slack Webhooks<br/>(JSON Alerts)"]
    end

    Browser -->|HTTPS / REST API| FastAPI
    PublicUser -->|Public Status Page| FastAPI
    FastAPI <-->|SQL Queries & Window Subqueries| NeonDB
    FastAPI -.->|Inspect Vitality| Heartbeat
    Worker -.->|Write Timestamp| Heartbeat
    Worker <-->|Atomic SKIP LOCKED Lease| NeonDB
    Worker -->|Async HTTPX Pings| TargetServices
    Worker -->|HTTPS Port 443| Brevo
    Worker -->|Port 465 (Local)| SMTP
    Worker -->|Incident Payloads| Webhooks
```

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance Python async web framework |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) | Lightning-fast ASGI web server |
| **Database** | [PostgreSQL (Neon)](https://neon.tech/) | Serverless PostgreSQL with connection pooling & SSL |
| **ORM & Migrations** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/) | Async ORM (asyncpg driver) & schema versioning |
| **Async Networking** | [HTTPX](https://www.python-httpx.org/) | Fully async HTTP client for concurrent endpoint probing |
| **Email Delivery** | [Brevo REST API](https://www.brevo.com/) + SMTP | HTTPS port 443 cloud delivery & local SMTP fallback |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) | Modern frontend build tooling with hot-module reload |
| **Styling & Icons** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide](https://lucide.dev/) | Utility-first styling & comprehensive icon set |
| **State & Data Fetching**| [TanStack React Query v5](https://tanstack.com/query) | Server-state caching, automatic polling & cache clearance |
| **Charts & Visualization**| [Recharts](https://recharts.org/) | Composable SVG area charts for latency analytics |
| **Security & Auth** | [PyJWT](https://pyjwt.readthedocs.io/) + [Bcrypt](https://pypi.org/project/bcrypt/) | JWT authentication, bounded password hashing & SSRF filtering |
| **Automated Testing** | [Pytest](https://docs.pytest.org/) + `pytest-asyncio` | 16 unit & integration tests covering security, health & isolation |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) | Automated test and build verification on push & PR |

---

## 🧪 Automated Testing & CI/CD

UptimeSentinel includes a comprehensive automated test suite with **16 unit and integration tests** verifying critical application behavior:

```bash
# Run the test suite from the backend directory
cd backend
pytest -v tests
```

### Test Suite Breakdown:
* **`tests/test_health.py`**:
  * Root endpoint status check.
  * Health check vitality reporting (`worker: active` when heartbeat is fresh; `worker: offline` or `degraded` when worker is stopped).
* **`tests/test_isolation.py`**:
  * Multi-tenant data isolation: verifies that User A cannot read, update, or delete User B's monitors (IDOR prevention).
  * Enforces the 15-monitor per-account fair usage quota.
  * Public status page error masking: verifies that target server error bodies are sanitized to standard HTTP status phrases.
  * Empty account serialization: verifies that newly registered users receive zero-state dashboard stats without serialization crashes.
* **`tests/test_schemas.py`**:
  * HTTP method validation (allows `GET`, `HEAD`, `POST`; blocks destructive `DELETE`, `PUT`, `PATCH`).
  * Monitor polling interval bounds validation (enforces 60-second minimum and 24-hour maximum).
  * Strict email RFC validation and password length boundary checks (6–72 characters).
* **`tests/test_security.py`**:
  * SSRF filter: allows valid public URLs (`https://example.com`, `https://google.com`).
  * SSRF filter: blocks loopbacks (`127.0.0.1`, `localhost`, `0.0.0.0`).
  * SSRF filter: blocks private RFC1918 subnets (`10.0.0.1`, `192.168.1.1`, `172.16.0.1`).
  * SSRF filter: blocks AWS/GCP cloud metadata endpoints (`169.254.169.254`).
  * Webhook validation: enforces `https://` protocol on Discord/Slack webhook endpoints.

### CI Pipeline (`.github/workflows/ci.yml`)
Every push and pull request to `main` triggers a two-track GitHub Actions workflow:
1. **`backend-ci`**: Sets up Python 3.12, installs dependencies, and runs the entire Pytest suite against mock settings.
2. **`frontend-ci`**: Sets up Node.js 20, runs ESLint checks, and performs a full production bundle build (`npm run build`).

---

## 📁 Repository Structure

```text
UptimeSentinel/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Dual-track GitHub Actions CI workflow
├── .gitignore                      # Git exclusion rules
├── README.md                       # Comprehensive documentation
│
├── backend/                        # Backend Application (FastAPI)
│   ├── Procfile                    # Cloud process runner (web: ./start.sh)
│   ├── start.sh                    # Multi-process boot script (Migrations + Worker + API)
│   ├── requirements.txt            # Python dependencies
│   ├── alembic.ini                 # Database migration configuration
│   ├── alembic/                    # Database migrations
│   │   ├── env.py                  # Alembic runtime setup
│   │   └── versions/               # Schema version revisions
│   ├── tests/                      # Automated Pytest suite (16 tests)
│   │   ├── test_health.py          # Health & worker heartbeat tests
│   │   ├── test_isolation.py       # Multi-tenant IDOR & quota tests
│   │   ├── test_schemas.py         # HTTP method & interval bounds tests
│   │   └── test_security.py        # SSRF & DNS resolution tests
│   └── app/
│       ├── main.py                 # FastAPI application, CORS & /health vitality
│       ├── worker.py               # Background monitoring scheduler & heartbeat
│       ├── api/
│       │   ├── auth.py             # Rate-limited authentication & user profile
│       │   └── services.py         # Monitors, window-function analytics & status page
│       ├── core/
│       │   ├── config.py           # Pydantic Settings & DB URL normalizer
│       │   ├── database.py         # SQLAlchemy async engine & sessionmaker
│       │   ├── security.py         # JWT tokens & Bcrypt password hashing
│       │   ├── logger.py           # Timestamped structured logger with LOG_LEVEL
│       │   ├── mailer.py           # Brevo HTTPS API mailer & SMTP fallback
│       │   └── url_validator.py    # Multi-layer SSRF & async DNS protection
│       ├── models/
│       │   └── models.py           # SQLAlchemy database tables & relationships
│       └── schemas/
│           ├── user.py             # Pydantic schemas for authentication
│           └── service.py          # Pydantic schemas for monitors & analytics
│
└── frontend/                       # Frontend Application (React 19 + Vite)
    ├── package.json                # Node dependencies & build scripts
    ├── vite.config.js              # Vite bundler configuration
    ├── vercel.json                 # Vercel SPA client-side routing rewrites
    ├── public/
    │   └── _redirects              # Netlify/Cloudflare SPA rewrite rules
    └── src/
        ├── App.jsx                 # Client router & root layout
        ├── main.jsx                # React DOM initialization
        ├── index.css               # Core styling tokens & animations
        ├── components/
        │   ├── ConfirmDialog.jsx   # Modal confirmation component
        │   ├── Skeletons.jsx       # Loading skeleton placeholders
        │   ├── Toast.jsx           # Animated alert notification toast
        │   └── ToastContext.jsx    # Global toast notification context
        ├── lib/
        │   └── api.js              # Axios instance with JWT interceptors
        └── pages/
            ├── Auth.jsx            # Sign In & Registration forms with cache reset
            ├── Dashboard.jsx       # System summary metrics & sparklines
            ├── Monitors.jsx        # Endpoint list, filter & registration form
            ├── MonitorDetails.jsx  # 100-check charts, incident history & edit form
            ├── Incidents.jsx       # Global incident timeline & diagnostics
            ├── Settings.jsx        # Profile, password, webhooks & public page config
            └── PublicStatus.jsx    # Public-facing status page (/status/:slug)
```

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)

```env
# Database Connection (Neon Serverless PostgreSQL)
DATABASE_URL=postgresql+asyncpg://neondb_owner:PASSWORD@ep-xyz.aws.neon.tech/neondb?ssl=require

# Authentication & Security
SECRET_KEY=your-32-character-random-secret-key-here

# Email Alert Dispatcher: Brevo HTTPS API (Recommended for Cloud / Render)
# Sends up to 300 free emails/day to any recipient over Port 443 with no custom domain
BREVO_API_KEY=xkeysib-your_brevo_api_key_here
BREVO_SENDER_EMAIL=your-verified-email@gmail.com

# Email Alert Dispatcher: Local SMTP Fallback (For local dev; blocked on Render Free Tier)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-16-char-google-app-password

# Logging & Operational (Optional)
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:5173,https://uptime-sentinel-six.vercel.app
```

> **Generating a Secure `SECRET_KEY`:**
> Run: `python -c "import secrets; print(secrets.token_hex(32))"`

### Frontend Configuration (`frontend/.env`)

```env
# Backend API Base URL (Leave as localhost for development)
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
* **Python 3.12+**
* **Node.js 18+** & npm
* A free **[Neon PostgreSQL](https://neon.tech/)** database

### 2. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Punithb2/Uptime-Sentiel.git
cd Uptime-Sentiel/backend

# Create and activate a virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate
# macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# (Fill in your DATABASE_URL, SECRET_KEY, and BREVO_API_KEY or SMTP credentials)

# Run database migrations
alembic upgrade head

# Run tests to verify setup
pytest -v tests
```

#### Running the Backend Locally (Multi-Process):

```bash
# Terminal 1: Run the FastAPI Web Server
uvicorn app.main:app --reload --port 8000

# Terminal 2: Run the Background Monitoring Worker
python -m app.worker
```

* Swagger API Documentation: `http://localhost:8000/docs`
* Health Check Endpoint: `http://localhost:8000/health`

### 3. Frontend Setup

```bash
# In a new terminal, navigate to the frontend directory
cd Uptime-Sentiel/frontend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env

# Start the Vite development server
npm run dev
```

* The Frontend Dashboard will be live at: `http://localhost:5173`

---

## 🌐 Production Deployment Guide (100% Free Stack)

You can run UptimeSentinel 24/7 completely free of charge using **Vercel** (Frontend), **Render** (Backend), and **Neon** (Database).

### Step 1: Database Setup (Neon PostgreSQL - Free)
1. Sign up on **[neon.tech](https://neon.tech/)** (Free tier gives 0.5 GB storage with SSL).
2. Create a project named `uptime-sentinel`.
3. Copy your database connection string:
   `postgresql://neondb_owner:PASSWORD@ep-xyz.aws.neon.tech/neondb?sslmode=require`

### Step 2: Backend Deployment (Render.com - Free)
1. Sign up on **[render.com](https://render.com/)**.
2. Click **New +** → **Web Service**.
3. Choose **Public Git Repository** and paste your GitHub repository URL:
   `https://github.com/Punithb2/Uptime-Sentiel`
4. Set the following configuration:
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `./start.sh`
   * **Instance Type**: **Free**
5. Add your **Environment Variables**:
   * `DATABASE_URL` = *(Your Neon database connection string)*
   * `SECRET_KEY` = *(Generated 32-byte secret key)*
   * `BREVO_API_KEY` = *(Your Brevo API Key from brevo.com)*
   * `BREVO_SENDER_EMAIL` = *(Your verified email on Brevo)*
   * `LOG_LEVEL` = `INFO`
   > **Note on Email on Render**: Render free tier blocks outbound SMTP ports (25, 465, 587). The included **Brevo integration uses HTTPS on Port 443**, which works reliably without being blocked.
6. Click **Create Web Service**. Render executes `start.sh`, automatically running migrations and spawning both the worker engine and FastAPI server inside the container.
7. Copy your backend URL: `https://sentinel-api-xxxx.onrender.com`.

### Step 3: Frontend Deployment (Vercel - Free)
1. Sign up on **[vercel.com](https://vercel.com/)**.
2. Click **Add New...** → **Project** and import your repository.
3. Configure the build:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
4. Add the Environment Variable:
   * **`VITE_API_URL`**: `https://sentinel-api-xxxx.onrender.com` *(Your Render URL without trailing slash)*
5. Click **Deploy**. Your app will be live globally in under a minute!

### Step 4: Keep Alive Strategy ($0)
To prevent the Render free tier container from sleeping after 15 minutes of inactivity:
* Log into your UptimeSentinel dashboard on Vercel.
* Click **Add Monitor** → Enter `https://sentinel-api-xxxx.onrender.com/health` with a **10-minute** interval.
* The `/health` endpoint validates both the FastAPI web server and worker daemon heartbeat vitality (`"worker": "active"`).
* *(Optional)* Set up a free 10-minute cron check on [cron-job.org](https://cron-job.org) as a fail-safe to wake the container after new deployments.

---

## 📡 API Reference

### Authentication Endpoints (`/auth`)

| Method | Endpoint | Description | Protected | Rate Limited |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/auth/register` | Register a new user account & receive JWT token | No | 5 / min |
| `POST` | `/auth/login` | Authenticate with email/password and obtain JWT | No | 5 / min |
| `GET` | `/auth/me` | Fetch currently authenticated user profile | Yes | No |
| `PATCH`| `/auth/me` | Update profile, email, password, webhooks, or public slug | Yes | No |
| `DELETE`| `/auth/me` | Permanently delete account and cascade-delete all monitors | Yes | No |

### Monitoring & Metrics Endpoints (`/services`)

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :---: |
| `GET` | `/services/` | Fetch all monitors belonging to the authenticated user | Yes |
| `POST` | `/services/` | Register a new target endpoint for monitoring (max 15) | Yes |
| `PATCH`| `/services/{id}` | Edit an existing monitor's parameters, headers, or timeouts | Yes |
| `DELETE`| `/services/{id}` | Permanently delete a monitor and associated check history | Yes |
| `GET` | `/services/{id}/checks` | Fetch recent checks (capped at 100) and uptime percentage | Yes |
| `GET` | `/services/{id}/history` | Fetch 100 historical checks for charting & incident data | Yes |
| `POST` | `/services/{id}/check-now` | Force an immediate health check ping | Yes |
| `POST` | `/services/{id}/pause` | Pause automated polling for a monitor | Yes |
| `POST` | `/services/{id}/resume` | Resume automated polling for a monitor | Yes |
| `PATCH`| `/services/{id}/visibility`| Toggle monitor visibility on public status page | Yes |
| `GET` | `/services/dashboard/summary` | Fetch aggregated dashboard stats & sparklines (Window Subquery) | Yes |
| `GET` | `/services/dashboard/incidents` | Fetch global incident timeline across all services | Yes |
| `GET` | `/services/status/public/{slug}` | Unauthenticated endpoint for public status pages | No |

---

## 🔒 Security Best Practices

1. **SSRF Guard with Async DNS**: The backend resolves hostnames asynchronously before dispatching requests, strictly rejecting loopbacks (`127.0.0.1`), LAN/private subnets (RFC1918), link-local, and cloud metadata endpoints (`169.254.169.254`).
2. **Safe Methods Enforcement**: Only non-destructive methods (`GET`, `HEAD`, `POST`) are permitted for health checks, preventing accidental state corruption on monitored servers.
3. **Multi-Tenant Data Isolation (IDOR Defense)**: Every database query enforces `WHERE owner_id == current_user.id`, ensuring zero cross-tenant access.
4. **Data Sanitization**: Stored error messages record only HTTP status codes and standard reason phrases (`HTTP 502 (Bad Gateway)`), preventing confidential backend error bodies or stack traces from persisting or displaying publicly.
5. **Brute Force Rate Limiting**: In-memory sliding-window limiter on auth routes bounds credential verification attempts to 5 per minute per IP.
6. **Client Cache Flushing**: Automatic `queryClient.clear()` on login and logout ensures session boundary integrity in shared browser environments.
7. **Environment Isolation**: Production secrets are never tracked in Git—`.env` files are strictly ignored via `.gitignore`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute for personal or commercial projects.
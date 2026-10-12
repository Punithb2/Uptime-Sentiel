<div align="center">

# ⚡ UptimeSentinel

**Enterprise-Grade, Real-Time HTTP Endpoint Monitoring & Incident Automation Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Live Demo](#-production-deployment-guide-100-free-stack) • [Features](#-key-features) • [Architecture](#-system-architecture) • [API Reference](#-api-reference) • [Local Setup](#-local-development-setup) • [Deployment](#-production-deployment-guide-100-free-stack)

</div>

---

## 📖 Overview

**UptimeSentinel** is a full-stack, distributed uptime monitoring and incident management SaaS platform. It continuously evaluates the health, response latency, and availability of your critical web services and APIs.

Engineered with a **decoupled multi-process architecture**, UptimeSentinel features an asynchronous background polling engine powered by atomic PostgreSQL locking, multi-channel alerting (Gmail SMTP & Discord/Slack Webhooks), and a responsive glassmorphic dashboard with interactive sparklines, latency curves, and public status pages.

---

## ✨ Key Features

### 📡 Advanced Monitoring & Custom Frequencies
* **Flexible Polling Intervals**: Choose from pre-configured intervals (`10s`, `30s`, `1m`, `3m`, `5m`, `10m`, `15m`, `30m`, `1h`) or set **any arbitrary custom interval** (in seconds, minutes, or hours up to 24 hours).
* **Safe Protocol Probing**: Exclusively supports non-destructive HTTP methods (**`GET`**, **`HEAD`**, and **`POST`**) to prevent accidental database state modifications on target servers.
* **Granular HTTP Configuration**: Custom JSON request headers (e.g., Bearer tokens, custom user-agents), custom body payloads, configurable timeouts (1–60s), and customizable expected status codes (e.g., `200`, `201`, `204`).
* **Multi-Strike Failure Thresholds**: Avoid false alarms caused by transient network blips by setting failure thresholds (1–10 consecutive failed pings before triggering an incident).

### ⚙️ Distributed Background Engine
* **Atomic Concurrency Control**: Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE SKIP LOCKED`) and asyncio semaphores to prevent race conditions and duplicate pings across scaled worker instances.
* **Automatic Database Pruning**: Built-in 30-day retention cleanup routine that periodically clears ping history to prevent unbounded database growth.
* **Instant "Check Now" & Pause/Resume**: Manually trigger an immediate health check on demand or pause monitoring during scheduled maintenance windows.

### 🚨 Multi-Channel Incident Alerting
* **Email Alerts (SMTP)**: Automated, beautifully formatted downtime and recovery notifications dispatched via Gmail SMTP.
* **Webhook Integrations**: Dispatches real-time JSON payloads compatible with Discord, Slack, and custom webhook receivers.
* **Smart Alert Cooldown**: 15-minute alert rate-limiting prevents email floods during prolonged outages, while **recovery notifications are guaranteed to deliver instantly** upon service restoration.

### 📊 Observability & Interactive UI
* **Real-time Sparklines**: 30-check visual sparklines with hover popovers showing exact timestamps, status codes, latency, and error details.
* **Interactive Latency Curves**: 100-check interactive Area Charts powered by Recharts with average latency benchmarking.
* **Live Status Dashboard**: Global monitor statistics (Total, Operational, Degraded, Down, Paused, and Average System Latency).
* **Global Search, Filter & Sort**: Filter by status (`Operational`, `Down`, `Paused`) and sort by latency or alphabetical order.
* **Dark & Light Mode**: Curated glassmorphism design system with high-contrast states and micro-animations.

### 🌐 Public Status Pages
* **Tenant-Isolated Slugs**: Generate a shareable public status page URL (`/status/:slug`) with a single click.
* **Per-Monitor Privacy**: Granular visibility toggle allowing users to choose exactly which monitors appear on their public status page.

### 🛡️ Enterprise Security & Hardening
* **SSRF Protection**: Multi-layer URL validation blocking loopbacks (`127.0.0.1`), private RFC1918 subnets (`10.x.x.x`, `192.168.x.x`), cloud metadata endpoints (`169.254.169.254`), and DNS rebinding attacks.
* **Safe Password Hashing**: Bcrypt hashing bounded between 6 and 72 characters to prevent DoS via CPU exhaustion.
* **Strict RFC Email Validation**: Regex email validation with automatic lowercase normalization.
* **Bounded Pagination**: Checks pagination query capped at 100 rows to prevent memory exhaustion DoS.
* **CORS Protection**: Environment-controlled origins with regex pattern matching for Vercel edge preview domains.

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
    end

    subgraph Data & Persistence
        NeonDB[("🐘 Neon Serverless PostgreSQL<br/>(asyncpg + SQLAlchemy ORM)")]
    end

    subgraph External Systems
        TargetServices["🌐 Monitored Target Endpoints<br/>(GET / HEAD / POST)"]
        SMTP["📧 Gmail SMTP Server<br/>(Alert Emails)"]
        Webhooks["💬 Discord / Slack Webhooks<br/>(JSON Alerts)"]
    end

    Browser -->|HTTPS / REST API| FastAPI
    PublicUser -->|Public Status Page| FastAPI
    FastAPI <-->|SQL Queries & Pooling| NeonDB
    Worker <-->|Atomic SKIP LOCKED Lease| NeonDB
    Worker -->|Async HTTPX Pings| TargetServices
    Worker -->|Downtime & Recovery Alerts| SMTP
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
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) | Modern frontend build tooling with hot-module reload |
| **Styling & Icons** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide](https://lucide.dev/) | Utility-first styling & comprehensive icon set |
| **State & Data Fetching**| [TanStack React Query v5](https://tanstack.com/query) | Server-state caching and auto-polling |
| **Charts & Visualization**| [Recharts](https://recharts.org/) | Composable SVG area charts for latency analytics |
| **Security** | [PyJWT](https://pyjwt.readthedocs.io/) + [Bcrypt](https://pypi.org/project/bcrypt/) | JWT authentication, password hashing, and SSRF filtering |

---

## 📁 Repository Structure

```text
UptimeSentinel/
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
│   └── app/
│       ├── main.py                 # FastAPI application & CORS setup
│       ├── worker.py               # Independent background monitoring scheduler
│       ├── api/
│       │   ├── auth.py             # Authentication & user profile endpoints
│       │   └── services.py         # Monitors, analytics, & status page endpoints
│       ├── core/
│       │   ├── config.py           # Pydantic Settings & DB URL normalizer
│       │   ├── database.py         # SQLAlchemy async engine & sessionmaker
│       │   ├── security.py         # JWT tokens & Bcrypt password hashing
│       │   ├── mailer.py           # Asynchronous SMTP alert mailer
│       │   └── url_validator.py    # Multi-layer SSRF & DNS rebinding protection
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
            ├── Auth.jsx            # Sign In & Registration forms
            ├── Dashboard.jsx       # System summary metrics & overview
            ├── Monitors.jsx        # Endpoint list, filter, & registration form
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

# Email Alert Dispatcher (Gmail SMTP)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-16-char-google-app-password

# Optional CORS Overrides (defaults to localhost & vercel.app domains)
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
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
# (Fill in your DATABASE_URL, SECRET_KEY, SMTP_EMAIL, and SMTP_PASSWORD)

# Run database migrations
alembic upgrade head
```

#### Running the Backend Locally (Multi-Process):

```bash
# Terminal 1: Run the FastAPI Web Server
uvicorn app.main:app --reload --port 8000

# Terminal 2: Run the Background Monitoring Worker
python -m app.worker
```

* Swagger API Documentation will be available at: `http://localhost:8000/docs`
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
   * `SMTP_EMAIL` = *(Your Gmail address)*
   * `SMTP_PASSWORD` = *(Your 16-character Gmail App Password)*
6. Click **Create Web Service**. Render will execute `start.sh`, running migrations and spawning both the worker and FastAPI concurrently inside a single container!
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
* *(Optional)* Set up a free 10-minute cron check on [cron-job.org](https://cron-job.org) as a fail-safe to wake the container after new deployments.

---

## 📡 API Reference

### Authentication Endpoints (`/auth`)

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Register a new user account & receive JWT token | No |
| `POST` | `/auth/login` | Authenticate with email/password and obtain JWT | No |
| `GET` | `/auth/me` | Fetch currently authenticated user profile | Yes |
| `PATCH`| `/auth/me` | Update profile, email, password, webhooks, or public slug | Yes |
| `DELETE`| `/auth/me` | Permanently delete account and cascade-delete all monitors | Yes |

### Monitoring & Metrics Endpoints (`/services`)

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :---: |
| `GET` | `/services/` | Fetch all monitors belonging to the authenticated user | Yes |
| `POST` | `/services/` | Register a new target endpoint for monitoring | Yes |
| `PATCH`| `/services/{id}` | Edit an existing monitor's parameters, headers, or timeouts | Yes |
| `DELETE`| `/services/{id}` | Permanently delete a monitor and associated check history | Yes |
| `GET` | `/services/{id}/checks` | Fetch recent checks (capped at 100) and uptime percentage | Yes |
| `GET` | `/services/{id}/history` | Fetch 100 historical checks for charting & incident data | Yes |
| `POST` | `/services/{id}/check-now` | Force an immediate health check ping | Yes |
| `POST` | `/services/{id}/pause` | Pause automated polling for a monitor | Yes |
| `POST` | `/services/{id}/resume` | Resume automated polling for a monitor | Yes |
| `PATCH`| `/services/{id}/visibility`| Toggle monitor visibility on public status page | Yes |
| `GET` | `/services/dashboard/summary` | Fetch aggregated dashboard stats & sparkline data | Yes |
| `GET` | `/services/dashboard/incidents` | Fetch global incident timeline across all services | Yes |
| `GET` | `/services/status/public/{slug}` | Unauthenticated endpoint for public status pages | No |

---

## 🔒 Security Best Practices

1. **SSRF Guard**: The backend resolves and verifies hostnames before dispatching network requests, rejecting loopback (`127.0.0.1`), LAN subnets, link-local, and AWS metadata addresses (`169.254.169.254`).
2. **Safe Methods Enforcement**: Only idempotent and safe methods (`GET`, `HEAD`, `POST`) are allowed for health checks, preventing accidental state corruption on client servers.
3. **Multi-Tenant Isolation**: All monitor queries enforce `WHERE owner_id == current_user.id`, preventing Insecure Direct Object References (IDOR).
4. **Environment Isolation**: Production secrets are never tracked in Git—`.env` files are strictly ignored via `.gitignore`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute for personal or commercial projects.
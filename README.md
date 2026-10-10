# UptimeSentinel

A full-stack SaaS application for monitoring HTTP endpoint uptime, tracking latency, and dispatching automated incident alerts. UptimeSentinel provides a real-time dashboard to track service health, manage downtime events, and maintain a historical record of system reliability.

## Features
* **Automated Polling:** Background worker asynchronously pings registered HTTP/HTTPS endpoints.
* **Incident State Tracking:** Automatically opens incidents upon consecutive failures and auto-resolves upon recovery.
* **Automated Alerting:** Dispatches real-time email notifications for downtime and recovery events.
* **Metrics Dashboard:** Real-time UI displaying 24-hour uptime percentage, current latency, and visual check history.
* **Secure Authentication:** JWT-based user authentication with isolated multi-tenant data access.

## Tech Stack
* **Backend:** FastAPI, Python 3.12+, Uvicorn
* **Database:** PostgreSQL (Neon Serverless), SQLAlchemy (AsyncPG), Alembic
* **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
* **Networking:** HTTPX for async background polling

## Prerequisites
* [Python 3.12+](https://www.python.org/downloads/)
* [Node.js 18+](https://nodejs.org/)
* A [Neon](https://neon.tech/) Serverless PostgreSQL database
* A Google/Gmail Account with [App Passwords enabled](https://support.google.com/accounts/answer/185833) for SMTP alerting

---

## Environment Configuration

You must create `.env` files in both the `backend` and `frontend` directories before running the application. Reference the `.env.example` files in each directory.

### Backend Variables (`backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | AsyncPG connection string for PostgreSQL | `postgresql+asyncpg://user:pass@host/db` |
| `SECRET_KEY` | 32+ character random string for JWT signing | `your-super-secret-jwt-key` |
| `SMTP_EMAIL` | The sender email address for alerts | `alerts@yourdomain.com` |
| `SMTP_PASSWORD` | App-specific password for SMTP auth | `abcd1234efgh5678` |

### Frontend Variables (`frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |

---

## Local Development Setup

### 1. Backend Setup
Navigate to the backend directory, create a virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

```

Apply database migrations to build your schema:

```bash
alembic upgrade head

```

### Running the Application

Sentinel requires two separate processes to run simultaneously.

**Terminal 1 (Web API):**
```bash
uvicorn app.main:app --reload
```

**Terminal 2 (Background Monitoring Worker):**

```bash
python -m app.worker
```

*The API will be available at `http://localhost:8000`. API documentation is auto-generated at `http://localhost:8000/docs`.*

### 2. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies:

```bash
cd frontend
npm install

```

Start the Vite development server:

```bash
npm run dev

```

*The UI will be available at `http://localhost:5173`.*

---

## Database Migrations (Alembic)

If you modify the SQLAlchemy models in `backend/app/models/models.py`, you must generate and apply a new migration:

```bash
cd backend
alembic revision --autogenerate -m "description_of_changes"
alembic upgrade head

```

## System Health

To verify the backend is running independently of the frontend, you can ping the health check endpoint:

```bash
curl http://localhost:8000/health

```
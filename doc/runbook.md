# Sprout — Developer Runbook

## Prerequisites

- **Python** 3.10+ (backend)
- **Node.js** 16+ and **npm** (frontend)
- **MongoDB** — either local or Atlas (connection string in `.env`)

---

## 1. Backend (FastAPI)

### First-time setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate    # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Create your .env from the example
cp .env.example .env
# Then edit .env with your actual values (MongoDB URL, JWT secret, etc.)
```

### Start the dev server

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**.
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Seed dev data

```bash
cd backend
source venv/bin/activate
python -m scripts.seed_dev_data
```

This creates a `sprout_admin` / `Admin123!` super admin user and a sample institution.

---

## 2. Frontend (React + Vite)

### First-time setup

```bash
cd web
npm install
```

### Start the dev server

```bash
cd web
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for production

```bash
cd web
npm run build
```

Output goes to `web/dist/`.

---

## 3. Environment Variables

All backend config lives in `backend/.env`. Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URL` | MongoDB connection string | ✅ |
| `DATABASE_NAME` | Database name (`sprout_dev` for local) | ✅ |
| `JWT_SECRET` | Secret key for JWT token signing | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key (for AI features) | Optional |
| `SENDGRID_API_KEY` | SendGrid API key (leave empty to log emails to console) | Optional |
| `SENDGRID_FROM_EMAIL` | Sender email for transactional emails | Optional |
| `FRONTEND_URL` | Frontend URL for activation links | ✅ |
| `EMAIL_WHITELIST_ENABLED` | Enable dev email whitelist (`true`/`false`) | Optional |
| `EMAIL_WHITELIST` | Comma-separated whitelisted emails | Optional |

---

## 4. Common Tasks

### Test the email invitation flow locally

1. Start both backend and frontend servers.
2. Log in as `sprout_admin` / `Admin123!`.
3. Go to **Day Cares → Add Day Care**, fill in details + admin email.
4. Since `SENDGRID_API_KEY` is empty, the activation URL will print to the **backend terminal**.
5. Copy the URL and open it in your browser to test the activation page.

### Add a new email to the dev whitelist

Edit `backend/.env` and comma-separate addresses:

```
EMAIL_WHITELIST=csjingtao@gmail.com,another@example.com
```

Gmail aliases (dots, `+suffix`) are auto-normalized — no need to list them separately.

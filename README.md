# AI Financial Copilot 🤖💰

An AI-powered full-stack web application for intelligent expense tracking and financial insights. Upload transactions, get automatic categorization, and chat with your finances using natural language.

---

## ✨ Features

- **JWT Authentication** – Secure email/password login and registration
- **CSV Upload** – Import bank statements in seconds
- **Manual Entry** – Add individual transactions with a form
- **ML Categorization** – Automatically classifies merchants (Food, Travel, Shopping, etc.)
- **AI Insights** – Plain-language summaries of your spending
- **Natural Language Queries** – Ask "How much did I spend on food this month?"
- **Subscription Detector** – Automatically identifies recurring payments
- **Rich Dashboard** – Pie charts, bar charts, and transaction history

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TailwindCSS, Recharts |
| Backend | FastAPI (Python), SQLAlchemy |
| Database | PostgreSQL |
| ML | scikit-learn, Naive Bayes Classifier |
| Auth | JWT, bcrypt |
| Deployment | Docker, Docker Compose |

---

## 🚀 Quick Start (Docker)

**Prerequisites:** Docker and Docker Compose installed.

```bash
# 1. Clone the repo
git clone <repo-url>
cd financial-copilot

# 2. Start all services
docker compose up --build

# 3. Access the app
open http://localhost:3000
```

The backend API docs will be at: http://localhost:8000/docs

---

## 🛠️ Local Development

### Backend (FastAPI)

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run the development server
uvicorn main:app --reload
```

### Frontend (Next.js)

```bash
cd frontend

npm install
npm run dev
```

Open http://localhost:3000.

---

## 🗄️ Database Setup

Make sure PostgreSQL is running and create the database:

```sql
CREATE DATABASE financial_copilot;
```

The backend will create all tables automatically on first run using SQLAlchemy.

---

## 🤖 ML Training

To train the merchant classifier:

```bash
cd backend
python -m ml.train_model
```

This trains a Naive Bayes classifier on merchant-category pairs and saves `merchant_classifier.pkl`. The classifier is then automatically loaded by the categorization service.

---

## 📡 API Documentation

| Endpoint | Method | Description |
|---|---|---|
| `/auth/register` | POST | Register a new user |
| `/auth/login` | POST | Login (returns JWT) |
| `/transactions/` | GET | List all transactions |
| `/transactions/add` | POST | Add a single transaction |
| `/transactions/upload` | POST | Upload CSV file |
| `/analytics/summary` | GET | Monthly spending summary |
| `/analytics/insights` | GET | AI-generated insights |
| `/analytics/subscriptions` | GET | Detected subscriptions |
| `/ai/query` | POST | Natural language query |

Full interactive docs: http://localhost:8000/docs

---

## 📂 Project Structure

```
financial-copilot/
├── backend/
│   ├── main.py               # FastAPI entry point
│   ├── database.py           # DB connection & session
│   ├── schemas.py            # Pydantic models
│   ├── auth_utils.py         # JWT & password hashing
│   ├── models/
│   │   └── models.py         # SQLAlchemy ORM models
│   ├── routers/
│   │   ├── auth.py           # Auth endpoints
│   │   ├── transactions.py   # Transaction endpoints
│   │   ├── analytics.py      # Analytics endpoints
│   │   └── ai.py             # NLQ endpoint
│   ├── services/
│   │   ├── ml_service.py     # ML categorization
│   │   └── analytics_service.py
│   └── ml/
│       └── train_model.py    # Model training script
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard
│   │   ├── login/page.tsx    # Login page
│   │   ├── register/page.tsx # Register page
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   └── ui.tsx            # Reusable UI components
│   └── lib/
│       └── api.ts            # Axios API client
├── training_data/
│   └── sample_transactions.csv
├── docker-compose.yml
└── README.md
```

---

## 📊 Sample CSV Format

```csv
date,merchant,amount,type
2026-03-01,Swiggy,450,expense
2026-03-02,Amazon,1200,expense
2026-03-03,Uber,230,expense
```

A sample file is provided at `training_data/sample_transactions.csv`.

---

## 🔐 Environment Variables

**Backend (`.env`):**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/financial_copilot
SECRET_KEY=your-super-secret-key-change-in-production
```

---

## 🌐 Deployment

The project is Docker-ready and can be deployed to:
- **AWS** (ECS, Elastic Beanstalk)
- **Render** (`render.yaml` can be added)
- **Railway** (auto-detects Dockerfile)

Set production environment variables (especially `SECRET_KEY` and `DATABASE_URL`) before deploying.

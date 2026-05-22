# AI Financial Copilot

AI-powered personal finance assistant that connects your bank accounts, parses transactions from emails/SMS/receipts, and gives you real-time spending insights through an intelligent chat interface.

**Live Demo:** [frontend-dusky-chi-43.vercel.app](https://frontend-dusky-chi-43.vercel.app)
**API Docs:** [ai-financial-copilot-lac5.onrender.com/docs](https://ai-financial-copilot-lac5.onrender.com/docs)

---

## Features

### 5 Data Sources
- **Plaid Bank Linking** - Connect 10,000+ US banks with one click
- **Gmail Sync** - AI extracts transactions from bank alert emails
- **SMS Parser** - Paste bank SMS, AI extracts amount/merchant/category
- **Bank CSV Upload** - Upload statements from HDFC, ICICI, SBI, Axis, Kotak
- **Receipt Scanner** - Take a photo, AI reads merchant, amount, and line items

### AI Intelligence
- **Chat Copilot** - Ask "How much did I spend on food?" and get real answers from your data
- **Financial Health Score** - 0-100 score based on savings rate, budget adherence, spending stability
- **Spending Predictions** - Predicts month-end spending based on current daily rate
- **Smart Budgets** - Set category limits, get alerts at 50%/80%/100%
- **Subscription Detection** - Auto-detects recurring charges, flags possibly cancelled ones
- **Weekly Digest** - Auto-generated summary with highlights and top merchants

### User Experience
- Dark Mode with toggle and persistence
- Mobile responsive sidebar with hamburger menu
- Category filters, sort, and pagination on transaction history
- Professional landing page
- Empty states on all pages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS, Recharts |
| Backend | FastAPI, SQLAlchemy, SQLite/PostgreSQL |
| AI (Chat) | Groq Llama 3.1 8B Instant |
| AI (Vision) | Groq Llama 3.2 90B Vision |
| AI (Parsing) | Groq Llama 3.1 8B (email/SMS extraction) |
| Bank Data | Plaid API (US banks), CSV parser (Indian banks) |
| Auth | JWT + bcrypt + Google OAuth 2.0 |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Architecture

```
Client (Next.js 16 + React 19)
    |
    v
API Gateway (FastAPI - 35 endpoints)
    |
    +-- Auth Service (JWT + Google OAuth)
    +-- Transaction Engine (normalize, dedupe, categorize)
    +-- Ingestion Pipeline
    |     +-- Plaid (US bank API)
    |     +-- Gmail (AI-powered email parsing)
    |     +-- SMS (AI-powered SMS parsing)
    |     +-- CSV (Indian bank statement parser)
    |     +-- Receipt (Vision AI scanner)
    +-- Analytics Engine
    |     +-- Monthly summary + daily trends
    |     +-- Financial health score (5 components)
    |     +-- Spending predictions (daily rate extrapolation)
    |     +-- Subscription detection (frequency + status)
    |     +-- Weekly digest (highlights + top merchants)
    +-- AI Copilot (Groq Llama with full financial context)
    +-- Budget Engine (category limits, progress, alerts)
    |
    v
SQLite (dev) / PostgreSQL (prod)
```

---

## API Endpoints (35)

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /auth/register` `POST /auth/login` `GET /auth/me` |
| Google OAuth | `GET /auth/google/login` `GET /auth/google/callback` `GET /auth/google/status` |
| Transactions | `GET/POST /transactions/` `DELETE /transactions/{id}` `POST /transactions/sync-gmail` `POST /transactions/upload` `POST /transactions/upload-bank-statement` |
| Analytics | `GET /analytics/summary` `/insights` `/predictions` `/health-score` `/weekly-digest` `/subscriptions` |
| Budgets | `GET/POST /budgets/` `GET /budgets/status` `PATCH/DELETE /budgets/{id}` |
| AI Chat | `POST /ai/query` |
| Plaid | `POST /plaid/create-link-token` `POST /plaid/exchange-token` |
| Receipts | `POST /receipts/scan` `POST /receipts/scan-and-save` |
| SMS | `POST /sms/parse` |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
cp .env.example .env
# Add your API keys to .env
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Environment Variables

```env
# Required
SECRET_KEY=your-secret-key
GROQ_API_KEY=gsk_xxx                  # Free: console.groq.com/keys

# Bank Linking (optional)
PLAID_CLIENT_ID=xxx                   # Free: dashboard.plaid.com
PLAID_SECRET=xxx

# Gmail Sync (optional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

### Plaid Sandbox Testing

When connecting a bank account, use:
- Username: `user_good`
- Password: `pass_good`

---

## Project Structure

```
backend/
  main.py                    # FastAPI app (35 endpoints)
  models/
    models.py                # User, Transaction, Category, GoogleAuth
    budget.py                # Budget model
  routers/
    auth.py                  # Register, login, JWT
    transactions.py          # CRUD, sync, upload, bank CSV
    analytics.py             # Summary, predictions, health, digest
    ai.py                    # Groq-powered chat copilot
    budgets.py               # Budget CRUD + alerts
    plaid_routes.py          # Plaid Link + transaction import
    receipts.py              # Vision AI receipt scanner
    sms.py                   # AI-powered SMS parser
    google_auth.py           # Gmail OAuth flow
  services/
    plaid_service.py         # Plaid API integration
    gmail_service.py         # Gmail sync + AI parsing
    ai_parser.py             # Groq email/SMS extraction
    bank_csv_parser.py       # Indian bank CSV parser
    health_score.py          # 5-component financial health
    subscription_detector.py # Recurring charge detection
    analytics_service.py     # Spending computations
    insights_engine.py       # AI insight generation

frontend/
  app/
    page.tsx                 # Dashboard
    landing/page.tsx         # Landing page (non-auth)
    login/page.tsx           # Login
    register/page.tsx        # Register
    history/page.tsx         # Transaction history + filters
    analytics/page.tsx       # Charts + predictions + digest
    budgets/page.tsx         # Budget management
    subscriptions/page.tsx   # Subscription tracking
    ai-chat/page.tsx         # AI copilot chat
  components/
    Sidebar.tsx              # Responsive nav + dark mode
    LayoutShell.tsx          # Auth-aware layout
    dashboard/
      HealthScoreCard.tsx    # Score ring widget
      PlaidLinkBank.tsx      # Bank linking
      BankStatementUpload.tsx # CSV upload
      ReceiptScanner.tsx     # Receipt camera/upload
      GmailIntegration.tsx   # Gmail sync
      SpendingTrend.tsx      # Bar chart
      CategoryBreakdown.tsx  # Pie chart
  lib/
    api.ts                   # Axios client with 30s cache
```

---

## License

MIT

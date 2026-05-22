from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

from routers import auth, transactions, analytics, ai, sms, google_auth, setu, plaid_routes
from database import engine
from models import models

load_dotenv()

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Financial Copilot API")

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", ""),
]
origins = [o for o in origins if o]  # remove empty

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware (for OAuth state)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "fallback-secret"),
)

# Routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(sms.router)
app.include_router(google_auth.router)
app.include_router(setu.router)
app.include_router(plaid_routes.router)


@app.get("/")
def root():
    return {"message": "AI Financial Copilot API Running"}


@app.get("/healthz")
def health():
    return {"status": "ok"}

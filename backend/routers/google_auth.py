import os
import json
import requests
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
from models import models
from routers.auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

REDIRECT_URI = "http://localhost:8000/auth/google/callback"
SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


@router.get("/login")
async def google_login(current_user: models.User = Depends(get_current_user)):
    """Returns the Google OAuth URL as JSON (not redirect) so frontend can handle it."""
    if not CLIENT_ID or not CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": str(current_user.id),  # pass user_id so callback knows who to bind
    }

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return {"url": auth_url}


@router.get("/callback")
async def google_callback(
    code: str,
    state: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """Exchange authorization code for tokens and bind to the user from state param."""
    if not CLIENT_ID or not CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    response = requests.post(token_url, data=data)
    if response.status_code != 200:
        raise HTTPException(
            status_code=400, detail=f"Token exchange failed: {response.text}"
        )

    tokens = response.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token received")

    # Resolve user from state param (user_id passed during login)
    user = None
    if state:
        user = db.query(models.User).filter(models.User.id == int(state)).first()

    if not user:
        # Fallback: should not happen, but don't crash
        raise HTTPException(status_code=400, detail="Could not identify user. Please log in and try again.")

    # Upsert google auth record
    existing = (
        db.query(models.UserGoogleAuth)
        .filter(models.UserGoogleAuth.user_id == user.id)
        .first()
    )

    if existing:
        existing.access_token = access_token
        if refresh_token:
            existing.refresh_token = refresh_token
    else:
        db.add(
            models.UserGoogleAuth(
                user_id=user.id,
                access_token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=CLIENT_ID,
                client_secret=CLIENT_SECRET,
                scopes=json.dumps([SCOPE]),
            )
        )

    db.commit()

    return RedirectResponse("http://localhost:3000/?google_connected=true")


@router.get("/status")
async def google_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if the current authenticated user has connected Gmail."""
    auth = (
        db.query(models.UserGoogleAuth)
        .filter(models.UserGoogleAuth.user_id == current_user.id)
        .first()
    )
    return {"connected": auth is not None}

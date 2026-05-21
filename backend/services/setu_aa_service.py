"""
Setu Account Aggregator integration.

Flow:
1. Get OAuth token
2. Create consent request → get consent URL
3. User approves on Setu UI → webhook notification
4. Fetch financial data using consent ID
5. Parse and store transactions
"""

import os
import json
import time
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

SETU_CLIENT_ID = os.getenv("SETU_CLIENT_ID")
SETU_CLIENT_SECRET = os.getenv("SETU_CLIENT_SECRET")
SETU_PRODUCT_INSTANCE_ID = os.getenv("SETU_PRODUCT_INSTANCE_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Sandbox URLs
TOKEN_URL = "https://uat.setu.co/api/v2/auth/token"
FIU_BASE_URL = "https://fiu-sandbox.setu.co/v2"

_token_cache = {"token": None, "expires_at": 0}


def _get_token() -> str:
    """Get OAuth token, using cache if valid."""
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["token"]

    if not SETU_CLIENT_ID or not SETU_CLIENT_SECRET:
        raise Exception("Setu credentials not configured")

    resp = requests.post(
        TOKEN_URL,
        json={
            "clientID": SETU_CLIENT_ID,
            "grant_type": "client_credentials",
            "secret": SETU_CLIENT_SECRET,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()["data"]

    _token_cache["token"] = data["token"]
    _token_cache["expires_at"] = now + data.get("expiresIn", 1800)

    return data["token"]


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_get_token()}",
        "x-product-instance-id": SETU_PRODUCT_INSTANCE_ID,
        "Content-Type": "application/json",
    }


def create_consent(mobile_number: str) -> dict:
    """
    Create a consent request for a user.
    Returns: { "consent_id": "...", "consent_url": "..." }
    """
    # VUA format: mobile@onemoney (sandbox)
    vua = f"{mobile_number}@onemoney"

    now = datetime.utcnow()
    data_from = (now - timedelta(days=365)).strftime("%Y-%m-%dT00:00:00.000Z")
    data_to = now.strftime("%Y-%m-%dT00:00:00.000Z")

    payload = {
        "consentDuration": {"unit": "MONTH", "value": 3},
        "dataRange": {"from": data_from, "to": data_to},
        "vua": vua,
        "redirectUrl": f"{FRONTEND_URL}/?bank_linked=true",
        "dataLife": {"unit": "MONTH", "value": 0},
    }

    resp = requests.post(
        f"{FIU_BASE_URL}/consents",
        headers=_headers(),
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    result = resp.json()

    return {
        "consent_id": result["id"],
        "consent_url": result["url"],
        "status": result["status"],
    }


def get_consent_status(consent_id: str) -> dict:
    """Check the status of a consent request."""
    resp = requests.get(
        f"{FIU_BASE_URL}/consents/{consent_id}",
        headers=_headers(),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def create_data_session(consent_id: str) -> dict:
    """Create a data session to fetch financial data after consent is approved."""
    now = datetime.utcnow()
    data_from = (now - timedelta(days=365)).strftime("%Y-%m-%dT00:00:00.000Z")
    data_to = now.strftime("%Y-%m-%dT00:00:00.000Z")

    payload = {
        "consentId": consent_id,
        "DataRange": {"from": data_from, "to": data_to},
        "format": "json",
    }

    resp = requests.post(
        f"{FIU_BASE_URL}/sessions",
        headers=_headers(),
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_data(session_id: str) -> list:
    """
    Fetch financial data from a data session.
    Returns list of parsed transactions.
    """
    resp = requests.get(
        f"{FIU_BASE_URL}/sessions/{session_id}",
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    transactions = []

    # Parse the FI data
    for fi_data in data.get("Payload", []):
        for account in fi_data.get("data", []):
            account_info = account.get("decryptedFI", {}).get("account", {})
            profile = account_info.get("profile", {}).get("holders", {})
            summary = account_info.get("summary", {})

            # Extract transactions
            tx_list = account_info.get("transactions", {}).get("transaction", [])
            for tx in tx_list:
                amount = float(tx.get("amount", 0))
                if amount <= 0:
                    continue

                tx_type = tx.get("type", "DEBIT").upper()
                direction = "income" if tx_type == "CREDIT" else "expense"

                # Parse date
                tx_date = None
                date_str = tx.get("transactionTimestamp", tx.get("valueDate", ""))
                if date_str:
                    try:
                        tx_date = datetime.fromisoformat(
                            date_str.replace("Z", "+00:00")
                        ).date()
                    except (ValueError, TypeError):
                        tx_date = datetime.now().date()
                else:
                    tx_date = datetime.now().date()

                narration = tx.get("narration", tx.get("reference", "Unknown"))

                transactions.append({
                    "date": tx_date.isoformat(),
                    "merchant": _clean_narration(narration),
                    "amount": amount,
                    "type": direction,
                    "narration_raw": narration,
                    "reference": tx.get("reference", ""),
                    "balance": float(tx.get("currentBalance", 0)),
                })

    return transactions


def _clean_narration(narration: str) -> str:
    """Clean bank narration to extract merchant name."""
    import re

    if not narration:
        return "Unknown"

    text = narration.strip()

    # UPI format: UPI/REF/MERCHANT/HANDLE
    upi_match = re.match(r"UPI/\d+/([^/]+)", text, re.IGNORECASE)
    if upi_match:
        return upi_match.group(1).strip().title()[:50]

    upi_match2 = re.match(r"UPI-([^-]+)", text, re.IGNORECASE)
    if upi_match2:
        return upi_match2.group(1).strip().title()[:50]

    # NEFT/IMPS
    neft_match = re.match(
        r"(?:NEFT|IMPS|RTGS)[/-][A-Z0-9]+[/-]([^/]+)", text, re.IGNORECASE
    )
    if neft_match:
        return neft_match.group(1).strip().title()[:50]

    # Clean generic prefixes
    text = re.sub(r"^(ATM[-/]|POS\s+\d+|BIL/ONL/|ECS/)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"/\d{10,}", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text.title()[:50] if text else "Unknown"

"""
AI-powered email/SMS parser using Groq (Llama 3.3 70B - free tier).

Replaces regex-based extraction with LLM structured extraction.
Free tier: 30 RPM, 15K tokens/min — no daily cap.
"""

import json
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

_client = None
if GROQ_API_KEY:
    _client = Groq(api_key=GROQ_API_KEY)

MODEL = "llama-3.1-8b-instant"

EXTRACTION_PROMPT = """You are a financial email parser for Indian bank and payment emails.

Analyze this email and extract transaction data. Return ONLY valid JSON, nothing else.

## Classification

First classify the email:
- "transaction": Bank debit/credit alert, UPI payment, card transaction
- "bill_reminder": Upcoming bill or payment due
- "subscription": Subscription renewal/cancellation notice
- "promotional": Bank offers, marketing (SKIP)
- "irrelevant": Not financial (SKIP)

## Extraction Rules

- Amount: Extract the EXACT number. Indian format: 1,00,000 = 100000. Handle ₹, Rs, Rs., INR
- Merchant: Clean name, not raw UPI IDs. "SWIGGY*ORDER123" → "Swiggy"
- Date: Use the transaction date from the email, NOT today. Format: YYYY-MM-DD
- Direction: "debit" if money left the account, "credit" if received
- Account: Last 4 digits if visible (e.g., "A/C XX1234" → "1234")
- Category: One of: Food, Travel, Shopping, Bills, Subscriptions, Entertainment, Health, Education, Groceries, Investment, Transfer, UPI, General
- Confidence: 0.0-1.0 how certain you are about the extraction

## Output

For transaction:
{"type":"transaction","amount":450.00,"currency":"INR","direction":"debit","merchant":"Swiggy","category":"Food","date":"2026-05-21","account_hint":"1234","description":"UPI payment to Swiggy","confidence":0.95}

For bill_reminder:
{"type":"bill_reminder","amount":2340.00,"currency":"INR","biller":"BESCOM Electricity","category":"Bills","due_date":"2026-05-25","is_recurring":true,"confidence":0.90}

For promotional/irrelevant:
{"type":"skip","reason":"Promotional offer from HDFC Bank"}"""


def parse_email_with_ai(subject: str, sender: str, date: str, body: str) -> dict | None:
    """Parse a financial email using Groq Llama 3.3 70B."""
    if not _client:
        return None

    body_truncated = body[:2500] if len(body) > 2500 else body

    user_msg = f"""Subject: {subject}
From: {sender}
Date: {date}
Body:
{body_truncated}"""

    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.1,
            max_tokens=400,
            response_format={"type": "json_object"},
        )

        text = response.choices[0].message.content.strip()
        result = json.loads(text)
        return _normalize_result(result)

    except json.JSONDecodeError:
        return None
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate" in error_msg.lower():
            print("AI parser: Rate limited, falling back to regex")
        else:
            print(f"AI parser error: {error_msg[:200]}")
        return None


def _normalize_result(data: dict) -> dict:
    """Normalize LLM output to our expected schema."""
    if not data:
        return data

    # Normalize type field
    t = data.get("type", "").lower()
    if t in ("debit", "credit", "transaction", "upi", "payment"):
        data["type"] = "transaction"
    elif t in ("bill", "bill_reminder", "reminder"):
        data["type"] = "bill_reminder"
    elif t in ("skip", "promotional", "irrelevant", "promo"):
        data["type"] = "skip"

    # Normalize direction
    d = data.get("direction", "").lower()
    if d in ("outward", "out", "debit", "debited", "sent"):
        data["direction"] = "debit"
    elif d in ("inward", "in", "credit", "credited", "received"):
        data["direction"] = "credit"

    # Clean merchant name
    import re
    merchant = data.get("merchant", "")
    if merchant:
        merchant = merchant.replace("*", " ").strip()
        for sep in ["ORDER", "TXN", "REF", "#"]:
            if sep in merchant.upper():
                merchant = merchant[:merchant.upper().index(sep)].strip()
        data["merchant"] = merchant.title() if merchant else "Unknown"

    # Normalize category
    valid_categories = {
        "food", "travel", "shopping", "bills", "subscriptions",
        "entertainment", "health", "education", "groceries",
        "investment", "transfer", "upi", "general",
    }
    cat = data.get("category", "General").lower()
    if cat == "purchase":
        cat = "shopping"
    if cat not in valid_categories:
        cat = "general"
    data["category"] = cat.title()

    # Clean account_hint to just last 4 digits
    hint = str(data.get("account_hint", "") or "")
    digits = "".join(c for c in hint if c.isdigit())
    data["account_hint"] = digits[-4:] if len(digits) >= 4 else digits or None

    return data


def parse_sms_with_ai(sms_text: str) -> dict | None:
    """Parse a bank SMS using Groq Llama 3.3 70B."""
    if not _client:
        return None

    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You parse Indian bank SMS messages. Return ONLY valid JSON.\n"
                        "Extract: type, amount, currency, direction (debit/credit), "
                        "merchant (clean name), category (Food|Travel|Shopping|Bills|"
                        "Subscriptions|Entertainment|Health|Education|Groceries|"
                        "Investment|Transfer|UPI|General), date (YYYY-MM-DD), "
                        "account_hint (last 4 digits), confidence (0-1).\n"
                        "If not financial: {\"type\":\"skip\",\"reason\":\"...\"}"
                    ),
                },
                {"role": "user", "content": sms_text},
            ],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"},
        )

        text = response.choices[0].message.content.strip()
        result = json.loads(text)
        return _normalize_result(result)

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate" in error_msg.lower():
            print("AI SMS parser: Rate limited, falling back to regex")
        else:
            print(f"AI SMS parser error: {error_msg[:200]}")
        return None

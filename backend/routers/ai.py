from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from pydantic import BaseModel
from database import get_db
from models import models
from routers.auth import get_current_user
import os
import json

router = APIRouter(prefix="/ai", tags=["AI"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
_groq_client = None

if GROQ_API_KEY:
    from groq import Groq
    _groq_client = Groq(api_key=GROQ_API_KEY)


class QueryRequest(BaseModel):
    query: str


def _get_financial_context(db: Session, user_id: int) -> str:
    """Build a financial context summary for the AI from the user's data."""
    today = datetime.now()
    first_of_month = today.replace(day=1)
    last_month_first = (first_of_month - timedelta(days=1)).replace(day=1)
    last_month_end = first_of_month - timedelta(days=1)
    week_start = today - timedelta(days=today.weekday())

    # This month totals by category
    category_spending = (
        db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label("total"),
            func.count(models.Transaction.id).label("count"),
        )
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_of_month,
        )
        .group_by(models.Transaction.category)
        .all()
    )

    # This month total
    month_total = sum(row.total for row in category_spending)

    # Last month total
    last_month_total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= last_month_first,
            models.Transaction.date <= last_month_end,
        )
        .scalar()
        or 0
    )

    # This week total
    week_total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= week_start.date(),
        )
        .scalar()
        or 0
    )

    # Top merchants this month
    top_merchants = (
        db.query(
            models.Transaction.merchant,
            func.sum(models.Transaction.amount).label("total"),
            func.count(models.Transaction.id).label("count"),
        )
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_of_month,
        )
        .group_by(models.Transaction.merchant)
        .order_by(func.sum(models.Transaction.amount).desc())
        .limit(10)
        .all()
    )

    # Recent transactions (last 10)
    recent = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == user_id)
        .order_by(models.Transaction.date.desc())
        .limit(10)
        .all()
    )

    # Income this month
    income_total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "income",
            models.Transaction.date >= first_of_month,
        )
        .scalar()
        or 0
    )

    # Build context
    lines = [
        f"Today: {today.strftime('%d %B %Y')}",
        f"",
        f"THIS MONTH EXPENSES: ₹{month_total:,.2f}",
        f"THIS MONTH INCOME: ₹{income_total:,.2f}",
        f"LAST MONTH EXPENSES: ₹{last_month_total:,.2f}",
        f"THIS WEEK EXPENSES: ₹{week_total:,.2f}",
        f"",
        f"SPENDING BY CATEGORY (this month):",
    ]
    for row in category_spending:
        lines.append(f"  {row.category or 'Uncategorized'}: ₹{row.total:,.2f} ({row.count} transactions)")

    lines.append(f"")
    lines.append(f"TOP MERCHANTS (this month):")
    for row in top_merchants:
        lines.append(f"  {row.merchant}: ₹{row.total:,.2f} ({row.count} txns)")

    lines.append(f"")
    lines.append(f"RECENT TRANSACTIONS:")
    for tx in recent:
        direction = "+" if tx.type == "income" else "-"
        lines.append(
            f"  {tx.date.strftime('%d %b')} | {tx.merchant} | {direction}₹{tx.amount:,.2f} | {tx.category or 'General'}"
        )

    return "\n".join(lines)


SYSTEM_PROMPT = """You are an AI Financial Copilot. You help users understand their spending, find savings, and make better financial decisions.

You have access to the user's real financial data provided below. Use it to answer questions accurately.

RULES:
- Always use the ACTUAL numbers from the data — never make up amounts
- Format currency as ₹X,XXX (Indian format)
- Be concise but insightful — 2-4 sentences max
- If asked about something not in the data, say so honestly
- Give actionable advice when relevant
- Use a friendly, conversational tone
- When comparing periods, calculate the actual percentage change
- If the user asks to set a budget or do something you can't, explain what they can do instead

USER'S FINANCIAL DATA:
{context}
"""


@router.post("/query")
def ai_query(
    query_req: QueryRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    context = _get_financial_context(db, current_user.id)

    # If Groq is available, use real AI
    if _groq_client:
        try:
            response = _groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT.format(context=context),
                    },
                    {"role": "user", "content": query_req.query},
                ],
                temperature=0.3,
                max_tokens=500,
            )
            answer = response.choices[0].message.content.strip()
            return {"answer": answer}
        except Exception as e:
            print(f"Groq AI error: {e}")
            # Fall through to keyword fallback

    # Fallback: keyword-based (when Groq is unavailable)
    return _keyword_fallback(query_req.query, db, current_user.id)


def _keyword_fallback(query: str, db: Session, user_id: int) -> dict:
    """Simple keyword-based fallback when AI is unavailable."""
    query_lower = query.lower()

    merchants = [
        "uber", "swiggy", "amazon", "netflix", "zomato",
        "flipkart", "ola", "spotify", "paytm", "phonepe",
    ]
    categories = [
        "food", "travel", "shopping", "bills",
        "subscriptions", "entertainment", "upi", "general",
    ]

    detected_merchant = next((m for m in merchants if m in query_lower), None)
    detected_category = next(
        (c.capitalize() for c in categories if c in query_lower), None
    )

    start_date = datetime.now().date().replace(day=1)
    time_period = "this month"

    if "this week" in query_lower or "last 7 days" in query_lower:
        start_date = (datetime.now() - timedelta(days=7)).date()
        time_period = "this week"
    elif "today" in query_lower:
        start_date = datetime.now().date()
        time_period = "today"

    q = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.is_duplicate == False,
        models.Transaction.date >= start_date,
    )

    if detected_merchant:
        q = q.filter(models.Transaction.merchant.ilike(f"%{detected_merchant}%"))
    if detected_category:
        q = q.filter(models.Transaction.category == detected_category)

    total = q.scalar() or 0
    subject = detected_merchant or detected_category or "total"
    return {"answer": f"You spent ₹{total:,.2f} on {subject} {time_period}."}

from sqlalchemy.orm import Session
from sqlalchemy import func
from models import models
from datetime import datetime, timedelta


def get_monthly_summary(db: Session, user_id: int):
    today = datetime.now()
    first_day = today.replace(day=1)

    # Total spending this month
    total_spending = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_day,
        )
        .scalar()
        or 0
    )

    # Category breakdown
    category_data = (
        db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label("total"),
        )
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_day,
        )
        .group_by(models.Transaction.category)
        .all()
    )

    category_breakdown = {
        (c or "Uncategorized"): float(t) for c, t in category_data
    }

    # Last month comparison
    last_month_first = (first_day - timedelta(days=1)).replace(day=1)
    last_month_last = first_day - timedelta(days=1)

    last_month_total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= last_month_first,
            models.Transaction.date <= last_month_last,
        )
        .scalar()
        or 0
    )

    change_pct = None
    if last_month_total > 0:
        change_pct = round(
            ((total_spending - last_month_total) / last_month_total) * 100, 1
        )

    # Daily spending trend
    daily_data = (
        db.query(
            models.Transaction.date,
            func.sum(models.Transaction.amount).label("total"),
        )
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_day,
        )
        .group_by(models.Transaction.date)
        .order_by(models.Transaction.date)
        .all()
    )

    daily_trend = [
        {"date": d[0].strftime("%d %b"), "amount": float(d[1])} for d in daily_data
    ]

    return {
        "total_spending": float(total_spending),
        "daily_trend": daily_trend,
        "category_breakdown": category_breakdown,
        "last_month_total": float(last_month_total),
        "change_percentage": change_pct,
    }


def detect_subscriptions(db: Session, user_id: int):
    transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.is_duplicate == False,
        )
        .order_by(models.Transaction.date.asc())
        .all()
    )

    if not transactions:
        return {"count": 0, "total_monthly_cost": 0, "subscriptions": []}

    # Group by merchant
    merchants = {}
    for t in transactions:
        merchants.setdefault(t.merchant, []).append(t)

    detected = []
    total_monthly_cost = 0

    for merchant, txs in merchants.items():
        if len(txs) < 2:
            continue

        intervals = []
        for i in range(len(txs) - 1):
            delta = (txs[i + 1].date - txs[i].date).days
            intervals.append(delta)

        if any(25 <= inv <= 35 for inv in intervals):
            avg_amount = sum(t.amount for t in txs) / len(txs)
            detected.append(
                {
                    "merchant": merchant,
                    "amount": round(float(avg_amount), 2),
                    "frequency": "Monthly",
                    "last_date": txs[-1].date.strftime("%Y-%m-%d"),
                }
            )
            total_monthly_cost += avg_amount

    return {
        "count": len(detected),
        "total_monthly_cost": round(float(total_monthly_cost), 2),
        "subscriptions": detected,
    }

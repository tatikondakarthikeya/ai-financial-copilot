from sqlalchemy.orm import Session
from sqlalchemy import func
from models import models
from datetime import datetime, timedelta


def detect_subscriptions(db: Session, user_id: int) -> list:
    """
    Detects recurring transactions with frequency analysis and cancellation insights.
    """
    transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
        )
        .order_by(models.Transaction.date.asc())
        .all()
    )
    if not transactions:
        return []

    # Group by merchant
    merchants = {}
    for t in transactions:
        merchants.setdefault(t.merchant, []).append(t)

    subscriptions = []
    now = datetime.now().date()

    for merchant, txs in merchants.items():
        if len(txs) < 2:
            continue

        amounts = [t.amount for t in txs]
        dates = sorted([t.date for t in txs])

        # Calculate intervals
        intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        if not intervals:
            continue

        avg_interval = sum(intervals) / len(intervals)
        avg_amount = sum(amounts) / len(amounts)
        amount_std = (sum((a - avg_amount) ** 2 for a in amounts) / len(amounts)) ** 0.5

        # Determine frequency
        frequency = None
        if 5 <= avg_interval <= 10:
            frequency = "Weekly"
        elif 25 <= avg_interval <= 35:
            frequency = "Monthly"
        elif 80 <= avg_interval <= 100:
            frequency = "Quarterly"
        elif 350 <= avg_interval <= 380:
            frequency = "Yearly"

        if not frequency:
            continue

        # Check amount stability (within 10% variance)
        is_stable = (amount_std / avg_amount < 0.15) if avg_amount > 0 else True
        if not is_stable:
            continue

        # Calculate next expected charge
        last_date = dates[-1]
        if frequency == "Weekly":
            next_date = last_date + timedelta(days=7)
        elif frequency == "Monthly":
            next_date = last_date + timedelta(days=30)
        elif frequency == "Quarterly":
            next_date = last_date + timedelta(days=90)
        else:
            next_date = last_date + timedelta(days=365)

        # Days since last charge
        days_since = (now - last_date).days

        # Status
        if frequency == "Monthly" and days_since > 45:
            status = "possibly_cancelled"
        elif frequency == "Weekly" and days_since > 14:
            status = "possibly_cancelled"
        else:
            status = "active"

        subscriptions.append({
            "merchant": merchant,
            "amount": round(float(avg_amount), 2),
            "frequency": frequency,
            "last_charge": last_date.isoformat(),
            "next_expected": next_date.isoformat(),
            "charge_count": len(txs),
            "total_spent": round(sum(amounts), 2),
            "days_since_last": days_since,
            "status": status,
            "category": txs[-1].category or "General",
        })

    # Sort: active first, then by amount desc
    subscriptions.sort(key=lambda x: (x["status"] != "active", -x["amount"]))
    return subscriptions

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import models
from routers.auth import get_current_user
from services import analytics_service, insights_engine
from services.health_score import calculate_health_score

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return analytics_service.get_monthly_summary(db, current_user.id)


@router.get("/insights")
def get_insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return insights_engine.generate_insights(db, current_user.id)


@router.get("/predictions")
def get_predictions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Predict month-end spending based on current rate."""
    import calendar
    from datetime import datetime, timedelta

    now = datetime.now()
    first_of_month = now.replace(day=1).date()
    _, last_day = calendar.monthrange(now.year, now.month)
    days_passed = now.day
    days_total = last_day
    days_remaining = days_total - days_passed

    # Current month spending
    total_spent = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_of_month,
        )
        .scalar() or 0
    )

    # Daily rate
    daily_rate = total_spent / max(days_passed, 1)
    predicted_total = daily_rate * days_total
    predicted_remaining = daily_rate * days_remaining

    # Last month total for comparison
    last_month_start = (first_of_month - timedelta(days=1)).replace(day=1)
    last_month_end = first_of_month - timedelta(days=1)
    last_month_total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= last_month_start,
            models.Transaction.date <= last_month_end,
        )
        .scalar() or 0
    )

    # Category predictions
    category_data = (
        db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount),
        )
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= first_of_month,
        )
        .group_by(models.Transaction.category)
        .all()
    )

    category_predictions = []
    for cat, spent in category_data:
        cat_predicted = (float(spent) / max(days_passed, 1)) * days_total
        category_predictions.append({
            "category": cat or "General",
            "spent": round(float(spent), 2),
            "predicted": round(cat_predicted, 2),
        })

    category_predictions.sort(key=lambda x: x["predicted"], reverse=True)

    return {
        "days_passed": days_passed,
        "days_remaining": days_remaining,
        "days_total": days_total,
        "spent_so_far": round(float(total_spent), 2),
        "daily_rate": round(float(daily_rate), 2),
        "predicted_total": round(float(predicted_total), 2),
        "predicted_remaining": round(float(predicted_remaining), 2),
        "last_month_total": round(float(last_month_total), 2),
        "vs_last_month": round(float(predicted_total - last_month_total), 2) if last_month_total > 0 else None,
        "category_predictions": category_predictions,
    }


@router.get("/health-score")
def get_health_score(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return calculate_health_score(db, current_user.id)


@router.get("/weekly-digest")
def get_weekly_digest(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """AI-generated weekly financial summary."""
    from datetime import datetime, timedelta

    now = datetime.now()
    week_start = (now - timedelta(days=now.weekday())).date()
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start - timedelta(days=1)

    # This week data
    week_expenses = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= week_start,
        )
        .scalar() or 0
    )

    # Last week
    last_week_expenses = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= last_week_start,
            models.Transaction.date <= last_week_end,
        )
        .scalar() or 0
    )

    # Top categories this week
    top_cats = (
        db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label("total"),
            func.count(models.Transaction.id).label("count"),
        )
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= week_start,
        )
        .group_by(models.Transaction.category)
        .order_by(func.sum(models.Transaction.amount).desc())
        .limit(5)
        .all()
    )

    # Top merchants this week
    top_merchants = (
        db.query(
            models.Transaction.merchant,
            func.sum(models.Transaction.amount).label("total"),
            func.count(models.Transaction.id).label("count"),
        )
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= week_start,
        )
        .group_by(models.Transaction.merchant)
        .order_by(func.sum(models.Transaction.amount).desc())
        .limit(5)
        .all()
    )

    # Transaction count
    tx_count = (
        db.query(func.count(models.Transaction.id))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.date >= week_start,
        )
        .scalar() or 0
    )

    change_pct = None
    if last_week_expenses > 0:
        change_pct = round(((week_expenses - last_week_expenses) / last_week_expenses) * 100, 1)

    highlights = []
    if change_pct is not None:
        if change_pct > 15:
            highlights.append(f"Spending up {change_pct}% from last week")
        elif change_pct < -15:
            highlights.append(f"Great job! Spending down {abs(change_pct)}% from last week")

    if top_cats:
        top = top_cats[0]
        highlights.append(f"Biggest category: {top.category or 'General'} (₹{float(top.total):,.0f})")

    if top_merchants:
        highlights.append(f"Top merchant: {top_merchants[0].merchant} (₹{float(top_merchants[0].total):,.0f})")

    return {
        "week_start": week_start.isoformat(),
        "total_spent": round(float(week_expenses), 2),
        "last_week_spent": round(float(last_week_expenses), 2),
        "change_percentage": change_pct,
        "transaction_count": tx_count,
        "top_categories": [
            {"category": c.category or "General", "amount": round(float(c.total), 2), "count": c.count}
            for c in top_cats
        ],
        "top_merchants": [
            {"merchant": m.merchant, "amount": round(float(m.total), 2), "count": m.count}
            for m in top_merchants
        ],
        "highlights": highlights,
    }


@router.get("/subscriptions")
def get_subscriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return analytics_service.detect_subscriptions(db, current_user.id)

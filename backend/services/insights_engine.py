from sqlalchemy.orm import Session
from sqlalchemy import func
from models import models
from datetime import datetime, timedelta
from services import analytics_service


def generate_insights(db: Session, user_id: int):
    today = datetime.now()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)

    # Weekly food spending
    food_spending_this_week = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.category == "Food",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= this_week_start.date(),
        )
        .scalar()
        or 0
    )

    food_spending_last_week = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.category == "Food",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= last_week_start.date(),
            models.Transaction.date < this_week_start.date(),
        )
        .scalar()
        or 0
    )

    # Subscription data
    sub_data = analytics_service.detect_subscriptions(db, user_id)
    subscriptions = sub_data.get("subscriptions", [])
    total_subscription_cost = sub_data.get("total_monthly_cost", 0)

    # Build messages
    messages = []

    if food_spending_this_week > 0:
        messages.append(
            f"You spent ₹{food_spending_this_week:,.0f} on food this week."
        )

    if food_spending_last_week > 0 and food_spending_this_week > 0:
        change = (
            (food_spending_this_week - food_spending_last_week)
            / food_spending_last_week
            * 100
        )
        if change > 10:
            messages.append(
                f"Food spending increased {change:.0f}% compared to last week."
            )
        elif change < -10:
            messages.append(
                f"Great! Food spending decreased {abs(change):.0f}% compared to last week."
            )

    if subscriptions:
        messages.append(
            f"You have {len(subscriptions)} active subscriptions "
            f"costing ₹{total_subscription_cost:,.0f}/month."
        )

    if not messages:
        messages.append("Start adding transactions to see spending insights!")

    return {
        "weekly_food_spending": float(food_spending_this_week),
        "subscriptions": subscriptions,
        "messages": messages,
    }

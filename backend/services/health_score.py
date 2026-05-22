"""
Financial Health Score — 0 to 100.

Components:
1. Savings Rate (30 pts) — income vs expenses ratio
2. Budget Adherence (25 pts) — staying within budgets
3. Spending Stability (20 pts) — consistent vs erratic spending
4. Subscription Burden (15 pts) — subscription % of income
5. Diversity (10 pts) — not over-concentrated in one category
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from models import models
from models.budget import Budget


def calculate_health_score(db: Session, user_id: int) -> dict:
    now = datetime.now()
    first_of_month = now.replace(day=1).date()
    last_month_start = (first_of_month - timedelta(days=1)).replace(day=1)
    last_month_end = first_of_month - timedelta(days=1)

    # Fetch data
    month_expenses = _total_expenses(db, user_id, first_of_month)
    month_income = _total_income(db, user_id, first_of_month)
    last_month_expenses = _total_expenses(db, user_id, last_month_start, last_month_end)
    category_spending = _category_breakdown(db, user_id, first_of_month)
    budgets = db.query(Budget).filter(Budget.user_id == user_id, Budget.is_active == True).all()

    # 1. Savings Rate (30 pts)
    savings_score, savings_detail = _savings_score(month_income, month_expenses)

    # 2. Budget Adherence (25 pts)
    budget_score, budget_detail = _budget_score(budgets, db, user_id, first_of_month)

    # 3. Spending Stability (20 pts)
    stability_score, stability_detail = _stability_score(month_expenses, last_month_expenses)

    # 4. Subscription Burden (15 pts)
    sub_spending = category_spending.get("Subscriptions", 0)
    sub_score, sub_detail = _subscription_score(sub_spending, month_income or month_expenses)

    # 5. Diversity (10 pts)
    diversity_score, diversity_detail = _diversity_score(category_spending, month_expenses)

    total = savings_score + budget_score + stability_score + sub_score + diversity_score
    total = min(100, max(0, round(total)))

    if total >= 80:
        grade = "Excellent"
        color = "emerald"
    elif total >= 60:
        grade = "Good"
        color = "blue"
    elif total >= 40:
        grade = "Fair"
        color = "amber"
    else:
        grade = "Needs Work"
        color = "red"

    return {
        "score": total,
        "grade": grade,
        "color": color,
        "breakdown": {
            "savings": {"score": round(savings_score, 1), "max": 30, "detail": savings_detail},
            "budget": {"score": round(budget_score, 1), "max": 25, "detail": budget_detail},
            "stability": {"score": round(stability_score, 1), "max": 20, "detail": stability_detail},
            "subscriptions": {"score": round(sub_score, 1), "max": 15, "detail": sub_detail},
            "diversity": {"score": round(diversity_score, 1), "max": 10, "detail": diversity_detail},
        },
        "summary": {
            "monthly_income": round(float(month_income), 2),
            "monthly_expenses": round(float(month_expenses), 2),
            "savings_rate": round((1 - month_expenses / month_income) * 100, 1) if month_income > 0 else 0,
        },
    }


def _savings_score(income: float, expenses: float) -> tuple:
    if income <= 0:
        return 15, "No income data — add income transactions for accurate score"
    rate = (income - expenses) / income
    if rate >= 0.3:
        return 30, f"Great! Saving {rate*100:.0f}% of income"
    elif rate >= 0.2:
        return 25, f"Saving {rate*100:.0f}% — aim for 30%+"
    elif rate >= 0.1:
        return 18, f"Saving {rate*100:.0f}% — try to increase"
    elif rate >= 0:
        return 10, f"Barely saving {rate*100:.0f}% — cut unnecessary spending"
    else:
        return 0, f"Spending more than earning! Over by ₹{abs(income-expenses):,.0f}"


def _budget_score(budgets, db, user_id, start_date) -> tuple:
    if not budgets:
        return 12.5, "No budgets set — set budgets for a better score"

    within = 0
    for b in budgets:
        query = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= start_date,
        )
        if b.category != "Total":
            query = query.filter(models.Transaction.category == b.category)
        spent = query.scalar() or 0
        if spent <= b.amount_limit:
            within += 1

    ratio = within / len(budgets)
    score = ratio * 25
    return score, f"{within}/{len(budgets)} budgets on track"


def _stability_score(this_month: float, last_month: float) -> tuple:
    if last_month <= 0:
        return 10, "Not enough history — need 2 months of data"
    change = abs(this_month - last_month) / last_month
    if change <= 0.1:
        return 20, "Very stable spending pattern"
    elif change <= 0.25:
        return 15, f"Spending changed {change*100:.0f}% from last month"
    elif change <= 0.5:
        return 10, f"Spending swung {change*100:.0f}% — try to be more consistent"
    else:
        return 5, f"Erratic spending — {change*100:.0f}% change from last month"


def _subscription_score(sub_spending: float, reference: float) -> tuple:
    if reference <= 0:
        return 10, "No data to assess"
    ratio = sub_spending / reference
    if ratio <= 0.05:
        return 15, "Subscription burden is low"
    elif ratio <= 0.1:
        return 12, f"Subscriptions are {ratio*100:.0f}% of spending"
    elif ratio <= 0.2:
        return 8, f"Subscriptions at {ratio*100:.0f}% — review for unused ones"
    else:
        return 3, f"High subscription burden at {ratio*100:.0f}%"


def _diversity_score(categories: dict, total: float) -> tuple:
    if total <= 0 or not categories:
        return 5, "Need more transactions for analysis"
    max_cat = max(categories.values()) if categories else 0
    concentration = max_cat / total
    if concentration <= 0.3:
        return 10, "Well-diversified spending"
    elif concentration <= 0.5:
        return 7, "Moderately concentrated spending"
    else:
        top = max(categories, key=categories.get)
        return 4, f"Spending heavily concentrated in {top} ({concentration*100:.0f}%)"


def _total_expenses(db, user_id, start, end=None):
    q = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense",
        models.Transaction.is_duplicate == False,
        models.Transaction.date >= start,
    )
    if end:
        q = q.filter(models.Transaction.date <= end)
    return q.scalar() or 0


def _total_income(db, user_id, start, end=None):
    q = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "income",
        models.Transaction.date >= start,
    )
    if end:
        q = q.filter(models.Transaction.date <= end)
    return q.scalar() or 0


def _category_breakdown(db, user_id, start):
    rows = (
        db.query(models.Transaction.category, func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.is_duplicate == False,
            models.Transaction.date >= start,
        )
        .group_by(models.Transaction.category)
        .all()
    )
    return {(c or "General"): float(t) for c, t in rows}

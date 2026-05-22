from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from models import models
from models.budget import Budget
from routers.auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])


class BudgetCreate(BaseModel):
    category: str
    amount_limit: float
    period: str = "monthly"


class BudgetUpdate(BaseModel):
    amount_limit: Optional[float] = None
    is_active: Optional[bool] = None


@router.post("/")
def create_budget(
    req: BudgetCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if budget already exists for this category
    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category == req.category,
            Budget.is_active == True,
        )
        .first()
    )
    if existing:
        # Update existing
        existing.amount_limit = req.amount_limit
        db.commit()
        return _budget_to_dict(existing, db, current_user.id)

    budget = Budget(
        user_id=current_user.id,
        category=req.category,
        amount_limit=req.amount_limit,
        period=req.period,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _budget_to_dict(budget, db, current_user.id)


@router.get("/")
def get_budgets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.is_active == True)
        .all()
    )
    return [_budget_to_dict(b, db, current_user.id) for b in budgets]


@router.get("/status")
def get_budget_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all budgets with current spending, percentage, and alerts."""
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.is_active == True)
        .all()
    )

    result = []
    alerts = []

    for b in budgets:
        data = _budget_to_dict(b, db, current_user.id)
        result.append(data)

        pct = data["percentage"]
        if pct >= 100:
            alerts.append({
                "type": "exceeded",
                "category": b.category,
                "message": f"You've exceeded your {b.category} budget by ₹{data['spent'] - b.amount_limit:,.0f}",
                "severity": "error",
            })
        elif pct >= 80:
            remaining = b.amount_limit - data["spent"]
            alerts.append({
                "type": "warning",
                "category": b.category,
                "message": f"You've used {pct:.0f}% of your {b.category} budget. ₹{remaining:,.0f} remaining",
                "severity": "warning",
            })
        elif pct >= 50:
            days_left = _days_remaining(b.period)
            alerts.append({
                "type": "on_track",
                "category": b.category,
                "message": f"{b.category}: ₹{data['spent']:,.0f} of ₹{b.amount_limit:,.0f} spent. {days_left} days left",
                "severity": "info",
            })

    return {"budgets": result, "alerts": alerts}


@router.patch("/{budget_id}")
def update_budget(
    budget_id: int,
    req: BudgetUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if req.amount_limit is not None:
        budget.amount_limit = req.amount_limit
    if req.is_active is not None:
        budget.is_active = req.is_active

    db.commit()
    return _budget_to_dict(budget, db, current_user.id)


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted"}


def _budget_to_dict(budget: Budget, db: Session, user_id: int) -> dict:
    """Convert budget to dict with current spending calculated."""
    start_date = _period_start(budget.period)

    # Calculate spending for this category in the period
    query = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense",
        models.Transaction.is_duplicate == False,
        models.Transaction.date >= start_date,
    )

    if budget.category != "Total":
        query = query.filter(models.Transaction.category == budget.category)

    spent = query.scalar() or 0
    pct = (spent / budget.amount_limit * 100) if budget.amount_limit > 0 else 0

    return {
        "id": budget.id,
        "category": budget.category,
        "amount_limit": budget.amount_limit,
        "period": budget.period,
        "spent": round(float(spent), 2),
        "remaining": round(float(max(budget.amount_limit - spent, 0)), 2),
        "percentage": round(pct, 1),
        "is_active": budget.is_active,
        "status": "exceeded" if pct >= 100 else "warning" if pct >= 80 else "on_track",
    }


def _period_start(period: str):
    now = datetime.now()
    if period == "weekly":
        return (now - timedelta(days=now.weekday())).date()
    return now.replace(day=1).date()


def _days_remaining(period: str) -> int:
    now = datetime.now()
    if period == "weekly":
        return 7 - now.weekday()
    import calendar
    _, last_day = calendar.monthrange(now.year, now.month)
    return last_day - now.day

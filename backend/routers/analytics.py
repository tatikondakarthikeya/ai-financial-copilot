from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import models
from routers.auth import get_current_user
from services import analytics_service, insights_engine

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


@router.get("/subscriptions")
def get_subscriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return analytics_service.detect_subscriptions(db, current_user.id)

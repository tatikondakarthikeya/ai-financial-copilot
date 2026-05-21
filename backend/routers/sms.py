from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from database import get_db
from models import models
import schemas
from routers.auth import get_current_user
from services import ml_service
from services.ai_parser import parse_sms_with_ai

router = APIRouter(prefix="/sms", tags=["SMS"])


@router.post("/parse", response_model=schemas.SMSParseResponse)
def parse_sms_endpoint(
    sms_input: schemas.SMSInput,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Try AI parser first
    ai_result = parse_sms_with_ai(sms_input.sms_text)

    if ai_result and ai_result.get("type") == "transaction":
        parsed_data = {
            "merchant": ai_result.get("merchant", "Unknown"),
            "amount": float(ai_result.get("amount", 0)),
            "category": ai_result.get("category", "General"),
            "type": "income" if ai_result.get("direction") == "credit" else "expense",
            "ai_tags": f"ai_parsed,confidence:{ai_result.get('confidence', 0.8):.2f}",
        }
    else:
        # Fallback to regex
        parsed_data = ml_service.parse_sms(sms_input.sms_text)

    # Check for duplicates
    two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
    existing_tx = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.merchant == parsed_data["merchant"],
            models.Transaction.amount == parsed_data["amount"],
            models.Transaction.source == "sms",
            models.Transaction.created_at >= two_minutes_ago,
        )
        .first()
    )

    is_duplicate = existing_tx is not None
    message = "Duplicate transaction flagged" if is_duplicate else None

    tx_date = date.today()
    if ai_result and ai_result.get("date"):
        try:
            tx_date = datetime.strptime(ai_result["date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    db_transaction = models.Transaction(
        user_id=current_user.id,
        date=tx_date,
        merchant=parsed_data["merchant"],
        amount=parsed_data["amount"],
        type=parsed_data["type"],
        category=parsed_data["category"],
        ai_tags=parsed_data.get("ai_tags"),
        source="sms",
        is_duplicate=is_duplicate,
    )

    db.add(db_transaction)
    try:
        db.commit()
        db.refresh(db_transaction)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error saving transaction")

    return {
        "merchant": parsed_data["merchant"],
        "amount": parsed_data["amount"],
        "category": parsed_data["category"],
        "type": parsed_data["type"],
        "is_duplicate": is_duplicate,
        "message": message,
    }

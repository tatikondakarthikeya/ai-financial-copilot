from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models import models
from routers.auth import get_current_user
from services import setu_aa_service
from services.bank_csv_parser import categorize_merchant

router = APIRouter(prefix="/setu", tags=["Setu Account Aggregator"])


class ConsentRequest(BaseModel):
    mobile_number: str


@router.post("/create-consent")
def create_consent(
    req: ConsentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a consent request and return the Setu consent URL."""
    try:
        result = setu_aa_service.create_consent(req.mobile_number)
        return {
            "status": "success",
            "consent_id": result["consent_id"],
            "consent_url": result["consent_url"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create consent: {str(e)}")


@router.get("/consent-status/{consent_id}")
def check_consent_status(
    consent_id: str,
    current_user: models.User = Depends(get_current_user),
):
    """Check if user has approved the consent."""
    try:
        result = setu_aa_service.get_consent_status(consent_id)
        return {
            "status": result.get("status", "PENDING"),
            "consent_id": consent_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch-data/{consent_id}")
def fetch_bank_data(
    consent_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch bank transactions after consent is approved."""
    try:
        # Check consent is approved
        consent = setu_aa_service.get_consent_status(consent_id)
        if consent.get("status") != "ACTIVE":
            return {
                "status": "waiting",
                "message": f"Consent is {consent.get('status', 'PENDING')}. User needs to approve first.",
            }

        # Create data session
        session = setu_aa_service.create_data_session(consent_id)
        session_id = session.get("id")

        if not session_id:
            raise HTTPException(status_code=500, detail="Failed to create data session")

        # Fetch transactions
        transactions = setu_aa_service.fetch_data(session_id)

        # Store in database
        added = 0
        duplicates = 0

        for tx in transactions:
            # Dedup check
            exists = (
                db.query(models.Transaction)
                .filter(
                    models.Transaction.user_id == current_user.id,
                    models.Transaction.date == tx["date"],
                    models.Transaction.amount == tx["amount"],
                    models.Transaction.merchant == tx["merchant"],
                )
                .first()
            )
            if exists:
                duplicates += 1
                continue

            category = categorize_merchant(tx["merchant"])

            db_tx = models.Transaction(
                user_id=current_user.id,
                date=datetime.strptime(tx["date"], "%Y-%m-%d").date(),
                merchant=tx["merchant"],
                amount=tx["amount"],
                type=tx["type"],
                category=category,
                source="setu_aa",
                ai_tags=f"ref:{tx.get('reference', '')}",
                is_duplicate=False,
            )
            db.add(db_tx)
            added += 1

        db.commit()

        return {
            "status": "success",
            "transactions_added": added,
            "duplicates_skipped": duplicates,
            "total_fetched": len(transactions),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")


@router.post("/callback")
async def setu_webhook(request: Request):
    """Receive webhook notifications from Setu AA."""
    body = await request.json()
    print(f"Setu webhook received: {body}")

    # Log the event type
    event_type = body.get("type", "unknown")
    consent_id = body.get("consentId", "")
    status = body.get("consentStatus", body.get("status", ""))

    print(f"Setu event: type={event_type}, consent={consent_id}, status={status}")

    # Return success to acknowledge
    return {"status": "ok"}

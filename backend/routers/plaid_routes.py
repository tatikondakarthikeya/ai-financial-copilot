from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models import models
from routers.auth import get_current_user
from services import plaid_service
from services.bank_csv_parser import categorize_merchant

router = APIRouter(prefix="/plaid", tags=["Plaid Bank Linking"])


class ExchangeRequest(BaseModel):
    public_token: str


@router.post("/create-link-token")
def create_link_token(
    current_user: models.User = Depends(get_current_user),
):
    """Create a Plaid Link token for the frontend."""
    try:
        result = plaid_service.create_link_token(str(current_user.id))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange-token")
def exchange_token(
    req: ExchangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange public token for access token and fetch transactions."""
    try:
        # Exchange token
        token_data = plaid_service.exchange_public_token(req.public_token)
        access_token = token_data["access_token"]
        item_id = token_data["item_id"]

        # Fetch transactions
        result = plaid_service.get_transactions(access_token)
        transactions = result["transactions"]

        # Fetch more if paginated
        while result["has_more"]:
            result = plaid_service.get_transactions(access_token, result["cursor"])
            transactions.extend(result["transactions"])

        # Store transactions
        added = 0
        duplicates = 0

        for tx in transactions:
            # Dedup by plaid_transaction_id
            exists = (
                db.query(models.Transaction)
                .filter(
                    models.Transaction.user_id == current_user.id,
                    models.Transaction.source == "plaid",
                    models.Transaction.email_id == tx["plaid_transaction_id"],
                )
                .first()
            )
            if exists:
                duplicates += 1
                continue

            db_tx = models.Transaction(
                user_id=current_user.id,
                date=datetime.strptime(tx["date"], "%Y-%m-%d").date(),
                merchant=tx["merchant"][:100],
                amount=tx["amount"],
                type=tx["type"],
                category=tx["category"],
                source="plaid",
                email_id=tx["plaid_transaction_id"],  # reuse for dedup
                ai_tags=f"plaid,item:{item_id[:8]}",
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
            "item_id": item_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

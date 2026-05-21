from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import pandas as pd
import io
from database import get_db
from models import models
import schemas
from routers.auth import get_current_user
from services import category_classifier
from services.gmail_service import GmailService
from services.bank_csv_parser import parse_bank_csv

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/sync-gmail")
async def sync_gmail(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gmail_service = GmailService(db, user.id)
    return gmail_service.sync_transactions()


@router.post("/add", response_model=schemas.TransactionResponse)
def add_transaction(
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category, ai_tags = category_classifier.classify_transaction(transaction.merchant)

    db_transaction = models.Transaction(
        date=transaction.date,
        merchant=transaction.merchant,
        amount=transaction.amount,
        type=transaction.type,
        user_id=current_user.id,
        category=category,
        ai_tags=ai_tags,
        source="manual",
    )
    db.add(db_transaction)
    try:
        db.commit()
        db.refresh(db_transaction)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error saving transaction")
    return db_transaction


@router.post("/upload")
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    contents = file.file.read()
    df = pd.read_csv(io.BytesIO(contents))

    required_cols = {"date", "merchant", "amount", "type"}
    if not required_cols.issubset(df.columns):
        raise HTTPException(
            status_code=400, detail=f"CSV must contain columns: {required_cols}"
        )

    transactions_added = 0
    for _, row in df.iterrows():
        merchant = str(row["merchant"])
        category, ai_tags = category_classifier.classify_transaction(merchant)
        db_transaction = models.Transaction(
            date=pd.to_datetime(row["date"]).date(),
            merchant=merchant,
            amount=float(row["amount"]),
            type=str(row.get("type", "expense")),
            category=category,
            ai_tags=ai_tags,
            source="csv",
            user_id=current_user.id,
        )
        db.add(db_transaction)
        transactions_added += 1

    db.commit()
    return {"message": f"Successfully uploaded {transactions_added} transactions"}


@router.post("/upload-bank-statement")
def upload_bank_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload a bank statement CSV. Auto-detects bank format and parses transactions."""
    if not file.filename.endswith((".csv", ".CSV")):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    contents = file.file.read()
    result = parse_bank_csv(contents, file.filename)

    if result["errors"] and not result["transactions"]:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse file: {result['errors'][0]}",
        )

    added = 0
    duplicates = 0

    for tx in result["transactions"]:
        # Dedup: check if same date + amount + merchant already exists
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

        db_tx = models.Transaction(
            user_id=current_user.id,
            date=datetime.strptime(tx["date"], "%Y-%m-%d").date(),
            merchant=tx["merchant"],
            amount=tx["amount"],
            type=tx["type"],
            category=tx["category"],
            source="bank_csv",
            ai_tags=f"bank:{result['bank']}",
            is_duplicate=False,
        )
        db.add(db_tx)
        added += 1

    db.commit()

    return {
        "status": "success",
        "bank_detected": result["bank"],
        "transactions_added": added,
        "duplicates_skipped": duplicates,
        "rows_skipped": result["skipped"],
        "errors": result["errors"][:5],
    }


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == transaction_id,
            models.Transaction.user_id == current_user.id,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"message": "Transaction deleted"}


@router.get("/", response_model=List[schemas.TransactionResponse])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.date.desc())
        .all()
    )

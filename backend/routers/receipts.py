import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import models
from routers.auth import get_current_user
from services.bank_csv_parser import categorize_merchant
import os
import json

router = APIRouter(prefix="/receipts", tags=["Receipt Scanner"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
_groq_client = None
if GROQ_API_KEY:
    from groq import Groq
    _groq_client = Groq(api_key=GROQ_API_KEY)


@router.post("/scan")
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a receipt image, AI extracts merchant/amount/items."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Encode to base64
    b64 = base64.b64encode(contents).decode("utf-8")
    mime = file.content_type or "image/jpeg"

    # Use Groq vision model to extract receipt data
    if not _groq_client:
        raise HTTPException(status_code=500, detail="AI not configured")

    try:
        response = _groq_client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Extract data from this receipt image. Return ONLY valid JSON:
{
  "merchant": "<store/restaurant name>",
  "amount": <total amount as number>,
  "currency": "INR" or "USD",
  "date": "<YYYY-MM-DD or null>",
  "items": [{"name": "<item>", "amount": <price>}],
  "category": "<Food|Shopping|Groceries|Bills|Health|Entertainment|Travel|General>",
  "confidence": <0.0-1.0>
}
If not a receipt, return: {"error": "Not a receipt"}""",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)

        if result.get("error"):
            return {"status": "failed", "message": result["error"]}

        # Parse and return
        merchant = result.get("merchant", "Unknown")
        amount = float(result.get("amount", 0))
        category = result.get("category") or categorize_merchant(merchant)
        tx_date = result.get("date")

        return {
            "status": "success",
            "data": {
                "merchant": merchant,
                "amount": amount,
                "currency": result.get("currency", "INR"),
                "date": tx_date,
                "items": result.get("items", []),
                "category": category,
                "confidence": result.get("confidence", 0.8),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan receipt: {str(e)[:200]}")


@router.post("/scan-and-save")
async def scan_and_save(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Scan receipt and immediately save as transaction."""
    # Reuse scan logic
    result = await scan_receipt(file, current_user, db)

    if result.get("status") != "success":
        return result

    data = result["data"]
    amount = data["amount"]
    if amount <= 0:
        return {"status": "failed", "message": "Could not extract amount from receipt"}

    tx_date = datetime.now().date()
    if data.get("date"):
        try:
            tx_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    tx = models.Transaction(
        user_id=current_user.id,
        date=tx_date,
        merchant=data["merchant"][:100],
        amount=amount,
        type="expense",
        category=data["category"],
        source="receipt",
        ai_tags=f"receipt,confidence:{data.get('confidence', 0.8):.2f}",
        is_duplicate=False,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    return {
        "status": "success",
        "transaction_id": tx.id,
        "data": data,
    }

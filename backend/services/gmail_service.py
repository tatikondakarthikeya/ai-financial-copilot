import base64
import re
import json
from datetime import datetime
from email.utils import parsedate_to_datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy.orm import Session
from models import models
from services.ai_parser import parse_email_with_ai


class GmailService:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.creds = self._get_credentials()

    def _get_credentials(self):
        auth = (
            self.db.query(models.UserGoogleAuth)
            .filter(models.UserGoogleAuth.user_id == self.user_id)
            .first()
        )
        if not auth:
            return None

        return Credentials(
            token=auth.access_token,
            refresh_token=auth.refresh_token,
            token_uri=auth.token_uri,
            client_id=auth.client_id,
            client_secret=auth.client_secret,
            scopes=json.loads(auth.scopes),
        )

    def sync_transactions(self):
        if not self.creds:
            return {"status": "error", "message": "Google not connected"}

        service = build("gmail", "v1", credentials=self.creds)

        query = (
            "category:updates "
            "(₹ OR rs OR inr OR debited OR credited OR paid OR bill "
            "OR recharge OR txn OR upi OR invoice OR receipt) "
            "newer_than:30d"
        )

        results = (
            service.users()
            .messages()
            .list(userId="me", q=query, maxResults=25)
            .execute()
        )

        messages = results.get("messages", [])
        new_count = 0
        duplicate_count = 0
        skipped_count = 0
        error_count = 0

        for msg in messages:
            try:
                status = self._process_message(service, msg["id"])
                if status == "new":
                    new_count += 1
                elif status == "duplicate":
                    duplicate_count += 1
                elif status == "skipped":
                    skipped_count += 1
            except Exception as e:
                print(f"Error processing message {msg['id']}: {e}")
                error_count += 1

        return {
            "status": "success",
            "new_transactions": new_count,
            "duplicates_skipped": duplicate_count,
            "non_financial_skipped": skipped_count,
            "errors": error_count,
        }

    def _process_message(self, service, msg_id: str) -> str:
        # Skip if already ingested
        exists = (
            self.db.query(models.Transaction)
            .filter(models.Transaction.email_id == msg_id)
            .first()
        )
        if exists:
            return "duplicate"

        message = service.users().messages().get(userId="me", id=msg_id).execute()
        payload = message.get("payload", {})
        headers = payload.get("headers", [])

        subject = next(
            (h["value"] for h in headers if h["name"].lower() == "subject"), ""
        )
        sender = next(
            (h["value"] for h in headers if h["name"].lower() == "from"), ""
        )
        date_str = next(
            (h["value"] for h in headers if h["name"].lower() == "date"), ""
        )

        body = self._get_body(payload)

        # === TRY AI PARSER FIRST ===
        ai_result = parse_email_with_ai(subject, sender, date_str, body)

        if ai_result and ai_result.get("type") == "transaction":
            return self._save_ai_transaction(ai_result, msg_id, date_str)

        if ai_result and ai_result.get("type") == "bill_reminder":
            # For now, save bill reminders as upcoming expenses
            return self._save_ai_bill_reminder(ai_result, msg_id, date_str)

        if ai_result and ai_result.get("type") == "skip":
            return "skipped"

        # === FALLBACK TO REGEX (if AI unavailable or failed) ===
        return self._process_with_regex(subject, sender, date_str, body, msg_id)

    def _save_ai_transaction(self, data: dict, msg_id: str, date_str: str) -> str:
        """Save an AI-parsed transaction."""
        # Parse date from AI result or email header
        tx_date = None
        if data.get("date"):
            try:
                tx_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass
        if not tx_date:
            tx_date = self._parse_email_date(date_str)

        amount = data.get("amount")
        if not amount or amount <= 0:
            return "skipped"

        # Map AI direction to our type
        direction = data.get("direction", "debit")
        tx_type = "income" if direction == "credit" else "expense"

        merchant = data.get("merchant", "Unknown")
        category = data.get("category", "General")
        confidence = data.get("confidence", 0.8)
        description = data.get("description", "")

        new_tx = models.Transaction(
            user_id=self.user_id,
            date=tx_date,
            merchant=merchant[:100],
            amount=float(amount),
            source="email",
            email_id=msg_id,
            category=category,
            type=tx_type,
            is_duplicate=False,
            ai_tags=f"confidence:{confidence:.2f}",
        )

        self.db.add(new_tx)
        self.db.commit()
        return "new"

    def _save_ai_bill_reminder(self, data: dict, msg_id: str, date_str: str) -> str:
        """Save a bill reminder as an upcoming transaction."""
        due_date = None
        if data.get("due_date"):
            try:
                due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass
        if not due_date:
            due_date = self._parse_email_date(date_str)

        amount = data.get("amount")
        if not amount or amount <= 0:
            return "skipped"

        biller = data.get("biller", "Unknown")
        category = data.get("category", "Bills")

        new_tx = models.Transaction(
            user_id=self.user_id,
            date=due_date,
            merchant=biller[:100],
            amount=float(amount),
            source="email",
            email_id=msg_id,
            category=category,
            type="expense",
            is_duplicate=False,
            ai_tags=f"bill_reminder,confidence:{data.get('confidence', 0.8):.2f}",
        )

        self.db.add(new_tx)
        self.db.commit()
        return "new"

    # === REGEX FALLBACK (used when Gemini API key not set or AI fails) ===

    def _process_with_regex(
        self, subject: str, sender: str, date_str: str, body: str, msg_id: str
    ) -> str:
        text = (subject + " " + body).lower()

        valid_senders = [
            "hdfc", "icici", "sbi", "axis", "kotak",
            "yesbank", "indusind", "rbl", "federal",
            "paytm", "phonepe", "gpay",
            "amazon", "flipkart",
            "swiggy", "zomato",
            "uber", "ola",
            "airtel", "jio", "vodafone", "vi",
        ]

        has_valid_sender = any(v in sender.lower() for v in valid_senders)
        has_amount = bool(re.search(r"(₹|rs|inr)\s?\d+", text))

        if not has_valid_sender and not has_amount:
            return "skipped"

        keywords = [
            "debited", "credited", "spent", "paid",
            "txn", "transaction", "upi", "purchase",
            "bill", "due", "recharge", "invoice",
        ]
        has_keyword = any(k in text for k in keywords)

        if not has_keyword and not has_amount:
            return "skipped"

        amount = self._extract_amount(text)
        if not amount:
            return "skipped"

        tx_date = self._parse_email_date(date_str)

        if any(x in text for x in ["credited", "refund", "received", "cashback"]):
            tx_type = "income"
        else:
            tx_type = "expense"

        merchant = self._extract_merchant(sender, text)
        category = self._get_category(merchant)

        new_tx = models.Transaction(
            user_id=self.user_id,
            date=tx_date,
            merchant=merchant,
            amount=amount,
            source="email",
            email_id=msg_id,
            category=category,
            type=tx_type,
            is_duplicate=False,
            ai_tags="regex_fallback",
        )

        self.db.add(new_tx)
        self.db.commit()
        return "new"

    # === HELPER METHODS ===

    def _parse_email_date(self, date_str: str):
        if date_str:
            try:
                return parsedate_to_datetime(date_str).date()
            except Exception:
                pass
        return datetime.now().date()

    def _get_body(self, payload: dict) -> str:
        def clean_html(text: str) -> str:
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text)
            return text.strip()

        if "parts" in payload:
            for part in payload["parts"]:
                mime = part.get("mimeType", "")
                data = part.get("body", {}).get("data")
                if data and "text" in mime:
                    decoded = base64.urlsafe_b64decode(data).decode(errors="ignore")
                    return clean_html(decoded)
            for part in payload["parts"]:
                data = part.get("body", {}).get("data")
                if data:
                    decoded = base64.urlsafe_b64decode(data).decode(errors="ignore")
                    return clean_html(decoded)

        data = payload.get("body", {}).get("data")
        if data:
            decoded = base64.urlsafe_b64decode(data).decode(errors="ignore")
            return clean_html(decoded)

        return ""

    def _extract_amount(self, text: str):
        patterns = [
            r"(?:₹|rs\.?|inr)\s?([\d,]+\.?\d*)",
            r"amount\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)",
            r"(?:debited|credited|paid|spent)\s*(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)",
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for m in matches:
                try:
                    val = float(str(m).replace(",", "").strip())
                    if 1 <= val <= 500000:
                        return val
                except (ValueError, TypeError):
                    continue
        return None

    def _extract_merchant(self, sender: str, text: str) -> str:
        patterns = [
            r"(?:paid to|transferred to)\s+([a-zA-Z0-9 .&\-]+)",
            r"at\s+([a-zA-Z0-9 .&\-]+)",
            r"to\s+([a-zA-Z0-9 .&\-]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                merchant = match.group(1).strip()
                if merchant.lower() not in (
                    "your", "account", "a", "the", "bank", "card",
                ):
                    return merchant.title()[:50]

        name = sender.split("@")[0].split(".")[0]
        name = re.sub(r"[^a-zA-Z ]", "", name)
        return name.title()[:50] if name.strip() else "Unknown"

    def _get_category(self, merchant: str) -> str:
        m = merchant.lower()
        category_map = {
            "Food": [
                "swiggy", "zomato", "dominos", "mcdonalds", "kfc",
                "starbucks", "blinkit", "zepto", "dunzo",
            ],
            "Travel": [
                "uber", "ola", "rapido", "indigo", "airindia",
                "irctc", "redbus", "makemytrip",
            ],
            "Shopping": [
                "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa",
            ],
            "Subscriptions": [
                "netflix", "spotify", "youtube", "hotstar", "prime", "apple",
            ],
            "Bills": [
                "airtel", "jio", "vodafone", "vi", "electricity",
                "water", "gas", "broadband",
            ],
            "UPI": ["paytm", "phonepe", "gpay", "googlepay"],
        }
        for category, keywords in category_map.items():
            if any(keyword in m for keyword in keywords):
                return category
        return "General"

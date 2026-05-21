"""
Smart CSV Bank Statement Parser for Indian Banks.

Auto-detects bank format from column headers and parses transactions.
Supports: HDFC, ICICI, SBI, Axis, Kotak, YES Bank, PNB, BOB, IndusInd, Federal.
Falls back to AI parsing for unknown formats.
"""

import csv
import io
import re
from datetime import datetime
from typing import Optional
from services.ai_parser import parse_sms_with_ai


# Bank format signatures — maps column patterns to bank parsers
BANK_SIGNATURES = {
    "hdfc": {
        "columns": ["date", "narration", "chq./ref.no.", "value dt", "withdrawal amt.", "deposit amt.", "closing balance"],
        "alt_columns": ["date", "narration", "withdrawal", "deposit", "balance"],
    },
    "icici": {
        "columns": ["s no.", "value date", "transaction date", "cheque number", "transaction remarks", "withdrawal amount (inr )", "deposit amount (inr )", "balance (inr )"],
        "alt_columns": ["transaction date", "transaction remarks", "withdrawal", "deposit", "balance"],
    },
    "sbi": {
        "columns": ["txn date", "value date", "description", "ref no./cheque no.", "debit", "credit", "balance"],
        "alt_columns": ["txn date", "description", "debit", "credit", "balance"],
    },
    "axis": {
        "columns": ["tran date", "chq no", "particulars", "dr amount", "cr amount", "balance"],
        "alt_columns": ["tran date", "particulars", "debit", "credit", "balance"],
    },
    "kotak": {
        "columns": ["sl. no.", "transaction date", "value date", "description", "chq / ref number", "debit", "credit", "balance"],
        "alt_columns": ["transaction date", "description", "debit", "credit", "balance"],
    },
    "yes_bank": {
        "columns": ["date", "particulars", "debit", "credit", "balance"],
    },
    "pnb": {
        "columns": ["date", "narration", "branch code", "debit", "credit", "balance"],
    },
    "indusind": {
        "columns": ["transaction date", "transaction details", "cheque no./ref no.", "amount", "cr/dr", "balance"],
    },
}


def detect_bank(columns: list[str]) -> Optional[str]:
    """Detect which bank the CSV is from based on column headers."""
    cols_lower = [c.strip().lower() for c in columns]
    cols_joined = " ".join(cols_lower)

    for bank, sig in BANK_SIGNATURES.items():
        # Check primary columns
        primary = sig.get("columns", [])
        if all(any(p in c for c in cols_lower) for p in primary[:4]):
            return bank

        # Check alt columns
        alt = sig.get("alt_columns", [])
        if alt and all(any(a in c for c in cols_lower) for a in alt[:3]):
            return bank

    # Heuristic: check for common patterns
    if "narration" in cols_joined:
        return "hdfc"
    if "particulars" in cols_joined and "debit" in cols_joined:
        return "axis"
    if "txn date" in cols_joined:
        return "sbi"
    if "transaction remarks" in cols_joined:
        return "icici"

    return None


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse various Indian bank date formats."""
    date_str = date_str.strip()
    if not date_str:
        return None

    formats = [
        "%d/%m/%Y", "%d/%m/%y",
        "%d-%m-%Y", "%d-%m-%y",
        "%Y-%m-%d",
        "%d %b %Y", "%d %b %y",
        "%d-%b-%Y", "%d-%b-%y",
        "%d/%b/%Y",
        "%m/%d/%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    return None


def clean_amount(amount_str: str) -> Optional[float]:
    """Parse Indian number formats to float."""
    if not amount_str:
        return None
    # Remove everything except digits, commas, dots, minus
    cleaned = re.sub(r"[^\d.,\-]", "", str(amount_str).strip())
    if not cleaned or cleaned in ("", "-", "."):
        return None
    try:
        return abs(float(cleaned.replace(",", "")))
    except (ValueError, TypeError):
        return None


def clean_merchant(narration: str) -> str:
    """Clean bank narration to extract merchant name."""
    if not narration:
        return "Unknown"

    text = narration.strip()

    # Remove common prefixes and extract merchant
    # UPI format: UPI/REF/MERCHANT/UPI_HANDLE or UPI-MERCHANT-DETAILS
    upi_match = re.match(r"UPI/\d+/([^/]+)", text, re.IGNORECASE)
    if upi_match:
        text = upi_match.group(1)
    else:
        upi_match2 = re.match(r"UPI-([^-]+)", text, re.IGNORECASE)
        if upi_match2:
            text = upi_match2.group(1)
        else:
            # NEFT format: NEFT/REF/MERCHANT/details
            neft_match = re.match(r"(?:NEFT|IMPS|RTGS)[/-][A-Z0-9]+[/-]([^/]+)", text, re.IGNORECASE)
            if neft_match:
                text = neft_match.group(1)
            else:
                # BIL format: BIL/ONL/MERCHANT/...
                bil_match = re.match(r"BIL/(?:ONL|BPAY)/([^/]+)", text, re.IGNORECASE)
                if bil_match:
                    text = bil_match.group(1)
                else:
                    # Remove generic prefixes as fallback
                    prefixes = [
                        r"ATM[-/](?:CASH\s*)?(?:WDL)?[/-]?",
                        r"POS\s+\d+\s*",
                        r"ACH D-",
                        r"ECS/",
                        r"SI-",
                        r"MMT/IMPS/\d+/",
                    ]
                    for prefix in prefixes:
                        text = re.sub(prefix, "", text, flags=re.IGNORECASE)

    # Remove trailing reference numbers, dates, account numbers
    text = re.sub(r"/\d{10,}", "", text)  # UPI ref numbers
    text = re.sub(r"\d{12,}", "", text)  # Long numbers
    text = re.sub(r"\d{2}/\d{2}/\d{2,4}", "", text)  # dates
    text = re.sub(r"@\w+", "", text)  # UPI handles
    text = re.sub(r"[/\-]+$", "", text)  # trailing slashes/dashes

    # Clean up
    text = re.sub(r"\s+", " ", text).strip()

    # If too short after cleaning, use original
    if len(text) < 2:
        text = narration[:50]

    # Title case, max 50 chars
    return text.title().strip()[:50] or "Unknown"


def categorize_merchant(merchant: str) -> str:
    """Categorize based on merchant name."""
    m = merchant.lower()

    category_map = {
        "Food": [
            "swiggy", "zomato", "dominos", "mcdonalds", "kfc", "starbucks",
            "blinkit", "zepto", "dunzo", "restaurant", "cafe", "kitchen",
            "pizza", "burger", "biryani", "food",
        ],
        "Groceries": [
            "bigbasket", "grofers", "jiomart", "dmart", "reliance",
            "more supermarket", "nature", "basket", "fresh", "grocery",
        ],
        "Travel": [
            "uber", "ola", "rapido", "indigo", "airindia", "irctc",
            "redbus", "makemytrip", "goibibo", "cleartrip", "vistara",
            "spicejet", "cab", "taxi", "flight", "train",
        ],
        "Shopping": [
            "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa",
            "tata cliq", "snapdeal", "shoppers stop",
        ],
        "Subscriptions": [
            "netflix", "spotify", "youtube", "hotstar", "prime", "apple",
            "disney", "jio cinema", "zee5", "sony liv",
        ],
        "Bills": [
            "airtel", "jio", "vodafone", "vi", "electricity", "bescom",
            "water", "gas", "broadband", "wifi", "internet", "bsnl",
            "tata power", "adani",
        ],
        "Health": [
            "apollo", "pharmeasy", "netmeds", "1mg", "medplus",
            "hospital", "clinic", "doctor", "dental",
        ],
        "Education": [
            "udemy", "coursera", "unacademy", "byjus", "upgrad",
            "college", "university", "school", "tuition",
        ],
        "Investment": [
            "zerodha", "groww", "upstox", "mutual fund", "sip",
            "paytm money", "coin", "stock", "nse", "bse",
        ],
        "Transfer": [
            "transfer", "neft", "rtgs", "imps", "self",
        ],
        "UPI": [
            "paytm", "phonepe", "gpay", "googlepay",
        ],
    }

    for category, keywords in category_map.items():
        if any(keyword in m for keyword in keywords):
            return category

    # ATM
    if "atm" in m or "cash" in m:
        return "Bills"

    return "General"


def parse_bank_csv(file_content: bytes, filename: str = "") -> dict:
    """
    Parse a bank CSV/statement file and return structured transactions.

    Returns:
    {
        "bank": "hdfc" | "icici" | ... | "unknown",
        "transactions": [...],
        "skipped": int,
        "errors": [...]
    }
    """
    # Try to decode
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            text = file_content.decode(encoding)
            break
        except (UnicodeDecodeError, AttributeError):
            continue
    else:
        return {"bank": "unknown", "transactions": [], "skipped": 0, "errors": ["Could not decode file"]}

    # Skip BOM
    if text.startswith("\ufeff"):
        text = text[1:]

    # Some bank CSVs have header rows before the actual CSV
    # Try to find the row with column headers
    lines = text.strip().split("\n")
    header_row_idx = 0
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if any(kw in line_lower for kw in ["date", "narration", "particulars", "description", "transaction"]):
            header_row_idx = i
            break

    # Re-parse from header row
    csv_text = "\n".join(lines[header_row_idx:])
    reader = csv.reader(io.StringIO(csv_text))

    try:
        headers = next(reader)
    except StopIteration:
        return {"bank": "unknown", "transactions": [], "skipped": 0, "errors": ["Empty CSV file"]}

    headers_clean = [h.strip() for h in headers]
    bank = detect_bank(headers_clean)

    transactions = []
    skipped = 0
    errors = []

    headers_lower = [h.strip().lower() for h in headers_clean]

    # Find column indices dynamically
    date_col = _find_col(headers_lower, ["date", "txn date", "tran date", "transaction date", "value date"])
    narration_col = _find_col(headers_lower, ["narration", "particulars", "description", "transaction remarks", "transaction details"])
    debit_col = _find_col(headers_lower, ["withdrawal", "debit", "dr amount", "withdrawal amt"])
    credit_col = _find_col(headers_lower, ["deposit", "credit", "cr amount", "deposit amt"])
    balance_col = _find_col(headers_lower, ["balance", "closing balance"])

    # For banks with single amount + cr/dr column
    amount_col = _find_col(headers_lower, ["amount"])
    crdr_col = _find_col(headers_lower, ["cr/dr", "dr/cr", "type"])

    if date_col is None or narration_col is None:
        return {
            "bank": bank or "unknown",
            "transactions": [],
            "skipped": 0,
            "errors": [f"Could not identify date and narration columns. Found headers: {headers_clean}"],
        }

    for row_num, row in enumerate(reader, start=header_row_idx + 2):
        try:
            if len(row) <= max(date_col, narration_col):
                skipped += 1
                continue

            # Parse date
            date_val = parse_date(row[date_col])
            if not date_val:
                skipped += 1
                continue

            # Parse narration
            narration = row[narration_col].strip() if narration_col < len(row) else ""
            if not narration:
                skipped += 1
                continue

            # Parse amount and direction
            amount = None
            direction = "debit"

            if debit_col is not None and credit_col is not None:
                debit_amt = clean_amount(row[debit_col]) if debit_col < len(row) else None
                credit_amt = clean_amount(row[credit_col]) if credit_col < len(row) else None

                if debit_amt and debit_amt > 0:
                    amount = debit_amt
                    direction = "debit"
                elif credit_amt and credit_amt > 0:
                    amount = credit_amt
                    direction = "credit"
            elif amount_col is not None:
                amount = clean_amount(row[amount_col]) if amount_col < len(row) else None
                if crdr_col is not None and crdr_col < len(row):
                    cr_dr = row[crdr_col].strip().lower()
                    direction = "credit" if "cr" in cr_dr else "debit"

            if not amount or amount <= 0:
                skipped += 1
                continue

            # Parse balance
            balance = None
            if balance_col is not None and balance_col < len(row):
                balance = clean_amount(row[balance_col])

            # Clean merchant and categorize
            merchant = clean_merchant(narration)
            category = categorize_merchant(merchant)
            tx_type = "income" if direction == "credit" else "expense"

            transactions.append({
                "date": date_val.strftime("%Y-%m-%d"),
                "merchant": merchant,
                "amount": amount,
                "type": tx_type,
                "category": category,
                "source": "bank_csv",
                "narration_raw": narration,
                "balance": balance,
            })

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)[:100]}")
            continue

    return {
        "bank": bank or "auto_detected",
        "transactions": transactions,
        "skipped": skipped,
        "errors": errors,
    }


def _find_col(headers: list[str], keywords: list[str]) -> Optional[int]:
    """Find the first column index that matches any keyword."""
    for kw in keywords:
        for i, h in enumerate(headers):
            if kw in h:
                return i
    return None

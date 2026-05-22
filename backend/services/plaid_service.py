"""
Plaid integration for US bank account linking.

Flow:
1. Create link token → frontend opens Plaid Link UI
2. User connects bank → returns public_token
3. Exchange public_token for access_token
4. Fetch transactions using access_token
"""

import os
from datetime import datetime, timedelta
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from dotenv import load_dotenv

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")

# Configure Plaid client
_client = None

if PLAID_CLIENT_ID and PLAID_SECRET:
    host = plaid.Environment.Sandbox
    if PLAID_ENV == "development":
        host = plaid.Environment.Development
    elif PLAID_ENV == "production":
        host = plaid.Environment.Production

    configuration = plaid.Configuration(
        host=host,
        api_key={
            "clientId": PLAID_CLIENT_ID,
            "secret": PLAID_SECRET,
        },
    )
    api_client = plaid.ApiClient(configuration)
    _client = plaid_api.PlaidApi(api_client)


def create_link_token(user_id: str) -> dict:
    """Create a Plaid Link token for the frontend."""
    if not _client:
        raise Exception("Plaid not configured")

    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="AI Financial Copilot",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
    )

    response = _client.link_token_create(request)
    return {"link_token": response.link_token}


def exchange_public_token(public_token: str) -> dict:
    """Exchange a public token for an access token."""
    if not _client:
        raise Exception("Plaid not configured")

    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = _client.item_public_token_exchange(request)

    return {
        "access_token": response.access_token,
        "item_id": response.item_id,
    }


def get_transactions(access_token: str, cursor: str = None) -> dict:
    """
    Fetch transactions using Plaid Sync API.
    Returns transactions and a cursor for pagination.
    """
    if not _client:
        raise Exception("Plaid not configured")

    request = TransactionsSyncRequest(access_token=access_token)
    if cursor:
        request.cursor = cursor

    response = _client.transactions_sync(request)

    transactions = []
    for tx in response.added:
        amount = abs(float(tx.amount))
        direction = "income" if tx.amount < 0 else "expense"  # Plaid: negative = income

        transactions.append({
            "date": tx.date.isoformat() if tx.date else datetime.now().date().isoformat(),
            "merchant": tx.merchant_name or tx.name or "Unknown",
            "amount": amount,
            "type": direction,
            "category": _map_category(tx.personal_finance_category),
            "plaid_transaction_id": tx.transaction_id,
            "account_id": tx.account_id,
        })

    return {
        "transactions": transactions,
        "cursor": response.next_cursor,
        "has_more": response.has_more,
    }


def _map_category(pfc) -> str:
    """Map Plaid's personal finance category to our categories."""
    if not pfc:
        return "General"

    primary = getattr(pfc, "primary", "").upper()

    category_map = {
        "FOOD_AND_DRINK": "Food",
        "TRANSPORTATION": "Travel",
        "SHOPPING": "Shopping",
        "ENTERTAINMENT": "Entertainment",
        "RENT_AND_UTILITIES": "Bills",
        "MEDICAL": "Health",
        "EDUCATION": "Education",
        "GENERAL_MERCHANDISE": "Shopping",
        "GROCERIES": "Groceries",
        "TRAVEL": "Travel",
        "INCOME": "General",
        "TRANSFER_IN": "Transfer",
        "TRANSFER_OUT": "Transfer",
        "LOAN_PAYMENTS": "Bills",
        "PERSONAL_CARE": "Health",
        "GENERAL_SERVICES": "Bills",
        "GOVERNMENT_AND_NON_PROFIT": "Bills",
        "HOME_IMPROVEMENT": "Shopping",
        "BANK_FEES": "Bills",
    }

    return category_map.get(primary, "General")

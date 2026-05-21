import re
import pickle
import os
from services import category_classifier

CATEGORY_MAP = {
    "food": ["swiggy", "zomato", "restaurant", "mcdonalds", "kfc", "starbucks", "grocery", "blinkit", "zepto"],
    "travel": ["uber", "ola", "petrol", "shell", "indigo", "airindia", "railway", "irctc"],
    "shopping": ["amazon", "flipkart", "myntra", "ajio", "mall", "decathlon"],
    "bills": ["electricity", "water", "gas", "recharge", "airtel", "jio", "broadband"],
    "subscriptions": ["netflix", "amazon prime", "spotify", "youtube", "hotstar"],
    "entertainment": ["pvr", "inox", "bookmyshow", "gaming"]
}

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml', 'merchant_classifier.pkl')
trained_pipeline = None

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            trained_pipeline = pickle.load(f)
    except Exception as e:
        print(f"Error loading model: {e}")

def predict_category(merchant_name: str) -> str:
    if trained_pipeline:
        try:
            prediction = trained_pipeline.predict([merchant_name])
            return prediction[0]
        except:
            pass
            
    merchant_lower = merchant_name.lower()
    for category, keywords in CATEGORY_MAP.items():
        if any(keyword in merchant_lower for keyword in keywords):
            return category.capitalize()
    return "Other"

def parse_sms(text: str):
    """
    Parses bank SMS messages to extract transaction details.
    Examples:
    - "Rs 1200 debited from A/C ending 9876 via UPI to Amazon."
    - "INR 230 credited to your account from Flipkart."
    - "Rs 650 spent on Netflix subscription."
    """
    # Amount extraction: Rs 450, INR 230, etc.
    amount_match = re.search(r'(?:Rs|INR|₹)\s?(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    
    # Merchant extraction: "to Swiggy", "from Flipkart", "on Netflix", "to Amazon"
    # Special case for "via UPI to Merchant"
    upi_to_match = re.search(r'via\s+UPI\s+to\s+([A-Za-z0-9]+)', text, re.IGNORECASE)
    if upi_to_match:
        merchant = upi_to_match.group(1).strip()
    else:
        merchant_match = re.search(r'(?:to|from|on)\s+([A-Za-z0-9]+)', text, re.IGNORECASE)
        merchant = merchant_match.group(1).strip() if merchant_match else "Unknown"
    
    # Filter out generic terms that might be caught
    if merchant.lower() in ["account", "your", "a"]:
        # Try a second search excluding those terms
        second_match = re.search(r'(?:to|from|on)\s+(?!your|account|A/C|A)([A-Za-z0-9]+)', text, re.IGNORECASE)
        if second_match:
            merchant = second_match.group(1).strip()
    
    # Transaction type extraction
    is_credit = bool(re.search(r'credited|received|added', text, re.IGNORECASE))
    is_debit = bool(re.search(r'debited|spent|paid|payment', text, re.IGNORECASE))
    
    amount = float(amount_match.group(1)) if amount_match else 0.0
    
    # Simple merchant-category dictionary as requested
    MERCHANT_CATEGORY_MAP = {
        "Swiggy": "Food",
        "Zomato": "Food",
        "Uber": "Travel",
        "Ola": "Travel",
        "Amazon": "Shopping",
        "Flipkart": "Shopping",
        "Netflix": "Subscription",
        "Spotify": "Subscription",
        "Electricity": "Bills",
        "Airtel": "Bills",
        "Jio": "Bills"
    }
    
    # Use the new AI classifier for category and tags
    category, ai_tags = category_classifier.classify_transaction(merchant)
    
    transaction_type = "credit" if is_credit else "debit"
    
    if amount == 0.0 or merchant == "Unknown":
        print(f"Logging: Could not fully parse SMS: '{text}'")
        
    return {
        "merchant": merchant,
        "amount": amount,
        "category": category,
        "ai_tags": ai_tags,
        "type": transaction_type
    }

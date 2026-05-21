import re

CATEGORY_MAP = {
    "Food": ["swiggy", "zomato", "restaurant", "mcdonalds", "kfc", "starbucks", "grocery", "blinkit", "zepto"],
    "Travel": ["uber", "ola", "petrol", "shell", "indigo", "airindia", "railway", "irctc"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "mall", "decathlon"],
    "Bills": ["electricity", "water", "gas", "recharge", "airtel", "jio", "broadband"],
    "Subscriptions": ["netflix", "amazon prime", "spotify", "youtube", "hotstar"],
    "Entertainment": ["pvr", "inox", "bookmyshow", "gaming"]
}

def classify_transaction(merchant_name: str):
    """
    Classifies a transaction based on the merchant name and returns (category, tags).
    """
    merchant_lower = merchant_name.lower()
    
    category = "Other"
    tags = []

    # 1. Exact or keyword matching from map
    for cat, keywords in CATEGORY_MAP.items():
        if any(keyword in merchant_lower for keyword in keywords):
            category = cat
            break
            
    if category == "Other":
        # 2. General keyword matching for unknown merchants
        if any(k in merchant_lower for k in ["cafe", "dine", "eat", "food", "kitchen"]):
            category = "Food"
        elif any(k in merchant_lower for k in ["taxi", "cab", "travel", "flight", "bus"]):
            category = "Travel"
        elif any(k in merchant_lower for k in ["store", "shop", "market", "bazaar"]):
            category = "Shopping"
        elif any(k in merchant_lower for k in ["bill", "pay", "utility"]):
            category = "Bills"
        elif any(k in merchant_lower for k in ["sub", "premium", "membership"]):
            category = "Subscriptions"
        elif any(k in merchant_lower for k in ["movie", "cinema", "club", "park"]):
            category = "Entertainment"
    
    # Simple tag detection
    if category == "Subscriptions":
        tags.append("Recurring")
    if category == "Food":
        tags.append("Food")
        
    return category, ",".join(tags)

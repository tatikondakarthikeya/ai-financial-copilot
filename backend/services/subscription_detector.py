from sqlalchemy.orm import Session
from sqlalchemy import func
from models import models
import pandas as pd
from datetime import datetime, timedelta

def detect_subscriptions(db: Session, user_id: int):
    """
    Detects recurring transactions occurring every ~30 days with similar amounts.
    """
    # Fetch user transactions
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    if not transactions:
        return []
        
    df = pd.DataFrame([{
        'merchant': t.merchant,
        'amount': t.amount,
        'date': t.date
    } for t in transactions])
    
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by=['merchant', 'date'])
    
    subscriptions = []
    
    for merchant, group_raw in df.groupby('merchant'):
        if len(group_raw) < 2:
            continue
            
        group = group_raw.copy()
        # Calculate day differences between consecutive entries
        group['diff'] = group['date'].diff().dt.days
        
        # Calculate amount differences
        avg_amount = group['amount'].mean()
        amount_std = group['amount'].std()
        
        # Check if intervals are around 30 days (25-35 range) and amounts are stable
        recurring_intervals = group['diff'].dropna()
        is_monthly = any(25 <= d <= 35 for d in recurring_intervals)
        is_stable_amount = amount_std / avg_amount < 0.1 if avg_amount > 0 else True
        
        if is_monthly and is_stable_amount:
            subscriptions.append({
                "merchant": merchant,
                "amount": float(avg_amount),
                "frequency": "Monthly"
            })
            
    return subscriptions

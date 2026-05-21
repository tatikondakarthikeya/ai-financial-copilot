import pandas as pd
import pickle
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import os

# Example training data
data = [
    ("Swiggy", "Food"),
    ("Zomato", "Food"),
    ("Uber", "Travel"),
    ("Ola", "Travel"),
    ("Amazon", "Shopping"),
    ("Flipkart", "Shopping"),
    ("Airtel", "Bills"),
    ("Netflix", "Subscriptions"),
    ("Spotify", "Subscriptions"),
    ("PVR", "Entertainment"),
    ("Starbucks", "Food"),
    ("Shell", "Travel"),
    ("Myntra", "Shopping"),
    ("Jio", "Bills"),
    ("Disney+", "Subscriptions")
]

def train_model():
    df = pd.DataFrame(data, columns=['merchant', 'category'])
    
    # Simple Pipeline: Vectorizer + Naive Bayes
    pipeline = Pipeline([
        ('vectorizer', CountVectorizer()),
        ('classifier', MultinomialNB())
    ])
    
    pipeline.fit(df['merchant'], df['category'])
    
    # Save the model
    model_path = os.path.join(os.path.dirname(__file__), 'merchant_classifier.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(pipeline, f)
    
    print(f"Model trained and saved to {model_path}")

if __name__ == "__main__":
    train_model()

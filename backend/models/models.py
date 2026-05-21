from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Date, Boolean, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user")
    google_auth = relationship(
        "UserGoogleAuth", back_populates="user", uselist=False
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    transactions = relationship("Transaction", back_populates="category_ref")


class UserGoogleAuth(Base):
    __tablename__ = "user_google_auth"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_uri = Column(String)
    client_id = Column(String)
    client_secret = Column(String)
    scopes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="google_auth")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    merchant = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, default="expense")  # expense / income
    is_duplicate = Column(Boolean, default=False)
    category = Column(String)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    source = Column(String)  # csv, manual, sms, email
    email_id = Column(String, unique=True, nullable=True)
    ai_tags = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")
    category_ref = relationship("Category", back_populates="transactions")

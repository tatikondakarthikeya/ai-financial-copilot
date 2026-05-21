from pydantic import BaseModel, EmailStr
from datetime import date as date_type
from typing import Optional


# --- Auth ---

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# --- Transactions ---

class TransactionBase(BaseModel):
    date: date_type
    merchant: str
    amount: float
    type: str  # expense / income


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    category: Optional[str] = None
    source: Optional[str] = None
    ai_tags: Optional[str] = None
    is_duplicate: bool = False

    model_config = {"from_attributes": True}


# --- Categories ---

class CategoryResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# --- SMS ---

class SMSInput(BaseModel):
    sms_text: str


class SMSParseResponse(BaseModel):
    merchant: str
    amount: float
    category: str
    type: str
    message: Optional[str] = None
    is_duplicate: bool = False

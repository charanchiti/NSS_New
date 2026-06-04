from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class PricesUpdate(BaseModel):
    ms: float
    hsd: float

class PricesResponse(BaseModel):
    ms: float
    hsd: float

class VerifyPinRequest(BaseModel):
    pin: str

class UpdatePinRequest(BaseModel):
    pin: str

class ShiftStart(BaseModel):
    dsmName: str
    shiftType: str
    startTime: datetime

class TransactionCreate(BaseModel):
    vehicle: str
    fuelId: str
    liters: float
    amount: float
    note: Optional[str] = None
    paymentMode: str
    rateUsed: float
    isOverride: bool = False
    overrideReason: Optional[str] = None

class DeleteTransactionRequest(BaseModel):
    reason: str

class TransactionResponse(BaseModel):
    id: str
    shift_id: str
    vehicle: str
    fuel_id: str
    fuel_label: str
    liters: float
    amount: float
    note: Optional[str] = None
    payment_mode: str
    mode_label: str
    rate_used: float
    timestamp: datetime
    is_override: bool
    override_reason: Optional[str] = None
    deleted: bool
    deletion_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ShiftResponse(BaseModel):
    id: str
    dsm_name: str
    shift_type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    active: bool
    transactions: List[TransactionResponse] = []

    class Config:
        from_attributes = True

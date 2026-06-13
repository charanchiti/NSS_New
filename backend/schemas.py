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

# V2: Nozzle opening readings included in shift start
class ShiftStart(BaseModel):
    dsmName: str
    shiftType: str
    startTime: datetime
    openingN1: float = 0.0
    openingN2: float = 0.0
    openingN3: float = 0.0
    openingN4: float = 0.0

# V2: Closing readings update
class ClosingReadingsUpdate(BaseModel):
    closingN1: float
    closingN2: float
    closingN3: float
    closingN4: float

# V2: Transaction with nozzle and credit fields
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
    nozzle: int = 1
    creditName: Optional[str] = None
    creditPhone: Optional[str] = None
    creditVehicle: Optional[str] = None

# V2: Transaction edit (owner-approved)
class TransactionEdit(BaseModel):
    amount: Optional[float] = None
    liters: Optional[float] = None
    nozzle: Optional[int] = None
    paymentMode: Optional[str] = None
    creditName: Optional[str] = None
    creditPhone: Optional[str] = None
    editedBy: str = "Owner"
    otpRef: Optional[str] = None

class DeleteTransactionRequest(BaseModel):
    reason: str

# V2: Deduction schemas
class DeductionCreate(BaseModel):
    type: str       # "reward" or "expense"
    amount: float
    note: Optional[str] = None
    time: Optional[datetime] = None

class DeductionResponse(BaseModel):
    id: str
    shift_id: str
    type: str
    amount: float
    note: Optional[str] = None
    time: datetime

    class Config:
        from_attributes = True

# V2: Transaction response with all V2 fields
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
    # V2 fields
    nozzle: Optional[int] = 1
    credit_name: Optional[str] = None
    credit_phone: Optional[str] = None
    credit_vehicle: Optional[str] = None
    edited: bool = False
    edited_at: Optional[datetime] = None
    edited_by: Optional[str] = None
    edit_otp_ref: Optional[str] = None
    original_amount: Optional[float] = None
    original_liters: Optional[float] = None
    original_mode: Optional[str] = None

    class Config:
        from_attributes = True

# V2: Shift response with nozzle readings and deductions
class ShiftResponse(BaseModel):
    id: str
    dsm_name: str
    shift_type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    active: bool
    # V2 nozzle readings
    opening_n1: Optional[float] = 0.0
    opening_n2: Optional[float] = 0.0
    opening_n3: Optional[float] = 0.0
    opening_n4: Optional[float] = 0.0
    closing_n1: Optional[float] = None
    closing_n2: Optional[float] = None
    closing_n3: Optional[float] = None
    closing_n4: Optional[float] = None
    transactions: List[TransactionResponse] = []
    deductions: List[DeductionResponse] = []

    class Config:
        from_attributes = True

from pydantic import BaseModel, field_validator
from datetime import date, datetime
import datetime as dt
from typing import Optional, List


# ── FUEL PRICES ──────────────────────────────────────────────────

class FuelPriceItem(BaseModel):
    fuel_type: str
    price: float

    class Config:
        from_attributes = True


class FuelPricesResponse(BaseModel):
    diesel: float
    ms: float


class FuelPricesUpdate(BaseModel):
    diesel: float
    ms: float

    @field_validator('diesel', 'ms')
    @classmethod
    def price_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Fuel price must be positive')
        return v


# ── LUBRICATE PRODUCTS ────────────────────────────────────────────

class LubricateProductResponse(BaseModel):
    id: int
    name: str
    sort_order: int
    active: bool

    class Config:
        from_attributes = True


class LubricateProductCreate(BaseModel):
    name: str
    sort_order: int = 0


# ── NOZZLE READINGS ────────────────────────────────────────────────

class NozzleReadingIn(BaseModel):
    nozzle_number: int
    fuel_type: str
    opening_reading: float = 0.0
    closing_reading: float = 0.0

    @field_validator('closing_reading')
    @classmethod
    def closing_gte_opening(cls, v, info):
        opening = info.data.get('opening_reading', 0.0)
        if v < opening:
            raise ValueError('Closing reading must be >= opening reading')
        return v

    @field_validator('nozzle_number')
    @classmethod
    def valid_nozzle(cls, v):
        if v not in (1, 2, 3, 4):
            raise ValueError('Nozzle number must be 1, 2, 3 or 4')
        return v


class NozzleReadingResponse(BaseModel):
    id: str
    nozzle_number: int
    fuel_type: str
    opening_reading: float
    closing_reading: float
    sales_litres: float
    price: float
    amount: float

    class Config:
        from_attributes = True


# ── COLLECTION ─────────────────────────────────────────────────────

class CollectionIn(BaseModel):
    category: str
    day_amount: float = 0.0
    evening_amount: float = 0.0


class CollectionResponse(BaseModel):
    id: str
    category: str
    day_amount: float
    evening_amount: float
    total_amount: float

    class Config:
        from_attributes = True


# ── LUBRICATES ─────────────────────────────────────────────────────

class LubricateIn(BaseModel):
    product_name: str
    opening_stock: float = 0.0
    sales: float = 0.0

    @field_validator('sales')
    @classmethod
    def sales_lte_opening(cls, v, info):
        opening = info.data.get('opening_stock', 0.0)
        if v > opening:
            raise ValueError('Lubricate sales cannot exceed opening stock')
        return v


class LubricateResponse(BaseModel):
    id: str
    product_name: str
    opening_stock: float
    sales: float
    balance_stock: float

    class Config:
        from_attributes = True


# ── DAILY REPORT ───────────────────────────────────────────────────

class ReportCreate(BaseModel):
    date: dt.date
    employee_name: str
    start_time: Optional[str] = None   # "HH:MM"
    end_time: Optional[str] = None
    pump_number: int = 1
    remarks: Optional[str] = None
    nozzle_readings: List[NozzleReadingIn] = []
    collections: List[CollectionIn] = []
    lubricates: List[LubricateIn] = []

    @field_validator('employee_name')
    @classmethod
    def name_required(cls, v):
        if not v or not v.strip():
            raise ValueError('Employee name is required')
        return v.strip()

    @field_validator('pump_number')
    @classmethod
    def valid_pump(cls, v):
        if v not in (1, 2, 3):
            raise ValueError('Only Pumps 01, 02, and 03 are supported')
        return v


class ReportUpdate(BaseModel):
    date: Optional[dt.date] = None
    employee_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None       # "draft" | "completed"
    remarks: Optional[str] = None
    nozzle_readings: Optional[List[NozzleReadingIn]] = None
    collections: Optional[List[CollectionIn]] = None
    lubricates: Optional[List[LubricateIn]] = None


class ReportSummary(BaseModel):
    """Lightweight response for history list."""
    id: str
    date: dt.date
    employee_name: str
    pump_number: int
    status: str
    total_sales_litres: float
    total_sales_amount: float
    total_collection: float
    created_at: datetime

    class Config:
        from_attributes = True


class CalculationSummary(BaseModel):
    """Calculated totals attached to a full report response."""
    total_fuel_litres: float
    total_fuel_amount: float
    diesel_litres: float
    diesel_amount: float
    ms_litres: float
    ms_amount: float
    gross_collection: float
    total_deductions: float
    net_collection: float
    expected_collection: float


class ReportResponse(BaseModel):
    id: str
    date: dt.date
    employee_name: str
    start_time: Optional[str]
    end_time: Optional[str]
    pump_number: int
    status: str
    remarks: Optional[str]
    created_at: datetime
    updated_at: datetime
    nozzle_readings: List[NozzleReadingResponse] = []
    collections: List[CollectionResponse] = []
    lubricates: List[LubricateResponse] = []
    summary: Optional[CalculationSummary] = None

    class Config:
        from_attributes = True

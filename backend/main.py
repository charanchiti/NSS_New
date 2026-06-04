import os
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, SessionLocal, Base, get_db

# ── DATABASE CONFIG SEEDING LIFESPAN ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed config tables
    db = SessionLocal()
    try:
        # Seed Owner PIN
        pin = db.query(models.Config).filter(models.Config.key == "owner_pin").first()
        if not pin:
            db.add(models.Config(key="owner_pin", value="0000"))
            
        # Seed MS Price
        ms = db.query(models.Config).filter(models.Config.key == "ms_price").first()
        if not ms:
            db.add(models.Config(key="ms_price", value="102.50"))
            
        # Seed HSD Price
        hsd = db.query(models.Config).filter(models.Config.key == "hsd_price").first()
        if not hsd:
            db.add(models.Config(key="hsd_price", value="89.00"))
            
        db.commit()
    except Exception as e:
        print("Database config seeding error:", e)
        db.rollback()
    finally:
        db.close()
    yield

app = FastAPI(
    title="NSS FuelTrack API",
    description="Backend API for Daily Shift Manager payment tracking at NSS Fuel Station",
    lifespan=lifespan
)

# ── CORS CONFIGURATION ──
origins_env = os.getenv("CORS_ORIGINS", "")
origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
if not origins:
    origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static mappings matching React constants
FUEL_LABELS = {
    "ms": "MS (Petrol)",
    "hsd": "HSD (Diesel)"
}

MODE_LABELS = {
    "cash": "Cash",
    "upi": "UPI",
    "penlabs": "Penlabs",
    "phonepay": "PhonePe EDC",
    "otp": "OTP/Unbarath",
    "credit": "Credit"
}

# ── API ENDPOINTS ──

# --- Security/PIN Routes ---

@app.post("/api/auth/verify-pin", status_code=status.HTTP_200_OK)
def verify_pin(payload: schemas.VerifyPinRequest, db: Session = Depends(get_db)):
    pin_config = db.query(models.Config).filter(models.Config.key == "owner_pin").first()
    stored_pin = pin_config.value if pin_config else "0000"
    
    if payload.pin != stored_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect PIN"
        )
    return {"message": "Authenticated successfully"}

@app.post("/api/auth/change-pin", status_code=status.HTTP_200_OK)
def change_pin(payload: schemas.UpdatePinRequest, db: Session = Depends(get_db)):
    if not payload.pin.isdigit() or len(payload.pin) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN must be exactly 4 digits"
        )
        
    pin_config = db.query(models.Config).filter(models.Config.key == "owner_pin").first()
    if not pin_config:
        pin_config = models.Config(key="owner_pin", value=payload.pin)
        db.add(pin_config)
    else:
        pin_config.value = payload.pin
        
    db.commit()
    return {"message": "PIN updated successfully"}

# --- Price Settings Routes ---

@app.get("/api/prices", response_model=schemas.PricesResponse)
def get_prices(db: Session = Depends(get_db)):
    ms_config = db.query(models.Config).filter(models.Config.key == "ms_price").first()
    hsd_config = db.query(models.Config).filter(models.Config.key == "hsd_price").first()
    
    ms = float(ms_config.value) if ms_config else 102.50
    hsd = float(hsd_config.value) if hsd_config else 89.00
    
    return {"ms": ms, "hsd": hsd}

@app.put("/api/prices", response_model=schemas.PricesResponse)
def update_prices(payload: schemas.PricesUpdate, db: Session = Depends(get_db)):
    if payload.ms <= 0 or payload.hsd <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prices must be positive values"
        )
        
    # Loophole 3: Price change is blocked mid-shift
    active_shift = db.query(models.Shift).filter(models.Shift.active == True).first()
    if active_shift:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Price changes are locked during an active shift. Only the owner can change prices before the next shift starts."
        )
        
    ms_config = db.query(models.Config).filter(models.Config.key == "ms_price").first()
    hsd_config = db.query(models.Config).filter(models.Config.key == "hsd_price").first()
    
    if ms_config:
        ms_config.value = str(payload.ms)
    else:
        db.add(models.Config(key="ms_price", value=str(payload.ms)))
        
    if hsd_config:
        hsd_config.value = str(payload.hsd)
    else:
        db.add(models.Config(key="hsd_price", value=str(payload.hsd)))
        
    db.commit()
    return {"ms": payload.ms, "hsd": payload.hsd}

# --- Shift Routes ---

@app.get("/api/shift/active", response_model=Optional[schemas.ShiftResponse])
def get_active_shift(db: Session = Depends(get_db)):
    # Load active shift and order transactions reverse-chronologically
    active_shift = db.query(models.Shift).filter(models.Shift.active == True).first()
    if not active_shift:
        return None
        
    # Explicitly load and sort transactions in python or rely on query
    txns = db.query(models.Transaction)\
        .filter(models.Transaction.shift_id == active_shift.id)\
        .order_by(models.Transaction.timestamp.desc())\
        .all()
        
    active_shift.transactions = txns
    return active_shift

@app.post("/api/shift/start", response_model=schemas.ShiftResponse)
def start_shift(payload: schemas.ShiftStart, db: Session = Depends(get_db)):
    active_shift = db.query(models.Shift).filter(models.Shift.active == True).first()
    if active_shift:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active shift is already running. End it first."
        )
        
    # Generate unique ID based on DSM Name, shift type, and timestamp
    timestamp_str = payload.startTime.strftime("%Y%m%dT%H%M%SZ")
    shift_id = f"{payload.dsmName.lower().replace(' ', '_')}_{payload.shiftType}_{timestamp_str}"
    
    new_shift = models.Shift(
        id=shift_id,
        dsm_name=payload.dsmName,
        shift_type=payload.shiftType,
        start_time=payload.startTime,
        active=True
    )
    
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    return new_shift

@app.post("/api/shift/end", status_code=status.HTTP_200_OK)
def end_shift(db: Session = Depends(get_db)):
    active_shift = db.query(models.Shift).filter(models.Shift.active == True).first()
    if not active_shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active shift to end"
        )
        
    active_shift.active = False
    active_shift.end_time = datetime.utcnow()
    db.commit()
    return {"message": "Shift ended successfully"}

# --- Transaction Routes ---

@app.post("/api/transactions", response_model=schemas.TransactionResponse)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    active_shift = db.query(models.Shift).filter(models.Shift.active == True).first()
    if not active_shift:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active shift is running. Start a shift to add transactions."
        )
        
    # Loophole 4: Positive bound checks
    if payload.liters <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Liters must be greater than 0"
        )
    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than ₹0"
        )
        
    # Loophole 2: Override validation reason
    calculated_amt = payload.liters * payload.rateUsed
    diff = abs(payload.amount - calculated_amt)
    
    is_override = diff > 1.00
    override_reason = payload.overrideReason
    
    if is_override:
        if not override_reason or len(override_reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Override justification (minimum 5 characters) is required when amount differs from calculated rate."
            )
            
    # Resolve labels
    fuel_label = FUEL_LABELS.get(payload.fuelId, "MS (Petrol)")
    mode_label = MODE_LABELS.get(payload.paymentMode, "Cash")
    
    tx_id = f"tx_{int(datetime.utcnow().timestamp())}_{os.urandom(2).hex()}"
    
    new_tx = models.Transaction(
        id=tx_id,
        shift_id=active_shift.id,
        vehicle=payload.vehicle,
        fuel_id=payload.fuelId,
        fuel_label=fuel_label,
        liters=payload.liters,
        amount=payload.amount,
        note=payload.note,
        payment_mode=payload.paymentMode,
        mode_label=mode_label,
        rate_used=payload.rateUsed,
        timestamp=datetime.utcnow(),
        is_override=is_override,
        override_reason=override_reason if is_override else None,
        deleted=False
    )
    
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx

@app.put("/api/transactions/{tx_id}/delete", status_code=status.HTTP_200_OK)
def delete_transaction(tx_id: str, payload: schemas.DeleteTransactionRequest, db: Session = Depends(get_db)):
    if not payload.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion reason is mandatory"
        )
        
    txn = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
        
    # Soft deletion: mark fields, don't erase
    txn.deleted = True
    txn.deletion_reason = payload.reason
    txn.deleted_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Transaction soft-deleted successfully"}

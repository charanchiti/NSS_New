from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(String, primary_key=True, index=True)
    dsm_name = Column(String, nullable=False)
    shift_type = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    # V2: Nozzle opening readings (entered at shift start)
    opening_n1 = Column(Float, nullable=True, default=0.0)
    opening_n2 = Column(Float, nullable=True, default=0.0)
    opening_n3 = Column(Float, nullable=True, default=0.0)
    opening_n4 = Column(Float, nullable=True, default=0.0)

    # V2: Nozzle closing readings (entered at settlement/end)
    closing_n1 = Column(Float, nullable=True)
    closing_n2 = Column(Float, nullable=True)
    closing_n3 = Column(Float, nullable=True)
    closing_n4 = Column(Float, nullable=True)

    # Relationship to transactions
    transactions = relationship("Transaction", back_populates="shift", cascade="all, delete-orphan")
    # V2: Relationship to deductions
    deductions = relationship("Deduction", back_populates="shift", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    shift_id = Column(String, ForeignKey("shifts.id"), nullable=False)
    vehicle = Column(String, nullable=False)
    fuel_id = Column(String, nullable=False)
    fuel_label = Column(String, nullable=False)
    liters = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    note = Column(String, nullable=True)
    payment_mode = Column(String, nullable=False)
    mode_label = Column(String, nullable=False)
    rate_used = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    
    # V2: Nozzle assignment (1-4)
    nozzle = Column(Integer, nullable=True, default=1)
    
    # V2: Credit tracking fields
    credit_name = Column(String, nullable=True)
    credit_phone = Column(String, nullable=True)
    credit_vehicle = Column(String, nullable=True)

    # Security/Loophole Columns
    is_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(String, nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    deletion_reason = Column(String, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # V2: Edit audit trail
    edited = Column(Boolean, default=False, nullable=False)
    edited_at = Column(DateTime, nullable=True)
    edited_by = Column(String, nullable=True)
    edit_otp_ref = Column(String, nullable=True)
    original_amount = Column(Float, nullable=True)
    original_liters = Column(Float, nullable=True)
    original_mode = Column(String, nullable=True)

    # Relationship back to shift
    shift = relationship("Shift", back_populates="transactions")

class Deduction(Base):
    """V2: Loyalty rewards and shift expenses that reduce net cash handover."""
    __tablename__ = "deductions"

    id = Column(String, primary_key=True, index=True)
    shift_id = Column(String, ForeignKey("shifts.id"), nullable=False)
    type = Column(String, nullable=False)   # "reward" or "expense"
    amount = Column(Float, nullable=False)
    note = Column(String, nullable=True)
    time = Column(DateTime, nullable=False)

    # Relationship back to shift
    shift = relationship("Shift", back_populates="deductions")

class Config(Base):
    __tablename__ = "config"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)

from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
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

    # Relationship to transactions
    transactions = relationship("Transaction", back_populates="shift", cascade="all, delete-orphan")

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
    
    # Security/Loophole Columns
    is_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(String, nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    deletion_reason = Column(String, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Relationship back to shift
    shift = relationship("Shift", back_populates="transactions")

class Config(Base):
    __tablename__ = "config"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)

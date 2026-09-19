from sqlalchemy import Column, String, Float, Boolean, Date, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class FuelPrice(Base):
    """Current fuel prices per type. Seeded on startup."""
    __tablename__ = "fuel_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fuel_type = Column(String, unique=True, nullable=False)   # "diesel" | "ms"
    price = Column(Float, nullable=False)
    active = Column(Boolean, default=True)


class LubricateProduct(Base):
    """Master list of lubricate products available at the station."""
    __tablename__ = "lubricate_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    sort_order = Column(Integer, default=0)
    active = Column(Boolean, default=True)


class DailyReport(Base):
    """One report per day per pump."""
    __tablename__ = "daily_reports"

    id = Column(String, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    employee_name = Column(String, nullable=False)
    start_time = Column(String, nullable=True)    # stored as "HH:MM" string
    end_time = Column(String, nullable=True)
    pump_number = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="draft")  # "draft" | "completed"
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    nozzle_readings = relationship("NozzleReading", back_populates="report", cascade="all, delete-orphan", order_by="NozzleReading.nozzle_number")
    collections = relationship("Collection", back_populates="report", cascade="all, delete-orphan")
    lubricates = relationship("Lubricate", back_populates="report", cascade="all, delete-orphan")


class NozzleReading(Base):
    """Opening/closing meter readings for each nozzle in a daily report."""
    __tablename__ = "nozzle_readings"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, ForeignKey("daily_reports.id"), nullable=False)
    nozzle_number = Column(Integer, nullable=False)     # 1, 2, 3, 4
    fuel_type = Column(String, nullable=False)          # "diesel" | "ms"
    opening_reading = Column(Float, nullable=False, default=0.0)
    closing_reading = Column(Float, nullable=False, default=0.0)
    sales_litres = Column(Float, nullable=False, default=0.0)  # computed: closing - opening
    price = Column(Float, nullable=False, default=0.0)
    amount = Column(Float, nullable=False, default=0.0)        # computed: sales_litres × price

    report = relationship("DailyReport", back_populates="nozzle_readings")


class Collection(Base):
    """Payment/collection categories for a daily report."""
    __tablename__ = "collections"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, ForeignKey("daily_reports.id"), nullable=False)
    category = Column(String, nullable=False)        # "cash", "phonepay", etc.
    day_amount = Column(Float, nullable=False, default=0.0)
    evening_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)   # computed: day + evening

    report = relationship("DailyReport", back_populates="collections")


class Lubricate(Base):
    """Lubricate inventory entry for a daily report."""
    __tablename__ = "lubricates"

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, ForeignKey("daily_reports.id"), nullable=False)
    product_name = Column(String, nullable=False)
    opening_stock = Column(Float, nullable=False, default=0.0)
    sales = Column(Float, nullable=False, default=0.0)
    balance_stock = Column(Float, nullable=False, default=0.0)   # computed: opening - sales

    report = relationship("DailyReport", back_populates="lubricates")

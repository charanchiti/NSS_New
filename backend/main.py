import os
import uuid
import datetime
from contextlib import asynccontextmanager
from typing import List, Optional
from io import BytesIO

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, SessionLocal, Base, get_db

# ── ReportLab imports for PDF ──────────────────────────────────────
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ── COLLECTION CATEGORIES (ordered) ───────────────────────────────
COLLECTION_CATEGORIES = [
    "cash",
    "phonepay",
    "pinelabs",
    "cms_otp",
    "pcr_otp",
    "dcr_otp",
    "credit",
    "phonepay_edc",
    "expenses",
    "non_pump_expenses",
    "discount",
    "lubricates",
]

COLLECTION_LABELS = {
    "cash": "Cash",
    "phonepay": "Phone Pay",
    "pinelabs": "Pine Labs",
    "cms_otp": "CMS OTP",
    "pcr_otp": "P.Cr OTP",
    "dcr_otp": "D.Cr OTP",
    "credit": "Credit",
    "phonepay_edc": "Phone Pay EDC",
    "expenses": "Expenses",
    "non_pump_expenses": "Non Pump Expenses",
    "discount": "Discount",
    "lubricates": "Lubricates",
}

# Categories that count toward Gross Collection (positive income)
INCOME_CATEGORIES = {"cash", "phonepay", "pinelabs", "cms_otp", "pcr_otp", "dcr_otp", "credit", "phonepay_edc"}
# Categories that are deductions from gross
DEDUCTION_CATEGORIES = {"expenses", "non_pump_expenses", "discount", "lubricates"}

# Default lubricate products
DEFAULT_LUBRICATES = [
    "20ML", "40ML", "60ML", "15W40", "20W40", "4T",
    "Break Oil", "Hydraulic Oil", "10W30", "Adblue"
]


# ── DATABASE SEEDING ON STARTUP ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed fuel prices if not present
        if not db.query(models.FuelPrice).filter_by(fuel_type="diesel").first():
            db.add(models.FuelPrice(fuel_type="diesel", price=99.11, active=True))
        if not db.query(models.FuelPrice).filter_by(fuel_type="ms").first():
            db.add(models.FuelPrice(fuel_type="ms", price=111.22, active=True))

        # Seed lubricate products if not present
        if db.query(models.LubricateProduct).count() == 0:
            for i, name in enumerate(DEFAULT_LUBRICATES):
                db.add(models.LubricateProduct(name=name, sort_order=i, active=True))

        db.commit()
    except Exception as e:
        print(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(
    title="NSS FuelTrack API",
    description="Daily Sales & Collection Report backend for NSS Fuel Station",
    version="3.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────
origins_env = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
if not origins:
    origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://localhost:80",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HELPERS ────────────────────────────────────────────────────────

def _calculate_report(report: models.DailyReport) -> schemas.CalculationSummary:
    """Compute all totals for a given report object."""
    diesel_litres = sum(
        n.sales_litres for n in report.nozzle_readings if n.fuel_type == "diesel"
    )
    diesel_amount = sum(
        n.amount for n in report.nozzle_readings if n.fuel_type == "diesel"
    )
    ms_litres = sum(
        n.sales_litres for n in report.nozzle_readings if n.fuel_type == "ms"
    )
    ms_amount = sum(
        n.amount for n in report.nozzle_readings if n.fuel_type == "ms"
    )
    total_fuel_litres = diesel_litres + ms_litres
    total_fuel_amount = diesel_amount + ms_amount

    col_map = {c.category: c.total_amount for c in report.collections}

    gross_collection = sum(col_map.get(cat, 0.0) for cat in INCOME_CATEGORIES)
    total_deductions = sum(col_map.get(cat, 0.0) for cat in DEDUCTION_CATEGORIES)
    net_collection = gross_collection - total_deductions

    lub_total = col_map.get("lubricates", 0.0)
    expected_collection = total_fuel_amount + lub_total

    return schemas.CalculationSummary(
        total_fuel_litres=round(total_fuel_litres, 2),
        total_fuel_amount=round(total_fuel_amount, 2),
        diesel_litres=round(diesel_litres, 2),
        diesel_amount=round(diesel_amount, 2),
        ms_litres=round(ms_litres, 2),
        ms_amount=round(ms_amount, 2),
        gross_collection=round(gross_collection, 2),
        total_deductions=round(total_deductions, 2),
        net_collection=round(net_collection, 2),
        expected_collection=round(expected_collection, 2),
    )


def _upsert_nozzle_readings(
    db: Session,
    report: models.DailyReport,
    readings: List[schemas.NozzleReadingIn],
    prices: dict,
):
    """Delete existing nozzle readings for the report and recreate from input."""
    # Remove old readings
    for old in list(report.nozzle_readings):
        db.delete(old)
    db.flush()

    for r in readings:
        price = prices.get(r.fuel_type, 0.0)
        sales = max(0.0, r.closing_reading - r.opening_reading)
        amount = round(sales * price, 2)
        nozzle = models.NozzleReading(
            id=str(uuid.uuid4()),
            report_id=report.id,
            nozzle_number=r.nozzle_number,
            fuel_type=r.fuel_type,
            opening_reading=r.opening_reading,
            closing_reading=r.closing_reading,
            sales_litres=round(sales, 2),
            price=price,
            amount=amount,
        )
        db.add(nozzle)


def _upsert_collections(
    db: Session,
    report: models.DailyReport,
    collections: List[schemas.CollectionIn],
):
    for old in list(report.collections):
        db.delete(old)
    db.flush()

    for c in collections:
        total = round(c.day_amount + c.evening_amount, 2)
        col = models.Collection(
            id=str(uuid.uuid4()),
            report_id=report.id,
            category=c.category,
            day_amount=c.day_amount,
            evening_amount=c.evening_amount,
            total_amount=total,
        )
        db.add(col)


def _upsert_lubricates(
    db: Session,
    report: models.DailyReport,
    lubricates: List[schemas.LubricateIn],
):
    for old in list(report.lubricates):
        db.delete(old)
    db.flush()

    for l in lubricates:
        balance = max(0.0, l.opening_stock - l.sales)
        lub = models.Lubricate(
            id=str(uuid.uuid4()),
            report_id=report.id,
            product_name=l.product_name,
            opening_stock=l.opening_stock,
            sales=l.sales,
            balance_stock=round(balance, 2),
        )
        db.add(lub)


def _get_prices_dict(db: Session) -> dict:
    prices_rows = db.query(models.FuelPrice).filter_by(active=True).all()
    return {p.fuel_type: p.price for p in prices_rows}


def _build_report_response(report: models.DailyReport) -> schemas.ReportResponse:
    summary = _calculate_report(report)
    return schemas.ReportResponse(
        id=report.id,
        date=report.date,
        employee_name=report.employee_name,
        start_time=report.start_time,
        end_time=report.end_time,
        pump_number=report.pump_number,
        status=report.status,
        remarks=report.remarks,
        created_at=report.created_at,
        updated_at=report.updated_at,
        nozzle_readings=[
            schemas.NozzleReadingResponse(
                id=n.id,
                nozzle_number=n.nozzle_number,
                fuel_type=n.fuel_type,
                opening_reading=n.opening_reading,
                closing_reading=n.closing_reading,
                sales_litres=n.sales_litres,
                price=n.price,
                amount=n.amount,
            )
            for n in sorted(report.nozzle_readings, key=lambda x: x.nozzle_number)
        ],
        collections=[
            schemas.CollectionResponse(
                id=c.id,
                category=c.category,
                day_amount=c.day_amount,
                evening_amount=c.evening_amount,
                total_amount=c.total_amount,
            )
            for c in report.collections
        ],
        lubricates=[
            schemas.LubricateResponse(
                id=l.id,
                product_name=l.product_name,
                opening_stock=l.opening_stock,
                sales=l.sales,
                balance_stock=l.balance_stock,
            )
            for l in report.lubricates
        ],
        summary=summary,
    )


# ── FUEL PRICE ENDPOINTS ───────────────────────────────────────────

@app.get("/api/config/fuel-prices", response_model=schemas.FuelPricesResponse)
def get_fuel_prices(db: Session = Depends(get_db)):
    prices = _get_prices_dict(db)
    return schemas.FuelPricesResponse(
        diesel=prices.get("diesel", 99.11),
        ms=prices.get("ms", 111.22),
    )


@app.put("/api/config/fuel-prices", response_model=schemas.FuelPricesResponse)
def update_fuel_prices(payload: schemas.FuelPricesUpdate, db: Session = Depends(get_db)):
    for fuel_type, price_val in [("diesel", payload.diesel), ("ms", payload.ms)]:
        row = db.query(models.FuelPrice).filter_by(fuel_type=fuel_type).first()
        if row:
            row.price = price_val
        else:
            db.add(models.FuelPrice(fuel_type=fuel_type, price=price_val, active=True))
    db.commit()
    return schemas.FuelPricesResponse(diesel=payload.diesel, ms=payload.ms)


# ── LUBRICATE PRODUCT ENDPOINTS ────────────────────────────────────

@app.get("/api/config/lubricates", response_model=List[schemas.LubricateProductResponse])
def get_lubricate_products(db: Session = Depends(get_db)):
    return db.query(models.LubricateProduct).filter_by(active=True).order_by(
        models.LubricateProduct.sort_order
    ).all()


@app.post("/api/config/lubricates", response_model=schemas.LubricateProductResponse, status_code=201)
def add_lubricate_product(payload: schemas.LubricateProductCreate, db: Session = Depends(get_db)):
    existing = db.query(models.LubricateProduct).filter_by(name=payload.name).first()
    if existing:
        existing.active = True
        db.commit()
        db.refresh(existing)
        return existing
    product = models.LubricateProduct(name=payload.name, sort_order=payload.sort_order)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


# ── DAILY REPORT ENDPOINTS ─────────────────────────────────────────

@app.post("/api/reports", response_model=schemas.ReportResponse, status_code=201)
def create_report(payload: schemas.ReportCreate, db: Session = Depends(get_db)):
    # Enforce one report per pump per date
    existing = db.query(models.DailyReport).filter_by(
        date=payload.date, pump_number=payload.pump_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "A report already exists for this date and pump.",
                "existing_id": existing.id,
            },
        )

    report_id = f"rpt_{payload.date.strftime('%Y%m%d')}_p{payload.pump_number}_{uuid.uuid4().hex[:6]}"
    report = models.DailyReport(
        id=report_id,
        date=payload.date,
        employee_name=payload.employee_name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        pump_number=payload.pump_number,
        status="draft",
        remarks=payload.remarks,
    )
    db.add(report)
    db.flush()  # get the report.id before adding children

    prices = _get_prices_dict(db)
    _upsert_nozzle_readings(db, report, payload.nozzle_readings, prices)
    _upsert_collections(db, report, payload.collections)
    _upsert_lubricates(db, report, payload.lubricates)

    db.commit()
    db.refresh(report)
    return _build_report_response(report)


@app.get("/api/reports", response_model=List[schemas.ReportSummary])
def list_reports(
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    q = db.query(models.DailyReport).order_by(models.DailyReport.date.desc())

    if date_from:
        try:
            q = q.filter(models.DailyReport.date >= datetime.date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(models.DailyReport.date <= datetime.date.fromisoformat(date_to))
        except ValueError:
            pass

    reports = q.all()

    results = []
    for r in reports:
        summary = _calculate_report(r)
        results.append(
            schemas.ReportSummary(
                id=r.id,
                date=r.date,
                employee_name=r.employee_name,
                pump_number=r.pump_number,
                status=r.status,
                total_sales_litres=summary.total_fuel_litres,
                total_sales_amount=summary.total_fuel_amount,
                total_collection=summary.gross_collection,
                created_at=r.created_at,
            )
        )
    return results


@app.get("/api/reports/today", response_model=Optional[schemas.ReportResponse])
def get_today_report(db: Session = Depends(get_db)):
    today = datetime.date.today()
    report = db.query(models.DailyReport).filter_by(date=today, pump_number=1).first()
    if not report:
        return None
    return _build_report_response(report)


@app.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.DailyReport).filter_by(id=report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _build_report_response(report)


@app.put("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def update_report(report_id: str, payload: schemas.ReportUpdate, db: Session = Depends(get_db)):
    report = db.query(models.DailyReport).filter_by(id=report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if payload.employee_name is not None:
        report.employee_name = payload.employee_name.strip()
    if payload.date is not None:
        report.date = payload.date
    if payload.start_time is not None:
        report.start_time = payload.start_time
    if payload.end_time is not None:
        report.end_time = payload.end_time
    if payload.status is not None:
        if payload.status not in ("draft", "completed"):
            raise HTTPException(status_code=400, detail="Status must be 'draft' or 'completed'")
        report.status = payload.status
    if payload.remarks is not None:
        report.remarks = payload.remarks

    report.updated_at = datetime.datetime.utcnow()

    prices = _get_prices_dict(db)
    if payload.nozzle_readings is not None:
        _upsert_nozzle_readings(db, report, payload.nozzle_readings, prices)
    if payload.collections is not None:
        _upsert_collections(db, report, payload.collections)
    if payload.lubricates is not None:
        _upsert_lubricates(db, report, payload.lubricates)

    db.commit()
    db.refresh(report)
    return _build_report_response(report)


@app.post("/api/reports/{report_id}/calculate", response_model=schemas.CalculationSummary)
def calculate_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.DailyReport).filter_by(id=report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _calculate_report(report)


# ── PDF GENERATION ─────────────────────────────────────────────────

def _generate_pdf(report: models.DailyReport) -> bytes:
    """Build a professional A4 landscape PDF for the daily report."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    bold_center = ParagraphStyle(
        "bold_center",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )
    normal_center = ParagraphStyle(
        "normal_center",
        parent=styles["Normal"],
        alignment=TA_CENTER,
    )

    # Color palette
    HEADER_BG = colors.HexColor("#001f5b")
    HEADER_FG = colors.white
    ROW_ALT = colors.HexColor("#f0f4ff")
    GOLD = colors.HexColor("#FFD100")
    LIGHT_GRAY = colors.HexColor("#e8ecf5")
    TEXT_DARK = colors.HexColor("#0a1a40")

    summary = _calculate_report(report)

    elements = []

    # ── Header Block ──────────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>NSS FUEL STATION</b>", bold_center),
        ],
        [
            Paragraph("BHARAT PETROLEUM CORPORATION LIMITED", normal_center),
        ],
        [
            Paragraph("<b>DAILY SALES AND COLLECTION REPORT</b>", bold_center),
        ],
    ]
    header_table = Table(header_data, colWidths=[267 * mm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
        ("FONTSIZE", (0, 0), (-1, 0), 16),
        ("FONTSIZE", (0, 1), (-1, 1), 10),
        ("FONTSIZE", (0, 2), (-1, 2), 12),
        ("BACKGROUND", (0, 2), (-1, 2), GOLD),
        ("TEXTCOLOR", (0, 2), (-1, 2), TEXT_DARK),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, 1), [colors.HexColor("#e8eef8")]),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 1), (-1, 1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
        ("TOPPADDING", (0, 2), (-1, 2), 6),
        ("BOTTOMPADDING", (0, 2), (-1, 2), 6),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 4 * mm))

    # ── Report Meta (Date/Employee/Timing/Pump) ────────────────────
    timing_str = ""
    if report.start_time and report.end_time:
        timing_str = f"{report.start_time} – {report.end_time}"
    elif report.start_time:
        timing_str = report.start_time

    meta_data = [
        ["Date:", str(report.date.strftime("%d-%m-%Y")),
         "Employee:", report.employee_name,
         "Timing:", timing_str,
         "Pump No:", f"0{report.pump_number}"],
    ]
    meta_table = Table(meta_data, colWidths=[20*mm, 45*mm, 25*mm, 55*mm, 20*mm, 40*mm, 22*mm, 30*mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (4, 0), (4, -1), "Helvetica-Bold"),
        ("FONTNAME", (6, 0), (6, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.gray),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 5 * mm))

    # ── Fuel Sales Table ───────────────────────────────────────────
    fuel_header = [["Nozzle No", "Fuel Type", "Opening Reading", "Closing Reading", "Total Sales (Ltrs)", "Price (₹)", "Amount (₹)"]]
    nozzle_rows = []
    for n in sorted(report.nozzle_readings, key=lambda x: x.nozzle_number):
        fuel_label = "Diesel" if n.fuel_type == "diesel" else "Motor Spirit"
        nozzle_rows.append([
            f"Nozzle {n.nozzle_number}",
            fuel_label,
            f"{n.opening_reading:.2f}",
            f"{n.closing_reading:.2f}",
            f"{n.sales_litres:.2f}",
            f"{n.price:.2f}",
            f"{n.amount:,.2f}",
        ])

    # Total row
    nozzle_rows.append([
        "TOTAL", "", "", "",
        f"{summary.total_fuel_litres:.2f}",
        "",
        f"{summary.total_fuel_amount:,.2f}",
    ])

    fuel_table_data = fuel_header + nozzle_rows
    col_w = [25*mm, 30*mm, 35*mm, 35*mm, 35*mm, 25*mm, 35*mm]
    fuel_table = Table(fuel_table_data, colWidths=col_w)
    fuel_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.gray),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, ROW_ALT]),
        ("BACKGROUND", (0, -1), (-1, -1), GOLD),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, -1), (-1, -1), TEXT_DARK),
    ])
    fuel_table.setStyle(fuel_style)
    elements.append(Paragraph("<b>FUEL SALES</b>", bold_center))
    elements.append(Spacer(1, 2 * mm))
    elements.append(fuel_table)
    elements.append(Spacer(1, 5 * mm))

    # ── Two-column layout: Collection + Summary ────────────────────
    # Left: Collection table
    col_header = [["Category", "Day (₹)", "Evening (₹)", "Total (₹)"]]
    col_map = {c.category: c for c in report.collections}
    col_rows = []
    for cat in COLLECTION_CATEGORIES:
        c = col_map.get(cat)
        label = COLLECTION_LABELS.get(cat, cat)
        if c:
            col_rows.append([label, f"{c.day_amount:,.2f}", f"{c.evening_amount:,.2f}", f"{c.total_amount:,.2f}"])
        else:
            col_rows.append([label, "—", "—", "—"])

    col_table_data = col_header + col_rows
    col_table = Table(col_table_data, colWidths=[42*mm, 22*mm, 24*mm, 24*mm])
    col_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.gray),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("LEFTPADDING", (0, 0), (0, -1), 3),
    ]))

    # Right: Sales Summary + Collection Summary
    sales_summary_data = [
        ["Fuel Summary", "Ltrs", "Price", "Amount (₹)"],
        ["Diesel", f"{summary.diesel_litres:.2f}", f"{_get_fuel_price_label(report, 'diesel')}", f"{summary.diesel_amount:,.2f}"],
        ["Motor Spirit", f"{summary.ms_litres:.2f}", f"{_get_fuel_price_label(report, 'ms')}", f"{summary.ms_amount:,.2f}"],
        ["TOTAL", f"{summary.total_fuel_litres:.2f}", "", f"{summary.total_fuel_amount:,.2f}"],
    ]
    sales_sum_table = Table(sales_summary_data, colWidths=[35*mm, 22*mm, 22*mm, 35*mm])
    sales_sum_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), GOLD),
        ("TEXTCOLOR", (0, -1), (-1, -1), TEXT_DARK),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.gray),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, ROW_ALT]),
        ("LEFTPADDING", (0, 0), (0, -1), 3),
    ]))

    collection_summary_data = [
        ["Collection Summary", "Amount (₹)"],
        ["Expected Collection", f"{summary.expected_collection:,.2f}"],
        ["Gross Collection", f"{summary.gross_collection:,.2f}"],
        ["Total Deductions", f"{summary.total_deductions:,.2f}"],
        ["NET COLLECTION", f"{summary.net_collection:,.2f}"],
    ]
    col_sum_table = Table(collection_summary_data, colWidths=[75*mm, 39*mm])
    col_sum_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#00c853")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.gray),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, ROW_ALT]),
        ("LEFTPADDING", (0, 0), (0, -1), 4),
    ]))

    right_col = [sales_sum_table, Spacer(1, 3*mm), col_sum_table]

    two_col = Table(
        [[col_table, right_col]],
        colWidths=[115*mm, 152*mm],
    )
    two_col.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, -1), 6),
    ]))
    elements.append(two_col)
    elements.append(Spacer(1, 5 * mm))

    # ── Lubricates Table ───────────────────────────────────────────
    if report.lubricates:
        lub_header = [["Product", "Opening Stock", "Sales", "Balance Stock"]]
        lub_rows = [[l.product_name, f"{l.opening_stock:.2f}", f"{l.sales:.2f}", f"{l.balance_stock:.2f}"]
                    for l in report.lubricates]
        lub_table = Table(lub_header + lub_rows, colWidths=[60*mm, 40*mm, 40*mm, 40*mm])
        lub_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_FG),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.gray),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
            ("LEFTPADDING", (0, 0), (0, -1), 4),
        ]))
        elements.append(Paragraph("<b>LUBRICATES</b>", bold_center))
        elements.append(Spacer(1, 2 * mm))
        elements.append(lub_table)
        elements.append(Spacer(1, 5 * mm))

    # ── Remarks ────────────────────────────────────────────────────
    if report.remarks and report.remarks.strip():
        remarks_data = [
            [Paragraph("<b>Remarks:</b>", styles["Normal"]),
             Paragraph(report.remarks, styles["Normal"])]
        ]
        remarks_table = Table(remarks_data, colWidths=[30*mm, 237*mm])
        remarks_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.gray),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        elements.append(remarks_table)
        elements.append(Spacer(1, 5 * mm))

    # ── Signature Row ──────────────────────────────────────────────
    sig_data = [
        ["Prepared by (DSM)", "Checked by", "Approved by (Owner)"],
        ["\n\n_________________________",
         "\n\n_________________________",
         "\n\n_________________________"],
    ]
    sig_table = Table(sig_data, colWidths=[89*mm, 89*mm, 89*mm])
    sig_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.gray),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.gray),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    return buffer.getvalue()


def _get_fuel_price_label(report: models.DailyReport, fuel_type: str) -> str:
    """Get price label from nozzle readings for the given fuel type."""
    for n in report.nozzle_readings:
        if n.fuel_type == fuel_type:
            return f"{n.price:.2f}"
    return "—"


@app.get("/api/reports/{report_id}/pdf")
def download_report_pdf(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.DailyReport).filter_by(id=report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = _generate_pdf(report)
    filename = f"NSS_Report_{report.date.strftime('%Y-%m-%d')}_Pump0{report.pump_number}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── HEALTH CHECK ───────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "NSS FuelTrack API v3"}

import os
import uuid
from datetime import datetime, date
import gspread
from google.oauth2.service_account import Credentials
from schemas import (
    FuelPricesResponse, LubricateProductResponse, ReportSummary, 
    ReportResponse, NozzleReadingResponse, CollectionResponse, LubricateResponse,
    CalculationSummary
)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

_client = None
_sheet = None

def get_client():
    global _client
    if _client is None:
        # First check if credentials are provided directly as a JSON string via env var
        creds_json_str = os.getenv("GOOGLE_CREDENTIALS_JSON")
        if creds_json_str:
            import json
            creds_info = json.loads(creds_json_str)
            creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        else:
            # Fallback to reading from file (useful for local development)
            creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "./credentials/service_account.json")
            creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
            
        _client = gspread.authorize(creds)
    return _client

def get_sheet():
    global _sheet
    if _sheet is None:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        _sheet = get_client().open_by_key(sheet_id)
    return _sheet

def get_worksheet(title):
    sheet = get_sheet()
    try:
        return sheet.worksheet(title)
    except gspread.exceptions.WorksheetNotFound:
        # Create it if it doesn't exist
        return sheet.add_worksheet(title=title, rows="1000", cols="20")

# --- INITIALIZATION ---
def initialize_sheets():
    # Ensure all tabs exist and have headers
    
    # 1. Daily Reports
    dr = get_worksheet("Daily Reports")
    if not dr.row_values(1):
        dr.append_row(["Report ID", "Date", "Employee Name", "Start Time", "End Time", "Pump Number", "Status", "Remarks", "Created At", "Updated At", "Total Sales Litres", "Total Sales Amount", "Total Collection", "PDF File"])
        
    # 2. Nozzle Readings
    nr = get_worksheet("Nozzle Readings")
    if not nr.row_values(1):
        nr.append_row(["Report ID", "Pump Number", "Nozzle Number", "Fuel Type", "Opening Reading", "Closing Reading", "Sales Litres", "Price", "Amount"])
        
    # 3. Collections
    c = get_worksheet("Collections")
    if not c.row_values(1):
        c.append_row(["Report ID", "Pump Number", "Category", "Day Amount", "Evening Amount", "Total Amount"])
        
    # 4. Lubricates
    l = get_worksheet("Lubricates")
    if not l.row_values(1):
        l.append_row(["Report ID", "Product Name", "Opening Stock", "Sales", "Balance Stock"])
        
    # 5. Settings
    s = get_worksheet("Settings")
    if not s.row_values(1):
        s.append_row(["Fuel Type", "Price", "Active", "", "Lubricate Product", "Sort Order", "Active"])
        s.append_row(["diesel", 99.11, "TRUE", "", "20ML", 0, "TRUE"])
        s.append_row(["ms", 111.22, "TRUE", "", "40ML", 1, "TRUE"])
        s.append_row(["", "", "", "", "15W40", 2, "TRUE"])
        s.append_row(["", "", "", "", "20W40", 3, "TRUE"])
        s.append_row(["", "", "", "", "4T", 4, "TRUE"])

# --- CONFIG (Settings Tab) ---
def get_settings_records(s):
    data = s.get_all_values()
    records = []
    if len(data) > 1:
        for row in data[1:]:
            records.append({
                "Fuel Type": row[0] if len(row) > 0 else "",
                "Price": row[1] if len(row) > 1 else "",
                "Active": row[2] if len(row) > 2 else "TRUE",
                "Lubricate Product": row[4] if len(row) > 4 else "",
                "Sort Order": row[5] if len(row) > 5 else 0,
                "Lubricate Active": row[6] if len(row) > 6 else "TRUE",
            })
    return records
def get_fuel_prices_dict():
    s = get_worksheet("Settings")
    records = get_settings_records(s)
    prices = {"diesel": 99.11, "ms": 111.22}
    for row in records:
        ftype = str(row.get("Fuel Type", "")).strip().lower()
        if ftype in prices:
            try:
                prices[ftype] = float(row.get("Price", prices[ftype]))
            except ValueError:
                pass
    return prices

def get_fuel_prices() -> FuelPricesResponse:
    prices = get_fuel_prices_dict()
    return FuelPricesResponse(diesel=prices["diesel"], ms=prices["ms"])

def update_fuel_prices(diesel: float, ms: float) -> FuelPricesResponse:
    s = get_worksheet("Settings")
    records = get_settings_records(s)
    cells_to_update = []
    
    # We find the rows for diesel and ms and update them
    for i, row in enumerate(records):
        ftype = str(row.get("Fuel Type", "")).strip().lower()
        if ftype == "diesel":
            cells_to_update.append(gspread.Cell(row=i+2, col=2, value=diesel))
        elif ftype == "ms":
            cells_to_update.append(gspread.Cell(row=i+2, col=2, value=ms))
            
    if cells_to_update:
        s.update_cells(cells_to_update)
    return FuelPricesResponse(diesel=diesel, ms=ms)

def get_lubricate_products():
    s = get_worksheet("Settings")
    records = get_settings_records(s)
    products = []
    for i, row in enumerate(records):
        name = str(row.get("Lubricate Product", "")).strip()
        if name and str(row.get("Lubricate Active", "TRUE")).upper() == "TRUE":
            try:
                sort_order = int(row.get("Sort Order", 0))
            except ValueError:
                sort_order = 0
            products.append({
                "id": i,
                "name": name,
                "sort_order": sort_order,
                "active": True
            })
    products.sort(key=lambda x: x["sort_order"])
    return [LubricateProductResponse(**p) for p in products]

def add_lubricate_product(name: str, sort_order: int):
    s = get_worksheet("Settings")
    records = get_settings_records(s)
    
    # Check if exists
    for i, row in enumerate(records):
        if str(row.get("Lubricate Product", "")).strip().lower() == name.lower():
            # Exists, make sure it's active
            s.update_cell(i+2, 7, "TRUE")
            return LubricateProductResponse(id=i, name=name, sort_order=sort_order, active=True)
            
    # Append
    # Find next empty row in column E
    col_e = s.col_values(5)
    next_row = len(col_e) + 1
    s.update(f"E{next_row}:G{next_row}", [[name, sort_order, "TRUE"]])
    return LubricateProductResponse(id=next_row, name=name, sort_order=sort_order, active=True)

# --- DAILY REPORTS ---

def calculate_report_data(payload, prices):
    total_diesel_litres = 0.0
    total_diesel_amount = 0.0
    total_ms_litres = 0.0
    total_ms_amount = 0.0
    
    nozzles = []
    for n in payload.nozzle_readings:
        sales = max(0.0, n.closing_reading - n.opening_reading)
        price = prices.get(n.fuel_type, 0.0)
        amount = round(sales * price, 2)
        
        if n.fuel_type == "diesel":
            total_diesel_litres += sales
            total_diesel_amount += amount
        else:
            total_ms_litres += sales
            total_ms_amount += amount
            
        nozzles.append({
            "nozzle_number": n.nozzle_number,
            "fuel_type": n.fuel_type,
            "opening_reading": n.opening_reading,
            "closing_reading": n.closing_reading,
            "sales_litres": round(sales, 2),
            "price": price,
            "amount": amount
        })

    total_fuel_litres = total_diesel_litres + total_ms_litres
    total_fuel_amount = total_diesel_amount + total_ms_amount
    
    collections = []
    col_map = {}
    for c in payload.collections:
        total = round(c.day_amount + c.evening_amount, 2)
        collections.append({
            "category": c.category,
            "day_amount": c.day_amount,
            "evening_amount": c.evening_amount,
            "total_amount": total
        })
        col_map[c.category] = total

    # Testing is NEUTRAL now, so we only include income categories and deductions
    income_cats = {"cash", "phonepay", "pinelabs", "cms_otp", "pcr_otp", "dcr_otp", "credit", "phonepay_edc"}
    deduction_cats = {"expenses", "non_pump_expenses", "discount", "lubricates"}
    
    gross_collection = sum(col_map.get(cat, 0.0) for cat in income_cats)
    total_deductions = sum(col_map.get(cat, 0.0) for cat in deduction_cats)
    net_collection = gross_collection - total_deductions
    
    lub_total = col_map.get("lubricates", 0.0)
    expected_collection = total_fuel_amount + lub_total

    lubricates = []
    for l in payload.lubricates:
        balance = max(0.0, l.opening_stock - l.sales)
        lubricates.append({
            "product_name": l.product_name,
            "opening_stock": l.opening_stock,
            "sales": l.sales,
            "balance_stock": round(balance, 2)
        })

    summary = {
        "total_fuel_litres": round(total_fuel_litres, 2),
        "total_fuel_amount": round(total_fuel_amount, 2),
        "diesel_litres": round(total_diesel_litres, 2),
        "diesel_amount": round(total_diesel_amount, 2),
        "ms_litres": round(total_ms_litres, 2),
        "ms_amount": round(total_ms_amount, 2),
        "gross_collection": round(gross_collection, 2),
        "total_deductions": round(total_deductions, 2),
        "net_collection": round(net_collection, 2),
        "expected_collection": round(expected_collection, 2),
    }

    return nozzles, collections, lubricates, summary


def create_report(payload, status="draft"):
    date_str = payload.date.strftime("%Y-%m-%d")
    pump = payload.pump_number
    
    dr = get_worksheet("Daily Reports")
    records = dr.get_all_records()
    
    # Check if exists
    for row in records:
        if str(row.get("Date", "")) == date_str and int(row.get("Pump Number", 0)) == pump:
            return None, str(row.get("Report ID"))
            
    report_id = f"RPT-{payload.date.strftime('%Y%m%d')}-P{pump:02d}-{uuid.uuid4().hex[:4]}"
    created_at = datetime.utcnow().isoformat()
    
    prices = get_fuel_prices_dict()
    nozzles, collections, lubricates, summary = calculate_report_data(payload, prices)
    
    dr.append_row([
        report_id, date_str, payload.employee_name, payload.start_time or "", payload.end_time or "", 
        pump, status, payload.remarks or "", created_at, created_at,
        summary["total_fuel_litres"], summary["total_fuel_amount"], summary["gross_collection"], ""
    ])
    
    if nozzles:
        nr = get_worksheet("Nozzle Readings")
        nr_rows = [[report_id, pump, n["nozzle_number"], n["fuel_type"], n["opening_reading"], n["closing_reading"], n["sales_litres"], n["price"], n["amount"]] for n in nozzles]
        nr.append_rows(nr_rows)
        
    if collections:
        c = get_worksheet("Collections")
        c_rows = [[report_id, pump, col["category"], col["day_amount"], col["evening_amount"], col["total_amount"]] for col in collections]
        c.append_rows(c_rows)
        
    if lubricates:
        l = get_worksheet("Lubricates")
        l_rows = [[report_id, lub["product_name"], lub["opening_stock"], lub["sales"], lub["balance_stock"]] for lub in lubricates]
        l.append_rows(l_rows)
        
    return get_report(report_id), report_id

def list_reports(date_from=None, date_to=None):
    dr = get_worksheet("Daily Reports")
    records = dr.get_all_records()
    
    results = []
    for r in records:
        try:
            r_date = datetime.strptime(str(r["Date"]), "%Y-%m-%d").date()
            if date_from and r_date < date_from:
                continue
            if date_to and r_date > date_to:
                continue
                
            results.append(ReportSummary(
                id=str(r["Report ID"]),
                date=r_date,
                employee_name=str(r["Employee Name"]),
                pump_number=int(r["Pump Number"]),
                status=str(r["Status"]),
                total_sales_litres=float(r.get("Total Sales Litres", 0) or 0),
                total_sales_amount=float(r.get("Total Sales Amount", 0) or 0),
                total_collection=float(r.get("Total Collection", 0) or 0),
                created_at=datetime.fromisoformat(str(r["Created At"])) if r.get("Created At") else datetime.utcnow()
            ))
        except Exception as e:
            pass # Skip malformed rows
            
    results.sort(key=lambda x: (x.date, x.pump_number), reverse=True)
    return results

def get_report(report_id: str):
    sheet = get_sheet()
    ranges = ["Daily Reports", "Nozzle Readings", "Collections", "Lubricates"]
    
    try:
        # Fetch all 4 sheets in a single API call to prevent rate limits
        batch_data = sheet.values_batch_get(ranges)
    except Exception as e:
        return None
        
    dr_data = batch_data.get('valueRanges', [])[0].get('values', []) if len(batch_data.get('valueRanges', [])) > 0 else []
    nr_data = batch_data.get('valueRanges', [])[1].get('values', []) if len(batch_data.get('valueRanges', [])) > 1 else []
    c_data  = batch_data.get('valueRanges', [])[2].get('values', []) if len(batch_data.get('valueRanges', [])) > 2 else []
    l_data  = batch_data.get('valueRanges', [])[3].get('values', []) if len(batch_data.get('valueRanges', [])) > 3 else []
    
    # Map headers to rows
    dr_records = [dict(zip(dr_data[0], row)) for row in dr_data[1:]] if len(dr_data) > 1 else []
    nr_records = [dict(zip(nr_data[0], row)) for row in nr_data[1:]] if len(nr_data) > 1 else []
    c_records  = [dict(zip(c_data[0], row))  for row in c_data[1:]]  if len(c_data) > 1 else []
    l_records  = [dict(zip(l_data[0], row))  for row in l_data[1:]]  if len(l_data) > 1 else []
    
    report_row = None
    for r in dr_records:
        if str(r.get("Report ID")) == report_id:
            report_row = r
            break
            
    if not report_row:
        return None
        
    nozzles = [NozzleReadingResponse(id=f"{report_id}_{n.get('Nozzle Number')}", nozzle_number=int(n.get("Nozzle Number")), fuel_type=str(n.get("Fuel Type")), opening_reading=float(n.get("Opening Reading", 0) or 0), closing_reading=float(n.get("Closing Reading", 0) or 0), sales_litres=float(n.get("Sales Litres", 0) or 0), price=float(n.get("Price", 0) or 0), amount=float(n.get("Amount", 0) or 0)) for n in nr_records if str(n.get("Report ID")) == report_id]
    nozzles.sort(key=lambda x: x.nozzle_number)
    
    collections = [CollectionResponse(id=f"{report_id}_{col.get('Category')}", category=str(col.get("Category")), day_amount=float(col.get("Day Amount", 0) or 0), evening_amount=float(col.get("Evening Amount", 0) or 0), total_amount=float(col.get("Total Amount", 0) or 0)) for col in c_records if str(col.get("Report ID")) == report_id]
    
    lubricates = [LubricateResponse(id=f"{report_id}_{lub.get('Product Name')}", product_name=str(lub.get("Product Name")), opening_stock=float(lub.get("Opening Stock", 0) or 0), sales=float(lub.get("Sales", 0) or 0), balance_stock=float(lub.get("Balance Stock", 0) or 0)) for lub in l_records if str(lub.get("Report ID")) == report_id]
    
    # Calculate summary based on retrieved items
    total_diesel_litres = sum(n.sales_litres for n in nozzles if n.fuel_type == "diesel")
    total_diesel_amount = sum(n.amount for n in nozzles if n.fuel_type == "diesel")
    total_ms_litres = sum(n.sales_litres for n in nozzles if n.fuel_type == "ms")
    total_ms_amount = sum(n.amount for n in nozzles if n.fuel_type == "ms")
    total_fuel_litres = total_diesel_litres + total_ms_litres
    total_fuel_amount = total_diesel_amount + total_ms_amount
    
    income_cats = {"cash", "phonepay", "pinelabs", "cms_otp", "pcr_otp", "dcr_otp", "credit", "phonepay_edc"}
    deduction_cats = {"expenses", "non_pump_expenses", "discount", "lubricates"}
    
    col_map = {col.category: col.total_amount for col in collections}
    gross_collection = sum(col_map.get(cat, 0.0) for cat in income_cats)
    total_deductions = sum(col_map.get(cat, 0.0) for cat in deduction_cats)
    net_collection = gross_collection - total_deductions
    
    lub_total = col_map.get("lubricates", 0.0)
    expected_collection = total_fuel_amount + lub_total
    
    summary = CalculationSummary(
        total_fuel_litres=round(total_fuel_litres, 2),
        total_fuel_amount=round(total_fuel_amount, 2),
        diesel_litres=round(total_diesel_litres, 2),
        diesel_amount=round(total_diesel_amount, 2),
        ms_litres=round(total_ms_litres, 2),
        ms_amount=round(total_ms_amount, 2),
        gross_collection=round(gross_collection, 2),
        total_deductions=round(total_deductions, 2),
        net_collection=round(net_collection, 2),
        expected_collection=round(expected_collection, 2)
    )
    
    return ReportResponse(
        id=report_id,
        date=datetime.strptime(str(report_row["Date"]), "%Y-%m-%d").date(),
        employee_name=str(report_row["Employee Name"]),
        start_time=str(report_row["Start Time"]) if report_row.get("Start Time") else None,
        end_time=str(report_row["End Time"]) if report_row.get("End Time") else None,
        pump_number=int(report_row["Pump Number"]),
        status=str(report_row["Status"]),
        remarks=str(report_row["Remarks"]) if report_row.get("Remarks") else None,
        created_at=datetime.fromisoformat(str(report_row["Created At"])) if report_row.get("Created At") else datetime.utcnow(),
        updated_at=datetime.fromisoformat(str(report_row["Updated At"])) if report_row.get("Updated At") else datetime.utcnow(),
        nozzle_readings=nozzles,
        collections=collections,
        lubricates=lubricates,
        summary=summary
    )

def update_report(report_id: str, payload):
    dr = get_worksheet("Daily Reports")
    records = dr.get_all_records()
    
    row_idx = None
    existing_row = None
    for i, r in enumerate(records):
        if str(r.get("Report ID")) == report_id:
            row_idx = i + 2
            existing_row = r
            break
            
    if not row_idx:
        return None

    # Merge fields
    date_str = payload.date.strftime("%Y-%m-%d") if payload.date else existing_row["Date"]
    employee_name = payload.employee_name if payload.employee_name else existing_row["Employee Name"]
    start_time = payload.start_time if payload.start_time is not None else existing_row.get("Start Time", "")
    end_time = payload.end_time if payload.end_time is not None else existing_row.get("End Time", "")
    pump = payload.pump_number if hasattr(payload, 'pump_number') and payload.pump_number else int(existing_row["Pump Number"])
    status = payload.status if payload.status else existing_row["Status"]
    remarks = payload.remarks if payload.remarks is not None else existing_row.get("Remarks", "")
    updated_at = datetime.utcnow().isoformat()
    
    prices = get_fuel_prices_dict()
    
    # We need full payload to recalculate. If partial, we pull current
    current_report = get_report(report_id)
    
    if payload.nozzle_readings is not None:
        new_nozzles = payload.nozzle_readings
    else:
        # Convert responses back to dicts for recalculation
        new_nozzles = current_report.nozzle_readings
        
    if payload.collections is not None:
        new_colls = payload.collections
    else:
        new_colls = current_report.collections
        
    if payload.lubricates is not None:
        new_lubs = payload.lubricates
    else:
        new_lubs = current_report.lubricates

    # Create a mock payload for calculation
    class MockPayload:
        pass
    mp = MockPayload()
    mp.nozzle_readings = new_nozzles
    mp.collections = new_colls
    mp.lubricates = new_lubs
    
    nozzles, collections, lubricates, summary = calculate_report_data(mp, prices)

    # Update Daily Reports row
    dr.update(f"B{row_idx}:H{row_idx}", [[date_str, employee_name, start_time, end_time, pump, status, remarks]])
    dr.update(f"J{row_idx}:M{row_idx}", [[updated_at, summary["total_fuel_litres"], summary["total_fuel_amount"], summary["gross_collection"]]])

    # Rewrite related rows: 
    # Because finding and updating/deleting multiple rows in gspread is slow, 
    # we can fetch all, remove the ones with report_id, and re-upload.
    def rewrite_worksheet(ws_name, report_id, new_data):
        ws = get_worksheet(ws_name)
        data = ws.get_all_values()
        header = data[0]
        filtered = [row for row in data[1:] if row[0] != report_id]
        
        # Add new rows
        filtered.extend(new_data)
        
        ws.clear()
        ws.append_rows([header] + filtered)

    if payload.nozzle_readings is not None:
        nr_rows = [[report_id, pump, n["nozzle_number"], n["fuel_type"], n["opening_reading"], n["closing_reading"], n["sales_litres"], n["price"], n["amount"]] for n in nozzles]
        rewrite_worksheet("Nozzle Readings", report_id, nr_rows)

    if payload.collections is not None:
        c_rows = [[report_id, pump, col["category"], col["day_amount"], col["evening_amount"], col["total_amount"]] for col in collections]
        rewrite_worksheet("Collections", report_id, c_rows)

    if payload.lubricates is not None:
        l_rows = [[report_id, lub["product_name"], lub["opening_stock"], lub["sales"], lub["balance_stock"]] for lub in lubricates]
        rewrite_worksheet("Lubricates", report_id, l_rows)

    return get_report(report_id)

def set_report_pdf_link(report_id, pdf_link):
    dr = get_worksheet("Daily Reports")
    records = dr.get_all_records()
    for i, r in enumerate(records):
        if str(r.get("Report ID")) == report_id:
            dr.update_cell(i + 2, 14, pdf_link)
            break

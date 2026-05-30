from fastapi import APIRouter, Depends, Query
from app.auth import get_current_user
from app.db import get_db
from datetime import date

router = APIRouter()

QUARTER_DATES = {
    1: ('01-01', '03-31', 'April 28'),
    2: ('04-01', '06-30', 'July 28'),
    3: ('07-01', '09-30', 'October 28'),
    4: ('10-01', '12-31', 'January 28 (next year)'),
}

QUARTER_LABELS = {
    1: 'Q1 (Jan – Mar)',
    2: 'Q2 (Apr – Jun)',
    3: 'Q3 (Jul – Sep)',
    4: 'Q4 (Oct – Dec)',
}


def _period_dates(year: int, quarter: int):
    start_str, end_str, deadline = QUARTER_DATES[quarter]
    date_from = date.fromisoformat(f'{year}-{start_str}')
    date_to   = date.fromisoformat(f'{year}-{end_str}')
    return date_from, date_to, deadline


@router.get('/vat/return')
def vat_return(
    year:    int = Query(default=None),
    quarter: int = Query(default=None, ge=1, le=4),
    _=Depends(get_current_user),
    db=Depends(get_db),
):
    today = date.today()
    if not year:
        year = today.year
    if not quarter:
        quarter = (today.month - 1) // 3 + 1

    date_from, date_to, deadline = _period_dates(year, quarter)
    cur = db.cursor()

    # ── OUTPUT: invoices in period (issued or paid, not voided/draft) ─────────
    cur.execute('''
        SELECT inv.id, inv.invoice_number, inv.created_at,
               so.customer_name,
               inv.subtotal, inv.vat_rate, inv.vat_amount, inv.total_amount,
               inv.status
        FROM erp.invoices inv
        JOIN erp.sale_orders so ON so.id = inv.so_id
        WHERE inv.status NOT IN ('voided', 'draft')
          AND DATE(inv.created_at) BETWEEN %s AND %s
        ORDER BY inv.created_at
    ''', (date_from, date_to))
    inv_rows = cur.fetchall()

    invoices = []
    total_sales_net  = 0.0
    total_output_vat = 0.0
    for r in inv_rows:
        sub = float(r[4] or 0)
        vat = float(r[6] or 0)
        total_sales_net  += sub
        total_output_vat += vat
        invoices.append({
            'id':             r[0],
            'invoice_number': r[1],
            'date':           str(r[2])[:10],
            'customer_name':  r[3],
            'net_amount':     round(sub, 2),
            'vat_rate':       float(r[5] or 5),
            'vat_amount':     round(vat, 2),
            'gross_amount':   float(r[7] or 0),
            'status':         r[8],
        })

    # ── INPUT: bills in period ────────────────────────────────────────────────
    cur.execute('''
        SELECT b.id, b.bill_number, b.created_at,
               b.supplier_name,
               b.subtotal, b.vat_rate, b.vat_amount, b.total_amount,
               b.status
        FROM erp.bills b
        WHERE DATE(b.created_at) BETWEEN %s AND %s
        ORDER BY b.created_at
    ''', (date_from, date_to))
    bill_rows = cur.fetchall()

    bills = []
    total_purchases_net = 0.0
    total_input_vat     = 0.0
    for r in bill_rows:
        sub = float(r[4] or 0)
        vat = float(r[6] or 0)
        total_purchases_net += sub
        total_input_vat     += vat
        bills.append({
            'id':            r[0],
            'bill_number':   r[1],
            'date':          str(r[2])[:10],
            'supplier_name': r[3],
            'net_amount':    round(sub, 2),
            'vat_rate':      float(r[5] or 5),
            'vat_amount':    round(vat, 2),
            'gross_amount':  float(r[7] or 0),
            'status':        r[8],
        })

    net_vat = round(total_output_vat - total_input_vat, 2)

    return {
        'year':            year,
        'quarter':         quarter,
        'quarter_label':   QUARTER_LABELS[quarter],
        'date_from':       str(date_from),
        'date_to':         str(date_to),
        'filing_deadline': deadline,
        'generated_on':    str(today),

        # UAE FTA Form 201 Boxes
        'box4_zero_rated_sales':  round(total_sales_net, 2),
        'box8_total_output_vat':  round(total_output_vat, 2),
        'box9_expenses_net':      round(total_purchases_net, 2),
        'box9_input_vat':         round(total_input_vat, 2),
        'box11_total_input_vat':  round(total_input_vat, 2),
        'box14_net_vat_payable':  net_vat,

        'invoice_count': len(invoices),
        'bill_count':    len(bills),
        'invoices':      invoices,
        'bills':         bills,
    }


@router.get('/vat/periods')
def vat_periods(_=Depends(get_current_user), db=Depends(get_db)):
    today = date.today()
    year  = today.year
    periods = []
    for q in range(4, 0, -1):
        df, dt, deadline = _period_dates(year, q)
        periods.append({
            'year': year, 'quarter': q,
            'label': f'{QUARTER_LABELS[q]} {year}',
            'date_from': str(df), 'date_to': str(dt),
            'filing_deadline': deadline,
        })
    df, dt, deadline = _period_dates(year - 1, 4)
    periods.append({
        'year': year - 1, 'quarter': 4,
        'label': f'Q4 (Oct – Dec) {year - 1}',
        'date_from': str(df), 'date_to': str(dt),
        'filing_deadline': deadline,
    })
    return periods

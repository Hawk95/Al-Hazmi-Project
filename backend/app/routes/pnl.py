from fastapi import APIRouter, Depends
from typing import Optional
from app.auth import get_current_user
from app.db import get_db

router = APIRouter()

# Reusable CTE: average purchase cost per product name from received POs
_COST_CTE = '''
    WITH product_costs AS (
        SELECT poi.product_name,
               AVG(poi.unit_price) AS avg_cost
        FROM erp.purchase_order_items poi
        JOIN erp.purchase_orders po ON po.id = poi.po_id
        WHERE po.status = 'received'
        GROUP BY poi.product_name
    ),
    so_pnl AS (
        SELECT
            so.id                              AS so_id,
            so.so_number,
            so.customer_name,
            so.status                          AS so_status,
            DATE(so.created_at)                AS so_date,
            DATE_TRUNC('week', so.created_at)  AS week_start,
            SUM(soi.total_price)                                    AS revenue,
            SUM(soi.quantity * COALESCE(pc.avg_cost, 0))            AS cost,
            SUM(soi.total_price)
              - SUM(soi.quantity * COALESCE(pc.avg_cost, 0))        AS profit,
            CASE WHEN SUM(soi.total_price) > 0
                 THEN ROUND(
                   (SUM(soi.total_price) - SUM(soi.quantity * COALESCE(pc.avg_cost, 0)))
                   / SUM(soi.total_price) * 100, 1)
                 ELSE 0 END                                         AS margin_pct,
            BOOL_OR(pc.avg_cost IS NULL)                            AS has_unknown_cost
        FROM erp.sale_orders so
        JOIN erp.sale_order_items soi ON soi.so_id = so.id
        LEFT JOIN product_costs pc ON pc.product_name = soi.product_name
        WHERE so.status NOT IN ('returned', 'draft')
        GROUP BY so.id, so.so_number, so.customer_name, so.status, so.created_at
    )
'''


@router.get('/pnl/summary')
def pnl_summary(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(_COST_CTE + '''
        SELECT
            COUNT(*)                            AS total_orders,
            COALESCE(SUM(revenue), 0)           AS total_revenue,
            COALESCE(SUM(cost), 0)              AS total_cost,
            COALESCE(SUM(profit), 0)            AS total_profit,
            CASE WHEN SUM(revenue) > 0
                 THEN ROUND(SUM(profit) / SUM(revenue) * 100, 1)
                 ELSE 0 END                     AS avg_margin_pct
        FROM so_pnl
    ''')
    r = cur.fetchone()

    # Best and worst margin products
    cur.execute(_COST_CTE + '''
        SELECT
            soi.product_name,
            SUM(soi.total_price)                               AS revenue,
            SUM(soi.quantity * COALESCE(pc.avg_cost, 0))       AS cost,
            CASE WHEN SUM(soi.total_price) > 0
                 THEN ROUND((SUM(soi.total_price) - SUM(soi.quantity * COALESCE(pc.avg_cost, 0)))
                      / SUM(soi.total_price) * 100, 1)
                 ELSE 0 END                                    AS margin_pct
        FROM erp.sale_order_items soi
        JOIN erp.sale_orders so ON so.id = soi.so_id
        LEFT JOIN product_costs pc ON pc.product_name = soi.product_name
        WHERE so.status NOT IN (\'returned\', \'draft\')
        GROUP BY soi.product_name
        ORDER BY margin_pct DESC
    ''')
    products = [{'name': p[0], 'revenue': float(p[1] or 0), 'cost': float(p[2] or 0), 'margin_pct': float(p[3] or 0)} for p in cur.fetchall()]

    return {
        'total_orders':   int(r[0] or 0),
        'total_revenue':  round(float(r[1] or 0), 2),
        'total_cost':     round(float(r[2] or 0), 2),
        'total_profit':   round(float(r[3] or 0), 2),
        'avg_margin_pct': float(r[4] or 0),
        'products':       products,
    }


@router.get('/pnl/sales')
def pnl_sales(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(_COST_CTE + '''
        SELECT so_id, so_number, customer_name, so_status, so_date,
               revenue, cost, profit, margin_pct, has_unknown_cost
        FROM so_pnl
        ORDER BY so_date DESC
    ''')
    return [
        {
            'so_id':            r[0],
            'so_number':        r[1],
            'customer_name':    r[2],
            'so_status':        r[3],
            'so_date':          str(r[4]) if r[4] else None,
            'revenue':          round(float(r[5] or 0), 2),
            'cost':             round(float(r[6] or 0), 2),
            'profit':           round(float(r[7] or 0), 2),
            'margin_pct':       float(r[8] or 0),
            'has_unknown_cost': bool(r[9]),
        }
        for r in cur.fetchall()
    ]


@router.get('/pnl/weekly')
def pnl_weekly(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    # Week-level aggregates
    cur.execute(_COST_CTE + '''
        SELECT
            week_start,
            SUM(revenue)     AS revenue,
            SUM(cost)        AS cost,
            SUM(profit)      AS profit,
            COUNT(*)         AS order_count,
            CASE WHEN SUM(revenue) > 0
                 THEN ROUND(SUM(profit) / SUM(revenue) * 100, 1)
                 ELSE 0 END  AS margin_pct
        FROM so_pnl
        GROUP BY week_start
        ORDER BY week_start DESC
    ''')
    weeks_raw = cur.fetchall()

    # Customer breakdown per week
    cur.execute(_COST_CTE + '''
        SELECT
            week_start,
            customer_name,
            SUM(revenue)    AS revenue,
            SUM(cost)       AS cost,
            SUM(profit)     AS profit,
            COUNT(*)        AS orders
        FROM so_pnl
        GROUP BY week_start, customer_name
        ORDER BY week_start DESC, revenue DESC
    ''')
    cust_rows = cur.fetchall()

    # Index customer rows by week
    from collections import defaultdict
    cust_by_week = defaultdict(list)
    for row in cust_rows:
        cust_by_week[str(row[0])[:10]].append({
            'customer_name': row[1],
            'revenue':       round(float(row[2] or 0), 2),
            'cost':          round(float(row[3] or 0), 2),
            'profit':        round(float(row[4] or 0), 2),
            'orders':        int(row[5] or 0),
        })

    result = []
    for r in weeks_raw:
        ws = str(r[0])[:10]
        from datetime import date, timedelta
        try:
            wdate = date.fromisoformat(ws)
            wend  = wdate + timedelta(days=6)
            label = f"{wdate.strftime('%d %b')} – {wend.strftime('%d %b %Y')}"
        except Exception:
            label = ws
        result.append({
            'week_start':   ws,
            'week_label':   label,
            'revenue':      round(float(r[1] or 0), 2),
            'cost':         round(float(r[2] or 0), 2),
            'profit':       round(float(r[3] or 0), 2),
            'order_count':  int(r[4] or 0),
            'margin_pct':   float(r[5] or 0),
            'customers':    cust_by_week.get(ws, []),
        })
    return result

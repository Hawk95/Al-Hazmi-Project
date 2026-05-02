from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.db import get_db

router = APIRouter()


@router.get('/summary')
def get_summary(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()

    cur.execute("SELECT COUNT(*) FROM erp.orders")
    total_orders = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM erp.orders WHERE status = 'pending'")
    pending_orders = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(total_amount),0) FROM erp.orders WHERE DATE(created_at)=CURRENT_DATE")
    revenue_today = float(cur.fetchone()[0])

    cur.execute(
        "SELECT COALESCE(SUM(total_amount),0) FROM erp.orders "
        "WHERE EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM CURRENT_DATE) "
        "AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM CURRENT_DATE)"
    )
    revenue_month = float(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM erp.products WHERE is_active=TRUE")
    total_products = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM erp.products WHERE quantity_kg<=min_stock_kg AND is_active=TRUE")
    low_stock_count = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(quantity_kg * price_per_kg),0) FROM erp.products WHERE is_active=TRUE")
    inventory_value = float(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM erp.suppliers WHERE is_active=TRUE")
    active_suppliers = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM erp.deliveries WHERE DATE(scheduled_at)=CURRENT_DATE")
    deliveries_today = cur.fetchone()[0]

    return {
        'orders': {'total': total_orders, 'pending': pending_orders},
        'revenue': {'today': revenue_today, 'month': revenue_month},
        'inventory': {'total_products': total_products, 'low_stock': low_stock_count, 'value': inventory_value},
        'suppliers': {'active': active_suppliers},
        'deliveries': {'today': deliveries_today},
    }


@router.get('/orders-by-status')
def orders_by_status(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT status, COUNT(*) FROM erp.orders GROUP BY status ORDER BY COUNT(*) DESC")
    return [{'status': r[0], 'count': r[1]} for r in cur.fetchall()]


@router.get('/revenue-trend')
def revenue_trend(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "SELECT DATE(created_at)::text, COALESCE(SUM(total_amount),0) "
        "FROM erp.orders WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' "
        "GROUP BY DATE(created_at) ORDER BY DATE(created_at)"
    )
    return [{'date': r[0], 'revenue': float(r[1])} for r in cur.fetchall()]


@router.get('/low-stock')
def low_stock_report(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "SELECT id, name, category, quantity_kg, min_stock_kg "
        "FROM erp.products "
        "WHERE quantity_kg <= min_stock_kg AND is_active=TRUE ORDER BY quantity_kg ASC"
    )
    return [
        {'id': r[0], 'name': r[1], 'category': r[2],
         'stock_qty': float(r[3]), 'min_threshold': float(r[4]),
         'unit': 'kg', 'supplier_name': None}
        for r in cur.fetchall()
    ]


@router.get('/top-products')
def top_products(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "SELECT oi.product_name, SUM(oi.quantity), SUM(oi.total_price), COUNT(DISTINCT oi.order_id) "
        "FROM erp.order_items oi JOIN erp.orders o ON oi.order_id=o.id "
        "WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days' "
        "GROUP BY oi.product_name ORDER BY SUM(oi.total_price) DESC LIMIT 10"
    )
    return [
        {'name': r[0], 'total_qty': float(r[1]), 'total_revenue': float(r[2]), 'order_count': r[3]}
        for r in cur.fetchall()
    ]

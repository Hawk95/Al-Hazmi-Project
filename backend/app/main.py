import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import (
    auth, products, suppliers, orders, deliveries,
    reports, sales, admin, hr, stock, customers, pnl, vat, trucks, settings as settings_router,
)

app = FastAPI(title='Meat Distribution ERP')

_default_origins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    'http://localhost:5175', 'http://127.0.0.1:5175',
]
_extra = [o.strip() for o in settings.cors_allowed_origins.split(',') if o.strip()]
_allowed = list(dict.fromkeys(_default_origins + _extra))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router,       prefix='/api/auth',       tags=['auth'])
app.include_router(products.router,   prefix='/api/products',   tags=['products'])
app.include_router(suppliers.router,  prefix='/api/suppliers',  tags=['suppliers'])
app.include_router(orders.router,     prefix='/api/orders',     tags=['orders'])
app.include_router(deliveries.router, prefix='/api/deliveries', tags=['deliveries'])
app.include_router(reports.router,    prefix='/api/reports',    tags=['reports'])
app.include_router(sales.router,      prefix='/api/sales',      tags=['sales'])
app.include_router(admin.router,      prefix='/api/admin',      tags=['admin'])
app.include_router(hr.router,         prefix='/api/hr',         tags=['hr'])
app.include_router(stock.router,      prefix='/api/stock',      tags=['stock'])
app.include_router(customers.router,  prefix='/api/customers',  tags=['customers'])
app.include_router(pnl.router,        prefix='/api/pnl',        tags=['pnl'])
app.include_router(vat.router,        prefix='/api/vat',        tags=['vat'])
app.include_router(trucks.router,          prefix='/api/trucks',   tags=['trucks'])
app.include_router(settings_router.router, prefix='/api/settings', tags=['settings'])


@app.get('/health')
def health():
    import psycopg
    try:
        conn = psycopg.connect(settings.db_conninfo, connect_timeout=5)
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM erp.users')
        count = cur.fetchone()[0]
        conn.close()
        return {
            'status': 'ok',
            'db_host': settings.db_host,
            'users': count,
            'env': {
                'DB_URL_set': bool(os.environ.get('DB_URL')),
                'DATABASE_URL_set': bool(os.environ.get('DATABASE_URL')),
                'SECRET_KEY_set': bool(os.environ.get('SECRET_KEY')),
            },
        }
    except Exception as e:
        return {
            'status': 'error',
            'db_host': settings.db_host,
            'error': str(e),
            'env': {
                'DB_URL_set': bool(os.environ.get('DB_URL')),
                'DATABASE_URL_set': bool(os.environ.get('DATABASE_URL')),
                'SECRET_KEY_set': bool(os.environ.get('SECRET_KEY')),
            },
        }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app.main:app', host=settings.backend_host, port=settings.backend_port, reload=False)

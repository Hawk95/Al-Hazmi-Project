from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes import auth, admin, suppliers, products, orders, deliveries, reports, sales, hr, stock, customers, pnl, vat
from app.core.config import settings

app = FastAPI(title='Meat Distribution ERP')

_origins = [o.strip() for o in settings.cors_allowed_origins.split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/health')
def health():
    try:
        import psycopg
        conn = psycopg.connect(settings.db_conninfo, connect_timeout=5)
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM erp.users')
        count = cur.fetchone()[0]
        conn.close()
        return {'status': 'ok', 'db': 'connected', 'users': count}
    except Exception as e:
        return JSONResponse(status_code=503, content={'status': 'error', 'db': str(e)})

app.include_router(auth.router,        prefix='/api/auth',       tags=['auth'])
app.include_router(admin.router,       prefix='/api/admin',      tags=['admin'])
app.include_router(suppliers.router,   prefix='/api/suppliers',  tags=['suppliers'])
app.include_router(products.router,    prefix='/api/products',   tags=['products'])
app.include_router(orders.router,      prefix='/api/orders',     tags=['orders'])
app.include_router(deliveries.router,  prefix='/api/deliveries', tags=['deliveries'])
app.include_router(reports.router,     prefix='/api/reports',    tags=['reports'])
app.include_router(sales.router,       prefix='/api/sales',      tags=['sales'])
app.include_router(hr.router,          prefix='/api/hr',         tags=['hr'])
app.include_router(stock.router,       prefix='/api/stock',      tags=['stock'])
app.include_router(customers.router,   prefix='/api',            tags=['customers'])
app.include_router(pnl.router,         prefix='/api',            tags=['pnl'])
app.include_router(vat.router,         prefix='/api',            tags=['vat'])


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'app.main:app',
        host=settings.backend_host,
        port=settings.backend_port,
        reload=False,
    )

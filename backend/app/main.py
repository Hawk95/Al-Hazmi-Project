from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, admin, suppliers, products, orders, deliveries, reports
from app.core.config import settings

app = FastAPI(title='Meat Distribution ERP')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5175',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router,        prefix='/api/auth',       tags=['auth'])
app.include_router(admin.router,       prefix='/api/admin',      tags=['admin'])
app.include_router(suppliers.router,   prefix='/api/suppliers',  tags=['suppliers'])
app.include_router(products.router,    prefix='/api/products',   tags=['products'])
app.include_router(orders.router,      prefix='/api/orders',     tags=['orders'])
app.include_router(deliveries.router,  prefix='/api/deliveries', tags=['deliveries'])
app.include_router(reports.router,     prefix='/api/reports',    tags=['reports'])


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'app.main:app',
        host=settings.backend_host,
        port=settings.backend_port,
        reload=False,
    )

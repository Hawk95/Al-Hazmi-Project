from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from app.db import Base, DATABASE_URL

_schema_name = 'erp' if DATABASE_URL.startswith('postgresql') else None
_table_schema = {'schema': _schema_name} if _schema_name else {}


def _fk(table_col):
    if _schema_name:
        return f'{_schema_name}.{table_col}'
    return table_col


class User(Base):
    __tablename__ = 'users'
    __table_args__ = _table_schema

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)


class Product(Base):
    __tablename__ = 'products'
    __table_args__ = _table_schema

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String)
    quantity_kg = Column(Float, default=0.0)
    min_stock_kg = Column(Float, default=0.0)
    price_per_kg = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Supplier(Base):
    __tablename__ = 'suppliers'
    __table_args__ = _table_schema

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    contact_name = Column(String)
    email = Column(String)
    phone = Column(String)
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = 'orders'
    __table_args__ = _table_schema

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False, index=True)
    customer_name = Column(String, nullable=False)
    status = Column(String, default='pending')  # pending, confirmed, delivered, cancelled
    total_amount = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Delivery(Base):
    __tablename__ = 'deliveries'
    __table_args__ = _table_schema

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey(_fk('orders.id')), nullable=True)
    driver_name = Column(String)
    vehicle_number = Column(String)
    status = Column(String, default='scheduled')  # scheduled, in_transit, delivered
    scheduled_at = Column(DateTime)
    delivered_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

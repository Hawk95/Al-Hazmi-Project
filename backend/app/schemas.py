from typing import List, Optional
from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# ── Admin user management ─────────────────────────────────────────────────────

class UserAdminView(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    hr_access: bool = False


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False


class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


# ── Suppliers ─────────────────────────────────────────────────────────────────

class SupplierView(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    halal_certified: bool = True
    is_active: bool = True
    created_at: Optional[str] = None


class CreateSupplierRequest(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True


class UpdateSupplierRequest(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


# ── Products ──────────────────────────────────────────────────────────────────

class ProductView(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    unit: str = 'kg'
    price_per_unit: float
    stock_qty: float
    min_threshold: float
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None


class CreateProductRequest(BaseModel):
    name: str
    category: Optional[str] = None
    price_per_unit: float
    stock_qty: float = 0.0
    min_threshold: float = 0.0
    is_active: bool = True


class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price_per_unit: Optional[float] = None
    stock_qty: Optional[float] = None
    min_threshold: Optional[float] = None
    is_active: Optional[bool] = None


class StockAdjustRequest(BaseModel):
    qty_change: float


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderItemView(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float
    total_price: float


class CreateOrderItemRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float


class OrderView(BaseModel):
    id: int
    order_number: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    status: str
    total_amount: float
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    items: List[OrderItemView] = []


class CreateOrderRequest(BaseModel):
    customer_name: str
    notes: Optional[str] = None
    items: List[CreateOrderItemRequest] = []


class UpdateOrderRequest(BaseModel):
    customer_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ── Deliveries ────────────────────────────────────────────────────────────────

class DeliveryView(BaseModel):
    id: int
    order_id: Optional[int] = None
    order_number: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle: Optional[str] = None
    scheduled_time: Optional[str] = None
    delivery_address: Optional[str] = None
    status: str = 'scheduled'
    notes: Optional[str] = None
    created_at: Optional[str] = None


class CreateDeliveryRequest(BaseModel):
    order_id: Optional[int] = None
    driver_name: Optional[str] = None
    vehicle: Optional[str] = None
    scheduled_time: Optional[str] = None


class UpdateDeliveryRequest(BaseModel):
    driver_name: Optional[str] = None
    vehicle: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None

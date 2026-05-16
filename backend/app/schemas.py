from pydantic import BaseModel
from typing import List, Optional


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool

    model_config = {"from_attributes": True}


class UserAdminView(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    phone: str | None = None
    is_active: bool
    is_admin: bool
    hr_access: bool = False
    created_at: str | None = None
    last_login: str | None = None


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    phone: str | None = None
    is_admin: bool = False


class UpdateUserRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    is_admin: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str


# ── Suppliers ────────────────────────────────────────────

class SupplierView(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    halal_certified: bool = True
    is_active: bool = True
    created_at: Optional[str] = None


class CreateSupplierRequest(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    halal_certified: bool = True
    is_active: bool = True


class UpdateSupplierRequest(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    halal_certified: Optional[bool] = None
    is_active: Optional[bool] = None


# ── Products / Inventory ─────────────────────────────────

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
    unit: str = 'kg'
    price_per_unit: float
    stock_qty: float = 0
    min_threshold: float = 10
    supplier_id: Optional[int] = None
    is_active: bool = True


class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    stock_qty: Optional[float] = None
    min_threshold: Optional[float] = None
    supplier_id: Optional[int] = None
    is_active: Optional[bool] = None


class StockAdjustRequest(BaseModel):
    qty_change: float
    reason: Optional[str] = None


# ── Orders ───────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float


class OrderItemView(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float
    total_price: float


class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemCreate]


class UpdateOrderRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


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


# ── Deliveries ───────────────────────────────────────────

class CreateDeliveryRequest(BaseModel):
    order_id: Optional[int] = None
    driver_name: Optional[str] = None
    vehicle: Optional[str] = None
    scheduled_time: Optional[str] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None


class UpdateDeliveryRequest(BaseModel):
    driver_name: Optional[str] = None
    vehicle: Optional[str] = None
    scheduled_time: Optional[str] = None
    delivery_address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DeliveryView(BaseModel):
    id: int
    order_id: Optional[int] = None
    order_number: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle: Optional[str] = None
    scheduled_time: Optional[str] = None
    delivery_address: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[str] = None

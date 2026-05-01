from pydantic import BaseModel


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
    is_active: bool
    is_admin: bool
    created_at: str | None = None


class CreateUserRequest(BaseModel):
    email: str
    password: str
    is_admin: bool = False


class ResetPasswordRequest(BaseModel):
    new_password: str

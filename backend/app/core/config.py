from urllib.parse import urlparse, unquote
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = 'change-me-to-a-secure-secret'
    algorithm: str = 'HS256'
    access_token_expire_minutes: int = 60
    db_url: str = 'postgresql+psycopg://erp_user:ErpUser%40123@127.0.0.1:5432/meat_erp'
    backend_host: str = '127.0.0.1'
    backend_port: int = 8002
    cors_allowed_origins: str = 'http://localhost:5173,http://localhost:5174'

    @property
    def db_conninfo(self) -> str:
        raw = self.db_url
        for prefix in ['postgresql+psycopg2://', 'postgresql+psycopg://', 'postgresql://']:
            if raw.startswith(prefix):
                raw = 'postgresql://' + raw[len(prefix):]
                break
        p = urlparse(raw)
        return (
            f"host={p.hostname} port={p.port or 5432} "
            f"dbname={p.path.lstrip('/')} "
            f"user={p.username} password={unquote(p.password or '')}"
        )

    class Config:
        env_file = '.env'


settings = Settings()

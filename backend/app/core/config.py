import os
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
    db_sslmode: str = 'prefer'

    @property
    def resolved_db_url(self) -> str:
        # Accept DATABASE_URL (Render standard) or DB_URL — env vars take priority over field default
        return (
            os.environ.get('DATABASE_URL') or
            os.environ.get('DB_URL') or
            self.db_url
        )

    @property
    def db_conninfo(self) -> str:
        raw = self.resolved_db_url
        for prefix in ['postgresql+psycopg2://', 'postgresql+psycopg://', 'postgresql://']:
            if raw.startswith(prefix):
                raw = 'postgresql://' + raw[len(prefix):]
                break
        p = urlparse(raw)
        sslmode = os.environ.get('DB_SSLMODE') or self.db_sslmode
        return (
            f"host={p.hostname} port={p.port or 5432} "
            f"dbname={p.path.lstrip('/')} "
            f"user={p.username} password={unquote(p.password or '')} "
            f"sslmode={sslmode}"
        )

    @property
    def db_host(self) -> str:
        """Returns just the hostname for logging — no credentials."""
        try:
            return urlparse(self.resolved_db_url).hostname or 'unknown'
        except Exception:
            return 'unknown'

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'


settings = Settings()

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = 'change-me-to-a-secure-secret'
    algorithm: str = 'HS256'
    access_token_expire_minutes: int = 60
    db_url: str = 'postgresql+psycopg://erp_user:ErpUser%40123@localhost:5432/meat_erp'
    db_sslmode: str = ''
    cors_allowed_origins: str = ''
    backend_host: str = '127.0.0.1'
    backend_port: int = 8003
    # Geofence — set per-client in Render env vars
    office_lat:  float = 25.269916
    office_lng:  float = 55.333817
    geofence_m:  int   = 50

    class Config:
        env_file = '.env'

    @property
    def resolved_db_url(self) -> str:
        return (
            os.environ.get('DATABASE_URL') or
            os.environ.get('DB_URL') or
            self.db_url
        )

    @property
    def db_conninfo(self) -> str:
        url = self.resolved_db_url.replace('postgresql+psycopg://', 'postgresql://')
        if self.db_sslmode:
            sep = '&' if '?' in url else '?'
            url = f'{url}{sep}sslmode={self.db_sslmode}'
        return url

    @property
    def db_host(self) -> str:
        try:
            from urllib.parse import urlparse
            return urlparse(self.resolved_db_url).hostname or 'unknown'
        except Exception:
            return 'unknown'


settings = Settings()

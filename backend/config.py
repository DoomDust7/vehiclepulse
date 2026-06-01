from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    MOCK_MODE: bool = True
    SERIAL_PORT: str = "/dev/ttyUSB0"
    BAUD_RATE: int = 38400
    POLL_RATE_HZ: float = 10.0
    DB_PATH: str = "/app/data/vehiclepulse.db"
    WS_BROADCAST_INTERVAL_MS: int = 100
    LOG_LEVEL: str = "INFO"
    VEHICLE_VIN: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

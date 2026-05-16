from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sprout API"
    MONGODB_URL: str = "mongodb://localhost:27017" # Placeholder, configure in Railway/Atlas
    DATABASE_NAME: str = "sprout_db"
    JWT_SECRET: str = "supersecretkey_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

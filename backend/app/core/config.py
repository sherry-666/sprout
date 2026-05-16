from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sprout API"
    MONGODB_URL: str = "mongodb://localhost:27017" # Placeholder, configure in Railway/Atlas
    DATABASE_NAME: str = "sprout_db"
    JWT_SECRET: str = "supersecretkey_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    GEMINI_API_KEY: str = ""

    # Email / SendGrid
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@sprout.app"
    FRONTEND_URL: str = "http://localhost:5173"

    # Dev email whitelist (comma-separated base Gmail addresses, dots/+suffix stripped)
    EMAIL_WHITELIST_ENABLED: bool = True
    EMAIL_WHITELIST: str = "csjingtao@gmail.com"

    class Config:
        env_file = ".env"

settings = Settings()

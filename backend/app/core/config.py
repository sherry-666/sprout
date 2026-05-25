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

    # Comma-separated allowed CORS origins (e.g. https://sprout-web.railway.app,http://localhost:5173)
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # S3-compatible object storage (Railway Bucket)
    S3_ENDPOINT: str = ""
    S3_REGION: str = "auto"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = ""

    # Dev email whitelist (comma-separated base Gmail addresses, dots/+suffix stripped)
    EMAIL_WHITELIST_ENABLED: bool = True
    EMAIL_WHITELIST: str = "csjingtao@gmail.com"

    # Calendar OAuth — Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/oauth/google/callback"

    # Calendar OAuth — Microsoft (Outlook)
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/oauth/microsoft/callback"

    # Signed state token secret for OAuth CSRF protection
    OAUTH_STATE_SECRET: str = "oauth_state_secret_change_in_prod"

    class Config:
        env_file = ".env"

settings = Settings()

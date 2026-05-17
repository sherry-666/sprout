from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routes import auth
from app.routes import institutions
from app.routes import admin
from app.routes import kids
from app.routes import parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Sprout API",
    description="API for the Sprout day care management system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(institutions.router, prefix="/api/institutions", tags=["institutions"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(kids.router, prefix="/api/kids", tags=["kids"])
app.include_router(parent.router, prefix="/api/parent", tags=["parent"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}

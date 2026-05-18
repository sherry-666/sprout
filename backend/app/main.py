from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.core import jobs as job_queue
from app.graphql.schema import graphql_router
from app.jobs.quick_log_processor import register_quick_log_handler

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    register_quick_log_handler()
    job_queue.start_worker()
    yield
    await job_queue.stop_worker()
    await close_mongo_connection()

app = FastAPI(
    title="Sprout API",
    description="API for the Sprout day care management system",
    version="1.0.0",
    lifespan=lifespan
)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graphql_router, prefix="/graphql", tags=["graphql"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}

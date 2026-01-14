"""
FastAPI Main Application
LMA Edge Hackathon - Loan Market Analytics Platform
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
# from app.routers import documents, simulation, export, loans  # RAG dependencies - skip for MVP
from app.routers import loans_enhanced
try:
    from app.routers import simulation, export, loans
except ImportError:
    pass  # Skip routers with missing dependencies

# Include the reconstruction router which provides a deterministic API for the frontend
from app.routers import reconstruction as reconstruction_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Perform startup actions here
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        init_db()
        print(f"[OK] {settings.PROJECT_NAME} v{settings.VERSION} initialized")
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
    yield

# Initialize FastAPI app with lifespan event handler
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade Loan Market Analytics platform with Covenant Breach Simulator",
    docs_url="/docs",
    redoc_url="/redoc"
    , lifespan=lifespan
)

# CORS Configuration - Allow all development ports
app.add_middleware(
    CORSMiddleware,
    # Allow all origins in development/demo. Change this to explicit origins in production.
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
try:
    app.include_router(documents.router, prefix=settings.API_V1_PREFIX, tags=["Documents"])
except NameError:
    pass
try:
    app.include_router(simulation.router, prefix=settings.API_V1_PREFIX, tags=["Simulation"])
except NameError:
    pass
try:
    app.include_router(export.router, prefix=settings.API_V1_PREFIX, tags=["Export"])
except NameError:
    pass
try:
    app.include_router(loans.router, prefix=settings.API_V1_PREFIX, tags=["Loans"])
except NameError:
    pass
app.include_router(loans_enhanced.router, prefix=settings.API_V1_PREFIX, tags=["Loans Extended"])
app.include_router(reconstruction_router.router, prefix=settings.API_V1_PREFIX, tags=["Reconstruction"])


# Note: startup actions moved into lifespan handler to avoid deprecated on_event usage


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "status": "operational",
        "endpoints": {
            "docs": "/docs",
            "api": settings.API_V1_PREFIX
        }
    }


@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy", "service": settings.PROJECT_NAME}


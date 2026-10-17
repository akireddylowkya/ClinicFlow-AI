import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, SessionLocal
from .models import Patient
from .seed_data import reset_and_seed_demo_database

# Routers
from .routers import (
    auth, patient_portal, dashboard, patients, appointments, queue, prescriptions,
    inventory, followups, ai, demo, settings as clinic_settings_router
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Smart Clinic Management and Predictive Operations Platform for Small & Local Clinics.",
    version="1.0.0"
)

# Enable CORS for frontend Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-seed database on first launch if empty
@app.on_event("startup")
def startup_event():
    db: Session = SessionLocal()
    try:
        patient_count = db.query(Patient).count()
        if patient_count == 0:
            print("ClinicFlow AI: Initializing first-launch demo environment...")
            reset_and_seed_demo_database(db)
        else:
            print(f"ClinicFlow AI: Database already initialized with {patient_count} patients.")
    finally:
        db.close()

# Include Routers
app.include_router(auth.router)
app.include_router(patient_portal.router)
app.include_router(dashboard.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(prescriptions.router)
app.include_router(inventory.router)
app.include_router(followups.router)
app.include_router(ai.router)
app.include_router(demo.router)
app.include_router(clinic_settings_router.router)


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "database": "sqlite_connected",
        "demo_mode": True,
        "timestamp": datetime.datetime.now().isoformat()
    }

# Mount frontend/dist for unified single-server deployment
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api"):
            return {"error": "API route not found"}
        target = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "project": settings.PROJECT_NAME,
            "clinic_name": settings.CLINIC_NAME,
            "status": "online",
            "documentation": "/docs",
            "timestamp": datetime.datetime.now().isoformat()
        }

import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Appointment, Patient
from ..schemas import (
    CongestionForecastResponse, WhatIfSimulationRequest, WhatIfSimulationResponse,
    NoShowAnalysisResponse, NoShowPredictionDetail, InventoryForecastResponse
)
from ..ai_engine import (
    compute_congestion_forecast, run_what_if_simulation,
    predict_appointment_noshow_risk, get_or_train_noshow_model,
    compute_inventory_demand_forecast
)

router = APIRouter(prefix="/api/ai", tags=["AI & Operational Intelligence"])

@router.get("/congestion-forecast", response_model=CongestionForecastResponse)
def get_congestion_forecast(db: Session = Depends(get_db)):
    return compute_congestion_forecast(db)


@router.post("/what-if-simulation", response_model=WhatIfSimulationResponse)
def simulate_scenario(payload: WhatIfSimulationRequest, db: Session = Depends(get_db)):
    return run_what_if_simulation(
        db=db,
        extra_arrivals=payload.extra_arrivals,
        service_duration_adjustment_min=payload.service_duration_adjustment_min,
        active_providers_count=payload.active_providers_count,
        simulation_duration_minutes=payload.simulation_duration_minutes
    )


@router.get("/no-show-analysis", response_model=NoShowAnalysisResponse)
def get_no_show_analysis(db: Session = Depends(get_db)):
    today = datetime.date.today()
    _, metrics = get_or_train_noshow_model()

    appts = db.query(Appointment).filter(
        Appointment.appointment_date >= today,
        Appointment.status.in_(["Scheduled", "Confirmed", "Rescheduled"])
    ).all()

    predictions = []
    summary_counts = {"High": 0, "Medium": 0, "Low": 0}

    for a in appts:
        patient = a.patient
        if not patient:
            continue
        info = predict_appointment_noshow_risk(a, patient)
        level = info["risk_level"]
        summary_counts[level] = summary_counts.get(level, 0) + 1

        lead = max(0, (a.appointment_date - today).days)
        prev_ns = 1 if "no-show" in (patient.medical_history_summary or "").lower() else 0

        predictions.append(
            NoShowPredictionDetail(
                appointment_id=a.id,
                patient_name=patient.full_name,
                time_slot=a.time_slot,
                lead_time_days=lead,
                previous_no_shows=prev_ns,
                confirmation_status=a.confirmation_status,
                risk_level=level,
                risk_probability=info["risk_probability"],
                top_factors=info["top_factors"],
                suggested_action=info["suggested_action"]
            )
        )

    # Sort so high-risk appointments appear first
    predictions.sort(key=lambda x: x.risk_probability, reverse=True)

    return NoShowAnalysisResponse(
        model_metrics=metrics,
        high_risk_appointments=predictions,
        summary=summary_counts
    )


@router.get("/inventory-demand-forecast", response_model=InventoryForecastResponse)
def get_inventory_demand_forecast(db: Session = Depends(get_db)):
    return compute_inventory_demand_forecast(db)

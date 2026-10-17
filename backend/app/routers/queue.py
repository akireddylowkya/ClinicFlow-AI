import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import QueueEntry, Provider, Patient, ServiceDurationRecord, Appointment
from ..schemas import (
    QueueEntryCreate, QueueStatusUpdate, QueuePriorityUpdate, QueueEntryResponse
)
from ..queue_logic import generate_next_token, recalculate_queue_estimates

router = APIRouter(prefix="/api/queue", tags=["Queue Management"])

@router.get("/", response_model=List[QueueEntryResponse])
def get_queue(
    provider_id: Optional[int] = Query(None, description="Filter by provider"),
    status: Optional[str] = Query(None, description="Filter by status (Waiting, In Consultation, Completed)"),
    db: Session = Depends(get_db)
):
    recalculate_queue_estimates(db)

    query = db.query(QueueEntry)
    if provider_id:
        query = query.filter(QueueEntry.provider_id == provider_id)
    if status and status != "All":
        query = query.filter(QueueEntry.status == status)

    return query.order_by(QueueEntry.status.desc(), QueueEntry.queue_position.asc()).all()


@router.post("/token", response_model=QueueEntryResponse, status_code=201)
def add_patient_to_queue(payload: QueueEntryCreate, db: Session = Depends(get_db)):
    """
    Direct walk-in patient or check-in to queue.
    """
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    provider = db.query(Provider).filter(Provider.id == payload.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    token = generate_next_token(db, provider)
    q_entry = QueueEntry(
        token_number=token,
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        appointment_id=payload.appointment_id,
        arrival_time=datetime.datetime.utcnow(),
        status="Waiting",
        priority=payload.priority,
        estimated_service_duration=provider.average_service_duration_min or 12,
        notes=payload.notes
    )
    db.add(q_entry)
    db.commit()

    recalculate_queue_estimates(db)
    db.refresh(q_entry)
    return q_entry


@router.put("/{queue_id}/status", response_model=QueueEntryResponse)
def update_queue_status(queue_id: int, payload: QueueStatusUpdate, db: Session = Depends(get_db)):
    """
    Status transition:
    - 'In Consultation': sets service_start_time, updates provider status
    - 'Completed': sets service_end_time, logs ServiceDurationRecord, updates linked appointment
    - 'Cancelled': frees slot
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    now = datetime.datetime.utcnow()
    old_status = entry.status
    new_status = payload.status

    if new_status == "In Consultation":
        # Check if provider currently has another patient in consultation and auto-complete or warn
        existing_active = db.query(QueueEntry).filter(
            QueueEntry.provider_id == entry.provider_id,
            QueueEntry.status == "In Consultation",
            QueueEntry.id != entry.id
        ).all()
        for ea in existing_active:
            ea.status = "Completed"
            ea.service_end_time = now

        entry.service_start_time = now
        entry.status = "In Consultation"
        if entry.provider:
            entry.provider.current_status = "In Consultation"

    elif new_status == "Completed":
        entry.service_end_time = now
        entry.status = "Completed"
        if entry.provider:
            entry.provider.current_status = "Available"

        # Calculate actual duration and record
        start = entry.service_start_time or (now - datetime.timedelta(minutes=12))
        actual_min = max(2, int((now - start).total_seconds() / 60))
        rec = ServiceDurationRecord(
            provider_id=entry.provider_id,
            patient_id=entry.patient_id,
            actual_duration_min=actual_min,
            visit_type="General OPD",
            recorded_at=now
        )
        db.add(rec)

        # Update linked appointment if present
        if entry.appointment:
            entry.appointment.status = "Completed"

    elif new_status == "Cancelled":
        entry.status = "Cancelled"
        if entry.appointment:
            entry.appointment.status = "Cancelled"

    elif new_status == "Waiting":
        entry.status = "Waiting"
        entry.service_start_time = None

    if payload.notes:
        entry.notes = payload.notes

    db.commit()
    recalculate_queue_estimates(db)
    db.refresh(entry)
    return entry


@router.put("/{queue_id}/priority", response_model=QueueEntryResponse)
def update_queue_priority(queue_id: int, payload: QueuePriorityUpdate, db: Session = Depends(get_db)):
    """
    Updates priority flag (Normal, Senior Citizen, Emergency / Priority) and triggers wait-time recalculation.
    """
    entry = db.query(QueueEntry).filter(QueueEntry.id == queue_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    entry.priority = payload.priority
    db.commit()

    recalculate_queue_estimates(db)
    db.refresh(entry)
    return entry


@router.get("/public-display")
def get_public_queue_display(db: Session = Depends(get_db)):
    """
    Separate patient-facing token display:
    Reveals only token number, current token in service, approximate wait, and room/doctor.
    STRICT PRIVACY: Zero personal names or clinical diagnostic data exposed!
    """
    recalculate_queue_estimates(db)

    providers = db.query(Provider).filter(Provider.is_available == True).all()
    display_rooms = []

    for p in providers:
        in_consult = db.query(QueueEntry).filter(
            QueueEntry.provider_id == p.id,
            QueueEntry.status == "In Consultation"
        ).first()

        waiting = db.query(QueueEntry).filter(
            QueueEntry.provider_id == p.id,
            QueueEntry.status == "Waiting"
        ).order_by(QueueEntry.queue_position.asc()).limit(5).all()

        display_rooms.append({
            "room_number": p.room_number,
            "doctor_display": p.name,
            "specialization": p.specialization,
            "current_token": in_consult.token_number if in_consult else "Ready / Next",
            "next_tokens": [
                {
                    "token": w.token_number,
                    "estimated_wait_min": w.estimated_waiting_time,
                    "priority": w.priority
                } for w in waiting
            ],
            "total_waiting": len(waiting)
        })

    from .settings import get_clinic_settings_dict
    config = get_clinic_settings_dict(db)


    return {
        "clinic_name": config.get("clinic_name", "Community Health Clinic"),
        "current_time": datetime.datetime.now().strftime("%I:%M %p"),
        "rooms": display_rooms,
        "announcement": "Please proceed to your assigned OPD room when your token is called."
    }


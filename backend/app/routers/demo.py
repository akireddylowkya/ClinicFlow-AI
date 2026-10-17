import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import QueueEntry, Appointment, Provider, NotificationLog, ServiceDurationRecord
from ..seed_data import reset_and_seed_demo_database
from ..queue_logic import recalculate_queue_estimates

router = APIRouter(prefix="/api/demo", tags=["Demo Controls & Simulations"])

@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """
    Deterministic Reset:
    Restores the rich initial hackathon demo scenario with 14 patients,
    10 appointments, 6 queue entries, 10 medicines, 12 inventory batches,
    alerts, and historical AI models.
    """
    reset_and_seed_demo_database(db)
    return {
        "status": "success",
        "message": "Demo data reset successfully to original presentation baseline scenario."
    }


@router.post("/advance-queue-step")
def simulate_advance_queue(db: Session = Depends(get_db)):
    """
    Demo Action: 'Simulate Service Completion'
    - Finishes the current patient in consultation in OPD-1
    - Moves the next waiting patient (Amitabh Gupta) to 'In Consultation'
    - Recalculates estimated wait times for remaining waiting patients
    """
    now = datetime.datetime.utcnow()

    # Find patient currently In Consultation in OPD-1
    current = db.query(QueueEntry).filter(
        QueueEntry.provider_id == 1,
        QueueEntry.status == "In Consultation"
    ).first()

    completed_token = None
    if current:
        current.status = "Completed"
        current.service_end_time = now
        completed_token = current.token_number
        if current.appointment:
            current.appointment.status = "Completed"

        # Log duration
        rec = ServiceDurationRecord(
            provider_id=1,
            patient_id=current.patient_id,
            actual_duration_min=13,
            visit_type="General OPD",
            recorded_at=now
        )
        db.add(rec)

    # Next waiting patient
    next_waiting = db.query(QueueEntry).filter(
        QueueEntry.provider_id == 1,
        QueueEntry.status == "Waiting"
    ).order_by(QueueEntry.queue_position.asc()).first()

    called_token = None
    if next_waiting:
        next_waiting.status = "In Consultation"
        next_waiting.service_start_time = now
        called_token = next_waiting.token_number
        if next_waiting.appointment:
            next_waiting.appointment.status = "In Consultation"

    db.commit()
    recalculate_queue_estimates(db)

    return {
        "status": "success",
        "message": f"Completed consultation for Token {completed_token or 'None'}. Token {called_token or 'None'} called into OPD-1.",
        "completed_token": completed_token,
        "called_token": called_token
    }


@router.post("/simulate-peak-arrivals")
def simulate_surge_arrivals(db: Session = Depends(get_db)):
    """
    Demo Action: 'Simulate High-Demand Peak Period'
    Adds 3 walk-in patients to the queue with different priorities to show real-time wait recalculations.
    """
    provider = db.query(Provider).filter(Provider.id == 1).first()
    now = datetime.datetime.utcnow()

    # Create dummy walk-ins
    tokens_added = []
    surge_data = [
        {"name": "Suresh Raina (Walk-in)", "age": 36, "prio": "Normal", "notes": "Acute viral fever symptoms"},
        {"name": "Kamala Devi (Walk-in)", "age": 71, "prio": "Senior Citizen", "notes": "Elderly patient with severe dizziness"},
        {"name": "Mohan Lal (Emergency)", "age": 52, "prio": "Emergency / Priority", "notes": "Chest discomfort & breathlessness triage"}
    ]

    for item in surge_data:
        from ..models import Patient
        # Create temp patient
        last_patient = db.query(Patient).order_by(Patient.id.desc()).first()
        dummy_id = f"PAT-{1001 + (last_patient.id if last_patient else 0)}"
        p = Patient(
            dummy_patient_id=dummy_id,
            full_name=item["name"],
            age=item["age"],
            gender="Other",
            contact_number="+91 98000 00000",
            preferred_language="English",
            registration_date=datetime.date.today(),
            medical_history_summary="Walk-in emergency triage entry"
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        from ..queue_logic import generate_next_token
        tok = generate_next_token(db, provider)
        q = QueueEntry(
            token_number=tok,
            patient_id=p.id,
            provider_id=1,
            arrival_time=now,
            status="Waiting",
            priority=item["prio"],
            estimated_service_duration=12,
            notes=item["notes"]
        )
        db.add(q)
        tokens_added.append(tok)

    db.commit()
    recalculate_queue_estimates(db)

    return {
        "status": "success",
        "message": f"Added 3 walk-in arrivals ({', '.join(tokens_added)}). Wait times and priority ordering recomputed dynamically.",
        "tokens_added": tokens_added
    }

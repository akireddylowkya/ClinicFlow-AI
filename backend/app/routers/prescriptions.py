import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Prescription, PrescriptionItem, Visit, Patient, Provider, Appointment, 
    MedicineCatalogue, FollowUpTask
)
from ..schemas import (
    PrescriptionCreate, PrescriptionFinalize, PrescriptionResponse, VisitCreate, VisitResponse
)

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions & Consultations"])

@router.get("/", response_model=List[PrescriptionResponse])
def get_prescriptions(
    patient_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Prescription)
    if patient_id:
        query = query.filter(Prescription.patient_id == patient_id)
    if status:
        query = query.filter(Prescription.status == status)

    return query.order_by(Prescription.created_at.desc()).all()


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
def get_prescription(prescription_id: int, db: Session = Depends(get_db)):
    rx = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return rx


@router.post("/", response_model=PrescriptionResponse, status_code=201)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    provider = db.query(Provider).filter(Provider.id == payload.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    rx = Prescription(
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        visit_id=payload.visit_id,
        doctor_notes=payload.doctor_notes,
        status="Draft"
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    # Add items
    for it in payload.items:
        item = PrescriptionItem(
            prescription_id=rx.id,
            medicine_id=it.medicine_id,
            medicine_name=it.medicine_name,
            strength=it.strength,
            dosage=it.dosage,
            frequency=it.frequency,
            duration=it.duration,
            route=it.route,
            instructions=it.instructions
        )
        db.add(item)

    db.commit()
    db.refresh(rx)
    return rx


@router.put("/{prescription_id}/finalize", response_model=PrescriptionResponse)
def finalize_prescription(prescription_id: int, payload: PrescriptionFinalize, db: Session = Depends(get_db)):
    """
    Doctor reviews and finalises the digital prescription.
    Generates optional plain-language patient summary strictly derived from doctor's items.
    """
    rx = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    now = datetime.datetime.utcnow()
    rx.status = "Finalised"
    rx.finalisation_time = now

    if payload.doctor_notes:
        rx.doctor_notes = payload.doctor_notes

    # Deterministic patient-friendly translation directly mirroring doctor's items
    if payload.patient_friendly_explanation:
        rx.patient_friendly_explanation = payload.patient_friendly_explanation
    else:
        instructions_summary = []
        for it in rx.items:
            instructions_summary.append(f"{it.medicine_name}: Take {it.dosage} ({it.frequency}) for {it.duration} - {it.instructions}.")
        rx.patient_friendly_explanation = "Medication Guide:\n" + "\n".join(instructions_summary)

    db.commit()
    db.refresh(rx)
    return rx


@router.post("/visits", response_model=VisitResponse, status_code=201)
def record_patient_visit(payload: VisitCreate, db: Session = Depends(get_db)):
    """
    Records a clinical visit (diagnosis, notes, vitals, follow-up).
    Optionally auto-creates a follow-up task if follow_up_date is given.
    """
    visit = Visit(
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        appointment_id=payload.appointment_id,
        chief_complaint=payload.chief_complaint,
        diagnosis=payload.diagnosis,
        clinical_notes=payload.clinical_notes,
        vitals=payload.vitals or "BP: 120/80, Pulse: 72, Temp: 98.4 F",
        follow_up_instructions=payload.follow_up_instructions,
        follow_up_date=payload.follow_up_date
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)

    # If follow-up date specified, schedule follow-up task
    if payload.follow_up_date:
        task = FollowUpTask(
            patient_id=payload.patient_id,
            visit_id=visit.id,
            task_type="Post-Consultation Follow-Up",
            due_date=payload.follow_up_date,
            status="Pending",
            responsible_staff=visit.provider.name if visit.provider else "Doctor",
            notes=payload.follow_up_instructions or f"Follow-up for {payload.diagnosis}"
        )
        db.add(task)
        db.commit()

    return visit

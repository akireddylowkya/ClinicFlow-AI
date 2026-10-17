import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import (
    Patient, Appointment, Visit, Prescription, FollowUpTask, QueueEntry,
    SymptomSubmission, MedicalDocument
)
from ..schemas import PatientCreate, PatientUpdate, PatientResponse

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("/", response_model=List[PatientResponse])
def get_patients(
    search: Optional[str] = Query(None, description="Search by name, ID or phone"),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Patient)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(s),
                Patient.dummy_patient_id.ilike(s),
                Patient.contact_number.ilike(s)
            )
        )
    return query.order_by(Patient.id.desc()).limit(limit).all()


@router.post("/", response_model=PatientResponse, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    # 1. Prevent accidental duplicate records check
    if payload.contact_number:
        duplicate = db.query(Patient).filter(
            Patient.full_name.ilike(payload.full_name.strip()),
            Patient.contact_number == payload.contact_number.strip()
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=400, 
                detail=f"Patient '{payload.full_name}' with contact {payload.contact_number} already exists as ID {duplicate.dummy_patient_id}."
            )

    # 2. Generate unique dummy patient ID (e.g. PAT-1015)
    last_patient = db.query(Patient).order_by(Patient.id.desc()).first()
    next_id = 1001 if not last_patient else (1001 + last_patient.id)
    dummy_id = f"PAT-{next_id}"

    new_patient = Patient(
        dummy_patient_id=dummy_id,
        full_name=payload.full_name.strip(),
        age=payload.age,
        gender=payload.gender,
        contact_number=payload.contact_number.strip() if payload.contact_number else None,
        preferred_language=payload.preferred_language,
        medical_history_summary=payload.medical_history_summary,
        allergies=payload.allergies or "None reported",
        registration_date=datetime.date.today()
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: int, payload: PatientUpdate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)

    patient.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}/timeline")
def get_patient_timeline(patient_id: int, db: Session = Depends(get_db)):
    """
    Returns a unified chronological timeline for a patient:
    - Registration
    - Appointments (scheduled, completed, cancelled)
    - Clinical Visits & Diagnoses
    - Prescriptions
    - Follow-Up Tasks
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    events = []

    # Registration event
    events.append({
        "event_type": "registration",
        "title": "Patient Registered at Clinic",
        "date": patient.registration_date.strftime("%d/%m/%Y"),
        "timestamp": patient.created_at.isoformat() if patient.created_at else "",
        "details": f"Registered with ID {patient.dummy_patient_id}. Preferred language: {patient.preferred_language}."
    })

    # Visits & Consultations
    visits = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.visit_date.desc()).all()
    for v in visits:
        events.append({
            "event_type": "visit",
            "title": f"Consultation: {v.diagnosis}",
            "date": v.visit_date.strftime("%d/%m/%Y"),
            "timestamp": v.visit_date.isoformat(),
            "details": f"Doctor: {v.provider.name if v.provider else 'Doctor'}. Complaint: {v.chief_complaint}. Notes: {v.clinical_notes}",
            "vitals": v.vitals,
            "has_prescription": v.prescription is not None,
            "prescription_id": v.prescription.id if v.prescription else None
        })

    # Prescriptions
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
    for rx in prescriptions:
        med_names = [f"{item.medicine_name} ({item.dosage}, {item.frequency})" for item in rx.items]
        events.append({
            "event_type": "prescription",
            "title": f"Prescription ({rx.status})",
            "date": rx.created_at.strftime("%d/%m/%Y"),
            "timestamp": rx.created_at.isoformat(),
            "details": f"Medications: {', '.join(med_names) if med_names else 'No items'}",
            "patient_friendly_explanation": rx.patient_friendly_explanation
        })

    # Appointments
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(Appointment.appointment_date.desc()).all()
    for a in appointments:
        events.append({
            "event_type": "appointment",
            "title": f"Appointment ({a.status})",
            "date": a.appointment_date.strftime("%d/%m/%Y"),
            "timestamp": a.created_at.isoformat() if a.created_at else "",
            "details": f"Time: {a.time_slot}. Doctor: {a.provider.name if a.provider else 'Assigned Doctor'}. Confirmation: {a.confirmation_status}. Notes: {a.administrative_notes or 'None'}"
        })

    # Follow-Up Tasks
    followups = db.query(FollowUpTask).filter(FollowUpTask.patient_id == patient_id).order_by(FollowUpTask.due_date.desc()).all()
    for f in followups:
        events.append({
            "event_type": "follow_up",
            "title": f"Follow-Up Task: {f.task_type} ({f.status})",
            "date": f.due_date.strftime("%d/%m/%Y"),
            "timestamp": f.created_at.isoformat() if f.created_at else "",
            "details": f"Due on {f.due_date.strftime('%d/%m/%Y')}. Assigned to: {f.responsible_staff}. Notes: {f.notes or 'None'}"
        })

    # Patient Symptoms Submissions
    symptoms = db.query(SymptomSubmission).filter(SymptomSubmission.patient_id == patient_id).order_by(SymptomSubmission.submitted_at.desc()).all()
    for s in symptoms:
        events.append({
            "event_type": "symptom_submission",
            "title": f"Patient Reported Symptoms: {s.main_reason}",
            "date": s.submitted_at.strftime("%d/%m/%Y"),
            "timestamp": s.submitted_at.isoformat(),
            "details": f"Reported: '{s.symptoms_text}'. Duration: {s.symptom_duration or 'Not specified'}. Additional notes: {s.additional_notes or 'None'}"
        })

    # Medical Documents Uploaded
    documents = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).order_by(MedicalDocument.upload_date.desc()).all()
    for d in documents:
        events.append({
            "event_type": "medical_document",
            "title": f"Document: {d.title} ({d.category})",
            "date": d.upload_date.strftime("%d/%m/%Y"),
            "timestamp": d.upload_date.isoformat(),
            "details": f"Filename: {d.original_filename} ({d.file_type}, {d.file_size // 1024} KB). Notes: {d.notes or 'None'}",
            "document_id": d.id
        })

    return {
        "patient": {
            "id": patient.id,
            "dummy_patient_id": patient.dummy_patient_id,
            "full_name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "contact_number": patient.contact_number,
            "preferred_language": patient.preferred_language,
            "medical_history_summary": patient.medical_history_summary,
            "allergies": patient.allergies,
            "last_visit": visits[0].visit_date.strftime("%d/%m/%Y") if visits else "No previous visits",
            "last_diagnosis": visits[0].diagnosis if visits else "None"
        },
        "timeline": events
    }

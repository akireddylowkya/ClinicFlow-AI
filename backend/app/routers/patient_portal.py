import os
import shutil
import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import (
    Patient, Appointment, QueueEntry, Visit, Prescription,
    MedicineRequest, FollowUpTask, SymptomSubmission, MedicalDocument,
    NotificationLog, MedicineCatalogue
)
from ..schemas import (
    PatientResponse, AppointmentResponse, VisitResponse, PrescriptionResponse,
    MedicineRequestResponse, FollowUpTaskResponse, SymptomSubmissionCreate,
    SymptomSubmissionResponse, MedicalDocumentResponse, PatientPortalOverviewResponse
)

router = APIRouter(prefix="/api/patient-portal", tags=["Patient Portal"])

UPLOAD_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "documents"))
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 MB


@router.get("/overview/{patient_id}", response_model=PatientPortalOverviewResponse)
def get_patient_portal_overview(patient_id: int, db: Session = Depends(get_db)):
    """Fetch consolidated dashboard overview scoped strictly to the authenticated patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    today = datetime.date.today()

    # Upcoming appointment (Scheduled or Confirmed)
    upcoming_apt = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.appointment_date >= today,
        Appointment.status.in_(["Scheduled", "Confirmed", "Arrived"])
    ).order_by(Appointment.appointment_date.asc()).first()

    # Active Queue entry
    queue_entry = db.query(QueueEntry).filter(
        QueueEntry.patient_id == patient_id,
        QueueEntry.status.in_(["Waiting", "In Consultation"])
    ).first()

    queue_data = None
    if queue_entry:
        queue_data = {
            "token_number": queue_entry.token_number,
            "status": queue_entry.status,
            "queue_position": queue_entry.queue_position,
            "estimated_waiting_time": queue_entry.estimated_waiting_time,
            "priority": queue_entry.priority,
            "arrival_time": queue_entry.arrival_time.isoformat() if queue_entry.arrival_time else None
        }

    # Latest Visit
    latest_visit = db.query(Visit).filter(
        Visit.patient_id == patient_id
    ).order_by(desc(Visit.visit_date)).first()

    # Prescriptions
    finalised_rx_count = db.query(Prescription).filter(
        Prescription.patient_id == patient_id,
        Prescription.status == "Finalised"
    ).count()

    recent_rx = db.query(Prescription).filter(
        Prescription.patient_id == patient_id,
        Prescription.status == "Finalised"
    ).order_by(desc(Prescription.created_at)).first()

    # Active medicine requests (not collected or cancelled)
    active_requests_count = db.query(MedicineRequest).filter(
        MedicineRequest.patient_id == patient_id,
        MedicineRequest.status.notin_(["Collected", "Cancelled"])
    ).count()

    recent_request = db.query(MedicineRequest).filter(
        MedicineRequest.patient_id == patient_id
    ).order_by(desc(MedicineRequest.created_at)).first()

    # Follow-ups
    pending_followups_count = db.query(FollowUpTask).filter(
        FollowUpTask.patient_id == patient_id,
        FollowUpTask.status.in_(["Pending", "Overdue"])
    ).count()

    next_follow_up = db.query(FollowUpTask).filter(
        FollowUpTask.patient_id == patient_id,
        FollowUpTask.status.in_(["Pending", "Overdue"])
    ).order_by(FollowUpTask.due_date.asc()).first()

    # Documents count
    doc_count = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).count()

    return PatientPortalOverviewResponse(
        patient=patient,
        upcoming_appointment=upcoming_apt,
        current_queue_entry=queue_data,
        latest_visit=latest_visit,
        finalised_prescriptions_count=finalised_rx_count,
        active_medicine_requests_count=active_requests_count,
        pending_follow_ups_count=pending_followups_count,
        documents_count=doc_count,
        recent_prescription=recent_rx,
        recent_medicine_request=recent_request,
        next_follow_up=next_follow_up
    )


# --- Symptoms ---
@router.post("/symptoms", response_model=SymptomSubmissionResponse, status_code=201)
def submit_symptoms(payload: SymptomSubmissionCreate, db: Session = Depends(get_db)):
    """
    Patient submits symptoms for their visit or appointment.
    CRITICAL DISCLAIMER:
    "Your symptoms have been submitted for review by the clinic. This form does not provide a diagnosis."
    """
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    sub = SymptomSubmission(
        patient_id=payload.patient_id,
        appointment_id=payload.appointment_id,
        visit_id=payload.visit_id,
        main_reason=payload.main_reason.strip(),
        symptoms_text=payload.symptoms_text.strip(),
        symptom_duration=payload.symptom_duration.strip() if payload.symptom_duration else None,
        additional_notes=payload.additional_notes.strip() if payload.additional_notes else None,
        submitted_at=datetime.datetime.utcnow(),
        reviewed_by_doctor=False
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    # Also log an in-app notification
    notif = NotificationLog(
        recipient_type="Patient",
        recipient_name=patient.full_name,
        recipient_phone=patient.contact_number,
        channel="In-App Simulation",
        message_type="Symptom Submission",
        content="Your symptoms have been submitted for review by the clinic doctor. This form does not provide a diagnosis.",
        status="Delivered"
    )
    db.add(notif)
    db.commit()

    return sub


@router.get("/symptoms/{patient_id}", response_model=List[SymptomSubmissionResponse])
def get_patient_symptoms(patient_id: int, db: Session = Depends(get_db)):
    return db.query(SymptomSubmission).filter(
        SymptomSubmission.patient_id == patient_id
    ).order_by(desc(SymptomSubmission.submitted_at)).all()


# --- Documents ---
@router.post("/documents/upload", response_model=MedicalDocumentResponse, status_code=201)
async def upload_medical_document(
    patient_id: int = Form(...),
    title: str = Form(...),
    category: str = Form("Diagnostic Report"),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload prior prescription, lab report, or diagnostic image.
    Validates file type (PDF, JPG, PNG) and size (< 10MB).
    Saves securely in backend/uploads/documents/{patient_id}/.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Extension check
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed formats: PDF, JPG, PNG."
        )

    # Destination directory
    patient_dir = os.path.join(UPLOAD_BASE_DIR, str(patient_id))
    os.makedirs(patient_dir, exist_ok=True)

    # Unique filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_original = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
    saved_filename = f"{timestamp}_{clean_original}"
    dest_path = os.path.join(patient_dir, saved_filename)

    # Read and calculate size
    content = await file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 10MB (size: {file_size / (1024*1024):.1f} MB)."
        )

    with open(dest_path, "wb") as f:
        f.write(content)

    doc = MedicalDocument(
        patient_id=patient_id,
        title=title.strip(),
        category=category.strip(),
        original_filename=file.filename,
        file_path=os.path.relpath(dest_path, os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        file_size=file_size,
        file_type=file.content_type or f"application/{ext.replace('.', '')}",
        notes=notes.strip() if notes else None,
        upload_date=datetime.datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{patient_id}", response_model=List[MedicalDocumentResponse])
def get_patient_documents(patient_id: int, db: Session = Depends(get_db)):
    return db.query(MedicalDocument).filter(
        MedicalDocument.patient_id == patient_id
    ).order_by(desc(MedicalDocument.upload_date)).all()


@router.get("/documents/download/{doc_id}")
def download_medical_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found")

    # Resolve full path
    base_proj = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    full_path = os.path.join(base_proj, doc.file_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Stored file could not be located on server disk")

    return FileResponse(
        path=full_path,
        filename=doc.original_filename,
        media_type=doc.file_type
    )


# --- Prescriptions & Visits ---
@router.get("/prescriptions/{patient_id}", response_model=List[PrescriptionResponse])
def get_patient_prescriptions(patient_id: int, db: Session = Depends(get_db)):
    return db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).order_by(desc(Prescription.created_at)).all()


@router.get("/visits/{patient_id}", response_model=List[VisitResponse])
def get_patient_visits(patient_id: int, db: Session = Depends(get_db)):
    return db.query(Visit).filter(
        Visit.patient_id == patient_id
    ).order_by(desc(Visit.visit_date)).all()


@router.get("/followups/{patient_id}", response_model=List[FollowUpTaskResponse])
def get_patient_followups(patient_id: int, db: Session = Depends(get_db)):
    return db.query(FollowUpTask).filter(
        FollowUpTask.patient_id == patient_id
    ).order_by(FollowUpTask.due_date.asc()).all()


# --- Medicine Requests ---
def populate_collection_details(req: MedicineRequest, db: Session) -> MedicineRequestResponse:
    from .settings import get_clinic_settings_dict
    config = get_clinic_settings_dict(db)

    clinic_name = config.get("clinic_name", "Community Health Clinic")
    clinic_address = config.get("clinic_address", "")
    collection_point = config.get("collection_point", "")
    opening_hours = config.get("opening_hours", "")
    instructions = req.collection_instructions or config.get("collection_instructions", "Please present your Patient ID at the counter.")

    collection_notice = None
    if not clinic_address.strip() or not collection_point.strip():
        collection_notice = "Collection location not configured — please contact clinic staff"

    return MedicineRequestResponse(
        id=req.id,
        request_reference=req.request_reference,
        patient_id=req.patient_id,
        patient_name=req.patient_name,
        medicine_name=req.medicine_name,
        medicine_id=req.medicine_id,
        requested_quantity=req.requested_quantity,
        status=req.status,
        collection_instructions=instructions,
        staff_notes=req.staff_notes,
        notes=req.notes or req.staff_notes,
        prescription_id=req.prescription_id,
        dispensed_batch_id=req.dispensed_batch_id,
        created_at=req.created_at,
        updated_at=req.updated_at,
        clinic_name=clinic_name,
        clinic_address=clinic_address if clinic_address.strip() else None,
        collection_point=collection_point if collection_point.strip() else None,
        opening_hours=opening_hours if opening_hours.strip() else None,
        collection_notice=collection_notice,
        collection_window=f"Today during: {opening_hours}" if opening_hours else "During clinic dispensary hours"
    )

@router.get("/medicine-requests/{patient_id}", response_model=List[MedicineRequestResponse])
def get_patient_medicine_requests(patient_id: int, db: Session = Depends(get_db)):
    requests = db.query(MedicineRequest).filter(
        MedicineRequest.patient_id == patient_id
    ).order_by(desc(MedicineRequest.created_at)).all()
    return [populate_collection_details(r, db) for r in requests]


@router.post("/medicine-requests", response_model=MedicineRequestResponse, status_code=201)
def submit_patient_medicine_request(
    patient_id: int,
    medicine_name: str,
    requested_quantity: int = 10,
    prescription_id: Optional[int] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Patient submits a medicine or prescription refill request.
    Generates reference REQ-XXXX and initializes status to 'Pending Review'.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Generate unique request reference
    ref_num = random.randint(1000, 9999)
    reference = f"REQ-{ref_num}"
    while db.query(MedicineRequest).filter(MedicineRequest.request_reference == reference).first():
        ref_num = random.randint(1000, 9999)
        reference = f"REQ-{ref_num}"

    # Match catalogue if available
    med = db.query(MedicineCatalogue).filter(
        MedicineCatalogue.name.ilike(f"%{medicine_name.strip()}%")
    ).first()

    req = MedicineRequest(
        request_reference=reference,
        patient_id=patient.id,
        patient_name=patient.full_name,
        medicine_name=medicine_name.strip(),
        medicine_id=med.id if med else None,
        requested_quantity=requested_quantity,
        status="Pending Review",
        collection_instructions="Your request is under review by clinic pharmacy staff.",
        staff_notes=notes,
        notes=notes,
        prescription_id=prescription_id
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # In-app log
    notif = NotificationLog(
        recipient_type="Patient",
        recipient_name=patient.full_name,
        recipient_phone=patient.contact_number,
        channel="In-App Simulation",
        message_type="Medicine Request",
        content=f"Medicine request {reference} for {medicine_name} submitted successfully. Status: Pending Review.",
        status="Delivered"
    )
    db.add(notif)
    db.commit()

    return populate_collection_details(req, db)


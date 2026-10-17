import hashlib
import datetime
import random
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import User, Patient, Provider, SymptomSubmission, Appointment
from ..schemas import (

    UserLogin, UserResponse, ReturningPatientLogin,
    PatientRegistrationCreate, PatientResponse
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Access"])


def hash_password(password: str) -> str:
    """Lightweight deterministic SHA-256 hash for local prototype authentication."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def generate_unique_patient_id(db: Session) -> str:
    """Generate sequential or unique PAT-XXXX identifier."""
    highest_patient = db.query(Patient).order_by(Patient.id.desc()).first()
    next_num = 1001 if not highest_patient else 1001 + highest_patient.id
    candidate = f"PAT-{next_num}"
    while db.query(Patient).filter(Patient.dummy_patient_id == candidate).first():
        next_num += 1
        candidate = f"PAT-{next_num}"
    return candidate


@router.post("/login", response_model=UserResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Role-based authentication supporting:
    - Doctor: username or demo account ('doctor_arun', 'doctor_sneha')
    - Staff: username or demo account ('staff_reception')
    - Patient: patient ID (e.g., 'PAT-1001'), phone number (e.g., '9876543210'), or username ('patient_rajesh')
    """
    role = payload.role.strip()
    identifier = payload.username.strip()

    if role == "Patient":
        # Check by username first
        user = db.query(User).filter(User.username == identifier, User.role == "Patient").first()
        if not user:
            # Check by patient_id or contact_number in Patient table
            patient = db.query(Patient).filter(
                or_(
                    Patient.dummy_patient_id == identifier.upper(),
                    Patient.contact_number == identifier
                )
            ).first()
            if patient:
                # Find or create corresponding User record
                user = db.query(User).filter(User.patient_id == patient.id).first()
                if not user:
                    user = User(
                        username=f"pat_{patient.dummy_patient_id.lower().replace('-', '_')}",
                        full_name=patient.full_name,
                        role="Patient",
                        email=patient.email,
                        contact_number=patient.contact_number,
                        patient_id=patient.id,
                        password_hash=hash_password("demo123")
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No patient account found for '{identifier}'. Please check your Patient ID (e.g. PAT-1001) or phone number, or register as a new patient."
            )
        return user

    elif role == "Doctor":
        user = db.query(User).filter(
            User.role == "Doctor",
            or_(User.username == identifier, User.email == identifier)
        ).first()

        # Fallback helper for quick demo selection: match any doctor if 'doctor' is sent
        if not user and identifier.lower() in ["doctor", "dr", "demo_doctor"]:
            user = db.query(User).filter(User.role == "Doctor").first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor account '{identifier}' not found. Available demo accounts: 'doctor_arun', 'doctor_sneha'."
            )
        return user

    elif role == "Staff":
        user = db.query(User).filter(
            User.role == "Staff",
            or_(User.username == identifier, User.email == identifier)
        ).first()

        # Fallback helper for quick demo selection: match any staff if 'staff' is sent
        if not user and identifier.lower() in ["staff", "reception", "demo_staff"]:
            user = db.query(User).filter(User.role == "Staff").first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff account '{identifier}' not found. Available demo account: 'staff_reception'."
            )
        return user

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role}'. Permitted roles are 'Doctor', 'Staff', or 'Patient'."
        )


@router.post("/patient-register")
def register_patient(payload: PatientRegistrationCreate, db: Session = Depends(get_db)):
    """
    Registers a new or returning patient.
    - Validates inputs
    - Prevents accidental duplicates if contact number matches existing patient (returns existing profile with notice)
    - Generates unique Patient ID (PAT-XXXX)
    - Saves initial symptom submission
    - Creates user account for instant portal login
    """
    # Duplicate check by contact number
    if payload.contact_number:
        clean_phone = payload.contact_number.strip()
        existing_patient = db.query(Patient).filter(Patient.contact_number == clean_phone).first()
        if existing_patient and payload.is_returning:
            # Returning patient profile match
            user = db.query(User).filter(User.patient_id == existing_patient.id).first()
            return {
                "status": "existing_account",
                "message": f"Welcome back, {existing_patient.full_name}! Your existing profile ({existing_patient.dummy_patient_id}) has been retrieved.",
                "patient": existing_patient,
                "user": user
            }

    # Generate unique ID
    new_dummy_id = generate_unique_patient_id(db)

    # Create Patient record
    new_patient = Patient(
        dummy_patient_id=new_dummy_id,
        full_name=payload.full_name.strip(),
        age=payload.age,
        gender=payload.gender,
        contact_number=payload.contact_number.strip() if payload.contact_number else None,
        preferred_language=payload.preferred_language,
        email=payload.email.strip() if payload.email else None,
        is_returning=payload.is_returning,
        main_complaint=payload.main_reason,
        symptom_duration=payload.symptom_duration,
        medical_history_summary=payload.medical_history_summary,
        allergies=payload.allergies or "None reported",
        registration_date=datetime.date.today()
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    # Create initial SymptomSubmission if provided
    initial_symptoms = None
    if payload.symptoms_text or payload.main_reason:
        initial_symptoms = SymptomSubmission(
            patient_id=new_patient.id,
            main_reason=payload.main_reason or "General Consultation",
            symptoms_text=payload.symptoms_text or "General consultation requested",
            symptom_duration=payload.symptom_duration,
            additional_notes=payload.additional_notes,
            reviewed_by_doctor=False
        )
        db.add(initial_symptoms)

    # Optional initial appointment requested during registration
    created_appointment = None
    if payload.appointment_date and payload.preferred_time_slot:
        provider = db.query(Provider).first()
        created_appointment = Appointment(
            patient_id=new_patient.id,
            provider_id=provider.id if provider else 1,
            appointment_date=payload.appointment_date,
            time_slot=payload.preferred_time_slot,
            status="Scheduled",
            confirmation_status="Unconfirmed",
            estimated_duration_min=12,
            administrative_notes=f"Requested during patient registration. Reason: {payload.main_reason or 'Consultation'}"
        )
        db.add(created_appointment)

    # Create User account for immediate login
    clean_username = f"pat_{new_dummy_id.lower().replace('-', '_')}"
    user = User(
        username=clean_username,
        full_name=new_patient.full_name,
        role="Patient",
        email=new_patient.email,
        contact_number=new_patient.contact_number,
        patient_id=new_patient.id,
        password_hash=hash_password("demo123")
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": f"Patient registration successful. Your Patient ID is {new_dummy_id}.",
        "patient": new_patient,
        "user": user,
        "appointment": created_appointment
    }



@router.post("/returning-lookup", response_model=UserResponse)
def lookup_returning_patient(payload: ReturningPatientLogin, db: Session = Depends(get_db)):
    """Look up returning patient by Patient ID or Contact Number."""
    query_str = payload.identifier.strip()
    patient = db.query(Patient).filter(
        or_(
            Patient.dummy_patient_id == query_str.upper(),
            Patient.contact_number == query_str
        )
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient found matching '{query_str}'. Please check your ID or phone number."
        )

    user = db.query(User).filter(User.patient_id == patient.id).first()
    if not user:
        user = User(
            username=f"pat_{patient.dummy_patient_id.lower().replace('-', '_')}",
            full_name=patient.full_name,
            role="Patient",
            email=patient.email,
            contact_number=patient.contact_number,
            patient_id=patient.id,
            password_hash=hash_password("demo123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.get("/demo-users", response_model=List[UserResponse])
def get_demo_users(db: Session = Depends(get_db)):
    """Returns sample users for one-click demo login cards."""
    return db.query(User).filter(
        User.username.in_(["doctor_arun", "doctor_sneha", "staff_reception", "patient_rajesh", "patient_priya"])
    ).all()

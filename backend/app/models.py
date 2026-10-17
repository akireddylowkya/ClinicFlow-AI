import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(30), nullable=False) # 'Doctor', 'Staff', 'Patient'
    password_hash = Column(String(200), nullable=True) # Demo hashed / plain fallback
    email = Column(String(120), nullable=True)
    contact_number = Column(String(30), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient")
    provider = relationship("Provider")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    dummy_patient_id = Column(String(50), unique=True, index=True)
    full_name = Column(String(120), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), default="Other")
    contact_number = Column(String(20), nullable=True, index=True)
    preferred_language = Column(String(50), default="English")
    email = Column(String(120), nullable=True)
    is_returning = Column(Boolean, default=False)
    main_complaint = Column(String(250), nullable=True)
    symptom_duration = Column(String(50), nullable=True)
    registration_date = Column(Date, default=datetime.date.today)
    medical_history_summary = Column(Text, nullable=True)
    allergies = Column(String(200), default="None reported")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    queue_entries = relationship("QueueEntry", back_populates="patient", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    follow_up_tasks = relationship("FollowUpTask", back_populates="patient", cascade="all, delete-orphan")
    symptoms = relationship("SymptomSubmission", back_populates="patient", cascade="all, delete-orphan")
    documents = relationship("MedicalDocument", back_populates="patient", cascade="all, delete-orphan")
    medicine_requests = relationship("MedicineRequest", back_populates="patient", cascade="all, delete-orphan")


class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    specialization = Column(String(100), default="General Medicine")
    qualification = Column(String(100), default="MBBS, MD")
    reg_number = Column(String(50), default="KMC-48291")
    room_number = Column(String(20), default="OPD-1")
    is_available = Column(Boolean, default=True)
    average_service_duration_min = Column(Integer, default=12)
    current_status = Column(String(50), default="Available") # Available, In Consultation, On Break

    appointments = relationship("Appointment", back_populates="provider")
    queue_entries = relationship("QueueEntry", back_populates="provider")
    visits = relationship("Visit", back_populates="provider")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    appointment_date = Column(Date, nullable=False, index=True)
    time_slot = Column(String(30), nullable=False) # e.g. "09:30 AM"
    status = Column(String(30), default="Scheduled") # Scheduled, Confirmed, Arrived, Completed, Cancelled, Rescheduled
    confirmation_status = Column(String(30), default="Unconfirmed") # Confirmed, Unconfirmed, Reminder Sent
    estimated_duration_min = Column(Integer, default=12)
    administrative_notes = Column(Text, nullable=True)
    reminder_24h_sent = Column(Boolean, default=False)
    reminder_30m_sent = Column(Boolean, default=False)
    no_show_risk_level = Column(String(20), default="Low") # Low, Medium, High
    no_show_risk_score = Column(Float, default=0.15)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    provider = relationship("Provider", back_populates="appointments")
    queue_entry = relationship("QueueEntry", back_populates="appointment", uselist=False)


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(20), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    arrival_time = Column(DateTime, default=datetime.datetime.utcnow)
    service_start_time = Column(DateTime, nullable=True)
    service_end_time = Column(DateTime, nullable=True)
    queue_position = Column(Integer, default=1)
    status = Column(String(30), default="Waiting") # Waiting, In Consultation, Completed, Cancelled
    priority = Column(String(30), default="Normal") # Normal, Senior Citizen, Emergency / Priority
    estimated_service_duration = Column(Integer, default=12) # minutes
    estimated_waiting_time = Column(Integer, default=0) # calculated minutes
    notes = Column(String(200), nullable=True)

    patient = relationship("Patient", back_populates="queue_entries")
    provider = relationship("Provider", back_populates="queue_entries")
    appointment = relationship("Appointment", back_populates="queue_entry")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    visit_date = Column(DateTime, default=datetime.datetime.utcnow)
    chief_complaint = Column(String(250), nullable=False)
    diagnosis = Column(String(250), nullable=False)
    clinical_notes = Column(Text, nullable=True)
    vitals = Column(String(100), default="BP: 120/80, Pulse: 72, Temp: 98.4 F")
    follow_up_instructions = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="visits")
    provider = relationship("Provider", back_populates="visits")
    prescription = relationship("Prescription", back_populates="visit", uselist=False)
    follow_up_tasks = relationship("FollowUpTask", back_populates="visit")


class SymptomSubmission(Base):
    __tablename__ = "symptom_submissions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)
    main_reason = Column(String(250), nullable=False)
    symptoms_text = Column(Text, nullable=False)
    symptom_duration = Column(String(50), nullable=True)
    additional_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_by_doctor = Column(Boolean, default=False)
    doctor_notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="symptoms")
    appointment = relationship("Appointment")


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    title = Column(String(150), nullable=False)
    category = Column(String(50), default="Diagnostic Report") # Previous Prescription, Laboratory Report, Diagnostic Report, Discharge Summary, Other
    original_filename = Column(String(250), nullable=False)
    file_path = Column(String(300), nullable=False)
    file_size = Column(Integer, default=0) # Bytes
    file_type = Column(String(80), default="application/pdf") # application/pdf, image/jpeg, image/png
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="documents")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    status = Column(String(30), default="Draft") # Draft, Finalised
    finalisation_time = Column(DateTime, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    patient_friendly_explanation = Column(Text, nullable=True) # Plain language guide
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    visit = relationship("Visit", back_populates="prescription")
    patient = relationship("Patient", back_populates="prescriptions")
    provider = relationship("Provider")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicine_catalogue.id"), nullable=True)
    medicine_name = Column(String(120), nullable=False)
    strength = Column(String(50), default="")
    dosage = Column(String(50), default="1 tablet") # e.g. "1 tab", "5 ml"
    frequency = Column(String(50), default="1-0-1") # e.g. "1-0-1 (Morning & Night)", "Once daily"
    duration = Column(String(50), default="5 days") # e.g. "5 days"
    route = Column(String(50), default="Oral") # Oral, Topical, Inhalation
    instructions = Column(String(200), default="After meals with water")

    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("MedicineCatalogue")


class MedicineCatalogue(Base):
    __tablename__ = "medicine_catalogue"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True) # e.g. MED-01
    name = Column(String(120), nullable=False, index=True)
    generic_name = Column(String(150), nullable=False)
    strength_formulation = Column(String(60), nullable=False) # e.g. "650mg Tablet"
    category = Column(String(60), default="General") # Antibiotic, Analgesic, Antipyretic, etc.
    prescription_required = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    unit_price = Column(Float, default=10.0) # INR
    instructions_guide = Column(Text, nullable=True)

    batches = relationship("InventoryBatch", back_populates="medicine", cascade="all, delete-orphan")


class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicine_catalogue.id"), nullable=False)
    batch_number = Column(String(50), nullable=False, index=True)
    expiry_date = Column(Date, nullable=False, index=True)
    available_quantity = Column(Integer, default=0)
    initial_quantity = Column(Integer, default=0)
    reorder_threshold = Column(Integer, default=25)
    purchase_price = Column(Float, default=5.0)
    mrp = Column(Float, default=10.0)
    status = Column(String(30), default="Active") # Active, Expiring Soon, Expired, Out of Stock
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    medicine = relationship("MedicineCatalogue", back_populates="batches")
    movements = relationship("StockMovement", back_populates="batch", cascade="all, delete-orphan")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=False)
    movement_type = Column(String(30), nullable=False) # Restock, Dispensed, Adjusted, Expired Disposal
    quantity = Column(Integer, nullable=False) # Positive or negative
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reason = Column(String(200), nullable=True)
    performed_by = Column(String(100), default="Staff")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    batch = relationship("InventoryBatch", back_populates="movements")


class MedicineRequest(Base):
    __tablename__ = "medicine_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_reference = Column(String(30), unique=True, index=True) # e.g. REQ-8021
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient_name = Column(String(120), nullable=False)
    medicine_name = Column(String(120), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicine_catalogue.id"), nullable=True)
    requested_quantity = Column(Integer, default=10)
    # Statuses: Pending Review, Confirmed for Collection, Ready for Collection, Collected, Unavailable, Cancelled
    status = Column(String(40), default="Pending Review")
    collection_instructions = Column(Text, nullable=True)
    staff_notes = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    dispensed_batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="medicine_requests")
    medicine = relationship("MedicineCatalogue")


class FollowUpTask(Base):
    __tablename__ = "follow_up_tasks"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)
    task_type = Column(String(100), nullable=False) # e.g. "Follow-up Consultation", "Check HbA1c Report"
    due_date = Column(Date, nullable=False, index=True)
    status = Column(String(30), default="Pending") # Pending, Completed, Overdue, Cancelled
    responsible_staff = Column(String(100), default="Receptionist")
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="follow_up_tasks")
    visit = relationship("Visit", back_populates="follow_up_tasks")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_type = Column(String(30), default="Patient") # Patient, Staff
    recipient_name = Column(String(120), nullable=False)
    recipient_phone = Column(String(20), nullable=True)
    channel = Column(String(50), default="In-App Simulation") # In-App Simulation
    message_type = Column(String(50), default="Reminder") # Reminder 24h, Reminder 30m, Queue Update, Stock Alert, Medicine Request
    content = Column(Text, nullable=False)
    status = Column(String(30), default="Delivered") # Delivered, Read, Action Taken
    action_taken = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ServiceDurationRecord(Base):
    __tablename__ = "service_duration_records"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    actual_duration_min = Column(Integer, nullable=False)
    visit_type = Column(String(50), default="General Consultation")
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)


class ClinicSettings(Base):
    __tablename__ = "clinic_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(50), unique=True, index=True)
    setting_value = Column(Text, nullable=False)
    description = Column(String(200), nullable=True)

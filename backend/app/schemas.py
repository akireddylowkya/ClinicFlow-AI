from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
import datetime

# --- Auth & Users ---
class UserLogin(BaseModel):
    username: str
    password: Optional[str] = "demo123"
    role: str = "Doctor" # 'Doctor', 'Staff', 'Patient'

class ReturningPatientLogin(BaseModel):
    identifier: str # dummy_patient_id or contact_number

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    contact_number: Optional[str] = None
    patient_id: Optional[int] = None
    provider_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Patients ---
class PatientBase(BaseModel):
    full_name: str
    age: int
    gender: str = "Other"
    contact_number: Optional[str] = None
    preferred_language: str = "English"
    email: Optional[str] = None
    is_returning: bool = False
    main_complaint: Optional[str] = None
    symptom_duration: Optional[str] = None
    medical_history_summary: Optional[str] = None
    allergies: Optional[str] = "None reported"

class PatientCreate(PatientBase):
    pass

class PatientRegistrationCreate(BaseModel):
    full_name: str
    age: int
    gender: str = "Other"
    contact_number: Optional[str] = None
    preferred_language: str = "English"
    email: Optional[str] = None
    is_returning: bool = False
    main_reason: Optional[str] = "General Consultation"
    symptoms_text: Optional[str] = ""
    symptom_duration: Optional[str] = None
    additional_notes: Optional[str] = None
    medical_history_summary: Optional[str] = None
    allergies: Optional[str] = "None reported"
    appointment_date: Optional[datetime.date] = None
    preferred_time_slot: Optional[str] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    preferred_language: Optional[str] = None
    email: Optional[str] = None
    medical_history_summary: Optional[str] = None
    allergies: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    dummy_patient_id: str
    registration_date: datetime.date
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Symptoms ---
class SymptomSubmissionCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    visit_id: Optional[int] = None
    main_reason: str
    symptoms_text: str
    symptom_duration: Optional[str] = None
    additional_notes: Optional[str] = None

class SymptomSubmissionResponse(BaseModel):
    id: int
    patient_id: int
    appointment_id: Optional[int] = None
    visit_id: Optional[int] = None
    main_reason: str
    symptoms_text: str
    symptom_duration: Optional[str] = None
    additional_notes: Optional[str] = None
    submitted_at: datetime.datetime
    reviewed_by_doctor: bool
    doctor_notes: Optional[str] = None

    class Config:
        from_attributes = True

# --- Medical Documents ---
class MedicalDocumentResponse(BaseModel):
    id: int
    patient_id: int
    title: str
    category: str
    original_filename: str
    file_path: str
    file_size: int
    file_type: str
    upload_date: datetime.datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True

# --- Providers ---
class ProviderBase(BaseModel):
    name: str
    specialization: str = "General Medicine"
    qualification: str = "MBBS, MD"
    reg_number: str = "KMC-48291"
    room_number: str = "OPD-1"
    is_available: bool = True
    average_service_duration_min: int = 12
    current_status: str = "Available"

class ProviderCreate(ProviderBase):
    pass

class ProviderResponse(ProviderBase):
    id: int

    class Config:
        from_attributes = True

# --- Appointments ---
class AppointmentBase(BaseModel):
    patient_id: int
    provider_id: int
    appointment_date: datetime.date
    time_slot: str
    estimated_duration_min: int = 12
    administrative_notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    provider_id: Optional[int] = None
    appointment_date: Optional[datetime.date] = None
    time_slot: Optional[str] = None
    status: Optional[str] = None
    confirmation_status: Optional[str] = None
    administrative_notes: Optional[str] = None

class AppointmentReschedule(BaseModel):
    new_date: datetime.date
    new_time_slot: str
    reason: Optional[str] = "Patient requested reschedule"

class AppointmentResponse(AppointmentBase):
    id: int
    status: str
    confirmation_status: str
    reminder_24h_sent: bool
    reminder_30m_sent: bool
    no_show_risk_level: str
    no_show_risk_score: float
    created_at: datetime.datetime
    patient: Optional[PatientResponse] = None
    provider: Optional[ProviderResponse] = None

    class Config:
        from_attributes = True

# --- Queue ---
class QueueEntryBase(BaseModel):
    patient_id: int
    provider_id: int
    appointment_id: Optional[int] = None
    priority: str = "Normal"
    notes: Optional[str] = None

class QueueEntryCreate(QueueEntryBase):
    pass

class QueueStatusUpdate(BaseModel):
    status: str # Waiting, In Consultation, Completed, Cancelled
    notes: Optional[str] = None

class QueuePriorityUpdate(BaseModel):
    priority: str # Normal, Senior Citizen, Emergency / Priority

class QueueEntryResponse(BaseModel):
    id: int
    token_number: str
    patient_id: int
    provider_id: int
    appointment_id: Optional[int] = None
    arrival_time: datetime.datetime
    service_start_time: Optional[datetime.datetime] = None
    service_end_time: Optional[datetime.datetime] = None
    queue_position: int
    status: str
    priority: str
    estimated_service_duration: int
    estimated_waiting_time: int
    notes: Optional[str] = None
    patient: Optional[PatientResponse] = None
    provider: Optional[ProviderResponse] = None

    class Config:
        from_attributes = True

# --- Prescriptions ---
class PrescriptionItemBase(BaseModel):
    medicine_id: Optional[int] = None
    medicine_name: str
    strength: str = ""
    dosage: str = "1 tablet"
    frequency: str = "1-0-1"
    duration: str = "5 days"
    route: str = "Oral"
    instructions: str = "After meals with water"

class PrescriptionItemCreate(PrescriptionItemBase):
    pass

class PrescriptionItemResponse(PrescriptionItemBase):
    id: int
    prescription_id: int

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    patient_id: int
    provider_id: int
    visit_id: Optional[int] = None
    doctor_notes: Optional[str] = None
    items: List[PrescriptionItemCreate]

class PrescriptionFinalize(BaseModel):
    doctor_notes: Optional[str] = None
    patient_friendly_explanation: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    visit_id: Optional[int] = None
    patient_id: int
    provider_id: int
    status: str
    finalisation_time: Optional[datetime.datetime] = None
    doctor_notes: Optional[str] = None
    patient_friendly_explanation: Optional[str] = None
    created_at: datetime.datetime
    items: List[PrescriptionItemResponse] = []
    patient: Optional[PatientResponse] = None
    provider: Optional[ProviderResponse] = None

    class Config:
        from_attributes = True

# --- Visits ---
class VisitCreate(BaseModel):
    patient_id: int
    provider_id: int
    appointment_id: Optional[int] = None
    chief_complaint: str
    diagnosis: str
    clinical_notes: Optional[str] = None
    vitals: Optional[str] = "BP: 120/80, Pulse: 72, Temp: 98.4 F"
    follow_up_instructions: Optional[str] = None
    follow_up_date: Optional[datetime.date] = None

class VisitResponse(BaseModel):
    id: int
    patient_id: int
    provider_id: int
    appointment_id: Optional[int] = None
    visit_date: datetime.datetime
    chief_complaint: str
    diagnosis: str
    clinical_notes: Optional[str] = None
    vitals: str
    follow_up_instructions: Optional[str] = None
    follow_up_date: Optional[datetime.date] = None
    created_at: datetime.datetime
    prescription: Optional[PrescriptionResponse] = None
    provider: Optional[ProviderResponse] = None

    class Config:
        from_attributes = True

# --- Inventory & Catalogue ---
class MedicineCatalogueBase(BaseModel):
    code: str
    name: str
    generic_name: str
    strength_formulation: str
    category: str = "General"
    prescription_required: bool = True
    is_active: bool = True
    unit_price: float = 10.0
    instructions_guide: Optional[str] = None

    class Config:
        from_attributes = True

class MedicineCatalogueCreate(MedicineCatalogueBase):
    pass

class MedicineCatalogueResponse(MedicineCatalogueBase):
    id: int
    total_stock: int = 0
    batches_count: int = 0
    has_low_stock: bool = False
    has_expired_batches: bool = False

    class Config:
        from_attributes = True

class InventoryBatchBase(BaseModel):
    medicine_id: int
    batch_number: str
    expiry_date: datetime.date
    available_quantity: int
    initial_quantity: int
    reorder_threshold: int = 25
    purchase_price: float = 5.0
    mrp: float = 10.0

    class Config:
        from_attributes = True

class InventoryBatchCreate(InventoryBatchBase):
    pass

class StockMovementResponse(BaseModel):
    id: int
    batch_id: int
    movement_type: str
    quantity: int
    previous_quantity: int
    new_quantity: int
    reason: Optional[str] = None
    performed_by: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class InventoryBatchResponse(InventoryBatchBase):
    id: int
    status: str
    created_at: datetime.datetime
    medicine: Optional[MedicineCatalogueBase] = None
    is_expired: bool = False
    is_expiring_soon: bool = False
    days_to_expiry: int = 0

    class Config:
        from_attributes = True

class StockDispenseRequest(BaseModel):
    batch_id: int
    quantity: int
    patient_id: Optional[int] = None
    prescription_id: Optional[int] = None
    reason: Optional[str] = "Prescription Dispensing"
    performed_by: str = "Staff"

class StockRestockRequest(BaseModel):
    batch_id: int
    quantity: int
    reason: Optional[str] = "Routine Inventory Restock"
    performed_by: str = "Staff"

# --- Medicine Requests with Complete Collection Workflow ---
class MedicineRequestCreate(BaseModel):
    patient_id: int
    patient_name: str
    medicine_name: str
    medicine_id: Optional[int] = None
    requested_quantity: int = 10
    prescription_id: Optional[int] = None
    notes: Optional[str] = None

class MedicineRequestUpdateStatus(BaseModel):
    status: str # 'Pending Review', 'Confirmed for Collection', 'Ready for Collection', 'Collected', 'Unavailable', 'Cancelled'
    collection_instructions: Optional[str] = None
    staff_notes: Optional[str] = None
    dispensed_batch_id: Optional[int] = None
    deduct_stock: bool = False

class MedicineRequestResponse(BaseModel):
    id: int
    request_reference: Optional[str] = None
    patient_id: int
    patient_name: str
    medicine_name: str
    medicine_id: Optional[int] = None
    requested_quantity: int
    status: str
    collection_instructions: Optional[str] = None
    staff_notes: Optional[str] = None
    notes: Optional[str] = None
    prescription_id: Optional[int] = None
    dispensed_batch_id: Optional[int] = None
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    collection_point: Optional[str] = None
    opening_hours: Optional[str] = None
    collection_notice: Optional[str] = None
    collection_window: Optional[str] = None

    class Config:
        from_attributes = True


# --- Follow-Up Tasks ---
class FollowUpTaskBase(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    task_type: str
    due_date: datetime.date
    responsible_staff: str = "Receptionist"
    notes: Optional[str] = None

class FollowUpTaskCreate(FollowUpTaskBase):
    pass

class FollowUpTaskUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    responsible_staff: Optional[str] = None

class FollowUpTaskResponse(FollowUpTaskBase):
    id: int
    status: str
    completed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    patient: Optional[PatientResponse] = None

    class Config:
        from_attributes = True

# --- Notifications ---
class NotificationLogResponse(BaseModel):
    id: int
    recipient_type: str
    recipient_name: str
    recipient_phone: Optional[str] = None
    channel: str
    message_type: str
    content: str
    status: str
    action_taken: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class SimulateReminderRequest(BaseModel):
    appointment_id: int
    reminder_type: str = "30m" # 30m or 24h

# --- AI & Intelligence Schemas ---
class CongestionForecastSlot(BaseModel):
    time_window: str
    forecast_time: str
    expected_patient_arrivals: int
    projected_queue_length_min: int
    projected_queue_length_max: int
    projected_wait_min: int
    projected_wait_max: int
    congestion_risk: str
    confidence_level: str
    contributing_factors: List[str]
    actionable_recommendations: List[str]

class CongestionForecastResponse(BaseModel):
    generated_at: str
    baseline_active_providers: int
    baseline_queue_count: int
    baseline_avg_service_min: int
    slots: List[CongestionForecastSlot]
    model_type: str
    assumptions: List[str]
    limitations: str

class WhatIfSimulationRequest(BaseModel):
    extra_arrivals: int = 4
    service_duration_adjustment_min: int = 0
    active_providers_count: int = 2
    simulation_duration_minutes: int = 60

class WhatIfSimulationResponse(BaseModel):
    baseline_summary: Dict[str, Any]
    simulated_summary: Dict[str, Any]
    timeline_comparison: List[Dict[str, Any]]
    recommendations: List[str]
    assumptions: List[str]

class NoShowPredictionDetail(BaseModel):
    appointment_id: int
    patient_name: str
    time_slot: str
    lead_time_days: int
    previous_no_shows: int
    confirmation_status: str
    risk_level: str
    risk_probability: float
    top_factors: List[str]
    suggested_action: str

class NoShowModelMetrics(BaseModel):
    model_name: str
    validation_accuracy: float
    precision: float
    recall: float
    f1_score: float
    total_training_records: int
    status: str

class NoShowAnalysisResponse(BaseModel):
    model_metrics: NoShowModelMetrics
    high_risk_appointments: List[NoShowPredictionDetail]
    summary: Dict[str, int]

class InventoryDemandPrediction(BaseModel):
    medicine_id: int
    medicine_name: str
    current_stock: int
    avg_daily_consumption: float
    predicted_7day_demand: int
    projected_stockout_days: int
    status: str
    recommended_order_quantity: int

class InventoryForecastResponse(BaseModel):
    predictions: List[InventoryDemandPrediction]
    total_items_analyzed: int
    at_risk_count: int
    assumptions: List[str]

# --- Dashboard Overview ---
class DashboardMetricsResponse(BaseModel):
    appointments_today: int
    patients_waiting: int
    patients_in_consultation: int
    completed_consultations: int
    avg_actual_service_duration_min: float
    avg_estimated_wait_time_min: int
    upcoming_appointments_count: int
    appointments_awaiting_confirmation: int
    medicines_running_low_count: int
    medicine_batches_nearing_expiry_count: int
    expired_batches_count: int
    pending_follow_ups_count: int
    predicted_congestion_next_hour: str
    hourly_arrival_chart: List[Dict[str, Any]]
    live_queue_preview: List[QueueEntryResponse]
    medicine_alerts: List[Dict[str, Any]]
    follow_up_tasks_preview: List[FollowUpTaskResponse]
    ai_insights: List[Dict[str, Any]]

# --- Patient Portal Specific Overview ---
class PatientPortalOverviewResponse(BaseModel):
    patient: PatientResponse
    upcoming_appointment: Optional[AppointmentResponse] = None
    current_queue_entry: Optional[Dict[str, Any]] = None
    latest_visit: Optional[VisitResponse] = None
    finalised_prescriptions_count: int = 0
    active_medicine_requests_count: int = 0
    pending_follow_ups_count: int = 0
    documents_count: int = 0
    recent_prescription: Optional[PrescriptionResponse] = None
    recent_medicine_request: Optional[MedicineRequestResponse] = None
    next_follow_up: Optional[FollowUpTaskResponse] = None

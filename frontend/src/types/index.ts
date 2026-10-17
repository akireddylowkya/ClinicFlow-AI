export type UserRole = 'Doctor' | 'Staff' | 'Patient';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  email?: string;
  contact_number?: string;
  patient_id?: number;
  provider_id?: number;
}

export interface Patient {
  id: number;
  dummy_patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  contact_number?: string;
  preferred_language: string;
  email?: string;
  is_returning?: boolean;
  main_complaint?: string;
  symptom_duration?: string;
  registration_date: string;
  medical_history_summary?: string;
  allergies?: string;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: number;
  name: string;
  specialization: string;
  qualification: string;
  reg_number: string;
  room_number: string;
  is_available: boolean;
  average_service_duration_min: number;
  current_status: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  provider_id: number;
  appointment_date: string;
  time_slot: string;
  status: 'Scheduled' | 'Confirmed' | 'Arrived' | 'Completed' | 'Cancelled' | 'Rescheduled';
  confirmation_status: 'Confirmed' | 'Unconfirmed' | 'Reminder Sent';
  estimated_duration_min: number;
  administrative_notes?: string;
  reminder_24h_sent: boolean;
  reminder_30m_sent: boolean;
  no_show_risk_level: 'Low' | 'Medium' | 'High';
  no_show_risk_score: number;
  created_at: string;
  patient?: Patient;
  provider?: Provider;
}

export interface QueueEntry {
  id: number;
  token_number: string;
  patient_id: number;
  provider_id: number;
  appointment_id?: number;
  arrival_time: string;
  service_start_time?: string;
  service_end_time?: string;
  queue_position: number;
  status: 'Waiting' | 'In Consultation' | 'Completed' | 'Cancelled';
  priority: 'Normal' | 'Senior Citizen' | 'Emergency / Priority';
  estimated_service_duration: number;
  estimated_waiting_time: number;
  notes?: string;
  patient?: Patient;
  provider?: Provider;
}

export interface PrescriptionItem {
  id?: number;
  prescription_id?: number;
  medicine_id?: number;
  medicine_name: string;
  strength?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions: string;
}

export interface Prescription {
  id: number;
  visit_id?: number;
  patient_id: number;
  provider_id: number;
  status: 'Draft' | 'Finalised';
  finalisation_time?: string;
  doctor_notes?: string;
  patient_friendly_explanation?: string;
  created_at: string;
  items: PrescriptionItem[];
  patient?: Patient;
  provider?: Provider;
}

export interface Visit {
  id: number;
  patient_id: number;
  provider_id: number;
  appointment_id?: number;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  clinical_notes?: string;
  vitals: string;
  follow_up_instructions?: string;
  follow_up_date?: string;
  created_at: string;
  prescription?: Prescription;
  provider?: Provider;
}

export interface SymptomSubmission {
  id: number;
  patient_id: number;
  appointment_id?: number;
  visit_id?: number;
  main_reason: string;
  symptoms_text: string;
  symptom_duration?: string;
  additional_notes?: string;
  submitted_at: string;
  reviewed_by_doctor: boolean;
  doctor_notes?: string;
}

export interface MedicalDocument {
  id: number;
  patient_id: number;
  title: string;
  category: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  notes?: string;
}

export interface MedicineCatalogue {
  id: number;
  code: string;
  name: string;
  generic_name: string;
  strength_formulation: string;
  category: string;
  prescription_required: boolean;
  is_active: boolean;
  unit_price: number;
  instructions_guide?: string;
  total_stock: number;
  batches_count: number;
  has_low_stock: boolean;
  has_expired_batches: boolean;
}

export interface InventoryBatch {
  id: number;
  medicine_id: number;
  batch_number: string;
  expiry_date: string;
  available_quantity: number;
  initial_quantity: number;
  reorder_threshold: number;
  purchase_price: number;
  mrp: number;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Low Stock';
  created_at: string;
  medicine?: MedicineCatalogue;
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_to_expiry: number;
}

export interface MedicineRequest {
  id: number;
  request_reference?: string;
  patient_id: number;
  patient_name: string;
  medicine_name: string;
  medicine_id?: number;
  requested_quantity: number;
  status: 'Pending Review' | 'Confirmed for Collection' | 'Ready for Collection' | 'Collected' | 'Unavailable' | 'Cancelled';
  collection_instructions?: string;
  staff_notes?: string;
  notes?: string;
  prescription_id?: number;
  dispensed_batch_id?: number;
  created_at: string;
  updated_at?: string;
  clinic_name?: string;
  clinic_address?: string;
  collection_point?: string;
  opening_hours?: string;
  collection_notice?: string;
  collection_window?: string;
}

export interface ClinicSettings {
  clinic_name: string;
  clinic_tagline?: string;
  clinic_address: string;
  clinic_phone?: string;
  clinic_email?: string;
  collection_point: string;
  collection_instructions: string;
  opening_hours: string;
  default_service_duration?: string;
  low_stock_threshold?: string;
  expiry_warning_days?: string;
}


export interface FollowUpTask {
  id: number;
  patient_id: number;
  visit_id?: number;
  task_type: string;
  due_date: string;
  status: 'Pending' | 'Completed' | 'Overdue' | 'Cancelled';
  responsible_staff: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
  patient?: Patient;
}

export interface PatientPortalOverview {
  patient: Patient;
  upcoming_appointment?: Appointment;
  current_queue_entry?: {
    token_number: string;
    status: string;
    queue_position: number;
    estimated_waiting_time: number;
    priority: string;
    arrival_time?: string;
  };
  latest_visit?: Visit;
  finalised_prescriptions_count: number;
  active_medicine_requests_count: number;
  pending_follow_ups_count: number;
  documents_count: number;
  recent_prescription?: Prescription;
  recent_medicine_request?: MedicineRequest;
  next_follow_up?: FollowUpTask;
}

export interface DashboardMetrics {
  appointments_today: number;
  patients_waiting: number;
  patients_in_consultation: number;
  completed_consultations: number;
  avg_actual_service_duration_min: number;
  avg_estimated_wait_time_min: number;
  upcoming_appointments_count: number;
  appointments_awaiting_confirmation: number;
  medicines_running_low_count: number;
  medicine_batches_nearing_expiry_count: number;
  expired_batches_count: number;
  pending_follow_ups_count: number;
  predicted_congestion_next_hour: string;
  hourly_arrival_chart: Array<{
    hour: string;
    scheduled: number;
    arrivals: number;
    completed: number;
  }>;
  live_queue_preview: QueueEntry[];
  medicine_alerts: Array<{
    type: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    action: string;
  }>;
  follow_up_tasks_preview: FollowUpTask[];
  ai_insights: Array<{
    category: string;
    level: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
}

export interface CongestionForecastSlot {
  time_window: string;
  forecast_time: string;
  expected_patient_arrivals: number;
  projected_queue_length_min: number;
  projected_queue_length_max: number;
  projected_wait_min: number;
  projected_wait_max: number;
  congestion_risk: 'Normal' | 'Moderate' | 'High' | 'Severe';
  confidence_level: string;
  contributing_factors: string[];
  actionable_recommendations: string[];
}

export interface CongestionForecastResponse {
  generated_at: string;
  baseline_active_providers: number;
  baseline_queue_count: number;
  baseline_avg_service_min: number;
  slots: CongestionForecastSlot[];
  model_type: string;
  assumptions: string[];
  limitations: string;
}

export interface WhatIfSimulationResult {
  baseline_summary: {
    active_providers: number;
    avg_service_duration_min: number;
    expected_arrivals: number;
    projected_end_queue: number;
    projected_avg_wait_min: number;
    status: string;
  };
  simulated_summary: {
    active_providers: number;
    avg_service_duration_min: number;
    expected_arrivals: number;
    projected_end_queue: number;
    projected_avg_wait_min: number;
    status: string;
  };
  timeline_comparison: Array<{
    minute_mark: string;
    baseline_queue: number;
    baseline_wait_min: number;
    simulated_queue: number;
    simulated_wait_min: number;
    difference_wait_min: number;
  }>;
  recommendations: string[];
  assumptions: string[];
}

export interface NoShowAnalysis {
  model_metrics: {
    model_name: string;
    validation_accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    total_training_records: number;
    status: string;
  };
  high_risk_appointments: Array<{
    appointment_id: number;
    patient_name: string;
    time_slot: string;
    lead_time_days: number;
    previous_no_shows: number;
    confirmation_status: string;
    risk_level: string;
    risk_probability: number;
    top_factors: string[];
    suggested_action: string;
  }>;
  summary: {
    High: number;
    Medium: number;
    Low: number;
  };
}

export interface InventoryDemandForecast {
  predictions: Array<{
    medicine_id: number;
    medicine_name: string;
    current_stock: number;
    avg_daily_consumption: number;
    predicted_7day_demand: number;
    projected_stockout_days: number;
    status: string;
    recommended_order_quantity: number;
  }>;
  total_items_analyzed: number;
  at_risk_count: number;
  assumptions: string[];
}

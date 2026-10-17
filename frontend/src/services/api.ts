import {
  DashboardMetrics, Patient, Appointment, QueueEntry,
  Prescription, Visit, MedicineCatalogue, InventoryBatch,
  FollowUpTask, CongestionForecastResponse, WhatIfSimulationResult,
  NoShowAnalysis, InventoryDemandForecast, MedicineRequest,
  User, SymptomSubmission, MedicalDocument, PatientPortalOverview,
  ClinicSettings
} from '../types';


const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMessage = `Error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) {
          errMessage = errorJson.detail;
        }
      } catch (_) {
        // use default error message
      }
      throw new Error(errMessage);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`API Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  // Auth & Roles
  login: (data: { username: string; role: string; password?: string }) =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  registerPatient: (data: any) =>
    request<{ status: string; message: string; patient: Patient; user: User }>('/auth/patient-register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  lookupReturningPatient: (identifier: string) =>
    request<User>('/auth/returning-lookup', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    }),
  getDemoUsers: () => request<User[]>('/auth/demo-users'),

  // Patient Portal
  getPatientPortalOverview: (patientId: number) =>
    request<PatientPortalOverview>(`/patient-portal/overview/${patientId}`),
  submitSymptoms: (data: {
    patient_id: number;
    main_reason: string;
    symptoms_text: string;
    symptom_duration?: string;
    additional_notes?: string;
    appointment_id?: number;
    visit_id?: number;
  }) => request<SymptomSubmission>('/patient-portal/symptoms', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getPatientSymptoms: (patientId: number) =>
    request<SymptomSubmission[]>(`/patient-portal/symptoms/${patientId}`),
  uploadMedicalDocument: async (formData: FormData): Promise<MedicalDocument> => {
    const res = await fetch(`${BASE_URL}/patient-portal/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      let msg = `Upload failed (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) msg = errJson.detail;
      } catch (_) {}
      throw new Error(msg);
    }
    return await res.json();
  },
  getPatientDocuments: (patientId: number) =>
    request<MedicalDocument[]>(`/patient-portal/documents/${patientId}`),
  getDocumentDownloadUrl: (docId: number) => `${BASE_URL}/patient-portal/documents/download/${docId}`,
  getPatientPrescriptions: (patientId: number) =>
    request<Prescription[]>(`/patient-portal/prescriptions/${patientId}`),
  getPatientVisits: (patientId: number) =>
    request<Visit[]>(`/patient-portal/visits/${patientId}`),
  getPatientFollowUps: (patientId: number) =>
    request<FollowUpTask[]>(`/patient-portal/followups/${patientId}`),
  getPatientMedicineRequests: (patientId: number) =>
    request<MedicineRequest[]>(`/patient-portal/medicine-requests/${patientId}`),
  submitPatientMedicineRequest: (params: {
    patient_id: number;
    medicine_name: string;
    requested_quantity?: number;
    prescription_id?: number;
    notes?: string;
  }) => {
    const url = `/patient-portal/medicine-requests?patient_id=${params.patient_id}&medicine_name=${encodeURIComponent(params.medicine_name)}&requested_quantity=${params.requested_quantity || 10}${params.prescription_id ? `&prescription_id=${params.prescription_id}` : ''}${params.notes ? `&notes=${encodeURIComponent(params.notes)}` : ''}`;
    return request<MedicineRequest>(url, { method: 'POST' });
  },

  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>('/dashboard/metrics'),

  // Patients
  getPatients: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Patient[]>(`/patients/${query}`);
  },
  createPatient: (data: Partial<Patient>) => request<Patient>('/patients/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePatient: (id: number, data: Partial<Patient>) => request<Patient>(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getPatientTimeline: (id: number) => request<{ patient: any; timeline: any[] }>(`/patients/${id}/timeline`),

  // Appointments
  getAppointments: (date?: string, status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return request<Appointment[]>(`/appointments/?${params.toString()}`);
  },
  createAppointment: (data: any) => request<Appointment>('/appointments/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  confirmAppointment: (id: number) => request<Appointment>(`/appointments/${id}/confirm`, {
    method: 'PUT'
  }),
  rescheduleAppointment: (id: number, data: { new_date: string; new_time_slot: string; reason?: string }) =>
    request<Appointment>(`/appointments/${id}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  cancelAppointment: (id: number, reason?: string) =>
    request<Appointment>(`/appointments/${id}/cancel?reason=${encodeURIComponent(reason || 'Patient cancelled')}`, {
      method: 'PUT'
    }),
  markPatientArrived: (id: number) => request<Appointment>(`/appointments/${id}/mark-arrived`, {
    method: 'POST'
  }),
  simulateReminder: (appointmentId: number, reminderType: '30m' | '24h') =>
    request<any>('/appointments/simulate-reminder', {
      method: 'POST',
      body: JSON.stringify({ appointment_id: appointmentId, reminder_type: reminderType })
    }),

  // Queue
  getQueue: (providerId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (providerId) params.append('provider_id', providerId.toString());
    if (status) params.append('status', status);
    return request<QueueEntry[]>(`/queue/?${params.toString()}`);
  },
  addPatientToQueue: (data: any) => request<QueueEntry>('/queue/token', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateQueueStatus: (id: number, status: string, notes?: string) =>
    request<QueueEntry>(`/queue/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    }),
  updateQueuePriority: (id: number, priority: string) =>
    request<QueueEntry>(`/queue/${id}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority })
    }),
  getPublicQueueDisplay: () => request<any>('/queue/public-display'),

  // Prescriptions & Visits
  getPrescriptions: (patientId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (status) params.append('status', status);
    return request<Prescription[]>(`/prescriptions/?${params.toString()}`);
  },
  getPrescription: (id: number) => request<Prescription>(`/prescriptions/${id}`),
  createPrescription: (data: any) => request<Prescription>('/prescriptions/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  finalizePrescription: (id: number, data: { doctor_notes?: string; patient_friendly_explanation?: string }) =>
    request<Prescription>(`/prescriptions/${id}/finalize`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  recordVisit: (data: any) => request<Visit>('/prescriptions/visits', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Inventory & Catalogue
  getCatalogue: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return request<MedicineCatalogue[]>(`/inventory/catalogue?${params.toString()}`);
  },
  addCatalogueMedicine: (data: any) => request<MedicineCatalogue>('/inventory/catalogue', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getInventoryBatches: (status?: string, medicineId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (medicineId) params.append('medicine_id', medicineId.toString());
    return request<InventoryBatch[]>(`/inventory/batches?${params.toString()}`);
  },
  addInventoryBatch: (data: any) => request<InventoryBatch>('/inventory/batches', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  dispenseStock: (data: { batch_id: number; quantity: number; patient_id?: number; reason?: string; performed_by?: string }) =>
    request<any>('/inventory/dispense', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  restockInventory: (data: { batch_id: number; quantity: number; reason?: string; performed_by?: string }) =>
    request<any>('/inventory/restock', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getMedicineRequests: () => request<MedicineRequest[]>('/inventory/requests'),
  createMedicineRequest: (data: any) => request<MedicineRequest>('/inventory/requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateMedicineRequestStatus: (id: number, data: {
    status: string;
    collection_instructions?: string;
    staff_notes?: string;
    dispensed_batch_id?: number;
    deduct_stock?: boolean;
  }) => request<MedicineRequest>(`/inventory/requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Follow-Ups
  getFollowUps: (status?: string, patientId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (patientId) params.append('patient_id', patientId.toString());
    return request<FollowUpTask[]>(`/followups/?${params.toString()}`);
  },
  createFollowUp: (data: any) => request<FollowUpTask>('/followups/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateFollowUpStatus: (id: number, data: { status?: string; notes?: string; responsible_staff?: string }) =>
    request<FollowUpTask>(`/followups/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // AI & Analytics
  getCongestionForecast: () => request<CongestionForecastResponse>('/ai/congestion-forecast'),
  runWhatIfSimulation: (data: {
    extra_arrivals: number;
    service_duration_adjustment_min: number;
    active_providers_count: number;
    simulation_duration_minutes?: number;
  }) => request<WhatIfSimulationResult>('/ai/what-if-simulation', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getNoShowAnalysis: () => request<NoShowAnalysis>('/ai/no-show-analysis'),
  getInventoryDemandForecast: () => request<InventoryDemandForecast>('/ai/inventory-demand-forecast'),
  // Clinic Settings
  getSettings: () => request<ClinicSettings>('/settings/'),
  updateSettings: (data: Partial<ClinicSettings>) => request<ClinicSettings>('/settings/', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Demo Controls
  resetDemoData: () => request<{ status: string; message: string }>('/demo/reset', {
    method: 'POST'
  }),
  advanceQueueStep: () => request<any>('/demo/advance-queue-step', {
    method: 'POST'
  }),
  simulatePeakArrivals: () => request<any>('/demo/simulate-peak-arrivals', {
    method: 'POST'
  })
};


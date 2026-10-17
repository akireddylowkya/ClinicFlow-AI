import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Patient, Appointment, Visit, Prescription, MedicalDocument, 
  MedicineCatalogue, MedicineRequest, FollowUpTask, PatientPortalOverview 
} from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  User, Calendar, Clock, FileText, FolderUp, Pill, 
  ClockAlert, Bell, CheckCircle2, AlertCircle, Download, 
  Upload, Search, Plus, MapPin, Printer, RefreshCw, XCircle, ShieldCheck
} from 'lucide-react';

export const PatientPortalPage: React.FC = () => {
  const { currentUser, activeTab, setActiveTab, refreshKey, triggerRefresh, showToast, clinicSettings } = useApp();

  const patientId = currentUser?.patient_id || 1;

  const [overview, setOverview] = useState<PatientPortalOverview | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [catalogue, setCatalogue] = useState<MedicineCatalogue[]>([]);
  const [medicineRequests, setMedicineRequests] = useState<MedicineRequest[]>([]);
  const [followups, setFollowups] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    age: 30,
    gender: 'Other',
    contact_number: '',
    preferred_language: 'English',
    allergies: '',
    medical_history_summary: ''
  });

  // Book Appointment
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookDate, setBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookTimeSlot, setBookTimeSlot] = useState('10:00 AM');
  const [bookReason, setBookReason] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('11:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('Schedule conflict');

  // Document Upload
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Laboratory Report');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Medicine Availability Request
  const [selectedMed, setSelectedMed] = useState<MedicineCatalogue | null>(null);
  const [medReqQuantity, setMedReqQuantity] = useState(10);
  const [medReqNotes, setMedReqNotes] = useState('Prescription refill');
  const [medSearch, setMedSearch] = useState('');
  const [submittingMedReq, setSubmittingMedReq] = useState(false);

  // Print Prescription
  const [printableRx, setPrintableRx] = useState<Prescription | null>(null);

  // Load Patient Portal Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getPatientPortalOverview(patientId),
      api.getAppointments(undefined, undefined, undefined),
      api.getPatientVisits(patientId),
      api.getPatientPrescriptions(patientId),
      api.getPatientDocuments(patientId),
      api.getCatalogue(undefined, medSearch),
      api.getPatientMedicineRequests(patientId),
      api.getPatientFollowUps(patientId)
    ])
      .then(([overviewData, allAppts, visitsData, rxData, docData, catData, reqData, followData]) => {
        if (!isMounted) return;
        setOverview(overviewData);
        setPatient(overviewData.patient);
        setAppointments(allAppts.filter(a => a.patient_id === patientId));
        setVisits(visitsData);
        setPrescriptions(rxData);
        setDocuments(docData);
        setCatalogue(catData);
        setMedicineRequests(reqData);
        setFollowups(followData);

        if (overviewData.patient) {
          setProfileForm({
            full_name: overviewData.patient.full_name,
            age: overviewData.patient.age,
            gender: overviewData.patient.gender,
            contact_number: overviewData.patient.contact_number || '',
            preferred_language: overviewData.patient.preferred_language,
            allergies: overviewData.patient.allergies || 'None reported',
            medical_history_summary: overviewData.patient.medical_history_summary || ''
          });
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to load patient data', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [patientId, refreshKey, medSearch]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    try {
      const updated = await api.updatePatient(patient.id, {
        full_name: profileForm.full_name,
        age: profileForm.age,
        gender: profileForm.gender,
        contact_number: profileForm.contact_number,
        preferred_language: profileForm.preferred_language,
        allergies: profileForm.allergies,
        medical_history_summary: profileForm.medical_history_summary
      });
      setPatient(updated);
      setProfileModalOpen(false);
      showToast('Profile updated successfully!', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Profile update failed', 'error');
    }
  };

  // Handle Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmittingBooking(true);
    try {
      await api.createAppointment({
        patient_id: patient.id,
        provider_id: 1, // Dr. Arun Deshmukh
        appointment_date: bookDate,
        time_slot: bookTimeSlot,
        administrative_notes: bookReason || 'Booked by patient online'
      });
      showToast(`Appointment requested for ${bookDate} at ${bookTimeSlot}!`, 'success');
      setBookModalOpen(false);
      setBookReason('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to request appointment', 'error');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Handle Confirm Appointment
  const handleConfirmAppointment = async (aptId: number) => {
    try {
      await api.confirmAppointment(aptId);
      showToast('Appointment confirmed! Status updated for clinic staff.', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm appointment', 'error');
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (aptId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.cancelAppointment(aptId, 'Cancelled by patient via portal');
      showToast('Appointment cancelled successfully.', 'info');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel appointment', 'error');
    }
  };

  // Handle Reschedule Appointment
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentId || !rescheduleDate) return;
    try {
      await api.rescheduleAppointment(selectedAppointmentId, {
        new_date: rescheduleDate,
        new_time_slot: rescheduleTimeSlot,
        reason: rescheduleReason
      });
      showToast('Appointment rescheduled successfully!', 'success');
      setRescheduleModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule appointment', 'error');
    }
  };

  // Simulate In-App Reminder
  const handleSimulateReminder = async (aptId: number, type: '30m' | '24h') => {
    try {
      const res = await api.simulateReminder(aptId, type);
      showToast(`Simulated in-app ${type} reminder received!`, 'info');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Reminder simulation failed', 'error');
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docTitle.trim() || !patient) {
      setUploadError('Please select a file and enter a title.');
      return;
    }

    // Validate size (< 10MB)
    if (docFile.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    // Validate extension
    const ext = docFile.name.substring(docFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      setUploadError('Unsupported file type. Please upload a PDF or image (JPG, PNG).');
      return;
    }

    setUploadingDoc(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('patient_id', patient.id.toString());
      formData.append('title', docTitle.trim());
      formData.append('category', docCategory);
      formData.append('notes', docNotes.trim());
      formData.append('file', docFile);

      await api.uploadMedicalDocument(formData);
      showToast('Medical document uploaded securely!', 'success');
      setDocTitle('');
      setDocNotes('');
      setDocFile(null);
      // Reset file input
      const fileInput = document.getElementById('patientDocInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      triggerRefresh();
    } catch (err: any) {
      setUploadError(err.message || 'Document upload failed. Please try again.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle Medicine Request
  const handleSubmitMedicineRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed || !patient) return;

    setSubmittingMedReq(true);
    try {
      await api.submitPatientMedicineRequest({
        patient_id: patient.id,
        medicine_name: `${selectedMed.name} (${selectedMed.strength_formulation})`,
        requested_quantity: medReqQuantity,
        notes: medReqNotes
      });
      showToast(`Medicine collection request submitted for ${selectedMed.name}!`, 'success');
      setSelectedMed(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Request failed', 'error');
    } finally {
      setSubmittingMedReq(false);
    }
  };

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case 'Confirmed':
      case 'Confirmed for Collection':
      case 'Ready for Collection':
        return 'success';
      case 'Arrived':
      case 'Collected':
      case 'Finalised':
        return 'primary';
      case 'Cancelled':
      case 'Unavailable':
        return 'danger';
      case 'Scheduled':
      case 'Pending':
      case 'Pending Review':
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
        Loading your patient records and portal...
      </div>
    );
  }

  // ================= VIEW SWITCHER =================
  return (
    <div className="space-y-6">
      {/* ================= 1. PATIENT DASHBOARD ================= */}
      {activeTab === 'patient_dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-teal-900 via-navy-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                  Welcome to Patient Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                  Hello, {patient?.full_name}!
                </h1>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <span>Patient ID: <span className="font-mono text-teal-200 font-bold">{patient?.dummy_patient_id}</span></span>
                  <span>•</span>
                  <span>{patient?.age} yrs, {patient?.gender}</span>
                  <span>•</span>
                  <span>{patient?.preferred_language}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors backdrop-blur-sm"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setBookModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-navy-950 transition-colors shadow-sm"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>

          {/* OPD Queue Status Strip (If currently waiting) */}
          {overview?.current_queue_entry && (
            <div className="bg-teal-50 border-2 border-teal-500 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-mono font-extrabold text-lg shadow-sm">
                  {overview.current_queue_entry.token_number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy-900">Your Live OPD Queue Token</span>
                    <Badge variant={overview.current_queue_entry.status === 'In Consultation' ? 'success' : 'primary'} size="sm">
                      {overview.current_queue_entry.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Position in line: <span className="font-bold text-navy-900">#{overview.current_queue_entry.queue_position}</span> • 
                    Approximate Wait: <span className="font-bold text-teal-800">~{overview.current_queue_entry.estimated_waiting_time} mins</span>
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-teal-800 bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                Please wait in the reception hall until your token is announced.
              </span>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveTab('patient_appointments')}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-teal-600 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-bold">{appointments.length}</span>
              </div>
              <h4 className="text-xs font-bold text-navy-900">Appointments</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Upcoming & history</p>
            </div>

            <div 
              onClick={() => setActiveTab('patient_prescriptions')}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <FileText className="w-5 h-5" />
                <span className="text-xs font-bold">{prescriptions.length}</span>
              </div>
              <h4 className="text-xs font-bold text-navy-900">Prescriptions</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Digital Rx & advice</p>
            </div>

            <div 
              onClick={() => setActiveTab('patient_documents')}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-sky-600 mb-2">
                <FolderUp className="w-5 h-5" />
                <span className="text-xs font-bold">{documents.length}</span>
              </div>
              <h4 className="text-xs font-bold text-navy-900">Documents</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Lab reports & files</p>
            </div>

            <div 
              onClick={() => setActiveTab('patient_medicine')}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-teal-700 mb-2">
                <Pill className="w-5 h-5" />
                <span className="text-xs font-bold">{medicineRequests.length}</span>
              </div>
              <h4 className="text-xs font-bold text-navy-900">Medicine Requests</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Check availability & pickup</p>
            </div>
          </div>

          {/* Upcoming Appointment Card */}
          {overview?.upcoming_appointment && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Next Upcoming Appointment
                  </h3>
                </div>
                <Badge variant={getStatusBadgeVariant(overview.upcoming_appointment.status)} size="sm">
                  {overview.upcoming_appointment.status}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <h4 className="text-sm font-bold text-navy-900">
                    Consultation with {overview.upcoming_appointment.provider?.name || 'Dr. Arun Deshmukh'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date: <span className="font-semibold text-slate-800">{new Date(overview.upcoming_appointment.appointment_date).toLocaleDateString()}</span> at <span className="font-semibold text-slate-800">{overview.upcoming_appointment.time_slot}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Room: {overview.upcoming_appointment.provider?.room_number || 'OPD-1'} • Confirmation: <span className="font-semibold text-teal-700">{overview.upcoming_appointment.confirmation_status}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {overview.upcoming_appointment.confirmation_status !== 'Confirmed' && (
                    <button
                      onClick={() => handleConfirmAppointment(overview.upcoming_appointment!.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      Confirm Visit
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedAppointmentId(overview.upcoming_appointment!.id);
                      setRescheduleDate(overview.upcoming_appointment!.appointment_date.toString());
                      setRescheduleModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(overview.upcoming_appointment!.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Working In-App Reminder Simulator */}
              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Test In-App Reminder:
                </span>
                <button
                  type="button"
                  onClick={() => handleSimulateReminder(overview.upcoming_appointment!.id, '30m')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                >
                  Trigger 30-min Reminder
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateReminder(overview.upcoming_appointment!.id, '24h')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                >
                  Trigger 24-hr Reminder
                </button>
              </div>
            </div>
          )}

          {/* Active Confirmed Medicine Request Card with Configured Location */}
          {overview?.recent_medicine_request && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Recent Medicine Collection Request ({overview.recent_medicine_request.request_reference})
                  </h3>
                </div>
                <Badge variant={getStatusBadgeVariant(overview.recent_medicine_request.status)} size="sm">
                  {overview.recent_medicine_request.status}
                </Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-900 text-sm">
                    {overview.recent_medicine_request.medicine_name}
                  </span>
                  <span className="font-mono text-slate-600">
                    Qty: {overview.recent_medicine_request.requested_quantity} units
                  </span>
                </div>

                {/* Collection Location Section (Requirement 6) */}
                {overview.recent_medicine_request.status === 'Confirmed for Collection' || 
                 overview.recent_medicine_request.status === 'Ready for Collection' ? (
                  <div className="mt-2 p-3.5 bg-teal-50/80 rounded-lg border border-teal-200 space-y-1.5 text-teal-900">
                    <div className="flex items-center gap-2 font-bold">
                      <MapPin className="w-4 h-4 text-teal-700" />
                      <span>Collection Location & Instructions:</span>
                    </div>
                    {overview.recent_medicine_request.collection_notice ? (
                      <p className="text-amber-800 font-semibold">
                        {overview.recent_medicine_request.collection_notice}
                      </p>
                    ) : (
                      <div className="space-y-0.5 text-xs text-slate-700">
                        <p><span className="font-semibold text-teal-900">Clinic:</span> {overview.recent_medicine_request.clinic_name || clinicSettings?.clinic_name}</p>
                        <p><span className="font-semibold text-teal-900">Address:</span> {overview.recent_medicine_request.clinic_address || clinicSettings?.clinic_address}</p>
                        <p><span className="font-semibold text-teal-900">Collection Point:</span> {overview.recent_medicine_request.collection_point || clinicSettings?.collection_point}</p>
                        <p><span className="font-semibold text-teal-900">Dispensary Hours:</span> {overview.recent_medicine_request.opening_hours || clinicSettings?.opening_hours}</p>
                        <p><span className="font-semibold text-teal-900">Instructions:</span> {overview.recent_medicine_request.collection_instructions}</p>
                      </div>
                    )}
                  </div>
                ) : overview.recent_medicine_request.status === 'Unavailable' ? (
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>This medication is currently unavailable. Please consult your doctor for an alternative prescription.</span>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">
                    Request submitted and awaiting staff review. Collection details will appear here once verified.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= 2. MY PROFILE ================= */}
      {activeTab === 'patient_profile' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                My Patient Profile
              </h2>
              <p className="text-xs text-slate-500">
                View and edit your personal details, language preferences, and reported medical history.
              </p>
            </div>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            >
              Edit Details
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Full Name</span>
              <span className="text-sm font-bold text-navy-900 mt-1 block">{patient?.full_name}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Patient ID</span>
              <span className="text-sm font-bold font-mono text-teal-800 mt-1 block">{patient?.dummy_patient_id}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Age & Gender</span>
              <span className="text-sm font-bold text-navy-900 mt-1 block">{patient?.age} years • {patient?.gender}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Contact Number</span>
              <span className="text-sm font-bold text-navy-900 mt-1 block">{patient?.contact_number || 'Not provided'}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Preferred Language</span>
              <span className="text-sm font-bold text-navy-900 mt-1 block">{patient?.preferred_language}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Known Allergies</span>
              <span className="text-sm font-bold text-rose-700 mt-1 block">{patient?.allergies || 'None reported'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
              Medical History Summary
            </span>
            <p className="text-slate-700 leading-relaxed">
              {patient?.medical_history_summary || 'No medical conditions noted in record.'}
            </p>
          </div>
        </div>
      )}

      {/* ================= 3. APPOINTMENTS ================= */}
      {activeTab === 'patient_appointments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                My Appointments
              </h2>
              <p className="text-xs text-slate-500">
                Book new consultations, confirm visits, or request rescheduling.
              </p>
            </div>

            <button
              onClick={() => setBookModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {appointments.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                You have no scheduled appointments. Click &quot;Book Appointment&quot; to request a slot.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Confirmation</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-bold text-navy-900">
                          {new Date(a.appointment_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {a.time_slot}
                        </td>
                        <td className="py-3.5 px-4">
                          {a.provider?.name || 'Dr. Arun Deshmukh'} ({a.provider?.room_number || 'OPD-1'})
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={getStatusBadgeVariant(a.status)} size="sm">
                            {a.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-teal-800">
                          {a.confirmation_status}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {a.administrative_notes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {a.status !== 'Cancelled' && a.status !== 'Completed' && (
                              <>
                                {a.confirmation_status !== 'Confirmed' && (
                                  <button
                                    onClick={() => handleConfirmAppointment(a.id)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  >
                                    Confirm
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedAppointmentId(a.id);
                                    setRescheduleDate(a.appointment_date.toString());
                                    setRescheduleModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => handleCancelAppointment(a.id)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 4. VISIT HISTORY ================= */}
      {activeTab === 'patient_visits' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              Previous Clinical Consultations
            </h2>
            <p className="text-xs text-slate-500">
              Detailed doctor diagnoses, recorded vitals, and follow-up advice from past visits.
            </p>
          </div>

          <div className="space-y-4">
            {visits.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                No previous clinical visits recorded yet.
              </div>
            ) : (
              visits.map(v => (
                <div key={v.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Visit Date: {new Date(v.visit_date).toLocaleDateString()}
                      </span>
                      <h3 className="text-base font-bold text-navy-900 mt-0.5">
                        Diagnosis: {v.diagnosis}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Doctor: {v.provider?.name || 'Dr. Arun Deshmukh'} ({v.provider?.specialization})
                      </p>
                    </div>

                    <span className="text-xs font-mono bg-teal-50 text-teal-800 px-3 py-1 rounded-lg border border-teal-200">
                      {v.vitals}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Chief Complaint:</span>
                      <p className="text-slate-600">{v.chief_complaint}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Clinical Notes:</span>
                      <p className="text-slate-600">{v.clinical_notes || 'None recorded'}</p>
                    </div>
                  </div>

                  {v.follow_up_instructions && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                      <span className="font-bold text-teal-900 block mb-0.5">Follow-up Instructions:</span>
                      <p className="text-slate-700">{v.follow_up_instructions}</p>
                      {v.follow_up_date && (
                        <p className="text-[11px] text-teal-800 font-semibold mt-1">
                          Recommended return date: {new Date(v.follow_up_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= 5. DOCUMENTS UPLOAD ================= */}
      {activeTab === 'patient_documents' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <FolderUp className="w-5 h-5 text-teal-600" />
              My Uploaded Medical Documents
            </h2>
            <p className="text-xs text-slate-500">
              Securely attach previous prescriptions, laboratory reports, or diagnostic images for your doctor to review.
            </p>
          </div>

          {/* Upload Form Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-teal-600" />
              Upload New Medical Document
            </h3>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blood Test Report (HbA1c) or Prior Prescription"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Document Category *
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="Laboratory Report">Laboratory Report</option>
                    <option value="Previous Prescription">Previous Prescription</option>
                    <option value="Diagnostic Report">Diagnostic Report (X-Ray / Scan)</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Other">Other Medical Record</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select File (PDF, JPG, PNG &lt; 10MB) *
                </label>
                <input
                  id="patientDocInput"
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDocFile(e.target.files[0]);
                      setUploadError(null);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Notes for Doctor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fasting sugar test done at Metropolis Lab last week"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {documents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                You have not uploaded any medical documents yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Upload Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-bold text-navy-900">
                          {doc.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {doc.original_filename}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(doc.upload_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={api.getDocumentDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 6. MY PRESCRIPTIONS ================= */}
      {activeTab === 'patient_prescriptions' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              My Digital Prescriptions
            </h2>
            <p className="text-xs text-slate-500">
              Doctor-finalised digital prescriptions with dosage guides and printable official letterhead.
            </p>
          </div>

          <div className="space-y-4">
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                No finalised prescriptions on record.
              </div>
            ) : (
              prescriptions.map(rx => (
                <div key={rx.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy-900">
                          Prescription #{rx.id}
                        </span>
                        <Badge variant="success" size="sm">
                          {rx.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Issued by: <span className="font-semibold text-slate-800">{rx.provider?.name || 'Dr. Arun Deshmukh'}</span> ({rx.provider?.qualification || 'MBBS, MD'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {new Date(rx.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => setPrintableRx(rx)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / View Letterhead</span>
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3">Dosage</th>
                          <th className="py-2 px-3">Frequency</th>
                          <th className="py-2 px-3">Duration</th>
                          <th className="py-2 px-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rx.items.map(it => (
                          <tr key={it.id || it.medicine_name}>
                            <td className="py-2.5 px-3 font-bold text-teal-900">
                              {it.medicine_name} {it.strength ? `(${it.strength})` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{it.dosage}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{it.frequency}</td>
                            <td className="py-2.5 px-3 text-slate-700">{it.duration}</td>
                            <td className="py-2.5 px-3 text-slate-600">{it.instructions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rx.patient_friendly_explanation && (
                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-xs">
                      <span className="font-bold text-teal-900 block mb-1">Plain-Language Medication Guide:</span>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                        {rx.patient_friendly_explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= 7. MEDICINE AVAILABILITY (Requirement 6) ================= */}
      {activeTab === 'patient_medicine' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              Medicine Availability & Dispensary Collection
            </h2>
            <p className="text-xs text-slate-500">
              Check clinic stock in real-time and submit collection requests before visiting the dispensary.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search medicines (e.g. Paracetamol, Cetirizine, ORS, Antacid, Ibuprofen)..."
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              />
            </div>
          </div>

          {/* Medicines Catalogue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogue.map(med => {
              const isAvailable = med.total_stock > 0;
              const requiresConfirmation = med.prescription_required;

              return (
                <div key={med.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {med.category}
                      </span>
                      <Badge 
                        variant={!isAvailable ? 'danger' : requiresConfirmation ? 'warning' : 'success'} 
                        size="sm"
                      >
                        {!isAvailable ? 'Out of Stock' : requiresConfirmation ? 'Requires Rx Confirmation' : 'In Stock'}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-navy-900 text-sm mt-1">
                      {med.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {med.strength_formulation} • {med.generic_name}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {isAvailable ? 'Available at clinic' : 'Currently unavailable'}
                    </span>
                    <button
                      onClick={() => setSelectedMed(med)}
                      disabled={!isAvailable}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isAvailable
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Request Collection
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* My Medicine Requests Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              My Medicine Collection Requests
            </h3>

            {medicineRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                You have not submitted any medicine collection requests yet.
              </p>
            ) : (
              <div className="space-y-4">
                {medicineRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-teal-800">
                          {req.request_reference || `REQ-${req.id}`}
                        </span>
                        <h4 className="text-sm font-bold text-navy-900">
                          {req.medicine_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Requested: {req.requested_quantity} units • Submitted: {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <Badge variant={getStatusBadgeVariant(req.status)} size="sm">
                        {req.status}
                      </Badge>
                    </div>

                    {/* Confirmed Collection Box (Requirement 6) */}
                    {(req.status === 'Confirmed for Collection' || req.status === 'Ready for Collection') && (
                      <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200 space-y-1.5 text-xs text-teal-950">
                        <div className="flex items-center gap-2 font-bold text-teal-900">
                          <MapPin className="w-4 h-4 text-teal-700" />
                          <span>Confirmed Collection Location & Instructions:</span>
                        </div>
                        {req.collection_notice ? (
                          <p className="text-amber-800 font-semibold">{req.collection_notice}</p>
                        ) : (
                          <div className="space-y-0.5 text-xs text-slate-700">
                            <p><span className="font-semibold text-teal-900">Clinic Name:</span> {req.clinic_name || clinicSettings?.clinic_name || 'Community Health Clinic'}</p>
                            <p><span className="font-semibold text-teal-900">Clinic Address:</span> {req.clinic_address || clinicSettings?.clinic_address}</p>
                            <p><span className="font-semibold text-teal-900">Collection Point:</span> {req.collection_point || clinicSettings?.collection_point}</p>
                            <p><span className="font-semibold text-teal-900">Dispensary Hours:</span> {req.opening_hours || clinicSettings?.opening_hours}</p>
                            <p><span className="font-semibold text-teal-900">Instructions:</span> {req.collection_instructions}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {req.status === 'Unavailable' && (
                      <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-xs font-semibold">
                        This item is currently out of stock or requires doctor consultation.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 8. FOLLOW-UPS ================= */}
      {activeTab === 'patient_followups' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <ClockAlert className="w-5 h-5 text-teal-600" />
              Follow-Up Tasks & Reminders
            </h2>
            <p className="text-xs text-slate-500">
              Tasks and scheduled re-evaluations requested by your doctor.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {followups.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                You have no pending follow-up tasks.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {followups.map(f => (
                  <div key={f.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-navy-900">{f.task_type}</h4>
                        <Badge variant={f.status === 'Completed' ? 'success' : f.status === 'Overdue' ? 'danger' : 'warning'} size="sm">
                          {f.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Due Date: <span className="font-semibold text-slate-800">{new Date(f.due_date).toLocaleDateString()}</span> • Assigned: {f.responsible_staff}
                      </p>
                      {f.notes && <p className="text-xs text-slate-600">{f.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 9. NOTIFICATIONS ================= */}
      {activeTab === 'patient_notifications' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              In-App Reminders & Notification History
            </h2>
            <p className="text-xs text-slate-500">
              Record of appointment confirmations, simulated reminders, and medicine collection alerts.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100">
            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy-900">In-App Appointment Reminder (30m)</span>
                  <span className="text-[10px] text-slate-400">Today</span>
                </div>
                <p className="text-xs text-slate-600">
                  Your OPD appointment with Dr. Arun Deshmukh is approaching. Please arrive 10 minutes early.
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy-900">Appointment Confirmed</span>
                  <span className="text-[10px] text-slate-400">Scheduled Visit</span>
                </div>
                <p className="text-xs text-slate-600">
                  Your appointment request was confirmed by clinic reception staff.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Profile Edit Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Permitted Profile Details"
        subtitle="Update contact and personal preferences"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                required
                value={profileForm.age}
                onChange={e => setProfileForm({ ...profileForm, age: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender (Inclusive)</label>
              <select
                value={profileForm.gender}
                onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Prefer not to say / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
              <input
                type="tel"
                value={profileForm.contact_number}
                onChange={e => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Language</label>
              <select
                value={profileForm.preferred_language}
                onChange={e => setProfileForm({ ...profileForm, preferred_language: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Kannada">Kannada</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Known Allergies</label>
              <input
                type="text"
                value={profileForm.allergies}
                onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Medical History Summary</label>
            <textarea
              rows={2}
              value={profileForm.medical_history_summary}
              onChange={e => setProfileForm({ ...profileForm, medical_history_summary: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              Save Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title="Request Doctor Appointment"
        subtitle="Choose preferred date and time slot"
        maxWidth="md"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={bookDate}
                onChange={e => setBookDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Time *</label>
              <select
                value={bookTimeSlot}
                onChange={e => setBookTimeSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="04:30 PM">04:30 PM</option>
                <option value="05:00 PM">05:00 PM</option>
                <option value="05:30 PM">05:30 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Basic Symptoms (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Follow-up check on blood pressure"
              value={bookReason}
              onChange={e => setBookReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used solely to help clinic staff understand the request. No automated medical diagnosis is performed.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBookModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBooking}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              {submittingBooking ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        subtitle="Select your preferred new date and time"
        maxWidth="sm"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Date *</label>
            <input
              type="date"
              required
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Time Slot *</label>
            <select
              value={rescheduleTimeSlot}
              onChange={e => setRescheduleTimeSlot(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="09:30 AM">09:30 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="04:30 PM">04:30 PM</option>
              <option value="05:30 PM">05:30 PM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rescheduling</label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={e => setRescheduleReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              Confirm Reschedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Medicine Collection Request Modal */}
      <Modal
        isOpen={selectedMed !== null}
        onClose={() => setSelectedMed(null)}
        title="Request Medicine Availability / Collection"
        subtitle={selectedMed ? `${selectedMed.name} (${selectedMed.strength_formulation})` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitMedicineRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Requested Quantity (Units) *</label>
            <input
              type="number"
              min="1"
              max="100"
              required
              value={medReqQuantity}
              onChange={e => setMedReqQuantity(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={medReqNotes}
              onChange={e => setMedReqNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <p className="font-semibold text-navy-900 mb-0.5">Collection Protocol:</p>
            <p>
              Clinic staff will verify batch availability. Once confirmed, you will receive collection point instructions and opening hours.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedMed(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingMedReq}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
            >
              {submittingMedReq ? 'Submitting...' : 'Submit Collection Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Prescription Modal */}
      <Modal
        isOpen={printableRx !== null}
        onClose={() => setPrintableRx(null)}
        title="Official Clinic Prescription View"
        subtitle={printableRx ? `Rx #${printableRx.id} • Issued to ${patient?.full_name}` : ''}
        maxWidth="2xl"
      >
        {printableRx && (
          <div className="space-y-4">
            <div id="patient-printable-prescription" className="bg-white border-2 border-slate-300 rounded-xl p-6 space-y-6 font-sans">
              {/* Letterhead Header */}
              <div className="flex items-start justify-between border-b-2 border-teal-800 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-navy-900 tracking-tight uppercase">
                    {clinicSettings?.clinic_name || 'Community Health Clinic'}
                  </h2>
                  <p className="text-xs text-teal-700 font-semibold">
                    {clinicSettings?.clinic_tagline || 'Primary Care & Family Medicine Center'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {clinicSettings?.clinic_address || '124 Healthcare Boulevard, Medical District'}{clinicSettings?.clinic_phone ? ` • Tel: ${clinicSettings.clinic_phone}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-bold text-slate-900">
                    {printableRx.provider?.name || 'Dr. Arun Deshmukh'}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    {printableRx.provider?.qualification || 'MBBS, MD'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Reg No: {printableRx.provider?.reg_number || 'REG-48291'}
                  </p>
                </div>
              </div>

              {/* Patient Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">PATIENT NAME</span>
                  <span className="font-bold text-slate-900">{patient?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PATIENT ID</span>
                  <span className="font-mono font-bold text-teal-800">{patient?.dummy_patient_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AGE / GENDER</span>
                  <span className="font-medium text-slate-800">{patient?.age} yrs / {patient?.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DATE</span>
                  <span className="font-medium text-slate-800">{new Date(printableRx.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Rx Medications */}
              <div className="space-y-3">
                <span className="text-base font-serif font-bold text-teal-900">℞</span>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="py-2 px-3 border-b">Medicine</th>
                      <th className="py-2 px-3 border-b">Dosage</th>
                      <th className="py-2 px-3 border-b">Frequency</th>
                      <th className="py-2 px-3 border-b">Duration</th>
                      <th className="py-2 px-3 border-b">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {printableRx.items.map(it => (
                      <tr key={it.id || it.medicine_name}>
                        <td className="py-2.5 px-3 font-bold text-navy-900">{it.medicine_name} {it.strength}</td>
                        <td className="py-2.5 px-3">{it.dosage}</td>
                        <td className="py-2.5 px-3 font-mono">{it.frequency}</td>
                        <td className="py-2.5 px-3">{it.duration}</td>
                        <td className="py-2.5 px-3">{it.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Plain Language Medication Guide */}
              {printableRx.patient_friendly_explanation && (
                <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-200 text-xs">
                  <span className="font-bold text-teal-900 block mb-1">Patient Instructions:</span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                    {printableRx.patient_friendly_explanation}
                  </p>
                </div>
              )}

              {/* Signature Line */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
                <span className="text-[11px] text-slate-400">Digitally Verified & Finalised by Attending Physician</span>
                <div className="text-right">
                  <div className="font-serif italic text-teal-800 font-bold text-sm">Dr. Arun Deshmukh</div>
                  <span className="text-[10px] text-slate-400">Doctor Signature & Stamp</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

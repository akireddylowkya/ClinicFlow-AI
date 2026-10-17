import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Patient, Appointment, QueueEntry, Prescription, MedicineCatalogue, 
  FollowUpTask, MedicalDocument, Visit 
} from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  Stethoscope, Calendar, Users, FileText, ClockAlert, Plus, 
  CheckCircle2, AlertCircle, Printer, Download, Search, 
  ArrowRight, Clock, Trash2, Eye, ShieldAlert, Activity, 
  FolderUp, RefreshCw, ChevronRight, Check
} from 'lucide-react';

interface PrescriptionDraftItem {
  medicine_name: string;
  strength: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
}

export const DoctorPortalPage: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, clinicSettings, refreshKey, triggerRefresh, showToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [catalogue, setCatalogue] = useState<MedicineCatalogue[]>([]);

  // Selected Patient for Record View modal
  const [inspectPatient, setInspectPatient] = useState<Patient | null>(null);
  const [inspectTimeline, setInspectTimeline] = useState<any[]>([]);
  const [inspectDocs, setInspectDocs] = useState<MedicalDocument[]>([]);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Active Consultation State
  const [consultPatient, setConsultPatient] = useState<Patient | null>(null);
  const [consultQueueEntry, setConsultQueueEntry] = useState<QueueEntry | null>(null);
  const [consultAppointment, setConsultAppointment] = useState<Appointment | null>(null);
  const [consultDocs, setConsultDocs] = useState<MedicalDocument[]>([]);
  const [consultVisits, setConsultVisits] = useState<Visit[]>([]);

  // Consultation Form Fields
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('74');
  const [temp, setTemp] = useState('98.4');
  const [spo2, setSpo2] = useState('99');
  const [weight, setWeight] = useState('68');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  // Prescription builder rows
  const [rxItems, setRxItems] = useState<PrescriptionDraftItem[]>([
    {
      medicine_name: 'Paracetamol',
      strength: '650mg',
      dosage: '1 tablet',
      frequency: '1-0-1 (Morning & Night)',
      route: 'Oral',
      duration: '3 days',
      instructions: 'Take after meals'
    }
  ]);

  // Follow-up scheduling
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('Review Consultation');
  const [followUpInstructions, setFollowUpInstructions] = useState('');

  // Saving state
  const [submittingConsultation, setSubmittingConsultation] = useState(false);

  // Prescription Letterhead Modal
  const [selectedPrintRx, setSelectedPrintRx] = useState<Prescription | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState('All');
  const [followUpFilter, setFollowUpFilter] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pts, appts, q, rxs, fws, cat] = await Promise.all([
        api.getPatients(),
        api.getAppointments(),
        api.getQueue(),
        api.getPrescriptions(),
        api.getFollowUps(),
        api.getCatalogue()
      ]);
      setPatients(pts);
      setAppointments(appts);
      setQueue(q);
      setPrescriptions(rxs);
      setFollowUps(fws);
      setCatalogue(cat);
    } catch (err: any) {
      showToast(err.message || 'Error loading clinical records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Handle opening a patient's full record modal
  const handleOpenPatientRecord = async (pt: Patient) => {
    setInspectPatient(pt);
    setLoadingInspect(true);
    try {
      const [timelineData, docs] = await Promise.all([
        api.getPatientTimeline(pt.id),
        api.getPatientDocuments(pt.id).catch(() => [])
      ]);
      setInspectTimeline(timelineData.timeline || []);
      setInspectDocs(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInspect(false);
    }
  };

  // Start Consultation for a patient (from Queue, Appointment, or Patient Record)
  const handleStartConsultation = async (patient: Patient, qEntry?: QueueEntry, appt?: Appointment) => {
    setConsultPatient(patient);
    setConsultQueueEntry(qEntry || null);
    setConsultAppointment(appt || null);

    // Reset consultation form fields
    setChiefComplaint(appt?.administrative_notes || 'Routine consultation');
    setClinicalNotes('');
    setDiagnosis('');
    setBp('120/80');
    setPulse('74');
    setTemp('98.4');
    setSpo2('99');
    setWeight('68');
    setRxItems([
      {
        medicine_name: 'Paracetamol',
        strength: '650mg',
        dosage: '1 tablet',
        frequency: '1-0-1 (Morning & Night)',
        route: 'Oral',
        duration: '3 days',
        instructions: 'Take after meals'
      }
    ]);
    setHasFollowUp(false);
    setFollowUpDate('');
    setFollowUpInstructions('');

    // Fetch patient's past documents and visits
    try {
      const [docs, visits] = await Promise.all([
        api.getPatientDocuments(patient.id).catch(() => []),
        api.getPatientVisits(patient.id).catch(() => [])
      ]);
      setConsultDocs(docs);
      setConsultVisits(visits);
    } catch (_) {}

    // If queue entry is waiting, set to In Consultation
    if (qEntry && qEntry.status === 'Waiting') {
      try {
        await api.updateQueueStatus(qEntry.id, 'In Consultation');
        triggerRefresh();
      } catch (_) {}
    }

    // Switch view to consultations tab
    setActiveTab('doctor_consultations');
  };

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      {
        medicine_name: '',
        strength: '',
        dosage: '1 tablet',
        frequency: '1-0-1 (Morning & Night)',
        route: 'Oral',
        duration: '5 days',
        instructions: 'Take after food'
      }
    ]);
  };

  const handleRemoveRxItem = (index: number) => {
    if (rxItems.length > 1) {
      setRxItems(rxItems.filter((_, idx) => idx !== index));
    }
  };

  const handleUpdateRxItem = (index: number, field: keyof PrescriptionDraftItem, value: string) => {
    const updated = [...rxItems];
    updated[index] = { ...updated[index], [field]: value };
    setRxItems(updated);
  };

  const handleSelectPredefinedMedicine = (index: number, catMed: MedicineCatalogue) => {
    const updated = [...rxItems];
    updated[index] = {
      ...updated[index],
      medicine_name: catMed.name,
      strength: catMed.strength_formulation || '',
      instructions: `Prescribed formulation: ${catMed.strength_formulation || 'Standard'}. Take as directed.`
    };
    setRxItems(updated);
  };

  const handleCompleteConsultation = async () => {
    if (!consultPatient) {
      showToast('No active patient selected for consultation.', 'error');
      return;
    }
    if (!diagnosis.trim()) {
      showToast('Please enter a clinical diagnosis.', 'error');
      return;
    }

    setSubmittingConsultation(true);
    try {
      const vitalsString = `BP: ${bp} mmHg, Pulse: ${pulse} bpm, Temp: ${temp} °F, SpO2: ${spo2}%, Wt: ${weight} kg`;

      // 1. Record clinical visit
      const visit = await api.recordVisit({
        patient_id: consultPatient.id,
        provider_id: 1, // Logged in Doctor
        chief_complaint: chiefComplaint.trim() || 'General OPD Consultation',
        diagnosis: diagnosis.trim(),
        clinical_notes: clinicalNotes.trim() || 'Consultation completed. Patient advised on treatment plan.',
        vitals: vitalsString,
        follow_up_instructions: hasFollowUp ? followUpInstructions : undefined,
        follow_up_date: hasFollowUp && followUpDate ? followUpDate : undefined
      });

      // 2. Create prescription if medicines were drafted
      const validItems = rxItems.filter(item => item.medicine_name.trim().length > 0);
      let createdRx: Prescription | null = null;
      if (validItems.length > 0) {
        const rx = await api.createPrescription({
          patient_id: consultPatient.id,
          provider_id: 1,
          visit_id: visit.id,
          doctor_notes: clinicalNotes,
          items: validItems.map(it => ({
            medicine_name: it.medicine_name,
            strength: it.strength,
            dosage: it.dosage,
            frequency: `${it.frequency} [Route: ${it.route}]`,
            duration: it.duration,
            instructions: it.instructions
          }))
        });

        // 3. Finalize prescription immediately
        createdRx = await api.finalizePrescription(rx.id, {
          doctor_notes: clinicalNotes,
          patient_friendly_explanation: `Prescription issued by Doctor for ${diagnosis}. Follow instructions carefully and complete the full dosage.`
        });
      }

      // 4. Create follow-up task if requested
      if (hasFollowUp && followUpDate) {
        await api.createFollowUp({
          patient_id: consultPatient.id,
          visit_id: visit.id,
          task_type: followUpType,
          due_date: followUpDate,
          responsible_staff: currentUser?.full_name || 'Dr. Arun Deshmukh',
          notes: followUpInstructions || `Follow-up review for ${diagnosis}`
        });
      }

      // 5. Update Queue entry if linked
      if (consultQueueEntry) {
        await api.updateQueueStatus(consultQueueEntry.id, 'Completed');
      }

      // 6. Update Appointment status if linked
      if (consultAppointment) {
        // Automatically marked as completed through visit link
      }

      showToast(`Consultation saved and finalized for ${consultPatient.full_name}!`, 'success');
      triggerRefresh();

      if (createdRx) {
        setSelectedPrintRx(createdRx);
      }

      // Reset active consultation
      setConsultPatient(null);
      setConsultQueueEntry(null);
      setConsultAppointment(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to complete consultation', 'error');
    } finally {
      setSubmittingConsultation(false);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(a => {
    if (appointmentFilter === 'Today') {
      const today = new Date().toISOString().split('T')[0];
      return a.appointment_date === today;
    }
    if (appointmentFilter === 'Scheduled') return a.status === 'Scheduled';
    if (appointmentFilter === 'Completed') return a.status === 'Completed';
    return true;
  }).filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.patient?.full_name.toLowerCase().includes(q) || a.patient?.dummy_patient_id.toLowerCase().includes(q);
  });

  // Filter patients
  const filteredPatients = patients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || p.dummy_patient_id.toLowerCase().includes(q) || (p.contact_number && p.contact_number.includes(q));
  });

  // Filter follow-ups
  const filteredFollowUps = followUps.filter(f => {
    if (followUpFilter === 'Pending') return f.status === 'Pending';
    if (followUpFilter === 'Overdue') return f.status === 'Overdue';
    if (followUpFilter === 'Completed') return f.status === 'Completed';
    return true;
  });

  // Queue metrics
  const waitingPatients = queue.filter(q => q.status === 'Waiting');
  const inServicePatients = queue.filter(q => q.status === 'In Consultation');

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-navy-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/30 text-teal-200 border border-teal-400/30">
                Doctor OPD Portal
              </span>
              <span className="text-xs text-slate-300">
                {clinicSettings?.clinic_name || 'Community Health Clinic'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, Dr. {currentUser?.full_name || 'Arun Deshmukh'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Conduct consultations, inspect patient histories and uploaded reports, prescribe digital medications, and schedule follow-ups.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {waitingPatients.length > 0 && (
              <button
                onClick={() => {
                  const nextQ = waitingPatients[0];
                  if (nextQ.patient) handleStartConsultation(nextQ.patient, nextQ);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Call Next Patient ({waitingPatients[0].token_number})</span>
              </button>
            )}
            <button
              onClick={loadData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 1. DOCTOR DASHBOARD TAB */}
      {activeTab === 'doctor_dashboard' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Waiting in Queue</p>
                <p className="text-2xl font-extrabold text-slate-900">{waitingPatients.length}</p>
                <p className="text-[11px] text-amber-600 font-medium">Ready for consultation</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">In Consultation</p>
                <p className="text-2xl font-extrabold text-slate-900">{inServicePatients.length}</p>
                <p className="text-[11px] text-teal-600 font-medium">Active in OPD rooms</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Today's Appointments</p>
                <p className="text-2xl font-extrabold text-slate-900">{appointments.length}</p>
                <p className="text-[11px] text-blue-600 font-medium">Booked for today</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <ClockAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Pending Follow-ups</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {followUps.filter(f => f.status !== 'Completed').length}
                </p>
                <p className="text-[11px] text-rose-600 font-medium">Action items due</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Live Queue Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Queue Overview */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Live OPD Consultation Queue
                  </h3>
                  <p className="text-xs text-slate-500">Patients checked-in and assigned a queue token</p>
                </div>
                <button
                  onClick={() => setActiveTab('doctor_consultations')}
                  className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1"
                >
                  Consultation Room <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {queue.filter(q => q.status === 'Waiting' || q.status === 'In Consultation').length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No patients currently waiting in the OPD queue.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {queue.filter(q => q.status === 'Waiting' || q.status === 'In Consultation').map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                        <span className={`w-12 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          item.status === 'In Consultation' ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.token_number}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            {item.patient?.full_name}
                            {item.priority && item.priority !== 'Normal' && (
                              <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                                {item.priority}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {item.patient?.dummy_patient_id} • Age {item.patient?.age} • {item.patient?.gender}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={item.status === 'In Consultation' ? 'success' : 'warning'} size="sm">
                          {item.status}
                        </Badge>
                        {item.patient && (
                          <button
                            onClick={() => handleStartConsultation(item.patient!, item)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>{item.status === 'In Consultation' ? 'Resume' : 'Start'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Consultation Hub */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Quick Clinical Actions
              </h3>
              <p className="text-xs text-slate-500">
                Direct access to OPD tasks, patient records, and prescription issuance.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setActiveTab('doctor_consultations')}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-lg group-hover:scale-105 transition-transform">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Open Consultation Room</p>
                      <p className="text-[11px] text-slate-500">Diagnose patient & prescribe medicines</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                </button>

                <button
                  onClick={() => setActiveTab('doctor_patients')}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Patient Records & Documents</p>
                      <p className="text-[11px] text-slate-500">Review lab tests, history & reports</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                </button>

                <button
                  onClick={() => setActiveTab('doctor_prescriptions')}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Prescription Archive</p>
                      <p className="text-[11px] text-slate-500">Print or re-issue digital prescriptions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                </button>
              </div>

              {/* Clinical AI Guidance Banner */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Clinical Protocol Notice
                </div>
                <p className="text-[11px] leading-relaxed">
                  All clinical decisions, diagnoses, dosages, and prescriptions are strictly doctor-authorised. ClinicFlow AI does not make autonomous clinical determinations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DOCTOR APPOINTMENTS TAB */}
      {activeTab === 'doctor_appointments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                Doctor's OPD Appointments
              </h2>
              <p className="text-xs text-slate-500">
                Filter and view appointments scheduled for consultation today and upcoming days.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {['All', 'Today', 'Scheduled', 'Completed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setAppointmentFilter(f)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      appointmentFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Date & Slot</th>
                    <th className="py-3 px-4">Reason / Symptoms</th>
                    <th className="py-3 px-4">Confirmation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No appointments found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{appt.patient?.full_name}</p>
                          <p className="text-[11px] text-slate-400">{appt.patient?.dummy_patient_id} • Age {appt.patient?.age}</p>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <p className="font-semibold text-slate-800">{appt.appointment_date}</p>
                          <p className="text-[11px] text-slate-500">{appt.time_slot}</p>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          {appt.administrative_notes || 'General Consultation'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            appt.confirmation_status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {appt.confirmation_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={appt.status === 'Completed' ? 'success' : appt.status === 'Cancelled' ? 'danger' : 'primary'} size="sm">
                            {appt.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {appt.patient && appt.status !== 'Completed' && appt.status !== 'Cancelled' ? (
                            <button
                              onClick={() => handleStartConsultation(appt.patient!, undefined, appt)}
                              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Consult</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => appt.patient && handleOpenPatientRecord(appt.patient)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DOCTOR PATIENTS TAB */}
      {activeTab === 'doctor_patients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Patient Medical Records & Documents
              </h2>
              <p className="text-xs text-slate-500">
                Browse registered patients, review past diagnoses, inspect uploaded laboratory reports, and initiate consultations.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                No patients found matching "{searchQuery}".
              </div>
            ) : (
              filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-teal-800">{p.dummy_patient_id}</span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">{p.full_name}</h3>
                        <p className="text-[11px] text-slate-500">
                          Age {p.age} • {p.gender} • Lang: {p.preferred_language}
                        </p>
                      </div>
                      <Badge variant="primary" size="sm">Active</Badge>
                    </div>

                    {p.allergies && p.allergies.toLowerCase() !== 'none' && p.allergies.toLowerCase() !== 'none reported' && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                        <span>Allergies: {p.allergies}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-800 block">Medical History:</span>
                      {p.medical_history_summary || 'No prior chronic conditions recorded.'}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenPatientRecord(p)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Full Record</span>
                    </button>

                    <button
                      onClick={() => handleStartConsultation(p)}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Start Consult</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. DOCTOR CONSULTATIONS TAB (THE MAIN CLINICAL WORKSPACE) */}
      {activeTab === 'doctor_consultations' && (
        <div className="space-y-6">
          {/* Active Patient Selector Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Active Consultation</span>
                    {consultQueueEntry && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Token {consultQueueEntry.token_number}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {consultPatient ? `${consultPatient.full_name} (${consultPatient.dummy_patient_id})` : 'Select a Patient to Consult'}
                  </h2>
                </div>
              </div>

              {/* Patient Selector Dropdown */}
              <div className="flex items-center gap-3">
                <select
                  value={consultPatient ? consultPatient.id : ''}
                  onChange={(e) => {
                    const selected = patients.find(p => p.id === parseInt(e.target.value));
                    if (selected) {
                      const qEnt = queue.find(q => q.patient_id === selected.id && (q.status === 'Waiting' || q.status === 'In Consultation'));
                      handleStartConsultation(selected, qEnt);
                    }
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">-- Choose Patient for Consultation --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.dummy_patient_id}) - Age {p.age}
                    </option>
                  ))}
                </select>

                {consultPatient && (
                  <button
                    onClick={() => {
                      setConsultPatient(null);
                      setConsultQueueEntry(null);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {!consultPatient ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Stethoscope className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Patient Currently Selected</h3>
                <p className="text-xs text-slate-500">
                  Select a patient from the dropdown above, call the next patient from the OPD Queue, or choose from Appointments to open the consultation workspace.
                </p>
              </div>
              {waitingPatients.length > 0 && (
                <button
                  onClick={() => {
                    const nextQ = waitingPatients[0];
                    if (nextQ.patient) handleStartConsultation(nextQ.patient, nextQ);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Call Next Patient: {waitingPatients[0].patient?.full_name} ({waitingPatients[0].token_number})</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN: Patient Background, Previous Visits & Uploaded Documents */}
              <div className="space-y-4">
                {/* Demographics & Allergies Alert */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Patient Background</h4>
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-900 font-bold text-sm">{consultPatient.full_name}</p>
                    <p className="text-slate-500">{consultPatient.dummy_patient_id} • Age {consultPatient.age} • {consultPatient.gender}</p>
                    <p className="text-slate-500">Language: {consultPatient.preferred_language}</p>
                    {consultPatient.contact_number && (
                      <p className="text-slate-500 font-mono">Contact: {consultPatient.contact_number}</p>
                    )}
                  </div>

                  {consultPatient.allergies && (
                    <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-900">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Allergies Alert
                      </div>
                      <p className="text-[11px] mt-0.5">{consultPatient.allergies}</p>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700">
                    <span className="font-bold block text-slate-900">Medical History:</span>
                    <p className="text-[11px] mt-0.5">{consultPatient.medical_history_summary || 'No chronic history recorded.'}</p>
                  </div>
                </div>

                {/* Uploaded Documents (Prescriptions, Lab Reports) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FolderUp className="w-4 h-4 text-teal-600" />
                      Uploaded Reports ({consultDocs.length})
                    </h4>
                  </div>

                  {consultDocs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No previous documents uploaded by patient.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {consultDocs.map(doc => (
                        <div key={doc.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[160px]">{doc.title}</p>
                            <p className="text-[10px] text-slate-400">{doc.category} • {(doc.file_size / 1024).toFixed(0)} KB</p>
                          </div>
                          <a
                            href={api.getDocumentDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Previous Visits & Diagnoses */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Previous Visits ({consultVisits.length})
                  </h4>

                  {consultVisits.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">First documented visit for this patient.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {consultVisits.map(v => (
                        <div key={v.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{v.diagnosis}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(v.visit_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            Complaint: {v.chief_complaint}
                          </p>
                          {v.clinical_notes && (
                            <p className="text-[11px] text-slate-600 italic">
                              "{v.clinical_notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Clinical Notes, Diagnosis, Digital Prescription & Follow-up */}
              <div className="lg:col-span-2 space-y-5">
                {/* Vitals Form */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Current Consultation Vitals
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        placeholder="120/80"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Pulse (bpm)</label>
                      <input
                        type="text"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        placeholder="72"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Temp (°F)</label>
                      <input
                        type="text"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        placeholder="98.4"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">SpO2 (%)</label>
                      <input
                        type="text"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        placeholder="98"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Weight (kg)</label>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="65"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Chief Complaint, Notes & Diagnosis */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Chief Complaint / Symptoms *</label>
                      <input
                        type="text"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="e.g. High fever with chills, body ache, sore throat"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Doctor-Verified Diagnosis *
                      </label>
                      <input
                        type="text"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold text-teal-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Doctor's Clinical Examination Notes</label>
                    <textarea
                      rows={3}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Enter clinical observations, examination findings, throat examination, chest auscultation, patient lifestyle advice..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Digital Prescription Builder */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-600" />
                        Digital Prescription Builder
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Include drug formulation, dosage, frequency, route, and patient instructions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddRxItem}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-teal-200/60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine</span>
                    </button>
                  </div>

                  {/* Medicine Row List */}
                  <div className="space-y-3">
                    {rxItems.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-teal-900">
                            Medicine Item #{idx + 1}
                          </span>
                          {rxItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRxItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          {/* Medicine Name with catalogue suggestions */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Medicine Name</label>
                            <input
                              type="text"
                              value={item.medicine_name}
                              onChange={(e) => handleUpdateRxItem(idx, 'medicine_name', e.target.value)}
                              placeholder="e.g. Paracetamol, Cetirizine..."
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {/* Catalogue quick chips */}
                            {catalogue.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {catalogue.slice(0, 4).map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleSelectPredefinedMedicine(idx, c)}
                                    className="text-[9px] bg-slate-200/70 hover:bg-teal-100 hover:text-teal-900 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    + {c.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Strength / Formulation */}
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Strength / Form</label>
                            <input
                              type="text"
                              value={item.strength}
                              onChange={(e) => handleUpdateRxItem(idx, 'strength', e.target.value)}
                              placeholder="e.g. 650mg, 10mg"
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>

                          {/* Route */}
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Route</label>
                            <select
                              value={item.route}
                              onChange={(e) => handleUpdateRxItem(idx, 'route', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                              <option value="Oral">Oral</option>
                              <option value="Topical">Topical</option>
                              <option value="Inhalation">Inhalation</option>
                              <option value="Ophthalmic">Ophthalmic</option>
                              <option value="IM/IV">IM / IV</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Dosage */}
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Dosage</label>
                            <input
                              type="text"
                              value={item.dosage}
                              onChange={(e) => handleUpdateRxItem(idx, 'dosage', e.target.value)}
                              placeholder="e.g. 1 tablet, 5 ml"
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>

                          {/* Frequency */}
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Frequency</label>
                            <select
                              value={item.frequency}
                              onChange={(e) => handleUpdateRxItem(idx, 'frequency', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                              <option value="1-0-1 (Morning & Night)">1-0-1 (Morning & Night)</option>
                              <option value="1-0-0 (Morning only)">1-0-0 (Morning only)</option>
                              <option value="0-0-1 (Night only)">0-0-1 (Night only)</option>
                              <option value="1-1-1 (Thrice daily)">1-1-1 (Thrice daily)</option>
                              <option value="SOS (As needed)">SOS (As needed)</option>
                              <option value="Once daily">Once daily</option>
                            </select>
                          </div>

                          {/* Duration */}
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Duration</label>
                            <input
                              type="text"
                              value={item.duration}
                              onChange={(e) => handleUpdateRxItem(idx, 'duration', e.target.value)}
                              placeholder="e.g. 3 days, 5 days"
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Patient Instructions</label>
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={(e) => handleUpdateRxItem(idx, 'instructions', e.target.value)}
                            placeholder="e.g. After meals with water. Drink plenty of warm fluids."
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Follow-up Scheduling Section */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableFollowUp"
                      checked={hasFollowUp}
                      onChange={(e) => setHasFollowUp(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="enableFollowUp" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Schedule a Clinical Follow-up Task for this Patient
                    </label>
                  </div>

                  {hasFollowUp && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Follow-up Date</label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Task Type</label>
                        <select
                          value={followUpType}
                          onChange={(e) => setFollowUpType(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="Review Consultation">Review Consultation</option>
                          <option value="Lab Report Review">Lab Report Review</option>
                          <option value="Medication Adherence">Medication Adherence</option>
                          <option value="Post-op Dressing">Post-op Dressing</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Specific Instructions</label>
                        <input
                          type="text"
                          value={followUpInstructions}
                          onChange={(e) => setFollowUpInstructions(e.target.value)}
                          placeholder="e.g. Bring updated CBC report"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Finalize Button */}
                <div className="flex items-center justify-between p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl">
                  <div className="text-xs text-teal-950">
                    <p className="font-bold">Finalize Consultation & Prescription</p>
                    <p className="text-[11px] text-teal-800">
                      This will record the visit to patient history, lock the digital prescription, and advance the queue.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={submittingConsultation}
                    onClick={handleCompleteConsultation}
                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submittingConsultation ? 'Saving...' : 'Complete & Finalize Consultation'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. DOCTOR PRESCRIPTIONS TAB */}
      {activeTab === 'doctor_prescriptions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Prescription Registry & Letterheads
              </h2>
              <p className="text-xs text-slate-500">
                View doctor-issued electronic prescriptions with printable letterheads and patient guides.
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search prescription..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                No electronic prescriptions recorded yet.
              </div>
            ) : (
              prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-teal-800">
                          Rx #{rx.id.toString().padStart(4, '0')}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                          {rx.patient?.full_name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {rx.patient?.dummy_patient_id} • Age {rx.patient?.age} • {rx.patient?.gender}
                        </p>
                      </div>
                      <Badge variant={rx.status === 'Finalised' ? 'success' : 'warning'} size="sm">
                        {rx.status}
                      </Badge>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Prescribed Medicines ({rx.items.length})
                      </span>
                      {rx.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <span className="font-semibold text-slate-900">{it.medicine_name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{it.dosage} ({it.frequency})</span>
                        </div>
                      ))}
                    </div>

                    {rx.patient_friendly_explanation && (
                      <div className="text-[11px] text-teal-900 bg-teal-50/60 p-2.5 rounded-xl border border-teal-100 leading-relaxed line-clamp-2">
                        <span className="font-bold block text-teal-950">Patient Advice:</span>
                        {rx.patient_friendly_explanation}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {new Date(rx.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setSelectedPrintRx(rx)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Document</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. DOCTOR FOLLOWUPS TAB */}
      {activeTab === 'doctor_followups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClockAlert className="w-5 h-5 text-teal-600" />
                Follow-Up Tasks & Lab Tracking
              </h2>
              <p className="text-xs text-slate-500">
                Track clinical recalls, review dates, and patient check-ins.
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {['All', 'Pending', 'Overdue', 'Completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFollowUpFilter(f)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    followUpFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Task Type</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Instructions / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFollowUps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No follow-up tasks found.
                      </td>
                    </tr>
                  ) : (
                    filteredFollowUps.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {task.patient?.full_name}
                          <span className="block font-normal text-[11px] text-slate-400">{task.patient?.dummy_patient_id}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{task.task_type}</td>
                        <td className="py-3 px-4 font-mono">{task.due_date}</td>
                        <td className="py-3 px-4">{task.responsible_staff}</td>
                        <td className="py-3 px-4 max-w-xs truncate">{task.notes || 'Routine follow-up'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={task.status === 'Completed' ? 'success' : task.status === 'Overdue' ? 'danger' : 'warning'} size="sm">
                            {task.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {task.status !== 'Completed' ? (
                            <button
                              onClick={async () => {
                                try {
                                  await api.updateFollowUpStatus(task.id, { status: 'Completed', notes: 'Marked completed by Doctor' });
                                  showToast('Follow-up marked as completed!', 'success');
                                  triggerRefresh();
                                } catch (err: any) {
                                  showToast(err.message || 'Error updating status', 'error');
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-emerald-200 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-semibold">Done</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT RECORD INSPECT MODAL */}
      <Modal
        isOpen={inspectPatient !== null}
        onClose={() => setInspectPatient(null)}
        title={inspectPatient ? `Patient Medical Record: ${inspectPatient.full_name}` : ''}
        subtitle="Full patient history, previous diagnoses, uploaded lab documents, and consultation timeline."
      >
        {inspectPatient && (
          <div className="space-y-5">
            {/* Demographic Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient ID</span>
                <span className="font-mono font-bold text-slate-900">{inspectPatient.dummy_patient_id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Age & Gender</span>
                <span className="font-semibold text-slate-900">{inspectPatient.age} years • {inspectPatient.gender}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Preferred Language</span>
                <span className="font-semibold text-slate-900">{inspectPatient.preferred_language}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact</span>
                <span className="font-mono text-slate-900">{inspectPatient.contact_number || 'N/A'}</span>
              </div>
            </div>

            {/* Allergies & Chronic Conditions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <span className="font-bold flex items-center gap-1 text-rose-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Reported Allergies
                </span>
                <p className="mt-1 text-[11px]">{inspectPatient.allergies || 'No allergies recorded.'}</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <span className="font-bold flex items-center gap-1 text-blue-800">
                  <Clock className="w-3.5 h-3.5" />
                  Medical History Summary
                </span>
                <p className="mt-1 text-[11px]">{inspectPatient.medical_history_summary || 'No chronic history recorded.'}</p>
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FolderUp className="w-4 h-4 text-teal-600" />
                Uploaded Documents ({inspectDocs.length})
              </h4>
              {inspectDocs.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No files uploaded by patient.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectDocs.map(doc => (
                    <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{doc.title}</p>
                        <p className="text-[10px] text-slate-400">{doc.category} • {(doc.file_size / 1024).toFixed(0)} KB</p>
                      </div>
                      <a
                        href={api.getDocumentDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg border border-teal-200 transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Events */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Chronological Medical Timeline
              </h4>
              {loadingInspect ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading timeline...</div>
              ) : inspectTimeline.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No previous records found.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {inspectTimeline.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{item.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Consult Action */}
            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setInspectPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const pt = inspectPatient;
                  setInspectPatient(null);
                  handleStartConsultation(pt);
                }}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Start Consultation for {inspectPatient.full_name}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* PRINTABLE OFFICIAL PRESCRIPTION MODAL */}
      <Modal
        isOpen={selectedPrintRx !== null}
        onClose={() => setSelectedPrintRx(null)}
        title="Official Clinical Prescription Document"
        subtitle="Standard clinical letterhead with doctor authority, medication dosages, and printable format."
      >
        {selectedPrintRx && (
          <div className="space-y-6">
            <div id="printable-prescription-doctor" className="p-6 bg-white border border-slate-300 rounded-xl space-y-6 text-slate-900">
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-extrabold uppercase tracking-tight text-navy-900">
                    {clinicSettings?.clinic_name || 'Community Health Clinic'}
                  </h2>
                  <p className="text-xs text-slate-600 max-w-sm mt-0.5">
                    {clinicSettings?.clinic_address || '124 Healthcare Boulevard, Medical District'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Dispensary Hours: {clinicSettings?.opening_hours || 'Mon-Sat: 08:30 - 20:30'} • Contact: {clinicSettings?.clinic_phone || '+91 80 2555 0199'}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-slate-900">
                    Dr. {selectedPrintRx.provider?.name || currentUser?.full_name || 'Arun Deshmukh'}
                  </h3>
                  <p className="text-xs text-slate-500">MBBS, MD (General Medicine)</p>
                  <p className="text-[11px] text-slate-400 font-mono">Reg: DOC-49201</p>
                </div>
              </div>

              {/* Patient Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-500">Patient:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedPrintRx.patient?.full_name}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Patient ID:</span>{' '}
                  <span className="font-mono text-slate-900">{selectedPrintRx.patient?.dummy_patient_id}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Age / Gender:</span>{' '}
                  <span>{selectedPrintRx.patient?.age} y / {selectedPrintRx.patient?.gender}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Date:</span>{' '}
                  <span className="font-mono">{new Date(selectedPrintRx.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Rx Symbol & Medication Table */}
              <div className="space-y-2">
                <div className="text-xl font-serif font-black text-teal-800">℞</div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 text-[10px] uppercase">
                      <th className="py-2">#</th>
                      <th className="py-2">Medicine & Strength</th>
                      <th className="py-2">Dosage</th>
                      <th className="py-2">Frequency</th>
                      <th className="py-2">Duration</th>
                      <th className="py-2">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPrintRx.items.map((item, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 font-bold text-slate-900">{item.medicine_name} {item.strength}</td>
                        <td className="py-2">{item.dosage}</td>
                        <td className="py-2 font-semibold text-slate-700">{item.frequency}</td>
                        <td className="py-2">{item.duration}</td>
                        <td className="py-2 text-slate-600 italic">{item.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Patient Advice */}
              {selectedPrintRx.patient_friendly_explanation && (
                <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 text-xs">
                  <span className="font-bold text-teal-950 block">Doctor Advice for Patient:</span>
                  <p className="text-teal-900 mt-0.5 leading-relaxed">{selectedPrintRx.patient_friendly_explanation}</p>
                </div>
              )}

              {/* Signature Block */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end">
                <div className="text-[10px] text-slate-400">
                  <p>Electronically generated clinical prescription record.</p>
                  <p>Rx ID: {selectedPrintRx.id} • Issued via ClinicFlow AI</p>
                </div>
                <div className="text-center">
                  <div className="font-serif italic text-teal-800 text-sm font-bold">Dr. {selectedPrintRx.provider?.name || 'A. Deshmukh'}</div>
                  <div className="w-40 border-t border-slate-400 mt-1" />
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Authorised Doctor Signature</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedPrintRx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Prescription</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

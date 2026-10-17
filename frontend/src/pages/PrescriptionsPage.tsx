import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Prescription, Patient, MedicineCatalogue, PrescriptionItem } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  FileText, Plus, Printer, CheckCircle2, User, 
  Stethoscope, Clock, Sparkles, AlertCircle, Trash2, Calendar
} from 'lucide-react';

export const PrescriptionsPage: React.FC = () => {
  const { refreshKey, triggerRefresh, showToast, role, clinicSettings } = useApp();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [catalogue, setCatalogue] = useState<MedicineCatalogue[]>([]);
  const [loading, setLoading] = useState(true);

  // Print/View Modal
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  // New Prescription Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [vitals, setVitals] = useState('BP: 120/80 mmHg, Pulse: 72 bpm, Temp: 98.4 F');
  const [followUpDate, setFollowUpDate] = useState('');

  // Dynamic Medicine Items list
  const [items, setItems] = useState<Array<{
    medicine_name: string;
    strength: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>([
    {
      medicine_name: 'Paracetamol',
      strength: '650mg',
      dosage: '1 tablet',
      frequency: '1-0-1 (Morning & Night)',
      duration: '3 days',
      instructions: 'After meals with water'
    }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getPrescriptions(),
      api.getPatients(),
      api.getCatalogue()
    ])
      .then(([rxData, pData, catData]) => {
        if (isMounted) {
          setPrescriptions(rxData);
          setPatients(pData);
          setCatalogue(catData);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to fetch prescriptions', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medicine_name: 'Pantoprazole DSR',
        strength: 'Capsule',
        dosage: '1 capsule',
        frequency: '1-0-0 (Morning empty stomach)',
        duration: '5 days',
        instructions: '30 mins before breakfast'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      showToast('Please select a patient.', 'error');
      return;
    }
    setSubmitting(true);

    try {
      // 1. Record clinical visit
      const visit = await api.recordVisit({
        patient_id: parseInt(patientId),
        provider_id: 1, // Dr. Arun Deshmukh
        chief_complaint: chiefComplaint || 'Routine medical consultation',
        diagnosis: diagnosis || 'General Medical Evaluation',
        clinical_notes: doctorNotes,
        vitals: vitals,
        follow_up_instructions: followUpDate ? `Return for follow-up evaluation on ${followUpDate}` : undefined,
        follow_up_date: followUpDate || undefined
      });

      // 2. Create prescription
      const rx = await api.createPrescription({
        patient_id: parseInt(patientId),
        provider_id: 1,
        visit_id: visit.id,
        doctor_notes: doctorNotes,
        items: items
      });

      // 3. Finalize prescription immediately
      await api.finalizePrescription(rx.id, {
        doctor_notes: doctorNotes
      });

      showToast('Prescription finalized and recorded to patient history!', 'success');
      setCreateModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to create prescription', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Digital Prescriptions & Consultations
          </h1>
          <p className="text-xs text-slate-500">
            Doctor-controlled electronic prescriptions with clinic branding, drug formulation, and printable formats.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Prescription</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
        <Stethoscope className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">Clinical Safety Protocol: </span>
          All prescriptions remain strictly under licensed doctor authority. AI is not permitted to autonomously alter dosages, invent diagnoses, or override doctor instructions.
        </p>
      </div>

      {/* Prescription Cards / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading prescriptions...
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No prescriptions created yet. Click "New Prescription" to start.
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

                {/* Items Summary */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
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
                  <div className="text-[11px] text-teal-900 bg-teal-50/60 p-2.5 rounded-xl border border-teal-100 leading-relaxed line-clamp-3">
                    <span className="font-bold block text-teal-950">Patient Guide:</span>
                    {rx.patient_friendly_explanation}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="text-[11px]">
                  Dr. {rx.provider?.name || 'Arun Deshmukh'}
                </div>
                <button
                  onClick={() => setSelectedRx(rx)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print View</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Printable Prescription Modal */}
      <Modal
        isOpen={selectedRx !== null}
        onClose={() => setSelectedRx(null)}
        title="Official Clinical Prescription Document"
        subtitle="Standard Indian clinic prescription format ready for high-resolution printing or PDF download."
        maxWidth="xl"
      >
        {selectedRx && (
          <div className="space-y-6">
            {/* The printable card */}
            <div id="printable-prescription" className="bg-white border-2 border-slate-300 rounded-xl p-6 sm:p-8 space-y-6 font-sans">
              {/* Clinic Letterhead Header */}
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
                    {selectedRx.provider?.name || 'Dr. Arun Deshmukh'}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    {selectedRx.provider?.qualification || 'MBBS, MD'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Reg No: {selectedRx.provider?.reg_number || 'REG-48291'}
                  </p>
                </div>
              </div>


              {/* Patient Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient Name</span>
                  <span className="font-bold text-slate-900">{selectedRx.patient?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient ID / Age</span>
                  <span className="font-semibold text-slate-800">{selectedRx.patient?.dummy_patient_id} • {selectedRx.patient?.age}y / {selectedRx.patient?.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {new Date(selectedRx.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                  <span className="font-bold text-emerald-700">Official / Finalised</span>
                </div>
              </div>

              {/* Rx Symbol & Medication Table */}
              <div className="space-y-3">
                <div className="text-2xl font-serif font-black text-teal-800">
                  ℞
                </div>

                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Medicine & Strength</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Special Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRx.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {it.medicine_name} {it.strength ? `(${it.strength})` : ''}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{it.dosage}</td>
                        <td className="py-2 px-3 text-slate-700 font-mono">{it.frequency}</td>
                        <td className="py-2 px-3 text-slate-700">{it.duration}</td>
                        <td className="py-2 px-3 text-slate-600">{it.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Patient Guide Box */}
              {selectedRx.patient_friendly_explanation && (
                <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-teal-900 block">Patient Plain-Language Guide:</span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                    {selectedRx.patient_friendly_explanation}
                  </p>
                </div>
              )}

              {/* Footer Signature */}
              <div className="pt-8 flex items-end justify-between border-t border-slate-200 text-xs text-slate-500">
                <div>
                  <p>Next follow-up as advised.</p>
                  <p className="text-[10px] text-slate-400">Generated digitally via ClinicFlow AI Platform</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-36 border-b border-slate-400 pb-6" />
                  <span className="font-semibold text-slate-800 block">Doctor's Signature</span>
                </div>
              </div>
            </div>

            {/* Print action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Prescription Form Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Consultation & Finalise Prescription"
        subtitle="Enter consultation clinical notes, diagnosis, and prescribed medicine formulations."
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePrescriptionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Patient *
              </label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
              >
                <option value="">-- Choose patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.dummy_patient_id}) - Age {p.age}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Diagnosis *
              </label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bronchitis, Type 2 DM"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chief Complaint
              </label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. High fever x 2 days, dry cough"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Vitals
              </label>
              <input
                type="text"
                value={vitals}
                onChange={(e) => setVitals(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Medicines Entry Form Table */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-900">Prescription Medicines</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">Medicine #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Medicine Name (e.g. Paracetamol)"
                        value={it.medicine_name}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].medicine_name = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Strength (650mg)"
                        value={it.strength}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].strength = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Dosage (1 tablet)"
                        value={it.dosage}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].dosage = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Frequency (1-0-1)"
                        value={it.frequency}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].frequency = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Duration (5 days)"
                        value={it.duration}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].duration = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Instructions (After meals with water)"
                        value={it.instructions}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].instructions = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor's Clinical Notes
              </label>
              <textarea
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="e.g. Advised hydration and complete rest for 3 days."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Schedule Follow-Up Date (Optional)
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Auto-generates follow-up reminder task if selected.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              {submitting ? 'Finalising...' : 'Finalise Prescription'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

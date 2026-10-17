import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Patient } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  Users, Search, UserPlus, FileText, Calendar, 
  Clock, ShieldAlert, HeartPulse, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';

export const PatientsPage: React.FC = () => {
  const { refreshKey, triggerRefresh, showToast } = useApp();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Timeline Modal state
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<{ patient: any; timeline: any[] } | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Add Patient Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    contact_number: '',
    preferred_language: 'English',
    medical_history_summary: '',
    allergies: 'None reported'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getPatients(search)
      .then((data) => {
        if (isMounted) setPatients(data);
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to fetch patients', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, search]);

  const handleOpenTimeline = async (patientId: number) => {
    setSelectedPatientId(patientId);
    setTimelineLoading(true);
    try {
      const data = await api.getPatientTimeline(patientId);
      setTimelineData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load timeline', 'error');
      setSelectedPatientId(null);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.age) {
      setFormError('Patient full name and age are required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const newPat = await api.createPatient({
        full_name: formData.full_name.trim(),
        age: parseInt(formData.age),
        gender: formData.gender,
        contact_number: formData.contact_number.trim() || undefined,
        preferred_language: formData.preferred_language,
        medical_history_summary: formData.medical_history_summary.trim() || undefined,
        allergies: formData.allergies.trim() || 'None reported'
      });

      showToast(`Patient ${newPat.full_name} (${newPat.dummy_patient_id}) registered successfully!`, 'success');
      setAddModalOpen(false);
      setFormData({
        full_name: '',
        age: '',
        gender: 'Male',
        contact_number: '',
        preferred_language: 'English',
        medical_history_summary: '',
        allergies: 'None reported'
      });
      triggerRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Patient Registry & History
          </h1>
          <p className="text-xs text-slate-500">
            Search patient records, inspect chronological visit summaries, and register new patients.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, ID (e.g. PAT-1001), or phone number..."
          className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Patient Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">Known Allergies</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading patient database...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No patients found matching "{search}".
                  </td>
                </tr>
              ) : (
                patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                      {pat.dummy_patient_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{pat.full_name}</div>
                      {pat.medical_history_summary && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {pat.medical_history_summary}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {pat.age} yrs • {pat.gender}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {pat.contact_number || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{pat.preferred_language}</td>
                    <td className="py-3.5 px-4">
                      {pat.allergies && pat.allergies !== 'None reported' ? (
                        <Badge variant="danger" size="sm">
                          {pat.allergies}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{pat.registration_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenTimeline(pat.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1 ml-auto"
                      >
                        <span>Timeline</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Chronological Timeline Modal */}
      <Modal
        isOpen={selectedPatientId !== null}
        onClose={() => {
          setSelectedPatientId(null);
          setTimelineData(null);
        }}
        title="Patient Medical Profile & Chronological Timeline"
        subtitle={timelineData?.patient ? `${timelineData.patient.full_name} • ${timelineData.patient.dummy_patient_id} • Age ${timelineData.patient.age}` : 'Loading profile...'}
        maxWidth="xl"
      >
        {timelineLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading clinical timeline...
          </div>
        ) : timelineData ? (
          <div className="space-y-6">
            {/* Quick Profile Summary Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Gender / Age</span>
                <span className="font-semibold text-slate-800">{timelineData.patient.gender}, {timelineData.patient.age} yrs</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Language</span>
                <span className="font-semibold text-slate-800">{timelineData.patient.preferred_language}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Allergies</span>
                <span className="font-semibold text-rose-600">{timelineData.patient.allergies || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Last Visit</span>
                <span className="font-semibold text-slate-800">{timelineData.patient.last_visit}</span>
              </div>
            </div>

            {/* Medical History */}
            {timelineData.patient.medical_history_summary && (
              <div className="p-3 bg-teal-50/50 border border-teal-200/60 rounded-xl text-xs space-y-1">
                <span className="font-bold text-teal-900 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-teal-600" /> Medical Background / Pre-existing Conditions:
                </span>
                <p className="text-slate-700 leading-relaxed">{timelineData.patient.medical_history_summary}</p>
              </div>
            )}

            {/* Timeline Stream */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chronological Events Stream
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timelineData.timeline.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    {/* Bullet */}
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-600 group-hover:scale-110 transition-transform" />
                    
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{evt.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{evt.details}</p>

                      {evt.vitals && (
                        <div className="pt-1 text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded">
                          Vitals: {evt.vitals}
                        </div>
                      )}

                      {evt.patient_friendly_explanation && (
                        <div className="pt-1 text-[11px] text-teal-800 bg-teal-50/60 p-2 rounded-lg border border-teal-100">
                          <span className="font-bold block text-teal-900">Patient Instruction Summary:</span>
                          {evt.patient_friendly_explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add Patient Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Patient"
        subtitle="Registers a new patient record with automatic duplicate validation check."
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Ramesh Kulkarni"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age (Years) *
              </label>
              <input
                type="number"
                required
                min={0}
                max={120}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 42"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number (Optional)
              </label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="e.g. +91 98450 11223"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Language
              </label>
              <input
                type="text"
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                placeholder="e.g. Hindi, Kannada, English, Telugu"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Known Drug Allergies
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa, or None reported"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pre-existing Medical History Summary
              </label>
              <textarea
                rows={2}
                value={formData.medical_history_summary}
                onChange={(e) => setFormData({ ...formData, medical_history_summary: e.target.value })}
                placeholder="e.g. Essential Hypertension x 4 yrs, non-smoker"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Activity, User, Stethoscope, UserCheck, ShieldCheck, 
  ArrowRight, Key, Phone, UserPlus, CheckCircle2, AlertCircle 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, showToast, clinicSettings } = useApp();

  // Active portal tab: 'patient' | 'doctor' | 'staff'
  const [selectedPortal, setSelectedPortal] = useState<'patient' | 'doctor' | 'staff'>('patient');

  // Patient Sub-tab: 'login' | 'register'
  const [patientMode, setPatientMode] = useState<'login' | 'register'>('login');

  // Form states
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [doctorUsername, setDoctorUsername] = useState('doctor_arun');
  const [staffUsername, setStaffUsername] = useState('staff_reception');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient Registration Form state
  const [regForm, setRegForm] = useState({
    full_name: '',
    age: '',
    gender: 'Other',
    contact_number: '',
    preferred_language: 'English',
    email: '',
    main_reason: 'General Consultation',
    symptoms_text: '',
    appointment_date: new Date().toISOString().split('T')[0],
    preferred_time_slot: '10:00 AM',
    allergies: '',
    medical_history_summary: ''
  });

  const handlePatientLogin = async (e?: React.FormEvent, directIdentifier?: string) => {
    if (e) e.preventDefault();
    const idToUse = directIdentifier || patientIdentifier;
    if (!idToUse.trim()) {
      setError('Please enter your Patient ID (e.g. PAT-1001), phone number, or username.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await api.login({
        username: idToUse.trim(),
        role: 'Patient'
      });
      login(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials or register.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorLogin = async (e?: React.FormEvent, directUsername?: string) => {
    if (e) e.preventDefault();
    const uToUse = directUsername || doctorUsername;
    setLoading(true);
    setError(null);
    try {
      const user = await api.login({
        username: uToUse.trim(),
        role: 'Doctor'
      });
      login(user);
    } catch (err: any) {
      setError(err.message || 'Doctor login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e?: React.FormEvent, directUsername?: string) => {
    if (e) e.preventDefault();
    const uToUse = directUsername || staffUsername;
    setLoading(true);
    setError(null);
    try {
      const user = await api.login({
        username: uToUse.trim(),
        role: 'Staff'
      });
      login(user);
    } catch (err: any) {
      setError(err.message || 'Staff login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.full_name.trim() || !regForm.age) {
      setError('Full Name and Age are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.registerPatient({
        full_name: regForm.full_name.trim(),
        age: parseInt(regForm.age) || 30,
        gender: regForm.gender,
        contact_number: regForm.contact_number.trim() || undefined,
        preferred_language: regForm.preferred_language,
        email: regForm.email.trim() || undefined,
        main_reason: regForm.main_reason,
        symptoms_text: regForm.symptoms_text || 'General consultation request',
        allergies: regForm.allergies || 'None reported',
        medical_history_summary: regForm.medical_history_summary || undefined,
        appointment_date: regForm.appointment_date || undefined,
        preferred_time_slot: regForm.preferred_time_slot || undefined
      });

      showToast(res.message, 'success');
      if (res.user) {
        login(res.user);
      } else {
        setPatientMode('login');
        setPatientIdentifier(res.patient.dummy_patient_id);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col justify-center">
      {/* Title & Clinic Banner */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <Activity className="w-4 h-4 text-teal-600" />
          <span>{clinicSettings?.clinic_name || 'Community Health Clinic'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
          ClinicFlow <span className="text-teal-600">AI</span> Portals
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Please select your role portal below to securely access your personalized dashboard and clinical operational workflows.
        </p>
      </div>

      {/* 3 Portal Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Patient Portal Card */}
        <button
          type="button"
          onClick={() => { setSelectedPortal('patient'); setError(null); }}
          className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
            selectedPortal === 'patient'
              ? 'border-teal-600 bg-white shadow-md ring-2 ring-teal-500/20'
              : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white shadow-xs'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedPortal === 'patient' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700'
          }`}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-navy-900 text-base">Patient Portal</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Self-Service
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Book visits, view prescriptions, check medicine availability, upload lab reports.
            </p>
          </div>
        </button>

        {/* Doctor Portal Card */}
        <button
          type="button"
          onClick={() => { setSelectedPortal('doctor'); setError(null); }}
          className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
            selectedPortal === 'doctor'
              ? 'border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white shadow-xs'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedPortal === 'doctor' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-navy-900 text-base">Doctor Portal</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Clinical
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Consultation room, digital prescriptions, patient history & follow-up tasks.
            </p>
          </div>
        </button>

        {/* Staff Portal Card */}
        <button
          type="button"
          onClick={() => { setSelectedPortal('staff'); setError(null); }}
          className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
            selectedPortal === 'staff'
              ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-500/20'
              : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white shadow-xs'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedPortal === 'staff' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700'
          }`}>
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-navy-900 text-base">Staff Portal</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                Operations
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live queue management, patient registry, medicine stock & clinic settings.
            </p>
          </div>
        </button>
      </div>

      {/* Portal Login / Registration Box */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto w-full">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= PATIENT PORTAL ================= */}
        {selectedPortal === 'patient' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  Patient Access & Registration
                </h2>
                <p className="text-xs text-slate-500">
                  Sign in with your Patient ID or create a new profile for appointment requests.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setPatientMode('login'); setError(null); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    patientMode === 'login' ? 'bg-white text-navy-900 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setPatientMode('register'); setError(null); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    patientMode === 'register' ? 'bg-white text-navy-900 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {patientMode === 'login' ? (
              <form onSubmit={handlePatientLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient ID, Phone Number, or Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PAT-1001, 9876543210, or patient_rajesh"
                    value={patientIdentifier}
                    onChange={(e) => setPatientIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the unique Patient ID provided by the clinic, or your registered phone number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Patient Portal'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Quick Demo Accounts */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                    Quick Demo Patient Accounts:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setPatientIdentifier('PAT-1001'); handlePatientLogin(undefined, 'PAT-1001'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                    >
                      Rajesh Sharma (PAT-1001)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPatientIdentifier('PAT-1002'); handlePatientLogin(undefined, 'PAT-1002'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                    >
                      Priya Patel (PAT-1002)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPatientIdentifier('PAT-1003'); handlePatientLogin(undefined, 'PAT-1003'); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                    >
                      Amitabh Gupta (PAT-1003)
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Patient Registration Form */
              <form onSubmit={handlePatientRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={regForm.full_name}
                      onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      placeholder="e.g. 35"
                      value={regForm.age}
                      onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender (Inclusive)
                    </label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Other">Prefer not to say / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={regForm.contact_number}
                      onChange={(e) => setRegForm({ ...regForm, contact_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred Language
                    </label>
                    <select
                      value={regForm.preferred_language}
                      onChange={(e) => setRegForm({ ...regForm, preferred_language: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Appointment Preference */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-navy-900 block">
                    Preferred Appointment Slot (Optional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={regForm.appointment_date}
                        onChange={(e) => setRegForm({ ...regForm, appointment_date: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Preferred Time</label>
                      <select
                        value={regForm.preferred_time_slot}
                        onChange={(e) => setRegForm({ ...regForm, preferred_time_slot: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
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
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Reason for Visit / Basic Symptoms (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mild headache and low-grade fever for 2 days"
                      value={regForm.main_reason}
                      onChange={(e) => setRegForm({ ...regForm, main_reason: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Note: Information helps clinic staff schedule your consultation. No automatic diagnosis is performed.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Registering...' : 'Register & Enter Patient Dashboard'}
                  <UserPlus className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= DOCTOR PORTAL ================= */}
        {selectedPortal === 'doctor' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                Doctor Portal Sign In
              </h2>
              <p className="text-xs text-slate-500">
                Authorised clinical login for OPD consultations, patient histories, and digital prescriptions.
              </p>
            </div>

            <form onSubmit={handleDoctorLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Doctor Username or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. doctor_arun or doctor_sneha"
                  value={doctorUsername}
                  onChange={(e) => setDoctorUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Security Passkey / Password
                </label>
                <input
                  type="password"
                  defaultValue="demo123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Demo prototype mode: Standard credentials preloaded.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Doctor Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo Doctor Quick Chips */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Demo Doctor Accounts:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setDoctorUsername('doctor_arun'); handleDoctorLogin(undefined, 'doctor_arun'); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                  >
                    Dr. Arun Deshmukh (General Medicine • OPD-1)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDoctorUsername('doctor_sneha'); handleDoctorLogin(undefined, 'doctor_sneha'); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                  >
                    Dr. Sneha Kulkarni (Pediatrics • OPD-2)
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ================= STAFF PORTAL ================= */}
        {selectedPortal === 'staff' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-600" />
                Staff Portal Sign In
              </h2>
              <p className="text-xs text-slate-500">
                Reception desk, queue token management, medicine inventory, and clinic settings.
              </p>
            </div>

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Staff Username or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. staff_reception"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Staff Password
                </label>
                <input
                  type="password"
                  defaultValue="demo123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Demo prototype mode: Standard credentials preloaded.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Staff Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo Staff Quick Chip */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Demo Staff Account:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setStaffUsername('staff_reception'); handleStaffLogin(undefined, 'staff_reception'); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors"
                  >
                    Priya Sharma (Clinic Reception & Pharmacy Staff)
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Demo Credentials Quick Reference Documentation Table */}
      <div className="mt-10 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs max-w-3xl mx-auto w-full">
        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-teal-600" />
          Documented Prototype Demo Accounts & Credentials
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-2">Portal Role</th>
                <th className="pb-2">Account Name</th>
                <th className="pb-2">Username / Identifier</th>
                <th className="pb-2">Password</th>
                <th className="pb-2">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 font-bold text-teal-800">Patient</td>
                <td className="py-2.5">Rajesh Sharma</td>
                <td className="py-2.5 font-mono text-teal-700">PAT-1001 or patient_rajesh</td>
                <td className="py-2.5 font-mono">demo123</td>
                <td className="py-2.5 text-slate-500">Patient Portal Only</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-teal-800">Patient</td>
                <td className="py-2.5">Priya Patel</td>
                <td className="py-2.5 font-mono text-teal-700">PAT-1002 or patient_priya</td>
                <td className="py-2.5 font-mono">demo123</td>
                <td className="py-2.5 text-slate-500">Patient Portal Only</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-emerald-800">Doctor</td>
                <td className="py-2.5">Dr. Arun Deshmukh</td>
                <td className="py-2.5 font-mono text-emerald-700">doctor_arun</td>
                <td className="py-2.5 font-mono">demo123</td>
                <td className="py-2.5 text-slate-500">Doctor OPD & Clinical Consults</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-emerald-800">Doctor</td>
                <td className="py-2.5">Dr. Sneha Kulkarni</td>
                <td className="py-2.5 font-mono text-emerald-700">doctor_sneha</td>
                <td className="py-2.5 font-mono">demo123</td>
                <td className="py-2.5 text-slate-500">Doctor OPD & Clinical Consults</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-sky-800">Staff</td>
                <td className="py-2.5">Priya Sharma</td>
                <td className="py-2.5 font-mono text-sky-700">staff_reception</td>
                <td className="py-2.5 font-mono">demo123</td>
                <td className="py-2.5 text-slate-500">Full Queue, Inventory & Settings</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

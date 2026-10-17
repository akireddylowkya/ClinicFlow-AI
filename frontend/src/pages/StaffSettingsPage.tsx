import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ClinicSettings } from '../types';
import { 
  Settings, Building2, MapPin, Phone, Mail, 
  Clock, ShieldCheck, Save, CheckCircle2, AlertTriangle, Pill 
} from 'lucide-react';

export const StaffSettingsPage: React.FC = () => {
  const { clinicSettings, refreshClinicSettings, showToast, triggerRefresh } = useApp();

  const [form, setForm] = useState<ClinicSettings>({
    clinic_name: 'Community Health Clinic',
    clinic_tagline: 'Smart Clinic Management & Predictive Operations',
    clinic_address: '124 Healthcare Boulevard, Medical District',
    clinic_phone: '+91 98765 43210',
    clinic_email: 'care@communityclinicflow.org',
    collection_point: 'Clinic Pharmacy Counter 1',
    collection_instructions: 'Please present your Patient ID and request reference number at Counter 1.',
    opening_hours: '09:00 AM – 01:00 PM, 04:30 PM – 07:30 PM (Mon-Sat)',
    default_service_duration: '12',
    low_stock_threshold: '25',
    expiry_warning_days: '30'
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (clinicSettings) {
      setForm({
        clinic_name: clinicSettings.clinic_name || '',
        clinic_tagline: clinicSettings.clinic_tagline || '',
        clinic_address: clinicSettings.clinic_address || '',
        clinic_phone: clinicSettings.clinic_phone || '',
        clinic_email: clinicSettings.clinic_email || '',
        collection_point: clinicSettings.collection_point || '',
        collection_instructions: clinicSettings.collection_instructions || '',
        opening_hours: clinicSettings.opening_hours || '',
        default_service_duration: clinicSettings.default_service_duration || '12',
        low_stock_threshold: clinicSettings.low_stock_threshold || '25',
        expiry_warning_days: clinicSettings.expiry_warning_days || '30'
      });
    }
  }, [clinicSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(form);
      await refreshClinicSettings();
      triggerRefresh();
      setSavedSuccess(true);
      showToast('Clinic configuration and collection settings updated successfully!', 'success');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearLocation = () => {
    setForm(prev => ({ ...prev, clinic_address: '', collection_point: '' }));
  };

  const handleResetToStandardGeneric = () => {
    setForm({
      clinic_name: 'Community Health Clinic',
      clinic_tagline: 'Smart Clinic Management & Predictive Operations',
      clinic_address: '124 Healthcare Boulevard, Medical District',
      clinic_phone: '+91 98765 43210',
      clinic_email: 'care@communityclinicflow.org',
      collection_point: 'Clinic Pharmacy Counter 1',
      collection_instructions: 'Please present your Patient ID and request reference number at Counter 1.',
      opening_hours: '09:00 AM – 01:00 PM, 04:30 PM – 07:30 PM (Mon-Sat)',
      default_service_duration: '12',
      low_stock_threshold: '25',
      expiry_warning_days: '30'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" />
            Clinic & Pharmacy Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure generic clinic identity, medicine collection point, opening hours, and operational queue thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearLocation}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            title="Tests unconfigured collection fallback notice for patients"
          >
            Clear Location (Test Fallback)
          </button>
          <button
            type="button"
            onClick={handleResetToStandardGeneric}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            Reset to Generic Defaults
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Settings saved. Updated collection instructions and clinic details are now live across patient portals.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Clinic Identity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-navy-900">Clinic Identity & Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinic Display Name *
              </label>
              <input
                type="text"
                required
                value={form.clinic_name}
                onChange={e => setForm({ ...form, clinic_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinic Tagline / Subtitle
              </label>
              <input
                type="text"
                value={form.clinic_tagline}
                onChange={e => setForm({ ...form, clinic_tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={form.clinic_phone}
                onChange={e => setForm({ ...form, clinic_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={form.clinic_email}
                onChange={e => setForm({ ...form, clinic_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Medicine Collection Location (Requirement 6) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-navy-900">Medicine Collection & Pharmacy Counter Setup</h2>
            </div>
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
              Requirement 6
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Configure the physical collection point and instructions shown to patients whenever their medicine request is confirmed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinic Address (Entered by Authorized Staff)
              </label>
              <input
                type="text"
                placeholder="e.g. 124 Healthcare Boulevard, Medical District"
                value={form.clinic_address}
                onChange={e => setForm({ ...form, clinic_address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Leave blank to test fallback notice: &quot;Collection location not configured — please contact clinic staff&quot;.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Collection Point / Counter Name
              </label>
              <input
                type="text"
                placeholder="e.g. Clinic Pharmacy Counter 1 or Reception Desk"
                value={form.collection_point}
                onChange={e => setForm({ ...form, collection_point: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dispensary Opening Hours
              </label>
              <input
                type="text"
                placeholder="e.g. 09:00 AM – 01:00 PM, 04:30 PM – 07:30 PM (Mon-Sat)"
                value={form.opening_hours}
                onChange={e => setForm({ ...form, opening_hours: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Patient Collection Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Please present your Patient ID and request reference number at the counter."
                value={form.collection_instructions}
                onChange={e => setForm({ ...form, collection_instructions: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
              Patient Collection Card Preview:
            </span>
            {form.clinic_address.trim() && form.collection_point.trim() ? (
              <div className="space-y-1 text-slate-600">
                <p><span className="font-semibold text-navy-900">Clinic:</span> {form.clinic_name || 'Community Health Clinic'}</p>
                <p><span className="font-semibold text-navy-900">Address:</span> {form.clinic_address}</p>
                <p><span className="font-semibold text-navy-900">Collection Point:</span> {form.collection_point}</p>
                <p><span className="font-semibold text-navy-900">Hours:</span> {form.opening_hours || 'Not configured'}</p>
                <p><span className="font-semibold text-navy-900">Instructions:</span> {form.collection_instructions}</p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Collection location not configured — please contact clinic staff</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Operational Queue & Stock Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-navy-900">Operational & Queue Estimation Defaults</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Service Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={form.default_service_duration}
                onChange={e => setForm({ ...form, default_service_duration: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Low-Stock Trigger Threshold
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={form.low_stock_threshold}
                onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expiry Warning Threshold (Days)
              </label>
              <input
                type="number"
                min="7"
                max="180"
                value={form.expiry_warning_days}
                onChange={e => setForm({ ...form, expiry_warning_days: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Clinic Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

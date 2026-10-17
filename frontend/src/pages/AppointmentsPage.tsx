import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Appointment, Patient, Provider } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  CalendarDays, Search, CalendarPlus, Clock, CheckCircle2, 
  RotateCcw, XCircle, Bell, ArrowRight, UserCheck, AlertTriangle
} from 'lucide-react';

export const AppointmentsPage: React.FC = () => {
  const { refreshKey, triggerRefresh, showToast, setActiveTab } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Book Appointment Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookData, setBookData] = useState({
    patient_id: '',
    provider_id: '1',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '11:30 AM',
    administrative_notes: ''
  });
  const [booking, setBooking] = useState(false);

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    new_date: new Date().toISOString().split('T')[0],
    new_time_slot: '02:30 PM',
    reason: 'Patient requested time adjustment'
  });
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getAppointments(undefined, statusFilter === 'All' ? undefined : statusFilter, search),
      api.getPatients()
    ])
      .then(([apptsData, patsData]) => {
        if (isMounted) {
          setAppointments(apptsData);
          setPatients(patsData);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to fetch appointments', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, statusFilter, search]);

  const handleConfirm = async (id: number) => {
    try {
      await api.confirmAppointment(id);
      showToast('Appointment confirmed successfully!', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm', 'error');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await api.cancelAppointment(id, 'Patient informed cancellation');
      showToast('Appointment cancelled.', 'info');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel', 'error');
    }
  };

  const handleMarkArrived = async (id: number) => {
    try {
      const updated = await api.markPatientArrived(id);
      showToast(`Patient arrived! Token generated in OPD Queue.`, 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to check in', 'error');
    }
  };

  const handleSimulateReminder = async (id: number, type: '30m' | '24h') => {
    try {
      const res = await api.simulateReminder(id, type);
      showToast(res.message, 'info');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookData.patient_id) {
      showToast('Please select a patient.', 'error');
      return;
    }
    setBooking(true);
    try {
      await api.createAppointment({
        patient_id: parseInt(bookData.patient_id),
        provider_id: parseInt(bookData.provider_id),
        appointment_date: bookData.appointment_date,
        time_slot: bookData.time_slot,
        administrative_notes: bookData.administrative_notes || 'Scheduled via reception desk'
      });
      showToast('Appointment booked successfully!', 'success');
      setBookModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Booking failed', 'error');
    } finally {
      setBooking(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setRescheduling(true);
    try {
      await api.rescheduleAppointment(selectedAppt.id, rescheduleData);
      showToast(`Appointment rescheduled to ${rescheduleData.new_date} at ${rescheduleData.new_time_slot}!`, 'success');
      setRescheduleModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Rescheduling failed', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-teal-600" />
            Appointment Management & Reminders
          </h1>
          <p className="text-xs text-slate-500">
            Schedule slots, confirm attendance, simulate 30-min reminders, and transfer arrived patients into queue tokens.
          </p>
        </div>

        <button
          onClick={() => setBookModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <Search className="w-4 h-4 text-slate-400 ml-1 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, doctor or token..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-hidden"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['All', 'Scheduled', 'Confirmed', 'Arrived', 'Completed', 'Rescheduled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                statusFilter === st
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date / Slot</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Assigned Doctor</th>
                <th className="py-3 px-4">Confirmation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI No-Show Risk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading appointment slots...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No appointments found matching current filters.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{appt.time_slot}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{appt.appointment_date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{appt.patient?.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {appt.patient?.dummy_patient_id} • {appt.patient?.contact_number || 'No contact'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{appt.provider?.name}</div>
                      <div className="text-[11px] text-slate-500">{appt.provider?.room_number}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          appt.confirmation_status === 'Confirmed'
                            ? 'success'
                            : appt.confirmation_status === 'Reminder Sent'
                            ? 'primary'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {appt.confirmation_status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        appt.status === 'Arrived'
                          ? 'bg-teal-100 text-teal-800'
                          : appt.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : appt.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800 line-through'
                          : appt.status === 'Rescheduled'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {appt.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            appt.no_show_risk_level === 'High'
                              ? 'danger'
                              : appt.no_show_risk_level === 'Medium'
                              ? 'warning'
                              : 'success'
                          }
                          size="sm"
                        >
                          {appt.no_show_risk_level} Risk ({Math.round((appt.no_show_risk_score || 0.1) * 100)}%)
                        </Badge>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Mark Arrived -> Queue Token */}
                        {appt.status !== 'Arrived' && appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleMarkArrived(appt.id)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition-colors flex items-center gap-1 text-[11px]"
                            title="Mark patient as arrived and generate queue token"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Arrived</span>
                          </button>
                        )}

                        {/* Confirm Button if unconfirmed */}
                        {appt.confirmation_status !== 'Confirmed' && appt.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleConfirm(appt.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md transition-colors flex items-center gap-1 text-[11px] border border-emerald-200"
                            title="Confirm appointment"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                        )}

                        {/* Simulate 30-min Reminder (Demo Action!) */}
                        {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleSimulateReminder(appt.id, '30m')}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-md transition-colors flex items-center gap-1 text-[11px] border border-sky-200"
                            title="Hackathon Demo: Simulate 30-min WhatsApp/SMS reminder immediately"
                          >
                            <Bell className="w-3 h-3 text-sky-600" />
                            <span className="hidden sm:inline">Simulate 30m</span>
                          </button>
                        )}

                        {/* Reschedule */}
                        {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                          <button
                            onClick={() => {
                              setSelectedAppt(appt);
                              setRescheduleData({
                                new_date: appt.appointment_date,
                                new_time_slot: '03:30 PM',
                                reason: 'Patient requested time change'
                              });
                              setRescheduleModalOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors text-[11px]"
                            title="Reschedule appointment"
                          >
                            Reschedule
                          </button>
                        )}

                        {/* Cancel */}
                        {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                          <button
                            onClick={() => handleCancel(appt.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Cancel appointment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title="Book New Appointment"
        subtitle="Schedules an OPD consultation slot for an existing registered patient."
        maxWidth="md"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient *
            </label>
            <select
              required
              value={bookData.patient_id}
              onChange={(e) => setBookData({ ...bookData, patient_id: e.target.value })}
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
              Doctor / OPD Provider *
            </label>
            <select
              required
              value={bookData.provider_id}
              onChange={(e) => setBookData({ ...bookData, provider_id: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              <option value="1">Dr. Arun Deshmukh (General Medicine • OPD-1)</option>
              <option value="2">Dr. Sneha Kulkarni (Pediatrics • OPD-2)</option>
              <option value="3">Dr. Rohit Nair (ENT • OPD-3)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={bookData.appointment_date}
                onChange={(e) => setBookData({ ...bookData, appointment_date: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot *
              </label>
              <select
                value={bookData.time_slot}
                onChange={(e) => setBookData({ ...bookData, time_slot: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
              >
                {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Administrative Notes
            </label>
            <textarea
              rows={2}
              value={bookData.administrative_notes}
              onChange={(e) => setBookData({ ...bookData, administrative_notes: e.target.value })}
              placeholder="e.g. Routine follow-up, BP check, fever complaint"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setBookModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={booking}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              {booking ? 'Scheduling...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        subtitle={selectedAppt ? `Patient: ${selectedAppt.patient?.full_name} • Current Slot: ${selectedAppt.appointment_date} ${selectedAppt.time_slot}` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Date *
            </label>
            <input
              type="date"
              required
              value={rescheduleData.new_date}
              onChange={(e) => setRescheduleData({ ...rescheduleData, new_date: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Time Slot *
            </label>
            <select
              value={rescheduleData.new_time_slot}
              onChange={(e) => setRescheduleData({ ...rescheduleData, new_time_slot: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              {['09:30 AM', '10:00 AM', '11:00 AM', '11:30 AM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Reschedule
            </label>
            <input
              type="text"
              value={rescheduleData.reason}
              onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduling}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              {rescheduling ? 'Rescheduling...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

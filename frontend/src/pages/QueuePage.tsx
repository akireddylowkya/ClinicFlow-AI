import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { QueueEntry, Patient } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  ListOrdered, Play, CheckCircle, Clock, UserCheck, 
  AlertCircle, Plus, Tv, Flame, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';

export const QueuePage: React.FC = () => {
  const { 
    refreshKey, triggerRefresh, showToast, 
    handleAdvanceQueue, isAdvancingQueue, setActiveTab,
    handleSimulatePeakArrivals
  } = useApp();

  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<'active' | 'completed'>('active');

  // Walk-in Token Modal
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenData, setTokenData] = useState({
    patient_id: '',
    provider_id: '1',
    priority: 'Normal',
    notes: 'Walk-in desk check-in'
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getQueue(),
      api.getPatients()
    ])
      .then(([qData, pData]) => {
        if (isMounted) {
          setQueueEntries(qData);
          setPatients(pData);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to fetch queue', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateQueueStatus(id, newStatus);
      showToast(`Token status updated to ${newStatus}`, 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const handlePriorityChange = async (id: number, newPriority: string) => {
    try {
      await api.updateQueuePriority(id, newPriority);
      showToast(`Priority adjusted to ${newPriority}. Wait times recalculated.`, 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Priority update failed', 'error');
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenData.patient_id) {
      showToast('Please select a patient.', 'error');
      return;
    }
    setGenerating(true);
    try {
      const entry = await api.addPatientToQueue({
        patient_id: parseInt(tokenData.patient_id),
        provider_id: parseInt(tokenData.provider_id),
        priority: tokenData.priority,
        notes: tokenData.notes
      });
      showToast(`Token ${entry.token_number} generated for ${entry.patient?.full_name}!`, 'success');
      setTokenModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate token', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const activeEntries = queueEntries.filter(q => q.status === 'Waiting' || q.status === 'In Consultation');
  const completedEntries = queueEntries.filter(q => q.status === 'Completed' || q.status === 'Cancelled');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-teal-600" />
            Live OPD Queue & Wait-Time Estimation
          </h1>
          <p className="text-xs text-slate-500">
            Real-time FIFO token scheduling with transparent priority rules (Emergency & Senior Citizen) and deterministic wait calculations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('public_tv')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
          >
            <Tv className="w-4 h-4 text-slate-500" />
            <span>Open Waiting Hall TV</span>
          </button>

          <button
            onClick={handleAdvanceQueue}
            disabled={isAdvancingQueue}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            title="Complete current consultation and call next waiting token"
          >
            <Play className="w-4 h-4 text-teal-400" />
            <span>{isAdvancingQueue ? 'Advancing...' : 'Call Next Token'}</span>
          </button>

          <button
            onClick={() => setTokenModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Walk-In Token</span>
          </button>
        </div>
      </div>

      {/* Explanatory Formula Banner */}
      <div className="p-3.5 bg-sky-50 border border-sky-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-sky-950">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <div>
            <span className="font-bold">Transparent Wait Calculation: </span>
            <span className="text-sky-800">
              Estimated wait = Remaining service time of patient in consultation + sum of estimated durations of eligible patients ahead.
            </span>
          </div>
        </div>

        <button
          onClick={handleSimulatePeakArrivals}
          className="self-start md:self-auto flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-[11px] font-semibold transition-colors"
          title="Demo Action: Adds 3 realistic walk-ins (Normal, Senior, Emergency) to show instant wait recalculation"
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Simulate Surge Arrivals</span>
        </button>
      </div>

      {/* Active vs Completed Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTabFilter('active')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTabFilter === 'active'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Active Queue ({activeEntries.length})</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTabFilter('completed')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTabFilter === 'completed'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Completed & Cancelled ({completedEntries.length})</span>
        </button>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Token #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Provider / Room</th>
                <th className="py-3 px-4">Queue Pos</th>
                <th className="py-3 px-4">Priority Policy</th>
                <th className="py-3 px-4">Est. Wait Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Calculating live queue positions...
                  </td>
                </tr>
              ) : (activeTabFilter === 'active' ? activeEntries : completedEntries).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No entries in this view.
                  </td>
                </tr>
              ) : (
                (activeTabFilter === 'active' ? activeEntries : completedEntries).map((entry) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      entry.status === 'In Consultation'
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-navy-900">
                      {entry.token_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{entry.patient?.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {entry.patient?.dummy_patient_id} • Age {entry.patient?.age}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{entry.provider?.room_number}</div>
                      <div className="text-[11px] text-slate-500">{entry.provider?.name}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {entry.status === 'In Consultation' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Serving Now
                        </span>
                      ) : (
                        `#${entry.queue_position}`
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            entry.priority === 'Emergency / Priority'
                              ? 'danger'
                              : entry.priority === 'Senior Citizen'
                              ? 'purple'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {entry.priority}
                        </Badge>

                        {/* Priority Quick Reorder Switcher */}
                        {entry.status === 'Waiting' && (
                          <select
                            value={entry.priority}
                            onChange={(e) => handlePriorityChange(entry.id, e.target.value)}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 border-none rounded p-1 text-slate-600 outline-hidden cursor-pointer"
                            title="Change Priority policy"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Senior Citizen">Senior Citizen</option>
                            <option value="Emergency / Priority">Emergency</option>
                          </select>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {entry.status === 'In Consultation' ? (
                        <span className="text-emerald-700 font-bold">In Room</span>
                      ) : (
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>~{entry.estimated_waiting_time} mins</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          entry.status === 'In Consultation'
                            ? 'success'
                            : entry.status === 'Waiting'
                            ? 'primary'
                            : entry.status === 'Completed'
                            ? 'neutral'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {entry.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {entry.status === 'Waiting' && (
                          <button
                            onClick={() => handleStatusChange(entry.id, 'In Consultation')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md transition-colors flex items-center gap-1 text-[11px]"
                            title="Start consultation"
                          >
                            <Play className="w-3 h-3" />
                            <span>Call In</span>
                          </button>
                        )}

                        {entry.status === 'In Consultation' && (
                          <button
                            onClick={() => handleStatusChange(entry.id, 'Completed')}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition-colors flex items-center gap-1 text-[11px]"
                            title="Mark consultation completed and record service duration"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Complete</span>
                          </button>
                        )}

                        {entry.status !== 'Completed' && entry.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleStatusChange(entry.id, 'Cancelled')}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors text-[11px]"
                            title="Cancel token"
                          >
                            Cancel
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

      {/* Generate Walk-In Token Modal */}
      <Modal
        isOpen={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        title="Generate OPD Queue Token"
        subtitle="Issues a sequential token (e.g. A-106) and inserts into the active queue with wait calculation."
        maxWidth="md"
      >
        <form onSubmit={handleGenerateToken} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient *
            </label>
            <select
              required
              value={tokenData.patient_id}
              onChange={(e) => setTokenData({ ...tokenData, patient_id: e.target.value })}
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
              value={tokenData.provider_id}
              onChange={(e) => setTokenData({ ...tokenData, provider_id: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              <option value="1">Dr. Arun Deshmukh (General Medicine • OPD-1)</option>
              <option value="2">Dr. Sneha Kulkarni (Pediatrics • OPD-2)</option>
              <option value="3">Dr. Rohit Nair (ENT • OPD-3)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Administrative Priority Policy
            </label>
            <select
              value={tokenData.priority}
              onChange={(e) => setTokenData({ ...tokenData, priority: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              <option value="Normal">Normal Queue (Standard FIFO)</option>
              <option value="Senior Citizen">Senior Citizen (Priority Assistance)</option>
              <option value="Emergency / Priority">Emergency / Priority Triage (Fast-track)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Desk Intake Notes
            </label>
            <input
              type="text"
              value={tokenData.notes}
              onChange={(e) => setTokenData({ ...tokenData, notes: e.target.value })}
              placeholder="e.g. Walk-in patient complaining of severe headache"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTokenModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              {generating ? 'Generating Token...' : 'Issue Token'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

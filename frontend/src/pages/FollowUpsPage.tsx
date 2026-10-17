import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { FollowUpTask, Patient } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  ClockAlert, CheckCircle2, Calendar, User, 
  Plus, AlertCircle, Check, ArrowRight
} from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  const { refreshKey, triggerRefresh, showToast, setActiveTab } = useApp();
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Task Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [taskData, setTaskData] = useState({
    patient_id: '',
    task_type: 'Pending Diagnostic Lab Report (Blood Panel)',
    due_date: new Date().toISOString().split('T')[0],
    responsible_staff: 'Receptionist',
    notes: 'Follow up with diagnostic lab for reports'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getFollowUps(statusFilter === 'All' ? undefined : statusFilter),
      api.getPatients()
    ])
      .then(([tData, pData]) => {
        if (isMounted) {
          setTasks(tData);
          setPatients(pData);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to fetch tasks', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, statusFilter]);

  const handleMarkCompleted = async (id: number) => {
    try {
      await api.updateFollowUpStatus(id, { status: 'Completed' });
      showToast('Follow-up task marked as Completed!', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData.patient_id) {
      showToast('Please select a patient.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.createFollowUp({
        patient_id: parseInt(taskData.patient_id),
        task_type: taskData.task_type,
        due_date: taskData.due_date,
        responsible_staff: taskData.responsible_staff,
        notes: taskData.notes
      });
      showToast('Follow-up task created successfully!', 'success');
      setAddModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <ClockAlert className="w-5 h-5 text-teal-600" />
            Follow-Up & Diagnostic Report Tracker
          </h1>
          <p className="text-xs text-slate-500">
            Post-consultation administrative tracking, pending lab results, and patient re-evaluation reminders.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Follow-Up Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {['All', 'Pending', 'Overdue', 'Completed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              statusFilter === st
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {st} Tasks
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Task Description</th>
              <th className="py-3 px-4">Assigned Staff</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading follow-up tasks...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No tasks matching "{statusFilter}".
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    task.status === 'Overdue' ? 'bg-rose-50/30' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{task.due_date}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{task.patient?.full_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {task.patient?.dummy_patient_id} • {task.patient?.contact_number || 'No contact'}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{task.task_type}</div>
                    {task.notes && <div className="text-[11px] text-slate-500 mt-0.5">{task.notes}</div>}
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {task.responsible_staff}
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        task.status === 'Completed'
                          ? 'success'
                          : task.status === 'Overdue'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {task.status}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {task.status !== 'Completed' && (
                        <button
                          onClick={() => handleMarkCompleted(task.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md transition-colors flex items-center gap-1 text-[11px] border border-emerald-200"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveTab('appointments')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors text-[11px]"
                        title="Book follow-up appointment"
                      >
                        Book Slot
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Schedule Follow-Up Task"
        subtitle="Assign a post-consultation check or report retrieval reminder."
        maxWidth="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient *
            </label>
            <select
              required
              value={taskData.patient_id}
              onChange={(e) => setTaskData({ ...taskData, patient_id: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              <option value="">-- Choose patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.dummy_patient_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Type *
            </label>
            <select
              value={taskData.task_type}
              onChange={(e) => setTaskData({ ...taskData, task_type: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              <option value="Follow-up Consultation">Follow-up Consultation</option>
              <option value="Pending Diagnostic Lab Report (Blood Panel)">Pending Lab Report Review</option>
              <option value="Blood Pressure & Vitals Check">Blood Pressure & Vitals Check</option>
              <option value="Medication Adherence Review">Medication Adherence Review</option>
              <option value="Chest X-Ray / Ultrasound Verification">Radiology / Imaging Verification</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={taskData.due_date}
                onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsible Staff *
              </label>
              <input
                type="text"
                required
                value={taskData.responsible_staff}
                onChange={(e) => setTaskData({ ...taskData, responsible_staff: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes & Action Steps
            </label>
            <textarea
              rows={2}
              value={taskData.notes}
              onChange={(e) => setTaskData({ ...taskData, notes: e.target.value })}
              placeholder="e.g. Call patient to ensure fasting blood sugar test is done prior to visit"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

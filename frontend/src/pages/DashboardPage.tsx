import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { 
  Users, Calendar, Clock, CheckCircle, AlertTriangle, 
  BrainCircuit, ArrowRight, UserPlus, CalendarPlus,
  Pill, AlertCircle, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend 
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { refreshKey, triggerRefresh, setActiveTab, role, clinicSettings } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getDashboardMetrics()
      .then((data) => {
        if (isMounted) {
          setMetrics(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load live metrics');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Connecting to clinic database...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-950">Unable to Fetch Dashboard Data</h3>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={triggerRefresh}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {clinicSettings?.clinic_name || 'Clinic'} Operations Command
            </h1>

            <Badge variant="success" size="sm">
              Role: {role}
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            Real-time OPD patient flow, dynamic queue wait times, and predictive congestion intelligence.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('patients')}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Patient</span>
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors border border-white/20"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
          <button
            onClick={triggerRefresh}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            title="Refresh database metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Appointments Today"
          value={metrics?.appointments_today || 0}
          subtitle={`${metrics?.appointments_awaiting_confirmation || 0} unconfirmed`}
          icon={Calendar}
          color="blue"
          trend={`${metrics?.upcoming_appointments_count || 0} upcoming`}
          trendType="neutral"
          onClick={() => setActiveTab('appointments')}
        />

        <MetricCard
          title="Patients Waiting"
          value={metrics?.patients_waiting || 0}
          subtitle={`Avg Est Wait: ~${metrics?.avg_estimated_wait_time_min || 0} mins`}
          icon={Clock}
          color="teal"
          trend={`${metrics?.patients_in_consultation || 0} in consultation`}
          trendType="positive"
          onClick={() => setActiveTab('queue')}
        />

        <MetricCard
          title="Completed Consults"
          value={metrics?.completed_consultations || 0}
          subtitle={`Avg Service: ${metrics?.avg_actual_service_duration_min || 12} mins`}
          icon={CheckCircle}
          color="emerald"
          trend="Today's OPD"
          trendType="positive"
          onClick={() => setActiveTab('queue')}
        />

        <MetricCard
          title="Pharmacy Alerts"
          value={(metrics?.medicines_running_low_count || 0) + (metrics?.medicine_batches_nearing_expiry_count || 0)}
          subtitle={`${metrics?.expired_batches_count || 0} expired batch blocked`}
          icon={Pill}
          color="rose"
          trend={`${metrics?.medicines_running_low_count || 0} low stock`}
          trendType="negative"
          onClick={() => setActiveTab('inventory')}
        />
      </div>

      {/* Main Grid: Chart + Live Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Flow Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">
                Today's Patient Arrival & Consultation Throughput
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled slots vs. actual patient desk arrivals across OPD operating hours
              </p>
            </div>
            <button
              onClick={() => setActiveTab('ai')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View Forecasts <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.hourly_arrival_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="scheduled" name="Booked Slots" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="arrivals" name="Actual Arrivals" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed Consults" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Queue Preview (1 col) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Live OPD Queue</h3>
                <p className="text-xs text-slate-500">Active tokens currently in facility</p>
              </div>
              <button
                onClick={() => setActiveTab('queue')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                Full Queue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {metrics?.live_queue_preview && metrics.live_queue_preview.length > 0 ? (
                metrics.live_queue_preview.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-800">
                        {q.token_number}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{q.patient?.full_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {q.provider?.room_number} • {q.provider?.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          q.status === 'In Consultation' ? 'success' : 'primary'
                        }
                        size="sm"
                      >
                        {q.status}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {q.status === 'In Consultation' ? 'In Room' : `~${q.estimated_waiting_time}m wait`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No active patients waiting in queue.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
              <span className="font-medium">Estimated Peak Congestion:</span>
              <span className="font-bold text-teal-700">{metrics?.predicted_congestion_next_hour}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: AI Insights + Alerts + Follow-Ups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* AI Operational Insights */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy-900">AI Operational Insights</h3>
              <p className="text-[11px] text-slate-500">Explainable operational forecasts</p>
            </div>
          </div>

          <div className="space-y-3">
            {metrics?.ai_insights.map((ins, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    {ins.category}
                  </span>
                  <Badge variant={ins.level === 'danger' ? 'danger' : ins.level === 'warning' ? 'warning' : 'success'} size="sm">
                    {ins.level}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{ins.title}</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">{ins.description}</p>
                <div className="pt-1 text-[11px] font-medium text-teal-800">
                  💡 {ins.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medicine Inventory Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-900">Inventory & Expiry Warnings</h3>
                <p className="text-[11px] text-slate-500">Configured safety thresholds</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Pharmacy
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.medicine_alerts && metrics.medicine_alerts.length > 0 ? (
              metrics.medicine_alerts.map((al, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    al.type === 'danger'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : al.type === 'warning'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-sky-50/70 border-sky-200 text-sky-900'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{al.title}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">{al.type}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{al.message}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No active inventory warnings.</p>
            )}
          </div>
        </div>

        {/* Pending Follow-Ups & Diagnostic Lab Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-900">Follow-Ups & Lab Reports</h3>
                <p className="text-[11px] text-slate-500">{metrics?.pending_follow_ups_count || 0} pending tasks</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('followups')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.follow_up_tasks_preview && metrics.follow_up_tasks_preview.length > 0 ? (
              metrics.follow_up_tasks_preview.map((f) => (
                <div key={f.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{f.patient?.full_name}</span>
                    <Badge variant={f.status === 'Overdue' ? 'danger' : 'warning'} size="sm">
                      {f.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{f.task_type}</p>
                  <p className="text-[10px] text-slate-400">
                    Due: {f.due_date} • Assigned: {f.responsible_staff}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No pending follow-up tasks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

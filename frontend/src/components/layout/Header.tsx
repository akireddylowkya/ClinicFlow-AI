import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RoleSwitcher } from './RoleSwitcher';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { 
  Activity, RotateCcw, Clock, Calendar, 
  Tv, Play
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    handleResetDemo, isResetting, 
    clinicSettings, role,
    setActiveTab, handleAdvanceQueue, isAdvancingQueue 
  } = useApp();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Date formatting DD/MM/YYYY
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCurrentDate(`${day}/${month}/${year}`);

      // 12-hour time formatting
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Dynamic Clinic Meta */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-sky-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-navy-900">
                  ClinicFlow <span className="text-teal-600">AI</span>
                </span>
                {role && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/60 uppercase">
                    {role} Active
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 truncate max-w-[280px] sm:max-w-md">
                {clinicSettings?.clinic_name || 'Community Health Clinic'}
                {clinicSettings?.clinic_address ? ` • ${clinicSettings.clinic_address}` : ''}
              </p>
            </div>
          </div>

          {/* Central User Portal Badge / Role */}
          <div className="hidden lg:flex items-center">
            <RoleSwitcher />
          </div>

          {/* Right Controls: Date/Time, Quick Advance, Reset */}
          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className="hidden md:flex flex-col items-end text-xs text-slate-500 pr-2 border-r border-slate-200">
              <div className="flex items-center gap-1 font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{currentTime}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{currentDate}</span>
              </div>
            </div>

            {/* Quick Next Patient Token advance (Staff & Doctor only) */}
            {(role === 'Staff' || role === 'Doctor') && (
              <button
                onClick={handleAdvanceQueue}
                disabled={isAdvancingQueue}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors"
                title="Advances current patient to completed and calls next waiting patient"
              >
                <Play className="w-3.5 h-3.5 text-teal-600" />
                <span>Next Token</span>
              </button>
            )}

            {/* Waiting TV Display shortcut (Staff only) */}
            {role === 'Staff' && (
              <button
                onClick={() => setActiveTab('public_tv')}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                title="Open Patient-Facing Waiting Hall Display"
              >
                <Tv className="w-3.5 h-3.5 text-slate-600" />
                <span>TV Display</span>
              </button>
            )}

            {/* Reset Demo Data Button */}
            <button
              onClick={() => setConfirmResetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors"
              title="Reset database back to initial clean demo scenario"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Mobile User Profile bar */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex lg:hidden justify-center">
          <RoleSwitcher />
        </div>
      </header>

      {/* Confirmation Dialog for Demo Reset */}
      <ConfirmDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={async () => {
          setConfirmResetOpen(false);
          await handleResetDemo();
        }}
        title="Reset Demo Dataset?"
        message="This will restore the database to the seeded demo scenario with sample patients, appointments, pharmacy stock, and consult records. Any testing changes made during this session will be reset."
        confirmText="Confirm Reset"
        isDestructive={true}
        isLoading={isResetting}
      />
    </>
  );
};

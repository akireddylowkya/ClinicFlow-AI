import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserCheck, Stethoscope, User, LogOut } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, role, logout } = useApp();

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
        <User className="w-3.5 h-3.5 text-teal-600" />
        <span>Authentication Portal</span>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch (role) {
      case 'Doctor':
        return <Stethoscope className="w-4 h-4 text-emerald-600" />;
      case 'Staff':
        return <UserCheck className="w-4 h-4 text-sky-600" />;
      case 'Patient':
      default:
        return <User className="w-4 h-4 text-teal-600" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'Doctor':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Staff':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Patient':
      default:
        return 'bg-teal-50 text-teal-800 border-teal-200';
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
          {getRoleIcon()}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-navy-900 leading-tight">
            {currentUser.full_name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${getRoleBadgeColor()}`}>
              {role} Portal
            </span>
            {currentUser.patient_id && (
              <span className="text-[10px] font-mono text-slate-500">
                PAT-{1000 + currentUser.patient_id}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-1 ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
        title="Sign Out to Role Selection Portal"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>
    </div>
  );
};

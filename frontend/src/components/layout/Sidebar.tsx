import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, Users, CalendarDays, ListOrdered, 
  FileText, Pill, ClockAlert, ShoppingBag, 
  User, FolderUp, Clock, Bell, Settings, Stethoscope, ShieldCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, role, currentUser } = useApp();

  if (!currentUser || !role) {
    return null;
  }

  // Role-specific navigation menus
  const patientNavItems = [
    { id: 'patient_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patient_profile', label: 'My Profile', icon: User },
    { id: 'patient_appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'patient_visits', label: 'Visit History', icon: Clock },
    { id: 'patient_documents', label: 'Documents', icon: FolderUp },
    { id: 'patient_prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'patient_medicine', label: 'Medicine Availability', icon: Pill },
    { id: 'patient_followups', label: 'Follow-ups', icon: ClockAlert },
    { id: 'patient_notifications', label: 'Notifications', icon: Bell },
  ];

  const doctorNavItems = [
    { id: 'doctor_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'doctor_appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'doctor_patients', label: 'Patient Records', icon: Users },
    { id: 'doctor_consultations', label: 'Consultations', icon: Stethoscope },
    { id: 'doctor_prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'doctor_followups', label: 'Follow-ups', icon: ClockAlert },
  ];

  const staffNavItems = [
    { id: 'staff_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff_patients', label: 'Patients', icon: Users },
    { id: 'staff_appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'staff_queue', label: 'Queue', icon: ListOrdered },
    { id: 'staff_inventory', label: 'Medicine Inventory', icon: Pill },
    { id: 'staff_medicine_requests', label: 'Medicine Requests', icon: ShoppingBag },
    { id: 'staff_followups', label: 'Follow-ups', icon: ClockAlert },
    { id: 'staff_notifications', label: 'Notifications', icon: Bell },
    { id: 'staff_settings', label: 'Clinic Settings', icon: Settings },
  ];

  let currentNavItems = staffNavItems;
  let portalTitle = 'Staff Portal';
  if (role === 'Patient') {
    currentNavItems = patientNavItems;
    portalTitle = 'Patient Portal';
  } else if (role === 'Doctor') {
    currentNavItems = doctorNavItems;
    portalTitle = 'Doctor Portal';
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-[calc(100vh-65px)] sticky top-[65px] select-none">
      <div className="p-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {portalTitle}
        </div>

        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/60 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-navy-900">ClinicFlow AI</span>
            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/50">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Role: <span className="font-semibold text-slate-700">{role}</span>
          </p>
        </div>
      </div>
    </aside>
  );
};

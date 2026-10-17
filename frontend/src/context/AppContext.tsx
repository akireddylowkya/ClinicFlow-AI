import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, User, ClinicSettings } from '../types';
import { api } from '../services/api';

const PATIENT_TABS = [
  'patient_dashboard',
  'patient_profile',
  'patient_appointments',
  'patient_visits',
  'patient_documents',
  'patient_prescriptions',
  'patient_medicine',
  'patient_followups',
  'patient_notifications'
];

const DOCTOR_TABS = [
  'doctor_dashboard',
  'doctor_appointments',
  'doctor_patients',
  'doctor_consultations',
  'doctor_prescriptions',
  'doctor_followups'
];

const STAFF_TABS = [
  'staff_dashboard',
  'staff_patients',
  'staff_appointments',
  'staff_queue',
  'staff_inventory',
  'staff_medicine_requests',
  'staff_followups',
  'staff_notifications',
  'staff_settings',
  'public_tv'
];

interface AppContextType {
  currentUser: User | null;
  role: UserRole | null;
  login: (user: User) => void;
  logout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clinicSettings: ClinicSettings | null;
  refreshClinicSettings: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isResetting: boolean;
  handleResetDemo: () => Promise<void>;
  isAdvancingQueue: boolean;
  handleAdvanceQueue: () => Promise<void>;
  handleSimulatePeakArrivals: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('clinicflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const role: UserRole | null = currentUser?.role || null;

  const getDefaultTabForRole = (r: UserRole | null): string => {
    if (r === 'Patient') return 'patient_dashboard';
    if (r === 'Doctor') return 'doctor_dashboard';
    if (r === 'Staff') return 'staff_dashboard';
    return 'login';
  };

  const [activeTab, setActiveTabInternal] = useState<string>(() => {
    if (!currentUser) return 'login';
    return getDefaultTabForRole(currentUser.role);
  });

  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isAdvancingQueue, setIsAdvancingQueue] = useState(false);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const refreshClinicSettings = async () => {
    try {
      const data = await api.getSettings();
      setClinicSettings(data);
    } catch (err) {
      console.error('Failed to load clinic settings', err);
    }
  };

  useEffect(() => {
    refreshClinicSettings();
  }, [refreshKey]);

  // Role-Based Access Control Tab Setter
  const setActiveTab = (tab: string) => {
    if (!currentUser) {
      setActiveTabInternal('login');
      return;
    }

    if (currentUser.role === 'Patient') {
      const aliasMap: Record<string, string> = {
        dashboard: 'patient_dashboard',
        profile: 'patient_profile',
        appointments: 'patient_appointments',
        visits: 'patient_visits',
        documents: 'patient_documents',
        prescriptions: 'patient_prescriptions',
        medicine: 'patient_medicine',
        followups: 'patient_followups',
        notifications: 'patient_notifications'
      };
      const resolved = aliasMap[tab] || tab;
      if (PATIENT_TABS.includes(resolved)) {
        setActiveTabInternal(resolved);
      } else {
        setActiveTabInternal('patient_dashboard');
      }
    } else if (currentUser.role === 'Doctor') {
      const aliasMap: Record<string, string> = {
        dashboard: 'doctor_dashboard',
        appointments: 'doctor_appointments',
        patients: 'doctor_patients',
        consultations: 'doctor_consultations',
        prescriptions: 'doctor_prescriptions',
        followups: 'doctor_followups'
      };
      const resolved = aliasMap[tab] || tab;
      if (DOCTOR_TABS.includes(resolved)) {
        setActiveTabInternal(resolved);
      } else {
        setActiveTabInternal('doctor_dashboard');
      }
    } else if (currentUser.role === 'Staff') {
      const aliasMap: Record<string, string> = {
        dashboard: 'staff_dashboard',
        patients: 'staff_patients',
        appointments: 'staff_appointments',
        queue: 'staff_queue',
        inventory: 'staff_inventory',
        medicine_requests: 'staff_medicine_requests',
        followups: 'staff_followups',
        notifications: 'staff_notifications',
        settings: 'staff_settings'
      };
      const resolved = aliasMap[tab] || tab;
      if (STAFF_TABS.includes(resolved)) {
        setActiveTabInternal(resolved);
      } else {
        setActiveTabInternal('staff_dashboard');
      }
    } else {
      setActiveTabInternal('login');
    }
  };

  const login = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('clinicflow_user', JSON.stringify(user));
    } catch (_) {}
    const defaultTab = getDefaultTabForRole(user.role);
    setActiveTabInternal(defaultTab);
    showToast(`Signed in successfully as ${user.full_name} (${user.role})`, 'success');
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('clinicflow_user');
    } catch (_) {}
    setActiveTabInternal('login');
    showToast('Signed out of ClinicFlow AI', 'info');
  };

  // If user role changes or currentUser is null, enforce tab
  useEffect(() => {
    if (!currentUser) {
      setActiveTabInternal('login');
    } else {
      const currentRole = currentUser.role;
      if (currentRole === 'Patient' && !PATIENT_TABS.includes(activeTab)) {
        setActiveTabInternal('patient_dashboard');
      } else if (currentRole === 'Doctor' && !DOCTOR_TABS.includes(activeTab)) {
        setActiveTabInternal('doctor_dashboard');
      } else if (currentRole === 'Staff' && !STAFF_TABS.includes(activeTab)) {
        setActiveTabInternal('staff_dashboard');
      }
    }
  }, [currentUser]);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetDemoData();
      showToast(res.message, 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset demo data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleAdvanceQueue = async () => {
    setIsAdvancingQueue(true);
    try {
      const res = await api.advanceQueueStep();
      showToast(res.message, 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to advance queue', 'error');
    } finally {
      setIsAdvancingQueue(false);
    }
  };

  const handleSimulatePeakArrivals = async () => {
    try {
      const res = await api.simulatePeakArrivals();
      showToast(res.message, 'info');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to simulate arrivals', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        role,
        login,
        logout,
        activeTab,
        setActiveTab,
        clinicSettings,
        refreshClinicSettings,
        refreshKey,
        triggerRefresh,
        toast,
        showToast,
        isResetting,
        handleResetDemo,
        isAdvancingQueue,
        handleAdvanceQueue,
        handleSimulatePeakArrivals,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { DoctorPortalPage } from './pages/DoctorPortalPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { QueuePage } from './pages/QueuePage';
import { InventoryPage } from './pages/InventoryPage';
import { StaffMedicineRequestsPage } from './pages/StaffMedicineRequestsPage';
import { StaffSettingsPage } from './pages/StaffSettingsPage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { AiForecastingPage } from './pages/AiForecastingPage';
import { PatientQueueDisplay } from './components/public/PatientQueueDisplay';

const MainContent: React.FC = () => {
  const { activeTab, currentUser, role } = useApp();

  // Public TV Display route (accessible even if unauthenticated if needed)
  if (activeTab === 'public_tv') {
    return <PatientQueueDisplay />;
  }

  // If unauthenticated or on login tab, show 3-portal Login landing page
  if (!currentUser || activeTab === 'login') {
    return <LoginPage />;
  }

  // 1. Patient Portal
  if (role === 'Patient') {
    return <PatientPortalPage />;
  }

  // 2. Doctor Portal
  if (role === 'Doctor') {
    return <DoctorPortalPage />;
  }

  // 3. Staff Portal
  if (role === 'Staff') {
    switch (activeTab) {
      case 'staff_dashboard':
      case 'dashboard':
        return <DashboardPage />;
      case 'staff_patients':
      case 'patients':
        return <PatientsPage />;
      case 'staff_appointments':
      case 'appointments':
        return <AppointmentsPage />;
      case 'staff_queue':
      case 'queue':
        return <QueuePage />;
      case 'staff_inventory':
      case 'inventory':
        return <InventoryPage />;
      case 'staff_medicine_requests':
      case 'medicine_requests':
        return <StaffMedicineRequestsPage />;
      case 'staff_followups':
      case 'staff_notifications':
      case 'followups':
        return <FollowUpsPage />;
      case 'staff_settings':
      case 'settings':
        return <StaffSettingsPage />;
      case 'ai':
        return <AiForecastingPage />;
      default:
        return <DashboardPage />;
    }
  }

  // Fallback
  return <LoginPage />;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppShell>
        <MainContent />
      </AppShell>
    </AppProvider>
  );
};

export default App;

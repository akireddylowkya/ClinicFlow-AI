import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { toast, currentUser, activeTab } = useApp();

  const isLoginPage = !currentUser || activeTab === 'login';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header />

      <div className="flex-1 flex">
        {!isLoginPage && <Sidebar />}
        <main className={`flex-1 overflow-y-auto ${isLoginPage ? 'p-0 w-full' : 'p-6 md:p-8 max-w-7xl mx-auto w-full'}`}>
          {children}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-white text-slate-900 animate-in fade-in slide-in-from-top-2 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />}
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Tv, Clock, ArrowLeft, Volume2, ShieldCheck, Activity } from 'lucide-react';

export const PatientQueueDisplay: React.FC = () => {
  const { setActiveTab } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDisplay = () => {
      api.getPublicQueueDisplay()
        .then((res) => {
          if (isMounted) setData(res);
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    fetchDisplay();
    // Auto-refresh every 5 seconds for live TV display
    const interval = setInterval(fetchDisplay, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-slate-900 text-white min-h-[85vh] rounded-3xl p-6 md:p-10 flex flex-col justify-between space-y-8 shadow-2xl border border-slate-800">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/40">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {data?.clinic_name || 'Community Health Clinic'}
            </h1>

            <p className="text-xs md:text-sm text-teal-400 font-semibold tracking-wide flex items-center gap-2 mt-0.5">
              <span>OPD Waiting Hall Token Display</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Patient Privacy Protected (Zero Clinical Data)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white tracking-wider">
              {data?.current_time || '10:15 AM'}
            </div>
            <span className="text-xs text-slate-400 font-medium">Live Auto-Syncing</span>
          </div>

          <button
            onClick={() => setActiveTab('queue')}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Return to Staff Queue Management"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* OPD Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
        {data?.rooms?.map((room: any, idx: number) => (
          <div
            key={idx}
            className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 shadow-lg flex flex-col justify-between space-y-6"
          >
            {/* Room Header */}
            <div className="border-b border-slate-700/60 pb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  {room.room_number}
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  {room.doctor_display}
                </h3>
                <p className="text-xs text-slate-400">{room.specialization}</p>
              </div>

              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" title="Consulting" />
            </div>

            {/* Current Token Called */}
            <div className="text-center py-4 bg-slate-900/60 rounded-xl border border-teal-500/30 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Currently In Consultation
              </span>
              <div className="text-4xl md:text-5xl font-mono font-black text-teal-300 tracking-tight">
                {room.current_token}
              </div>
            </div>

            {/* Upcoming Next Tokens List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                <span>Next in Queue</span>
                <span>Est. Wait</span>
              </div>

              {room.next_tokens && room.next_tokens.length > 0 ? (
                room.next_tokens.map((tok: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/40 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-white">
                        {tok.token}
                      </span>
                      {tok.priority !== 'Normal' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {tok.priority === 'Senior Citizen' ? 'Senior' : 'Priority'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span>~{tok.estimated_wait_min} mins</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No patients waiting for this OPD.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ticker / Announcement Bar */}
      <div className="bg-teal-950/80 border border-teal-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-teal-200">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-teal-400 animate-pulse flex-shrink-0" />
          <span className="font-medium tracking-wide">
            {data?.announcement || 'Please proceed to your assigned OPD room when your token is called.'}
          </span>
        </div>

        <span className="text-[11px] text-teal-400 font-mono hidden sm:inline">
          ClinicFlow AI Smart Platform
        </span>

      </div>
    </div>
  );
};

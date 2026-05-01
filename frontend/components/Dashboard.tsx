'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Target, Calendar, TrendingUp, Zap, X, Briefcase } from 'lucide-react';
import { signIn } from 'next-auth/react';
import StatsChart from './StatsChart';

interface DashboardProps {
  activeName: string;
  session: any;
  stats: any;
  aiSuggestions: any[];
  syncStatus: { added: number } | null;
  setSyncStatus: (val: any) => void;
  STATUSES: string[];
}

export default function Dashboard({
  activeName,
  session,
  stats,
  aiSuggestions,
  syncStatus,
  setSyncStatus,
  STATUSES
}: DashboardProps) {

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Welcome back, {activeName?.split(' ')[0]}
          </h2>
          <p className="text-white/70">
            Here's what's happening with your applications.
          </p>
        </div>

        {syncStatus && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-2 pl-4 rounded-2xl flex items-center gap-4"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
              <p className="text-xs font-bold text-white/80">
                {syncStatus.added > 0 ? `${syncStatus.added} New Jobs Found` : "Gmail Synced"}
              </p>
            </div>

            <button
              onClick={() => setSyncStatus(null)}
              className="p-2 rounded-xl hover:bg-white/10 transition"
            >
              <X size={14} className="text-white/50" />
            </button>
          </motion.div>
        )}
      </div>

      {/* AI INSIGHTS */}
      {aiSuggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiSuggestions.slice(0, 3).map((s, i) => (
            <motion.div
              key={i}
              className="p-6 rounded-[20px] flex flex-col justify-between"
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2.5 rounded-2xl ${
                    s.priority === 'high'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <Sparkles size={18} />
                </div>

                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                  Insight {i + 1}
                </span>
              </div>

              <p className="text-sm font-semibold text-white/80 leading-relaxed">
                {s.message}
              </p>

              <div className="mt-4 pt-4 border-t border-white/10 cursor-pointer flex items-center gap-2 text-blue-400 text-xs font-bold">
                Take Action <ArrowRight size={14} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MAIN ANALYTICS */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* CHART */}
          <div
            className="lg:col-span-8 p-8 rounded-[20px]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Application Pipeline
              </h3>
            </div>

            <StatsChart
              data={STATUSES.map(s => ({
                name: s,
                value: stats.by_status[s] || 0
              }))}
              height="h-[300px]"
            />
          </div>

          {/* METRICS */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-4">
            {[
              { label: 'Total Tracked', value: stats.total, icon: Target },
              { label: 'Active Interviews', value: stats.by_status.Interview, icon: Calendar },
              { label: 'Success Rate', value: `${stats.response_rate}%`, icon: TrendingUp },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="p-6 rounded-[15px] flex items-center gap-5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(25px)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
                  <s.icon size={24} />
                </div>

                <div>
                  <div className="text-2xl font-black text-white leading-none">
                    {s.value}
                  </div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                    {s.label}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* PRO CARD */}
            <div
              className="p-6 rounded-[15px] text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #050c2bff, #0F172A)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <div className="relative z-10">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                  Pro Feature
                </p>

                <p className="text-sm font-bold leading-snug">
                  Unlock deeper market insights & salary benchmarking.
                </p>
              </div>

              <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12" />
            </div>

          </div>
        </div>
      )}

      {/* SIGNED OUT */}
      {!session && (
        <div
          className="relative py-24 rounded-[48px] flex flex-col items-center text-center overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(60px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full" />

          <div className="relative z-10 max-w-md">
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Briefcase size={40} className="text-blue-400" />
            </div>

            <h2 className="text-4xl font-black text-white mb-4">
              Your Career
            </h2>

            <p className="text-white/60 mb-10">
              Join thousands of professionals using AI to manage their job search pipeline.
            </p>

            <button
              onClick={() => signIn('google')}
              className="px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
              style={{
                background: '#0F52BA',
                color: '#fff'
              }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Target, Zap, BarChart3, Sparkles } from 'lucide-react';

interface AnalyticsProps {
  trends: any;
  STATUSES: string[];
}

export default function Analytics({ trends, STATUSES }: AnalyticsProps) {

  if (!trends || trends.metrics.total_applications === 0) {
    return (
      <div
        className="rounded-[40px] p-20 text-center"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(60px)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <TrendingUp size={50} className="text-white/30 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">No Data Yet</h3>
        <p className="text-white/50">Add applications to unlock insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          Analytics Overview
        </h2>
        <p className="text-white/60">Deep insights into your job search</p>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Applications', value: trends.metrics.total_applications, icon: Target },
          { label: 'Interview Rate', value: `${trends.metrics.interview_rate}%`, icon: Zap },
          { label: 'Offer Rate', value: `${trends.metrics.offer_rate}%`, icon: TrendingUp },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="p-6 rounded-[28px] flex items-center gap-5"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
              <item.icon size={24} />
            </div>

            <div>
              <div className="text-2xl font-black text-white">{item.value}</div>
              <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
                {item.label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* FUNNEL */}
        <div
          className="lg:col-span-7 p-8 rounded-[32px]"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">Funnel Conversion</h3>
          </div>

          <div className="space-y-5">
            {STATUSES.map((status, i) => {
              const count = trends.status_distribution[status] || 0;
              const total = trends.metrics.total_applications;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70 font-semibold">{status}</span>
                    <span className="text-white/40">{count} ({percent}%)</span>
                  </div>

                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-5 space-y-6">

          {/* PLATFORM */}
          <div
            className="p-8 rounded-[32px]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <h3 className="text-lg font-bold text-white mb-6">
              Platform Distribution
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(trends.platform_distribution || {}).map(([p, c]) => (
                <div
                  key={p}
                  className="p-4 rounded-xl text-center"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div className="text-xl font-bold text-white">{c as number}</div>
                  <div className="text-xs text-white/40 uppercase">{p}</div>
                </div>
              ))}
            </div>
          </div>

          {/* INSIGHT CARD */}
          <div
            className="p-6 rounded-[32px] text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #020617, #0F172A)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div className="relative z-10">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 border border-blue-500/30">
                <Sparkles size={18} className="text-blue-400" />
              </div>

              <h4 className="font-bold text-lg mb-2">Strategy Insight</h4>

              <p className="text-xs text-white/50">
                Your interview rate is {trends.metrics.interview_rate}% — focus on
                {` ${Object.keys(trends.platform_distribution)[0] || ' top platforms'}`} for better ROI.
              </p>
            </div>

            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500 blur-[100px] opacity-20" />
          </div>

        </div>
      </div>

      {/* MONTHLY TREND */}
      <div
        className="p-8 rounded-[32px]"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <h3 className="text-lg font-bold text-white mb-6">
          Monthly Applications
        </h3>
        <div className="flex items-end gap-6 h-56">
          {(() => {
            const values = Object.values(trends.monthly_applications || {}).map(v => Number(v) || 0);
            const max = Math.max(...values, 1);
            return Object.entries(trends.monthly_applications || {}).map(([month, count], i) => {
              const safeCount = Number(count) || 0;
              const height = Math.max((safeCount / max) * 100, 8);
              return (
                <div key={month} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full flex justify-center items-end h-48">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1.2, delay: i * 0.08 }}
                      className="w-10 rounded-2xl bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400"
                    />

                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition">
                      <div className="bg-[#020617] text-white px-3 py-1 rounded-lg text-xs shadow-lg border border-white/10">
                        {safeCount} jobs
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-white/40 mt-3 font-medium">
                    {month.substring(0, 3)}
                  </span>

                </div>
              );
            });
          })()}
        </div>
      </div>

    </div>
  );
}
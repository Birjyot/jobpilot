"use client";

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export default function StatsChart({ data, height = "h-full" }) {

  if (!data || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-20 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <TrendingUp size={48} className="text-white/30 mb-4" />
        <p className="text-white/50 font-medium">
          Analytics will appear once you add applications
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={`w-full ${height} min-h-[300px] p-5 rounded-[28px] relative overflow-hidden`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {/* HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Application Pipeline
          </h3>
          <p className="text-xs text-white/40 mt-1">
            Status distribution overview
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'rgba(59,130,246,0.12)',
            color: '#60A5FA',
            border: '1px solid rgba(59,130,246,0.25)'
          }}
        >
          <Sparkles size={12} />
          Live
        </div>
      </div>

      {/* CHART */}
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>

          {/* GRADIENT */}
          <defs>
            <linearGradient id="premiumBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0F52BA" stopOpacity={0.6} />
            </linearGradient>
          </defs>

          {/* GRID */}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.06)"
          />

          {/* X AXIS */}
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            dy={10}
          />

          {/* Y AXIS */}
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            domain={[0, 'dataMax + 2']}
            allowDecimals={false}
          />

          {/* TOOLTIP */}
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div
                    className="p-4 rounded-2xl"
                    style={{
                      background: 'rgba(0,9,38,0.9)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}
                  >
                    <p className="text-[10px] uppercase text-white/40 font-bold mb-1 tracking-widest">
                      {payload[0].payload.name}
                    </p>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <p className="text-lg font-bold text-white">
                        {payload[0].value}
                        <span className="text-xs opacity-60 ml-1">Jobs</span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* BAR */}
          <Bar
            dataKey="value"
            fill="url(#premiumBar)"
            radius={[8, 8, 0, 0]}
            barSize={36}
            animationDuration={1200}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
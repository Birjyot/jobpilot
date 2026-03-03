"use client";

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function StatsChart({ data, height = "h-full" }: { data: any[], height?: string }): React.JSX.Element {
    // Transform object data to array if necessary, or assume it's passed correctly
    // Expecting data in format: [{name: 'Applied', value: 10}, ...]

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white/50 rounded-2xl border border-dashed border-gray-300">
                <TrendingUp size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Analytics will appear once you add applications</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`w-full ${height} min-h-[300px] bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/50 relative overflow-hidden`}
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0F52BA] via-indigo-400 to-[#A6C5D7]" />

            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-[#000926] tracking-tight">Application Pipeline</h3>
                    <p className="text-sm text-gray-500 mt-1">Real-time status distribution</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-[#0F52BA] rounded-full text-xs font-bold uppercase tracking-wider">
                    <Sparkles size={14} />
                    Live Data
                </div>
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0F52BA" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.4} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                        dy={10}
                        interval={0}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 10 }}
                        domain={[0, 'dataMax + 2']}
                        allowDecimals={false}
                        width={40}
                    />
                    <Tooltip
                        cursor={{ fill: '#F1F5F9', radius: 10 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-[#000926] text-white p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-lg">
                                        <p className="text-xs uppercase text-gray-400 font-bold mb-1 tracking-widest">{payload[0].payload.name}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-400" />
                                            <p className="text-lg font-bold">{payload[0].value} <span className="text-xs font-normal opacity-70">Jobs</span></p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar
                        dataKey="value"
                        fill="url(#barGradient)"
                        radius={[10, 10, 0, 0]}
                        barSize={40}
                        animationBegin={300}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                    >
                        {data.map((entry, index) => (
                            <motion.rect key={`cell-${index}`} initial={{ height: 0 }} animate={{ height: 'auto' }} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
}

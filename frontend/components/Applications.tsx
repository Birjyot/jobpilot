'use client';

import { motion } from 'framer-motion';
import { Briefcase, Zap, Download, FileText, Brain, List, LayoutGrid, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ApplicationsProps {
  jobs: any[];
  filteredJobs: any[];
  STATUSES: string[];
  statusStyles: any;
  statusBorderColors: any;

  showForm: boolean;
  setShowForm: any;
  editingJob: any;
  formData: any;
  setFormData: any;

  handleSubmit: () => void;
  resetForm: () => void;
  handleDelete: (id: number) => void;
  handleEdit: (job: any) => void;

  generateCoverLetter: (c: string, p: string) => void;
  generateInterviewQuestions: (p: string) => void;

  filter: string;
  setFilter: any;

  viewMode: string;
  setViewMode: any;

  exportCSV: () => void;

  handleGmailSync: () => void;
  isSyncing: boolean;

  handleDragStart: any;
  handleDrop: any;

  JobCard: any;
}

export default function Applications(props: ApplicationsProps) {
  const {
    jobs,
    filteredJobs,
    STATUSES,
    statusStyles,
    statusBorderColors,
    showForm,
    setShowForm,
    editingJob,
    formData,
    setFormData,
    handleSubmit,
    resetForm,
    handleDelete,
    handleEdit,
    generateCoverLetter,
    generateInterviewQuestions,
    filter,
    setFilter,
    viewMode,
    setViewMode,
    exportCSV,
    handleGmailSync,
    isSyncing,
    handleDragStart,
    handleDrop,
    JobCard
  } = props;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black text-white">Applications</h2>
        <p className="text-white/60">Track and manage your job pipeline</p>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* ADD */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg"
          >
            {showForm ? 'Cancel' : '+ Add Application'}
          </button>

          {/* SYNC */}
          <button
            onClick={handleGmailSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white/80 hover:text-white"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {isSyncing
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Zap size={16} />
            }
            {isSyncing ? 'Syncing...' : 'Sync Gmail'}
          </button>

          {/* FILTER */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all min-w-[140px]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {filter}

              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  isFilterOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isFilterOpen && (
              <div
                className="absolute left-0 mt-2 w-full rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(25px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
                }}
              >
                {['All', ...STATUSES].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setFilter(s);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                      filter === s
                        ? 'bg-blue-600 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* VIEW */}
          <div
            className="flex items-center gap-2 p-1 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >

            {/* LIST VIEW */}
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <List size={18} />
            </button>

            {/* KANBAN VIEW */}
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutGrid size={18} />
            </button>

          </div>
        </div>

        {/* EXPORT */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* ================= FORM ================= */}
      {showForm && (
        <div
          className="p-6 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-5">
            {editingJob ? 'Edit Application' : 'New Application'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {['company', 'position', 'location', 'salary_range'].map(field => (
              <input
                key={field}
                placeholder={field}
                value={formData[field]}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                className="bg-white/10 p-3 rounded-xl text-white placeholder:text-white/40"
              />
            ))}

            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="bg-white/10 p-3 rounded-xl text-white md:col-span-2"
            />

            <div className="flex gap-3 md:col-span-2">
              <button onClick={handleSubmit} className="bg-blue-600 px-5 py-2 rounded-xl text-white">
                Save
              </button>
              <button onClick={resetForm} className="bg-white/10 px-5 py-2 rounded-xl text-white">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-5">

          {filteredJobs.length === 0 ? (
            <div className="text-center text-white/40 py-20">
              <Briefcase size={50} className="mx-auto mb-3" />
              No applications yet
            </div>
          ) : (
            filteredJobs.map(job => (
              <motion.div
                key={job.id}
                className="rounded-[28px] p-6 border transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.25)'
                }}
              >

                <div className="flex items-start justify-between gap-4 mb-4">

                  <div className="flex items-start gap-4">

                    <div className="w-12 h-12 rounded-xl flex items-center justify-center 
                      bg-white/10 text-white font-bold text-lg border border-white/10">
                      {job.company?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="text-lg font-bold text-white">
                          {job.position}
                        </h3>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md
                          ${statusStyles[job.status] || 'bg-white/10 text-white border-white/20'}`}
                        >
                          {job.status}
                        </span>

                        {job.platform && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium 
                            bg-white/10 text-blue-300 border border-white/10">
                            {job.platform}
                          </span>
                        )}
                      </div>

                      {/* COMPANY + LOCATION */}
                      <p className="text-blue-400 font-medium">
                        {job.company}
                      </p>

                      {job.location && (
                        <p className="text-white/50 text-xs">
                          📍 {job.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ================= META ================= */}
                <div className="flex flex-wrap gap-3 mb-4">

                  <div className="px-3 py-1.5 rounded-xl text-xs font-medium 
                    bg-white/5 text-white/70 border border-white/10">
                    📅 {job.applied_date}
                  </div>

                  {job.salary_range && (
                    <div className="px-3 py-1.5 rounded-xl text-xs font-medium 
                      bg-white/5 text-white/70 border border-white/10">
                      💰 {job.salary_range}
                    </div>
                  )}
                </div>

                {/* ================= NOTES ================= */}
                {job.notes && (
                  <div className="mb-4 p-4 rounded-xl 
                    bg-white/5 border border-white/10 text-white/70 text-sm leading-relaxed">
                    {job.notes}
                  </div>
                )}

                {/* ================= ACTIONS ================= */}
                <div className="flex items-center gap-3 flex-wrap">

                  <button
                    onClick={() => generateCoverLetter(job.company, job.position)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                  >
                    <FileText size={14} /> Cover Letter
                  </button>

                  <button
                    onClick={() => generateInterviewQuestions(job.position)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                  >
                    <Brain size={14} /> Interview Prep
                  </button>

                  <div className="ml-auto flex gap-2">

                    <button
                      onClick={() => handleEdit(job)}
                      className="px-4 py-2 rounded-xl text-sm font-medium
                        bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(job.id)}
                      className="px-4 py-2 rounded-xl text-sm font-medium
                        bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
                    >
                      Delete
                    </button>

                  </div>
                </div>

              </motion.div>
            ))
          )}
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {STATUSES.map(status => (
            <div
              key={status}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(status)}
              className="p-3 rounded-2xl min-h-[600px]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div className="flex justify-between mb-3">
                <h3 className="text-white font-bold text-sm">{status}</h3>
                <span className="text-xs text-white/50">
                  {jobs.filter(j => j.status === status).length}
                </span>
              </div>

              <div className="space-y-2">
                {jobs
                  .filter(j => j.status === status)
                  .map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      compact
                      onDragStart={handleDragStart}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onGenerateCoverLetter={generateCoverLetter}
                      onGenerateInterview={generateInterviewQuestions}
                      statusStyles={statusStyles}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
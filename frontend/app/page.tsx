'use client';

import { Brain, Briefcase, Calendar, Download, FileText, LogIn, LogOut, MessageSquare, Send, Sparkles, Target, TrendingUp } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import StatsChart from '../components/StatsChart';

interface Job {
  id: number;
  company: string;
  position: string;
  location: string;
  status: string;
  applied_date: string;
  salary_range: string;
  job_url: string;
  notes: string;
  platform: string;
}

interface Stats {
  total: number;
  by_status: { Applied: number; Screening: number; Interview: number; Offer: number; Rejected: number; };
  response_rate: number;
}

interface Trends {
  monthly_applications: Record<string, number>;
  status_distribution: Record<string, number>;
  platform_distribution: Record<string, number>;
  metrics: { total_applications: number; interview_rate: number; offer_rate: number };
}

const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];

const statusStyles: Record<string, string> = {
  Applied: 'bg-blue-100 text-blue-700 border-blue-200',
  Screening: 'bg-purple-100 text-purple-700 border-purple-200',
  Interview: 'bg-orange-100 text-orange-700 border-orange-200',
  Offer: 'bg-green-100 text-green-700 border-green-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
};

const statusBorderColors: Record<string, string> = {
  Applied: 'border-t-blue-400',
  Screening: 'border-t-purple-400',
  Interview: 'border-t-orange-400',
  Offer: 'border-t-green-400',
  Rejected: 'border-t-red-400',
};

const statusBarColors: Record<string, string> = {
  Applied: 'bg-blue-500',
  Screening: 'bg-purple-500',
  Interview: 'bg-orange-500',
  Offer: 'bg-green-500',
  Rejected: 'bg-red-500',
};

export default function PremiumJobTracker() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showInterviewQuestions, setShowInterviewQuestions] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [activeAiView, setActiveAiView] = useState<'chat' | 'ats'>('chat');
  const dragJobRef = useRef<Job | null>(null);

  const [formData, setFormData] = useState({
    company: '', position: '', location: '', status: 'Applied',
    applied_date: new Date().toISOString().split('T')[0],
    salary_range: '', job_url: '', notes: '', platform: 'LinkedIn',
  });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Email': session?.user?.email || '',
  });

  useEffect(() => {
    if (session) { fetchJobs(); fetchStats(); fetchSuggestions(); fetchTrends(); }
  }, [session]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`, { headers: authHeaders() });
      setJobs(await res.json());
      setLoading(false);
    } catch { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`, { headers: authHeaders() });
      setStats(await res.json());
    } catch { }
  };

  const fetchTrends = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/trends`, { headers: authHeaders() });
      setTrends(await res.json());
    } catch { }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/suggestions`, { headers: authHeaders() });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch { }
  };

  const handleSubmit = async () => {
    try {
      const url = editingJob ? `${API_BASE_URL}/api/jobs/${editingJob.id}` : `${API_BASE_URL}/api/jobs`;
      const res = await fetch(url, { method: editingJob ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(formData) });
      if (res.ok) { resetForm(); fetchJobs(); fetchStats(); fetchTrends(); }
    } catch { }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this application?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/jobs/${id}`, { method: 'DELETE', headers: authHeaders() });
      fetchJobs(); fetchStats(); fetchTrends();
    } catch { }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({ company: job.company, position: job.position, location: job.location, status: job.status, applied_date: job.applied_date, salary_range: job.salary_range, job_url: job.job_url, notes: job.notes, platform: job.platform || 'LinkedIn' });
    setShowForm(true);
    setActiveTab('applications');
  };

  const resetForm = () => {
    setEditingJob(null);
    setFormData({ company: '', position: '', location: '', status: 'Applied', applied_date: new Date().toISOString().split('T')[0], salary_range: '', job_url: '', notes: '', platform: 'LinkedIn' });
    setShowForm(false);
  };

  const updateJobStatus = async (job: Job, newStatus: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/jobs/${job.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: newStatus }) });
      fetchJobs(); fetchStats(); fetchTrends();
    } catch { }
  };

  const handleDragStart = (job: Job) => { dragJobRef.current = job; };
  const handleDrop = (status: string) => {
    if (dragJobRef.current && dragJobRef.current.status !== status) updateJobStatus(dragJobRef.current, status);
    dragJobRef.current = null;
  };

  const exportCSV = () => {
    const headers = ['Company', 'Position', 'Location', 'Status', 'Applied Date', 'Salary', 'Platform', 'Job URL', 'Notes'];
    const rows = jobs.map(j => [j.company, j.position, j.location, j.status, j.applied_date, j.salary_range, j.platform, j.job_url, j.notes].map(v => `"${(v || '').replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'jobpilot-applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const generateCoverLetter = async (company: string, position: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/cover-letter`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ company, position }) });
      const data = await res.json();
      setCoverLetter(data.cover_letter); setShowCoverLetter(true);
    } catch { }
  };

  const generateInterviewQuestions = async (position: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/interview-questions`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ position }) });
      setInterviewQuestions(await res.json()); setShowInterviewQuestions(true);
    } catch { }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ message: userMsg, history }) });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: data.response ? 'ai' : 'error', content: data.response || `Error: ${data.error}` }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'error', content: 'Connection failed.' }]);
    } finally { setIsChatLoading(false); }
  };

  const handleATSScan = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    setIsMatchLoading(true); setMatchResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/match-resume`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }) });
      setMatchResult(await res.json());
    } catch { }
    finally { setIsMatchLoading(false); }
  };

  const filteredJobs = jobs.filter(job => filter === 'All' || job.status === filter);

  const JobCard = ({ job, compact = false }: { job: Job; compact?: boolean }) => (
    <div draggable onDragStart={() => handleDragStart(job)} className={`bg-white rounded-xl shadow border border-gray-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${compact ? 'p-3' : 'p-6'}`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-[#000926] truncate ${compact ? 'text-sm' : 'text-xl'}`}>{job.position}</p>
          <p className="text-[#0F52BA] font-medium text-sm truncate">{job.company}</p>
          {job.location && <p className="text-gray-400 text-xs truncate">📍 {job.location}</p>}
        </div>
        {!compact && <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 shrink-0 ${statusStyles[job.status]}`}>{job.status}</span>}
      </div>
      <p className="text-gray-400 text-xs mb-3">{job.applied_date}</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => generateCoverLetter(job.company, job.position)} className="text-[#0F52BA] text-xs hover:underline flex items-center gap-1"><FileText size={11} />Cover Letter</button>
        <button onClick={() => generateInterviewQuestions(job.position)} className="text-[#0F52BA] text-xs hover:underline flex items-center gap-1"><Brain size={11} />Prep</button>
        <button onClick={() => handleEdit(job)} className="text-gray-400 text-xs hover:underline ml-auto">Edit</button>
        <button onClick={() => handleDelete(job.id)} className="text-red-400 text-xs hover:underline">Del</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D6E6F3] via-[#A6C5D7] to-[#0F52BA]">
      {/* Header */}
      <div className="bg-[#000926] text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] p-2.5 rounded-xl"><Briefcase size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-[#A6C5D7] bg-clip-text text-transparent">JobPilot</h1>
                <p className="text-[#A6C5D7] text-xs">AI-Powered Job Application Management</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {session ? (
                <>
                  <div className="hidden md:block text-right mr-1">
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-[#A6C5D7]">{session.user?.email}</p>
                  </div>
                  {session.user?.image && <img src={session.user.image} alt="Profile" className="w-9 h-9 rounded-full border-2 border-[#0F52BA]" />}
                  <button onClick={() => signOut()} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 sm:px-4 rounded-lg text-red-300 text-sm font-medium transition-all">
                    <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <button onClick={() => signIn('google')} className="flex items-center gap-2 bg-[#0F52BA] hover:bg-[#0F52BA]/80 px-5 py-2 rounded-lg font-medium text-sm shadow-lg">
                  <LogIn size={16} /> Sign In
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1 mt-5 border-b border-white/10 overflow-x-auto no-scrollbar whitespace-nowrap">
            {['dashboard', 'applications', 'ai-tools', 'analytics'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 font-medium text-sm transition-all capitalize flex-shrink-0 ${activeTab === tab ? 'text-white border-b-2 border-[#0F52BA] bg-white/5' : 'text-[#A6C5D7] hover:text-white hover:bg-white/5'}`}>
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div>
            {aiSuggestions.length > 0 && (
              <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20">
                <div className="flex items-center gap-2 mb-3"><Sparkles className="text-[#0F52BA]" size={18} /><h3 className="font-semibold text-[#000926] text-sm">AI Insights</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiSuggestions.slice(0, 3).map((s, i) => (
                    <div key={i} className={`p-3 rounded-xl border-l-4 text-sm ${s.priority === 'high' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-[#0F52BA]'}`}>{s.message}</div>
                  ))}
                </div>
              </div>
            )}
            {stats && (
              <div>
                <h3 className="text-lg font-bold text-[#000926] mb-4">Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="md:col-span-2">
                    <StatsChart data={STATUSES.map(s => ({ name: s, value: (stats.by_status as any)[s] || 0 }))} height="h-64" />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Total', value: stats.total, icon: Target, color: 'from-[#0F52BA] to-[#A6C5D7]' },
                      { label: 'Interviews', value: stats.by_status.Interview, icon: Calendar, color: 'from-purple-500 to-purple-300' },
                      { label: 'Offers', value: stats.by_status.Offer, icon: TrendingUp, color: 'from-green-500 to-green-300' },
                      { label: 'Response Rate', value: `${stats.response_rate}%`, icon: Sparkles, color: 'from-orange-500 to-orange-300' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/20 hover:scale-105 transition-transform flex flex-col">
                        <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-r ${s.color} mb-3 w-fit`}><s.icon className="text-white" size={20} /></div>
                        <div className="text-3xl font-bold text-[#000926]">{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!session && (
              <div className="text-center py-20">
                <Briefcase className="mx-auto text-white/50 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to JobPilot</h2>
                <p className="text-white/70 mb-6">Sign in with Google to start tracking your applications</p>
                <button onClick={() => signIn('google')} className="bg-white text-[#0F52BA] font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">Sign In with Google</button>
              </div>
            )}
          </div>
        )}

        {/* ── APPLICATIONS ── */}
        {activeTab === 'applications' && (
          <div>
            {/* Toolbar */}
            <div className="flex gap-3 mb-6 flex-wrap items-center">
              <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#0F52BA] hover:bg-[#0F52BA]/90 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all text-sm">
                <span className="text-lg">+</span> {showForm ? 'Cancel' : 'Add Application'}
              </button>
              <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white/90 border-2 border-[#0F52BA]/20 rounded-xl px-4 py-2.5 font-medium text-[#000926] text-sm shadow">
                <option>All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <div className="flex bg-white/90 rounded-xl shadow border border-[#0F52BA]/20 overflow-hidden">
                <button onClick={() => setViewMode('list')} className={`px-4 py-2.5 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-[#0F52BA] text-white' : 'text-[#0F52BA]'}`}>≡ List</button>
                <button onClick={() => setViewMode('kanban')} className={`px-4 py-2.5 text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-[#0F52BA] text-white' : 'text-[#0F52BA]'}`}>⊞ Kanban</button>
              </div>
              <button onClick={exportCSV} className="flex items-center gap-2 bg-white/90 hover:bg-white text-[#0F52BA] px-5 py-2.5 rounded-xl font-medium shadow text-sm transition-all ml-auto">
                <Download size={16} /> Export CSV
              </button>
            </div>

            {/* Form */}
            {showForm && (
              <div className="bg-white/95 rounded-2xl p-6 shadow-2xl mb-6 border border-white/30">
                <h2 className="text-xl font-bold text-[#000926] mb-5">{editingJob ? 'Edit Application' : 'New Application'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[['company', 'Company *', 'text'], ['position', 'Position *', 'text'], ['location', 'Location', 'text'], ['salary_range', 'Salary Range', 'text']].map(([field, placeholder, type]) => (
                    <input key={field} type={type} placeholder={placeholder} value={(formData as any)[field]} onChange={e => setFormData({ ...formData, [field]: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black placeholder:text-gray-400 text-sm" />
                  ))}
                  <select value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black text-sm">
                    {['LinkedIn', 'Indeed', 'Naukri', 'Internshala', 'Company Portal', 'Other'].map(p => <option key={p}>{p}</option>)}
                  </select>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black text-sm">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input type="date" value={formData.applied_date} onChange={e => setFormData({ ...formData, applied_date: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black text-sm" />
                  <input type="url" placeholder="Job URL" value={formData.job_url} onChange={e => setFormData({ ...formData, job_url: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black placeholder:text-gray-400 text-sm" />
                  <textarea placeholder="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black placeholder:text-gray-400 text-sm md:col-span-2" />
                  <div className="md:col-span-2 flex gap-3">
                    <button onClick={handleSubmit} className="bg-[#0F52BA] text-white px-6 py-2.5 rounded-xl font-medium text-sm shadow">{editingJob ? 'Update' : 'Add'} Application</button>
                    <button onClick={resetForm} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredJobs.length === 0 ? (
                  <div className="bg-white/90 rounded-2xl p-12 text-center shadow-xl">
                    <Briefcase className="mx-auto text-gray-300 mb-4" size={56} />
                    <p className="text-gray-400 text-lg">No applications yet. Add your first one!</p>
                  </div>
                ) : filteredJobs.map(job => (
                  <div key={job.id} className="bg-white/95 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border border-white/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-[#000926]">{job.position}</h3>
                          <span className={`px-3 py-0.5 rounded-full text-xs font-medium border-2 ${statusStyles[job.status]}`}>{job.status}</span>
                          {job.platform && <span className="px-2 py-0.5 bg-white border border-[#A6C5D7] rounded-full text-xs text-[#0F52BA] font-medium">{job.platform}</span>}
                        </div>
                        <p className="text-[#0F52BA] font-semibold">{job.company}</p>
                        {job.location && <p className="text-gray-500 text-sm">📍 {job.location}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-600 mb-3 bg-[#D6E6F3]/40 p-3 rounded-xl">
                      <span><b>Applied:</b> {job.applied_date}</span>
                      {job.salary_range && <span><b>Salary:</b> {job.salary_range}</span>}
                    </div>
                    {job.notes && <p className="text-gray-600 text-sm mb-3 p-3 bg-blue-50 rounded-xl border-l-4 border-[#0F52BA]">{job.notes}</p>}
                    <div className="flex gap-3 flex-wrap items-center">
                      {job.job_url && <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-[#0F52BA] text-sm font-medium hover:underline">View Posting →</a>}
                      <button onClick={() => generateCoverLetter(job.company, job.position)} className="text-[#0F52BA] text-sm font-medium flex items-center gap-1 hover:underline"><FileText size={14} />Cover Letter</button>
                      <button onClick={() => generateInterviewQuestions(job.position)} className="text-[#0F52BA] text-sm font-medium flex items-center gap-1 hover:underline"><Brain size={14} />Interview Prep</button>
                      <button onClick={() => handleEdit(job)} className="text-gray-500 text-sm font-medium ml-auto hover:underline">Edit</button>
                      <button onClick={() => handleDelete(job.id)} className="text-red-500 text-sm font-medium hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Kanban View */}
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {STATUSES.map(status => (
                  <div key={status} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(status)}
                    className={`bg-white/70 backdrop-blur-xl rounded-2xl p-3 shadow-xl border-t-4 ${statusBorderColors[status]} min-h-[400px]`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-[#000926] text-sm">{status}</h3>
                      <span className="bg-white rounded-full px-2 py-0.5 text-xs font-bold text-gray-500 shadow">{jobs.filter(j => j.status === status).length}</span>
                    </div>
                    <div className="space-y-2">
                      {jobs.filter(j => j.status === status).map(job => <JobCard key={job.id} job={job} compact />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AI TOOLS ── */}
        {activeTab === 'ai-tools' && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <button onClick={() => setActiveAiView('chat')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${activeAiView === 'chat' ? 'bg-[#0F52BA] text-white shadow-lg' : 'bg-white/90 text-[#0F52BA] hover:bg-white'}`}>
                <MessageSquare size={16} /> AI Career Coach
              </button>
              <button onClick={() => setActiveAiView('ats')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${activeAiView === 'ats' ? 'bg-[#0F52BA] text-white shadow-lg' : 'bg-white/90 text-[#0F52BA] hover:bg-white'}`}>
                <Target size={16} /> ATS Scanner
              </button>
            </div>

            {activeAiView === 'chat' && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden flex flex-col h-[500px]">
                <div className="bg-[#000926] p-4 flex items-center gap-2 text-white">
                  <Brain size={18} className="text-[#0F52BA]" />
                  <span className="font-bold text-sm">AI Career Coach</span>
                  <span className="ml-auto text-xs text-[#A6C5D7] bg-white/10 px-2 py-1 rounded">Gemini 1.5 Flash</span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                      <MessageSquare size={28} className="mb-3 text-[#0F52BA]" />
                      <p className="font-medium text-gray-600">Your Personal Career Mentor</p>
                      <p className="text-sm text-gray-400 mt-1">Ask anything about interviews, salary negotiation, or your applications!</p>
                    </div>
                  ) : chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${msg.role === 'user' ? 'bg-[#0F52BA] text-white rounded-tr-none' : msg.role === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-none p-3 flex items-center gap-1.5">
                        {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 bg-[#0F52BA] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleChatSend()} placeholder="Ask about interviews, salary, or career strategy..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0F52BA] outline-none text-black" />
                    <button onClick={handleChatSend} disabled={isChatLoading || !chatInput.trim()} className="bg-[#0F52BA] text-white p-2.5 rounded-xl hover:bg-[#000926] disabled:opacity-50"><Send size={18} /></button>
                  </div>
                </div>
              </div>
            )}

            {activeAiView === 'ats' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {[['📄 Your Resume', resumeText, setResumeText, 'Paste your resume text...'], ['💼 Job Description', jobDescription, setJobDescription, 'Paste the job description...']].map(([label, value, setter, placeholder]) => (
                    <div key={label as string} className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                      <label className="block text-sm font-semibold text-[#000926] mb-2">{label as string}</label>
                      <textarea value={value as string} onChange={e => (setter as any)(e.target.value)} placeholder={placeholder as string} rows={12} className="w-full border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none text-black placeholder:text-gray-400 text-sm resize-none" />
                    </div>
                  ))}
                </div>
                <button onClick={handleATSScan} disabled={isMatchLoading || !resumeText.trim() || !jobDescription.trim()} className="w-full bg-[#0F52BA] hover:bg-[#000926] disabled:opacity-50 text-white py-4 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-3">
                  {isMatchLoading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning...</> : <><Target size={20} />Run ATS Scan</>}
                </button>
                {matchResult && !matchResult.error && (
                  <div className="space-y-4">
                    <div className="bg-white/90 rounded-2xl p-6 shadow-xl border border-white/30">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-[#000926]">ATS Match Score</h3>
                        <span className={`text-4xl font-black ${matchResult.match_score >= 70 ? 'text-green-500' : matchResult.match_score >= 40 ? 'text-orange-500' : 'text-red-500'}`}>{matchResult.match_score}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 mb-3">
                        <div className={`h-4 rounded-full ${matchResult.match_score >= 70 ? 'bg-green-500' : matchResult.match_score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${matchResult.match_score}%` }} />
                      </div>
                      {matchResult.summary && <p className="text-gray-600 text-sm">{matchResult.summary}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                        <h3 className="text-sm font-bold text-green-600 mb-3">✅ Matched Keywords</h3>
                        <div className="flex flex-wrap gap-2">{matchResult.matched_keywords?.map((kw: string, i: number) => <span key={i} className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">{kw}</span>)}</div>
                      </div>
                      <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                        <h3 className="text-sm font-bold text-red-600 mb-3">❌ Missing Keywords</h3>
                        <div className="flex flex-wrap gap-2">{matchResult.missing_keywords?.map((kw: string, i: number) => <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium">{kw}</span>)}</div>
                      </div>
                    </div>
                    <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                      <h3 className="text-sm font-bold text-[#0F52BA] mb-3">💡 Improvement Suggestions</h3>
                      <div className="space-y-2">{matchResult.suggestions?.map((s: string, i: number) => (
                        <div key={i} className="flex gap-3 p-3 bg-blue-50 rounded-xl"><span className="text-[#0F52BA] font-bold text-sm">{i + 1}.</span><p className="text-gray-700 text-sm">{s}</p></div>
                      ))}</div>
                    </div>
                  </div>
                )}
                {matchResult?.error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">Error: {matchResult.error}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {!trends || trends.metrics.total_applications === 0 ? (
              <div className="bg-white/90 rounded-2xl p-16 text-center shadow-xl">
                <TrendingUp className="mx-auto text-gray-300 mb-4" size={56} />
                <p className="text-gray-400 text-lg">Add applications to see your analytics!</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { label: 'Total Applications', value: trends.metrics.total_applications, icon: Target, color: 'from-[#0F52BA] to-[#A6C5D7]' },
                    { label: 'Interview Rate', value: `${trends.metrics.interview_rate}%`, icon: Calendar, color: 'from-purple-500 to-purple-300' },
                    { label: 'Offer Rate', value: `${trends.metrics.offer_rate}%`, icon: TrendingUp, color: 'from-green-500 to-green-300' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/20 flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${s.color}`}><s.icon className="text-white" size={24} /></div>
                      <div><div className="text-3xl font-bold text-[#000926]">{s.value}</div><div className="text-sm text-gray-500">{s.label}</div></div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                  <h3 className="font-bold text-[#000926] mb-4">Application Pipeline</h3>
                  <div className="space-y-3">
                    {STATUSES.map(status => {
                      const count = trends.status_distribution[status] || 0;
                      const pct = trends.metrics.total_applications > 0 ? Math.round(count / trends.metrics.total_applications * 100) : 0;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600 w-20">{status}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                            <div className={`h-7 rounded-full flex items-center justify-end pr-3 text-xs text-white font-bold ${statusBarColors[status]}`} style={{ width: `${Math.max(pct, 6)}%` }}>{count}</div>
                          </div>
                          <span className="text-sm text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {trends.platform_distribution && Object.keys(trends.platform_distribution).length > 0 && (
                  <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                    <h3 className="font-bold text-[#000926] mb-4">Applications by Platform</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(trends.platform_distribution || {}).map(([p, c]) => (
                        <div key={p} className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                          <div className="text-2xl font-bold text-[#0F52BA]">{c as number}</div>
                          <div className="text-sm text-gray-500 mt-1">{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trends.monthly_applications && Object.keys(trends.monthly_applications).length > 0 && (
                  <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30">
                    <h3 className="font-bold text-[#000926] mb-4">Monthly Applications</h3>
                    <div className="overflow-x-auto no-scrollbar">
                      <div className="flex items-end gap-2 h-36 min-w-[400px]">
                        {Object.entries(trends.monthly_applications || {}).map(([month, count]) => {
                          const max = Math.max(...Object.values(trends.monthly_applications || {}) as number[]);
                          const h = max > 0 ? Math.max(((count as number) / max) * 100, 8) : 8;
                          return (
                            <div key={month} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs font-bold text-[#0F52BA]">{count as number}</span>
                              <div className="w-full bg-[#0F52BA] rounded-t-lg" style={{ height: `${h}%` }} />
                              <span className="text-xs text-gray-400 text-center leading-tight">{month}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Cover Letter Modal */}
        {showCoverLetter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl">
              <h2 className="text-xl font-bold text-[#000926] mb-4">Generated Cover Letter</h2>
              <pre className="whitespace-pre-wrap text-gray-700 text-sm mb-6">{coverLetter}</pre>
              <button onClick={() => setShowCoverLetter(false)} className="bg-[#0F52BA] text-white px-6 py-2.5 rounded-xl text-sm font-medium">Close</button>
            </div>
          </div>
        )}

        {/* Interview Questions Modal */}
        {showInterviewQuestions && interviewQuestions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl">
              <h2 className="text-xl font-bold text-[#000926] mb-4">Interview Preparation</h2>
              <div className="text-gray-700 text-sm whitespace-pre-wrap">{interviewQuestions.questions_text}</div>
              <button onClick={() => setShowInterviewQuestions(false)} className="bg-[#0F52BA] text-white px-6 py-2.5 rounded-xl text-sm font-medium mt-6">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
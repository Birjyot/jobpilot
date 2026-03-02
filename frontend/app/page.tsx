'use client';

import { Brain, Briefcase, Calendar, FileText, LogIn, LogOut, MessageSquare, Send, Sparkles, Target, TrendingUp } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
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
  by_status: {
    Applied: number;
    Screening: number;
    Interview: number;
    Offer: number;
    Rejected: number;
  };
  response_rate: number;
}

export default function PremiumJobTracker() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showInterviewQuestions, setShowInterviewQuestions] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [formData, setFormData] = useState({
    company: '',
    position: '',
    location: '',
    status: 'Applied',
    applied_date: new Date().toISOString().split('T')[0],
    salary_range: '',
    job_url: '',
    notes: '',
    platform: 'LinkedIn'
  });

  const statusStyles: Record<string, string> = {
    'Applied': 'bg-blue-100 text-blue-700 border-blue-200',
    'Screening': 'bg-purple-100 text-purple-700 border-purple-200',
    'Interview': 'bg-orange-100 text-orange-700 border-orange-200',
    'Offer': 'bg-green-100 text-green-700 border-green-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200'
  };

  // Helper to get auth headers
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Email': session?.user?.email || ''
  });

  // Re-fetch data when session loads
  useEffect(() => {
    if (session) {
      fetchJobs();
      fetchStats();
      fetchSuggestions();
    }
  }, [session]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`, {
        headers: authHeaders()
      });
      const data = await res.json();
      setJobs(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`, {
        headers: authHeaders()
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/suggestions`, {
        headers: authHeaders()
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingJob
        ? `${API_BASE_URL}/api/jobs/${editingJob.id}`
        : `${API_BASE_URL}/api/jobs`;

      const method = editingJob ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchJobs();
        fetchStats();
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this application?')) {
      try {
        await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        fetchJobs();
        fetchStats();
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      company: job.company,
      position: job.position,
      location: job.location,
      status: job.status,
      applied_date: job.applied_date,
      salary_range: job.salary_range,
      job_url: job.job_url,
      notes: job.notes,
      platform: job.platform || 'LinkedIn'
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingJob(null);
    setFormData({
      company: '',
      position: '',
      location: '',
      status: 'Applied',
      applied_date: new Date().toISOString().split('T')[0],
      salary_range: '',
      job_url: '',
      notes: '',
      platform: 'LinkedIn'
    });
    setShowForm(false);
  };

  const generateCoverLetter = async (company: string, position: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/cover-letter`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ company, position })
      });
      const data = await res.json();
      setCoverLetter(data.cover_letter);
      setShowCoverLetter(true);
    } catch (error) {
      console.error('Error generating cover letter:', error);
    }
  };

  const generateInterviewQuestions = async (position: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/interview-questions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ position })
      });
      const data = await res.json();
      setInterviewQuestions(data.questions);
      setShowInterviewQuestions(true);
    } catch (error) {
      console.error('Error generating interview questions:', error);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: userMsg, history })
      });

      const data = await res.json();
      if (data.response) {
        setChatMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      } else if (data.error) {
        setChatMessages(prev => [...prev, { role: 'error', content: `AI Error: ${data.error}` }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'error', content: "Connection failed. Make sure the backend is running on port 5000." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => filter === 'All' || job.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D6E6F3] via-[#A6C5D7] to-[#0F52BA]">
      {/* Premium Header */}
      <div className="bg-[#000926] text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] p-3 rounded-xl">
                <Briefcase size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-[#A6C5D7] bg-clip-text text-transparent">
                  JobPilot
                </h1>
                <p className="text-[#A6C5D7] text-sm">AI-Powered Job Application Management</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {session ? (
                <>
                  <div className="hidden md:block text-right mr-2">
                    <p className="text-sm font-medium text-white">{session.user?.name}</p>
                    <p className="text-xs text-[#A6C5D7]">{session.user?.email}</p>
                  </div>
                  {session.user?.image && (
                    <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#0F52BA]" />
                  )}
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-lg transition-all font-medium backdrop-blur-sm text-red-300 hover:text-red-200"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center gap-2 bg-[#0F52BA] hover:bg-[#0F52BA]/80 px-6 py-2.5 rounded-lg transition-all font-medium shadow-lg hover:shadow-[#0F52BA]/50"
                >
                  <LogIn size={18} />
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-6 border-b border-white/10">
            {['dashboard', 'applications', 'ai-tools', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-all capitalize ${activeTab === tab
                  ? 'text-white border-b-2 border-[#0F52BA] bg-white/5'
                  : 'text-[#A6C5D7] hover:text-white hover:bg-white/5'
                  }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* TAB CONTENT: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            {aiSuggestions.length > 0 && (
              <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="text-[#0F52BA]" size={20} />
                  <h3 className="font-semibold text-[#000926]">AI Insights & Recommendations</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiSuggestions.slice(0, 3).map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border-l-4 ${suggestion.priority === 'high'
                        ? 'bg-red-50 border-red-500'
                        : 'bg-blue-50 border-[#0F52BA]'
                        }`}
                    >
                      <p className="text-sm text-gray-700">{suggestion.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#000926] mb-6">Analytics Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                  <div className="md:col-span-2 lg:col-span-2">
                    <StatsChart
                      data={[
                        { name: 'Applied', value: stats.by_status.Applied },
                        { name: 'Screening', value: stats.by_status.Screening },
                        { name: 'Interview', value: stats.by_status.Interview },
                        { name: 'Offer', value: stats.by_status.Offer },
                        { name: 'Rejected', value: stats.by_status.Rejected },
                      ]}
                      height="h-full"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4">
                    {[
                      { label: 'Total Applications', value: stats.total, icon: Target, color: 'from-[#0F52BA] to-[#A6C5D7]' },
                      { label: 'Interviews', value: stats.by_status.Interview, icon: Calendar, color: 'from-purple-500 to-purple-300' },
                      { label: 'Offers', value: stats.by_status.Offer, icon: TrendingUp, color: 'from-green-500 to-green-300' },
                      { label: 'Response Rate', value: `${stats.response_rate}%`, icon: Sparkles, color: 'from-orange-500 to-orange-300' }
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:scale-105 transition-transform flex flex-col justify-center h-full"
                      >
                        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} mb-4 w-fit`}>
                          <stat.icon className="text-white" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-[#000926] mb-1">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: APPLICATIONS */}
        {activeTab === 'applications' && (
          <div className="animate-fade-in">
            <div className="flex gap-4 mb-6 flex-wrap">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-[#0F52BA] hover:bg-[#0F52BA]/90 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <span className="text-xl">+</span>
                {showForm ? 'Cancel' : 'Add Application'}
              </button>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white/90 backdrop-blur-xl border-2 border-[#0F52BA]/20 rounded-xl px-6 py-3 font-medium text-[#000926] shadow-lg"
              >
                <option>All</option>
                <option>Applied</option>
                <option>Screening</option>
                <option>Interview</option>
                <option>Offer</option>
                <option>Rejected</option>
              </select>

              <button className="flex items-center gap-2 bg-white/90 backdrop-blur-xl hover:bg-white text-[#0F52BA] px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all ml-auto">
                <Brain size={20} />
                Generate Cover Letter
              </button>
            </div>

            {showForm && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl mb-8 border border-white/30">
                <h2 className="text-2xl font-bold text-[#000926] mb-6">
                  {editingJob ? 'Edit Application' : 'Add New Application'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="text" placeholder="Company *" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500" />
                  <input type="text" placeholder="Position *" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500" />
                  <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500" />
                  <select value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500">
                    <option>LinkedIn</option>
                    <option>Indeed</option>
                    <option>Naukri</option>
                    <option>Internshala</option>
                    <option>Company Portal</option>
                    <option>Other</option>
                  </select>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500">
                    <option>Applied</option>
                    <option>Screening</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Rejected</option>
                  </select>
                  <input type="date" value={formData.applied_date} onChange={(e) => setFormData({ ...formData, applied_date: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500" />
                  <input type="text" placeholder="Salary Range" value={formData.salary_range} onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500" />
                  <input type="url" placeholder="Job URL" value={formData.job_url} onChange={(e) => setFormData({ ...formData, job_url: e.target.value })} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500 md:col-span-2" />
                  <textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors md:col-span-2 text-black placeholder:text-gray-500" />
                  <div className="md:col-span-2 flex gap-3">
                    <button onClick={handleSubmit} className="bg-[#0F52BA] hover:bg-[#0F52BA]/90 text-white px-8 py-3 rounded-xl font-medium shadow-lg transition-all">
                      {editingJob ? 'Update' : 'Add'} Application
                    </button>
                    <button onClick={resetForm} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-12 shadow-xl text-center border border-white/30">
                  <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
                  <p className="text-gray-500 text-lg">No applications found. Start tracking your job search!</p>
                </div>
              ) : (
                filteredJobs.map(job => (
                  <div key={job.id} className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border border-white/30">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-[#000926]">{job.position}</h3>
                          <span className={`px-4 py-1 rounded-full text-sm font-medium border-2 ${statusStyles[job.status]}`}>{job.status}</span>
                          {job.platform && (
                            <span className="px-3 py-1 bg-white border border-[#A6C5D7] rounded-full text-xs font-semibold text-[#0F52BA]">{job.platform}</span>
                          )}
                        </div>
                        <p className="text-lg text-[#0F52BA] font-semibold">{job.company}</p>
                        {job.location && <p className="text-gray-600">📍 {job.location}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-gradient-to-r from-[#D6E6F3] to-transparent p-4 rounded-xl">
                      <div className="text-gray-700"><span className="font-semibold">Applied:</span> {job.applied_date}</div>
                      {job.salary_range && <div className="text-gray-700"><span className="font-semibold">Salary:</span> {job.salary_range}</div>}
                    </div>
                    {job.notes && <p className="text-gray-700 text-sm mb-4 p-4 bg-blue-50/50 rounded-xl border-l-4 border-[#0F52BA]">{job.notes}</p>}
                    <div className="flex gap-3 flex-wrap">
                      {job.job_url && <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm transition-colors">View Posting →</a>}
                      <button onClick={() => generateCoverLetter(job.company, job.position)} className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm flex items-center gap-1 transition-colors"><FileText size={16} />Generate Cover Letter</button>
                      <button onClick={() => generateInterviewQuestions(job.position)} className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm flex items-center gap-1 transition-colors"><Brain size={16} />Interview Prep</button>
                      <button onClick={() => handleEdit(job)} className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm ml-auto transition-colors">Edit</button>
                      <button onClick={() => handleDelete(job.id)} className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: AI TOOLS & ANALYTICS */}
        {(activeTab === 'ai-tools' || activeTab === 'analytics') && (
          <div className="animate-fade-in space-y-8">
            {activeTab === 'ai-tools' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/30">
                    <Brain className="text-[#0F52BA] mb-4" size={48} />
                    <h2 className="text-2xl font-bold text-[#000926] mb-4">Command Center</h2>
                    <p className="text-gray-600 mb-6">Welcome to your AI Power Tools. Use the chat to get personalized advice or the action buttons in the Applications tab for deep dives.</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg"><Sparkles size={18} className="text-[#0F52BA]" /><span>Interactive AI Coaching</span></div>
                      <div className="flex items-center gap-3 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg"><FileText size={18} className="text-[#0F52BA]" /><span>Real-time Cover Letters</span></div>
                      <div className="flex items-center gap-3 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg"><Target size={18} className="text-[#0F52BA]" /><span>Smart Interview Prep</span></div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden flex flex-col h-[450px]">
                    <div className="bg-[#000926] p-4 flex items-center gap-2 text-white">
                      <Brain size={20} className="text-[#0F52BA]" />
                      <h3 className="font-bold">AI Career Coach Chat</h3>
                      <span className="ml-auto text-xs text-[#A6C5D7] bg-white/10 px-2 py-1 rounded">Online | Gemini 1.5 Flash</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                          <MessageSquare size={30} className="mb-4 text-[#0F52BA]" />
                          <p className="font-medium text-gray-600 text-lg">Your Personal Career Mentor</p>
                          <p className="text-sm text-gray-500 max-w-xs">Ask me anything about your current applications or for general interview tips!</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-[#0F52BA] text-white rounded-tr-none' : msg.role === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-800 shadow-sm border border-gray-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#0F52BA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-[#0F52BA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-[#0F52BA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex gap-2">
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} placeholder="Ask about SQL, interviews, or your jobs..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0F52BA] outline-none text-black transition-all" />
                        <button onClick={handleChatSend} disabled={isChatLoading || !chatInput.trim()} className="bg-[#0F52BA] text-white p-3 rounded-xl hover:bg-[#000926] transition-colors disabled:opacity-50"><Send size={20} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && stats && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 text-center">
                  <TrendingUp className="mx-auto text-[#0F52BA] mb-2" size={40} />
                  <h2 className="text-xl font-bold text-[#000926] mb-3">Advanced Performance Analytics</h2>
                  <StatsChart
                    data={[
                      { name: 'Applied', value: stats.by_status.Applied },
                      { name: 'Screening', value: stats.by_status.Screening },
                      { name: 'Interview', value: stats.by_status.Interview },
                      { name: 'Offer', value: stats.by_status.Offer },
                      { name: 'Rejected', value: stats.by_status.Rejected },
                    ]}
                    height="h-[380px]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cover Letter Modal */}
        {showCoverLetter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <h2 className="text-2xl font-bold text-[#000926] mb-4">Generated Cover Letter</h2>
              <pre className="whitespace-pre-wrap text-gray-700 mb-6">{coverLetter}</pre>
              <button onClick={() => setShowCoverLetter(false)} className="bg-[#0F52BA] text-white px-6 py-2 rounded-xl">Close</button>
            </div>
          </div>
        )}

        {/* Interview Questions Modal */}
        {showInterviewQuestions && interviewQuestions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <h2 className="text-2xl font-bold text-[#000926] mb-4">Interview Preparation Questions</h2>
              <div className="space-y-6">
                {interviewQuestions.questions_text ? (
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">{interviewQuestions.questions_text}</div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-[#0F52BA] mb-2">General Questions</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">{interviewQuestions.general?.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0F52BA] mb-2">Technical Questions</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">{interviewQuestions.technical?.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0F52BA] mb-2">Behavioral Questions</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">{interviewQuestions.behavioral?.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul>
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => setShowInterviewQuestions(false)} className="bg-[#0F52BA] text-white px-6 py-2 rounded-xl mt-6">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
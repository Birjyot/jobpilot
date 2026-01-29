'use client';

import { Brain, Briefcase, Calendar, FileText, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Job {
  id: number;
  company: string;
  position: string;
  location?: string;
  status: string;
  applied_date: string;
  job_url?: string;
  salary_range?: string;
  notes?: string;
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

interface Suggestion {
  type: string;
  priority: string;
  message: string;
  job_id: number | null;
}

export default function PremiumJobTracker() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const [showCoverLetter, setShowCoverLetter] = useState<boolean>(false);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [showInterviewQuestions, setShowInterviewQuestions] = useState<boolean>(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    location: '',
    status: 'Applied',
    job_url: '',
    salary_range: '',
    notes: '',
    applied_date: new Date().toISOString().split('T')[0]
  });

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchJobs();
    fetchStats();
    fetchAISuggestions();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAISuggestions = async () => {
    try {
      const response = await fetch(`${API_URL}/ai/suggestions`);
      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const generateCoverLetter = async (company: string, position: string) => {
    try {
      const response = await fetch(`${API_URL}/ai/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, position })
      });
      const data = await response.json();
      setCoverLetter(data.cover_letter);
      setShowCoverLetter(true);
    } catch (error) {
      console.error('Error generating cover letter:', error);
    }
  };

  const generateInterviewQuestions = async (position: string) => {
    try {
      const response = await fetch(`${API_URL}/ai/interview-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position })
      });
      const data = await response.json();
      setInterviewQuestions(data.questions);
      setShowInterviewQuestions(true);
    } catch (error) {
      console.error('Error generating questions:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingJob ? `${API_URL}/jobs/${editingJob.id}` : `${API_URL}/jobs`;
      const method = editingJob ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchJobs();
        fetchStats();
        fetchAISuggestions();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this application?')) return;
    
    try {
      await fetch(`${API_URL}/jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
      fetchStats();
      fetchAISuggestions();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      company: job.company,
      position: job.position,
      location: job.location || '',
      status: job.status,
      job_url: job.job_url || '',
      salary_range: job.salary_range || '',
      notes: job.notes || '',
      applied_date: job.applied_date
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      company: '',
      position: '',
      location: '',
      status: 'Applied',
      job_url: '',
      salary_range: '',
      notes: '',
      applied_date: new Date().toISOString().split('T')[0]
    });
    setEditingJob(null);
    setShowForm(false);
  };

  const filteredJobs = filter === 'All' ? jobs : jobs.filter(job => job.status === filter);

  const statusStyles: { [key: string]: string } = {
    'Applied': 'bg-blue-50 text-[#0F52BA] border-[#0F52BA]',
    'Screening': 'bg-yellow-50 text-yellow-700 border-yellow-400',
    'Interview': 'bg-purple-50 text-purple-700 border-purple-400',
    'Offer': 'bg-green-50 text-green-700 border-green-400',
    'Rejected': 'bg-red-50 text-red-700 border-red-400'
  };

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
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-[#0F52BA] hover:bg-[#0F52BA]/80 px-5 py-2.5 rounded-lg transition-all font-medium">
                <Brain size={18} />
                AI Assistant
              </button>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-lg transition-all font-medium backdrop-blur-sm">
                Profile
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-6 border-b border-white/10">
            {['dashboard', 'applications', 'ai-tools', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-all capitalize ${
                  activeTab === tab
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
        {/* AI Suggestions Bar */}
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
                  className={`p-3 rounded-xl border-l-4 ${
                    suggestion.priority === 'high'
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

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Applications', value: stats.total, icon: Target, color: 'from-[#0F52BA] to-[#A6C5D7]' },
              { label: 'Interviews', value: stats.by_status.Interview, icon: Calendar, color: 'from-purple-500 to-purple-300' },
              { label: 'Offers', value: stats.by_status.Offer, icon: TrendingUp, color: 'from-green-500 to-green-300' },
              { label: 'Response Rate', value: `${stats.response_rate}%`, icon: Sparkles, color: 'from-orange-500 to-orange-300' }
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:scale-105 transition-transform"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} mb-4`}>
                  <stat.icon className="text-white" size={24} />
                </div>
                <div className="text-4xl font-bold text-[#000926] mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
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

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl mb-8 border border-white/30">
            <h2 className="text-2xl font-bold text-[#000926] mb-6">
              {editingJob ? 'Edit Application' : 'Add New Application'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                type="text"
                placeholder="Company *"
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Position *"
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500"
              >
                <option>Applied</option>
                <option>Screening</option>
                <option>Interview</option>
                <option>Offer</option>
                <option>Rejected</option>
              </select>
              <input
                type="date"
                value={formData.applied_date}
                onChange={(e) => setFormData({...formData, applied_date: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Salary Range"
                value={formData.salary_range}
                onChange={(e) => setFormData({...formData, salary_range: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500"
              />
              <input
                type="url"
                placeholder="Job URL"
                value={formData.job_url}
                onChange={(e) => setFormData({...formData, job_url: e.target.value})}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors text-black placeholder:text-gray-500 md:col-span-2"
              />
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3 outline-none transition-colors md:col-span-2 text-black placeholder:text-gray-500"
              />
              <div className="md:col-span-2 flex gap-3">
                <button
                  onClick={handleSubmit}
                  className="bg-[#0F52BA] hover:bg-[#0F52BA]/90 text-white px-8 py-3 rounded-xl font-medium shadow-lg transition-all"
                >
                  {editingJob ? 'Update' : 'Add'} Application
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-12 shadow-xl text-center border border-white/30">
              <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-gray-500 text-lg">No applications found. Start tracking your job search!</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <div
                key={job.id}
                className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border border-white/30"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-[#000926]">{job.position}</h3>
                      <span className={`px-4 py-1 rounded-full text-sm font-medium border-2 ${statusStyles[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-lg text-[#0F52BA] font-semibold">{job.company}</p>
                    {job.location && <p className="text-gray-600">📍 {job.location}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-gradient-to-r from-[#D6E6F3] to-transparent p-4 rounded-xl">
                  <div className="text-gray-700">
                    <span className="font-semibold">Applied:</span> {job.applied_date}
                  </div>
                  {job.salary_range && (
                    <div className="text-gray-700">
                      <span className="font-semibold">Salary:</span> {job.salary_range}
                    </div>
                  )}
                </div>
                
                {job.notes && (
                  <p className="text-gray-700 text-sm mb-4 p-4 bg-blue-50/50 rounded-xl border-l-4 border-[#0F52BA]">
                    {job.notes}
                  </p>
                )}
                
                <div className="flex gap-3 flex-wrap">
                  {job.job_url && (
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm transition-colors"
                    >
                      View Posting →
                    </a>
                  )}
                  <button
                    onClick={() => generateCoverLetter(job.company, job.position)}
                    className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm flex items-center gap-1 transition-colors"
                  >
                    <FileText size={16} />
                    Generate Cover Letter
                  </button>
                  <button
                    onClick={() => generateInterviewQuestions(job.position)}
                    className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm flex items-center gap-1 transition-colors"
                  >
                    <Brain size={16} />
                    Interview Prep
                  </button>
                  <button
                    onClick={() => handleEdit(job)}
                    className="text-[#0F52BA] hover:text-[#000926] font-medium text-sm ml-auto transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cover Letter Modal */}
        {showCoverLetter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <h2 className="text-2xl font-bold text-[#000926] mb-4">Generated Cover Letter</h2>
              <pre className="whitespace-pre-wrap text-gray-700 mb-6">{coverLetter}</pre>
              <button
                onClick={() => setShowCoverLetter(false)}
                className="bg-[#0F52BA] text-white px-6 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Interview Questions Modal */}
        {showInterviewQuestions && interviewQuestions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <h2 className="text-2xl font-bold text-[#000926] mb-4">Interview Preparation Questions</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0F52BA] mb-2">General Questions</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {interviewQuestions.general.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-[#0F52BA] mb-2">Technical Questions</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {interviewQuestions.technical.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-[#0F52BA] mb-2">Behavioral Questions</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {interviewQuestions.behavioral.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <button
                onClick={() => setShowInterviewQuestions(false)}
                className="bg-[#0F52BA] text-white px-6 py-2 rounded-xl mt-6"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
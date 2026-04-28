'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Briefcase, Target, FileText, Calendar, Check, Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SharedResultPage() {
  const params = useParams();
  const code = params.code;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (code) {
      fetch(`${API_BASE_URL}/s/${code}`, {
        headers: { 'Accept': 'application/json' },
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.error) throw new Error(resData.error);
          setData(resData);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [code, API_BASE_URL]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#D6E6F3] via-[#A6C5D7] to-[#0F52BA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#D6E6F3] via-[#A6C5D7] to-[#0F52BA] flex items-center justify-center p-6">
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="bg-red-100 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#000926] mb-2">Link Expired or Invalid</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/" className="inline-flex items-center gap-2 text-[#0F52BA] font-semibold hover:underline">
            <ArrowLeft size={16} /> Go to JobPilot
          </Link>
        </div>
      </div>
    );
  }

  const result = data.data;
  const isATS = result.match_score !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D6E6F3] via-[#A6C5D7] to-[#0F52BA] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#000926] p-2 rounded-xl text-white shadow-lg">
              <Briefcase size={20} />
            </div>
            <h1 className="text-2xl font-bold text-[#000926]">JobPilot <span className="text-[#0F52BA]">Shared</span></h1>
          </div>
          <div className="text-xs text-gray-600 bg-white/50 px-3 py-1.5 rounded-full font-medium">
            Views: {data.click_count}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          <div className="bg-[#000926] p-6 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {isATS ? <Target className="text-[#0F52BA]" /> : <FileText className="text-[#0F52BA]" />}
              {data.label || (isATS ? "ATS Analysis Report" : "Shared Document")}
            </h2>
            <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
              <Calendar size={12} /> Generated on {new Date(data.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="p-8">
            {isATS ? (
              <div className="space-y-8">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * result.match_score) / 100}
                        className={`${result.match_score >= 70 ? 'text-green-500' : result.match_score >= 40 ? 'text-orange-500' : 'text-red-500'} transition-all duration-1000`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-black text-[#000926]">{result.match_score}%</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Match</span>
                    </div>
                  </div>
                  <p className="text-gray-700 font-medium max-w-lg italic">"{result.summary}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-green-600 flex items-center gap-2">
                      <Check size={16} /> Matched Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.matched_keywords?.map((kw: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold shadow-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                      <Zap size={16} className="rotate-180" /> Missing Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_keywords?.map((kw: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold shadow-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-[#0F52BA] mb-4">Improvement Roadmap</h3>
                  <div className="space-y-3">
                    {result.suggestions?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <span className="bg-[#0F52BA] text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-gray-700 text-sm leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-gray-700 font-sans leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  {result.cover_letter || JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#000926]/60 text-sm mb-6 font-medium">Want to scan your own resume?</p>
          <Link href="/" className="bg-[#000926] text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all inline-flex items-center gap-3 group">
            Try JobPilot AI Free <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Target, Brain, Send, Zap } from 'lucide-react';
import FileDropZone from './FileDropZone';
import ShareResultButton from './ShareResultButton';

export default function AITools(props: any) {
  const {
    activeAiView,
    setActiveAiView,
    chatMessages,
    chatInput,
    setChatInput,
    handleChatSend,
    isChatLoading,
    chatProvider,
    resumeText,
    setResumeText,
    jobDescription,
    setJobDescription,
    handleATSScan,
    isMatchLoading,
    matchResult,
    API_BASE_URL,
    authHeaders,
  } = props;

  return (
    <div className="space-y-8">

      {/* TOGGLE */}
      <div className="flex justify-center">
        <div
          className="p-1.5 rounded-2xl flex gap-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          {[
            { key: 'chat', label: 'CareerOS AI', icon: MessageSquare },
            { key: 'ats', label: 'ATS Scanner', icon: Target }
          ].map((tab: any) => (
            <button
              key={tab.key}
              onClick={() => setActiveAiView(tab.key)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition ${
                activeAiView === tab.key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= CHAT ================= */}
      {activeAiView === 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] flex flex-col h-[700px]"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          {/* HEADER */}
          <div className="px-8 py-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <Brain className="text-blue-400" />
              <div>
                <p className="text-white font-bold">CareerOS AI</p>
                <p className="text-xs text-white/40">System Active</p>
              </div>
            </div>

            <div className="text-xs text-white/40 flex items-center gap-1">
              <Zap size={12} />
              {chatProvider || 'Neural Engine'}
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {chatMessages.length === 0 ? (
              <div className="text-center text-white/40 mt-20">
                Ask anything about jobs, interviews, resumes...
              </div>
            ) : (
              chatMessages.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`px-5 py-3 rounded-2xl max-w-[70%] text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {isChatLoading && (
              <div className="text-white/40 text-sm">Thinking...</div>
            )}
          </div>

          {/* INPUT */}
          <div className="p-6 border-t border-white/10 flex gap-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Message CareerOS..."
              className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 outline-none"
            />
            <button
              onClick={handleChatSend}
              className="bg-blue-600 px-4 rounded-xl flex items-center justify-center hover:bg-blue-700"
            >
              <Send size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ================= ATS ================= */}
      {activeAiView === 'ats' && (
        <motion.div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FileDropZone
              label="Your Resume"
              value={resumeText}
              onChange={setResumeText}
              apiBase={API_BASE_URL}
              authHeaders={authHeaders}
            />

            <FileDropZone
              label="Job Description"
              value={jobDescription}
              onChange={setJobDescription}
              apiBase={API_BASE_URL}
              authHeaders={authHeaders}
            />
          </div>

          <button
            onClick={handleATSScan}
            disabled={isMatchLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold"
          >
            {isMatchLoading ? 'Scanning...' : 'Run ATS Scan'}
          </button>

          {matchResult && !matchResult.error && (
            <div className="space-y-5">

              {/* ================= SCORE CARD ================= */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      ATS Match Score
                    </h3>

                    {matchResult.provider && (
                      <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                        <Zap size={10} />
                        Analysed by {matchResult.provider}
                        {matchResult.cached && (
                          <span className="text-green-400 ml-1">(cached)</span>
                        )}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-4xl font-black ${
                      matchResult.match_score >= 70
                        ? 'text-green-400'
                        : matchResult.match_score >= 40
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {matchResult.match_score}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/10 h-3 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ${
                      matchResult.match_score >= 70
                        ? 'bg-green-500'
                        : matchResult.match_score >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${matchResult.match_score}%` }}
                  />
                </div>

                {matchResult.summary && (
                  <p className="text-white/60 text-sm mb-4">
                    {matchResult.summary}
                  </p>
                )}

                {/* Share */}
                <ShareResultButton
                  data={matchResult}
                  label={`ATS Match: ${matchResult.match_score}%`}
                  apiBase={API_BASE_URL}
                  authHeaders={authHeaders}
                />
              </div>

              {/* ================= KEYWORDS ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* MATCHED */}
                <div
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)'
                  }}
                >
                  <h3 className="text-sm font-bold text-green-400 mb-3">
                    ✅ Matched Keywords
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {matchResult.matched_keywords?.map((kw: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#4ade80',
                          border: '1px solid rgba(34,197,94,0.3)'
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* MISSING */}
                <div
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)'
                  }}
                >
                  <h3 className="text-sm font-bold text-red-400 mb-3">
                    ❌ Missing Keywords
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {matchResult.missing_keywords?.map((kw: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: 'rgba(239,68,68,0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.3)'
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ================= SUGGESTIONS ================= */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: 'rgba(15,82,186,0.08)',
                  border: '1px solid rgba(15,82,186,0.2)'
                }}
              >
                <h3 className="text-sm font-bold text-blue-400 mb-3">
                  💡 Improvement Suggestions
                </h3>

                <div className="space-y-2">
                  {matchResult.suggestions?.map((s: string, i: number) => (
                    <div
                      key={i}
                      className="flex gap-3 p-3 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <span className="text-blue-400 font-bold text-sm">
                        {i + 1}.
                      </span>

                      <p className="text-white/80 text-sm">
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
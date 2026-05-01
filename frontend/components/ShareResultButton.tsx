'use client';

import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { useState } from 'react';

interface ShareResultButtonProps {
  data: Record<string, any>;
  label: string;
  apiBase: string;
  authHeaders: () => Record<string, string>;
}

type ShareState = 'idle' | 'loading' | 'done' | 'error';

export default function ShareResultButton({
  data: payloadData,
  label,
  apiBase,
  authHeaders
}: ShareResultButtonProps) {

  const [state, setState] = useState<ShareState>('idle');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleShare = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${apiBase}/api/links/shorten`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: payloadData,
          label: label,
          expires_days: 30,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to shorten link');

      setShortUrl(resJson.short_url);
      setState('done');

    } catch (e: any) {
      setErrorMsg(e.message);
      setState('error');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  /* ================= BUTTON STATE ================= */
  if (state === 'idle' || state === 'loading' || state === 'error') {
    return (
      <div className="flex flex-col gap-2">

        <button
          onClick={handleShare}
          disabled={state === 'loading'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(20px)',
            color: '#fff'
          }}
        >
          {state === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
              Generating link…
            </>
          ) : (
            <>
              <Share2 size={15} />
              Share Results
            </>
          )}
        </button>

        {state === 'error' && (
          <p className="text-xs text-red-400">
            {errorMsg}
          </p>
        )}

      </div>
    );
  }

  /* ================= RESULT STATE ================= */
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-70">
        Secure Share Link (30 Days)
      </p>

      <div className="flex gap-2">

        {/* LINK BOX */}
        <div
          className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <ExternalLink size={13} className="text-blue-400 shrink-0" />
          <span className="text-xs text-white/80 font-mono truncate">
            {shortUrl}
          </span>
        </div>

        {/* COPY BUTTON */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            copied
              ? 'bg-green-500 text-white'
              : ''
          }`}
          style={
            !copied
              ? {
                  background: 'linear-gradient(135deg, #0F52BA, #3B82F6)',
                  color: '#fff'
                }
              : {}
          }
        >
          {copied ? (
            <>
              <Check size={13} /> Copied!
            </>
          ) : (
            <>
              <Copy size={13} /> Copy
            </>
          )}
        </button>

      </div>
    </div>
  );
}
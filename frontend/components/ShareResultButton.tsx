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

export default function ShareResultButton({ data: payloadData, label, apiBase, authHeaders }: ShareResultButtonProps) {
  const [state, setState]     = useState<ShareState>('idle');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleShare = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${apiBase}/api/links/shorten`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data:         payloadData,
          label:        label,
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
    } catch { }
  };

  if (state === 'idle' || state === 'loading' || state === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleShare}
          disabled={state === 'loading'}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#0F52BA]/30
                     hover:border-[#0F52BA] hover:bg-blue-50 text-[#0F52BA] rounded-xl
                     text-sm font-medium transition-all disabled:opacity-50"
        >
          {state === 'loading'
            ? <><div className="w-4 h-4 border-2 border-[#0F52BA]/30 border-t-[#0F52BA] rounded-full animate-spin" />Generating link…</>
            : <><Share2 size={15} />Share Results</>
          }
        </button>
        {state === 'error' && (
          <p className="text-xs text-red-500">{errorMsg}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
      <p className="text-[10px] font-black text-[#0F52BA] uppercase tracking-widest mb-2 opacity-70">Secure Share Link (30 Days)</p>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#0F52BA]/20
                        rounded-xl px-3 py-2 overflow-hidden shadow-sm">
          <ExternalLink size={13} className="text-[#0F52BA] shrink-0" />
          <span className="text-xs text-[#0F52BA] font-mono truncate">{shortUrl}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                      transition-all shrink-0 shadow-md
                      ${copied
                        ? 'bg-green-500 text-white'
                        : 'bg-[#0F52BA] text-white hover:bg-[#000926]'
                      }`}
        >
          {copied ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy</>}
        </button>
      </div>
    </div>
  );
}

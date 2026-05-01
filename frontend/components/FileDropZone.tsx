'use client';

import { FileText, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface FileDropZoneProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  apiBase: string;
  authHeaders: () => Record<string, string>;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'done' | 'error';

export default function FileDropZone({
  label,
  value,
  onChange,
  placeholder = 'Paste text or drop a file here...',
  apiBase,
  authHeaders
}: FileDropZoneProps) {

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  const ALLOWED_EXT = ['.pdf', '.docx', '.txt'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED.includes(file.type) &&
        !ALLOWED_EXT.some(e => file.name.toLowerCase().endsWith(e))) {
      return 'Only PDF, DOCX, or TXT files are supported.';
    }
    if (file.size > 5 * 1024 * 1024) return 'File must be under 5 MB.';
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setFileName(file.name);
    setErrorMsg('');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${apiBase}/api/upload/resume`, {
        method: 'POST',
        headers: { 'X-User-Email': authHeaders()['X-User-Email'] || '' },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      onChange(data.text);
      setWordCount(data.word_count);
      setUploadState('done');

    } catch (e: any) {
      setErrorMsg(e.message || 'Upload failed');
      setUploadState('error');
    }
  }, [apiBase, authHeaders, onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const clearFile = () => {
    onChange('');
    setFileName('');
    setWordCount(0);
    setUploadState('idle');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isDragging = uploadState === 'dragging';
  const isUploading = uploadState === 'uploading';

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {/* LABEL */}
      <label className="text-sm font-semibold text-white/80">
        {label}
      </label>

      {/* DROP ZONE */}
      <div
        onDragOver={e => { e.preventDefault(); setUploadState('dragging'); }}
        onDragLeave={() => setUploadState(uploadState === 'dragging' ? 'idle' : uploadState)}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          cursor-pointer select-none transition-all py-14
          ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
              : uploadState === 'done'
                ? 'border-green-400 bg-green-500/10'
                : uploadState === 'error'
                  ? 'border-red-400 bg-red-500/10'
                  : 'border-white/20 hover:border-blue-400 hover:bg-white/5'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={onFileChange}
        />

        {isUploading ? (
          <>
            <div className="w-6 h-6 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-blue-400 font-medium">
              Extracting text…
            </p>
          </>
        ) : uploadState === 'done' ? (
          <>
            <FileText size={24} className="text-green-400" />
            <p className="text-sm text-green-300 font-semibold">{fileName}</p>
            <p className="text-xs text-green-400">
              {wordCount.toLocaleString()} words extracted
            </p>

            <button
              onClick={e => { e.stopPropagation(); clearFile(); }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-500/20 text-red-400"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Upload size={22} className="text-white/40" />
            <p className="text-sm text-white/60 font-medium">
              {isDragging ? 'Drop to upload' : 'Drop PDF / DOCX / TXT or click'}
            </p>
            <p className="text-xs text-white/30">Max 5 MB</p>
          </>
        )}
      </div>

      {/* ERROR */}
      {errorMsg && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          ⚠ {errorMsg}
        </p>
      )}

      {/* TEXTAREA */}
      <textarea
        value={value}
        onChange={e => {
          onChange(e.target.value);
          if (uploadState === 'done') clearFile();
        }}
        placeholder={placeholder}
        rows={8}
        className="w-full bg-white/10 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3
                   outline-none text-white placeholder:text-white/40 text-sm resize-none transition"
      />

      {/* WORD COUNT */}
      {value && (
        <p className="text-xs text-white/40 text-right">
          {value.split(/\s+/).filter(Boolean).length.toLocaleString()} words
        </p>
      )}
    </div>
  );
}
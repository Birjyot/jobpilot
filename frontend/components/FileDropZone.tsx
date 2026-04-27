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
  label, value, onChange, placeholder = 'Paste text or drop a file here...', apiBase, authHeaders
}: FileDropZoneProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileName, setFileName]       = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [wordCount, setWordCount]     = useState(0);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const ALLOWED = ['application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'];
  const ALLOWED_EXT = ['.pdf', '.docx', '.txt'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED.includes(file.type) && !ALLOWED_EXT.some(e => file.name.toLowerCase().endsWith(e))) {
      return 'Only PDF, DOCX, or TXT files are supported.';
    }
    if (file.size > 5 * 1024 * 1024) return 'File must be under 5 MB.';
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const err = validateFile(file);
    if (err) { setErrorMsg(err); setUploadState('error'); return; }

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
    <div className="bg-white/90 rounded-2xl p-5 shadow-xl border border-white/30 flex flex-col gap-3">
      <label className="block text-sm font-semibold text-[#000926]">{label}</label>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setUploadState('dragging'); }}
        onDragLeave={() => setUploadState(uploadState === 'dragging' ? 'idle' : uploadState)}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          cursor-pointer select-none transition-all py-5
          ${isDragging
            ? 'border-[#0F52BA] bg-blue-50 scale-[1.01]'
            : uploadState === 'done'
              ? 'border-green-400 bg-green-50'
              : uploadState === 'error'
                ? 'border-red-400 bg-red-50'
                : 'border-[#A6C5D7] hover:border-[#0F52BA] hover:bg-blue-50/40'
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
            <div className="w-7 h-7 border-2 border-[#0F52BA]/30 border-t-[#0F52BA] rounded-full animate-spin" />
            <p className="text-sm text-[#0F52BA] font-medium">Extracting text…</p>
          </>
        ) : uploadState === 'done' ? (
          <>
            <FileText size={24} className="text-green-500" />
            <p className="text-sm text-green-700 font-semibold">{fileName}</p>
            <p className="text-xs text-green-600">{wordCount.toLocaleString()} words extracted</p>
            <button
              onClick={e => { e.stopPropagation(); clearFile(); }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100 text-red-400"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Upload size={22} className={isDragging ? 'text-[#0F52BA]' : 'text-gray-400'} />
            <p className={`text-sm font-medium ${isDragging ? 'text-[#0F52BA]' : 'text-gray-500'}`}>
              {isDragging ? 'Drop to upload' : 'Drop PDF / DOCX / TXT or click to browse'}
            </p>
            <p className="text-xs text-gray-400">Max 5 MB</p>
          </>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠ {errorMsg}
        </p>
      )}

      {/* Manual text area (always visible so user can also paste) */}
      <textarea
        value={value}
        onChange={e => { onChange(e.target.value); if (uploadState === 'done') clearFile(); }}
        placeholder={placeholder}
        rows={8}
        className="w-full border-2 border-[#A6C5D7] focus:border-[#0F52BA] rounded-xl px-4 py-3
                   outline-none text-black placeholder:text-gray-400 text-sm resize-none transition-colors"
      />

      {value && (
        <p className="text-xs text-gray-400 text-right">
          {value.split(/\s+/).filter(Boolean).length.toLocaleString()} words
        </p>
      )}
    </div>
  );
}

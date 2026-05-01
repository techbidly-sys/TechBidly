'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';

export default function LogoUploader({ currentUrl, onUploaded }) {
  const [preview, setPreview] = useState(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onUploaded?.(json.logo_url);
    } catch (err) {
      setError(err.message);
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-dashed border-ink-300 hover:border-brand-500 cursor-pointer transition flex items-center justify-center bg-ink-50 flex-shrink-0"
      >
        {preview ? (
          <img src={preview} alt="Company logo" className="h-full w-full object-contain bg-white" />
        ) : (
          <Upload size={20} className="text-ink-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-brand-600" />
          </div>
        )}
      </button>
      <div>
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="btn-outline text-sm"
        >
          {uploading ? 'Uploading…' : preview ? 'Change logo' : 'Upload logo'}
        </button>
        <p className="text-xs text-ink-500 mt-1">PNG, JPG or WebP · max 2 MB</p>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

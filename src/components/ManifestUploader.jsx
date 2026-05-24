'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';

// Maps canonical form field names to recognized column header aliases
const FIELD_ALIASES = {
  title:       ['title', 'name', 'product', 'productname', 'item', 'itemname'],
  category:    ['category', 'cat', 'type', 'producttype'],
  condition:   ['condition', 'cond', 'state', 'grade'],
  startingBid: ['startingbid', 'startbid', 'price', 'startprice', 'bidstart', 'bid', 'startingprice', 'initialbid', 'askingprice'],
  description: ['description', 'desc', 'details', 'about', 'info', 'notes'],
  location:    ['location', 'loc', 'city', 'from', 'origin', 'shippingfrom'],
  imageUrl:    ['imageurl', 'image', 'photo', 'img', 'picture', 'url', 'photourl', 'imagepath'],
  tags:        ['tags', 'keywords', 'keyword', 'labels', 'label'],
};

function normalize(str) {
  return str.toLowerCase().replace(/[\s_\-]/g, '');
}

function mapRow(rawRow) {
  const result = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const [rawKey, value] of Object.entries(rawRow)) {
      if (aliases.includes(normalize(rawKey)) && value !== undefined && String(value).trim() !== '') {
        result[field] = String(value).trim();
        break;
      }
    }
  }
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

async function parseExcel(file) {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return utils.sheet_to_json(ws, { defval: '' });
}

export default function ManifestUploader({ onApply }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null); // null | 'parsing' | 'ready' | 'error'
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const processFile = async (file) => {
    setStatus('parsing');
    setError('');
    setFileName(file.name);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let rawRows;
      if (ext === 'csv') {
        rawRows = parseCSV(await file.text());
      } else if (ext === 'xlsx' || ext === 'xls') {
        rawRows = await parseExcel(file);
      } else {
        throw new Error('Unsupported format — use CSV or Excel (.xlsx / .xls)');
      }
      if (!rawRows.length) throw new Error('No data rows found in the file');
      setRows(rawRows.map(mapRow));
      setStatus('ready');
    } catch (err) {
      setError(err.message ?? 'Failed to parse file');
      setStatus('error');
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const applyRow = (row) => {
    onApply(row);
    reset();
  };

  const reset = () => {
    setStatus(null);
    setRows([]);
    setError('');
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  if (status === 'ready') {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <FileSpreadsheet size={15} className="text-emerald-600" />
            {fileName}
          </div>
          <button type="button" onClick={reset} className="text-ink-400 hover:text-ink-700 transition">
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-ink-500 mt-1">
          {rows.length} row{rows.length !== 1 ? 's' : ''} found — select one to fill the form
        </p>

        {rows.length === 1 ? (
          <button
            type="button"
            onClick={() => applyRow(rows[0])}
            className="btn-outline w-full mt-3 text-sm"
          >
            <CheckCircle2 size={14} /> Apply to form
          </button>
        ) : (
          <ul className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
            {rows.map((row, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-white rounded-lg border border-ink-100 px-3 py-2 text-sm"
              >
                <span className="text-ink-700 truncate">{row.title || `Row ${i + 1}`}</span>
                <button
                  type="button"
                  onClick={() => applyRow(row)}
                  className="text-brand-700 font-semibold text-xs shrink-0 ml-3 hover:underline"
                >
                  Apply
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleInputChange}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl border-2 border-dashed border-ink-200 hover:border-brand-400 transition cursor-pointer p-5 flex flex-col items-center gap-2 text-center"
      >
        {status === 'parsing' ? (
          <div className="h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
        ) : (
          <Upload size={20} className="text-ink-400" />
        )}
        <div>
          <p className="text-sm font-semibold text-ink-700">
            {status === 'parsing' ? 'Parsing…' : 'Upload product manifest'}
          </p>
          <p className="text-xs text-ink-400 mt-0.5">
            CSV or Excel (.xlsx, .xls) · drag & drop or click to browse
          </p>
        </div>
        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-1.5">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

// Small CSV helpers shared across dashboards (export + bulk-upload parsing).

// Build CSV text and trigger a browser download. `rows` is an array of arrays.
export const downloadCSV = (filename, headers, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Parse CSV text into { headers, objects }. Handles quoted fields, escaped quotes,
// commas and newlines inside quotes. Keys come from the header row.
export const parseCSV = (text) => {
  text = String(text).replace(/^﻿/, ''); // strip a leading BOM (Excel-saved UTF-8 CSVs)
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  const nonEmpty = rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], objects: [] };
  const headers = nonEmpty[0].map((h) => h.trim());
  const objects = nonEmpty.slice(1).map((r) => {
    const o = {};
    headers.forEach((hdr, idx) => { o[hdr] = (r[idx] ?? '').trim(); });
    return o;
  });
  return { headers, objects };
};

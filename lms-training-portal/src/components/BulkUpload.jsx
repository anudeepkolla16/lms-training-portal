import React, { useRef, useState } from 'react';
import { parseCSV, downloadCSV } from '../utils/csv';

// Reusable CSV bulk-upload card. Parses a chosen .csv file and runs `onSubmitRow`
// for each data row, then shows a per-row success/error summary.
//   templateHeaders : column names for the downloadable template
//   sampleRows      : example rows (array of arrays) included in the template
//   mapRow(obj)     : map a parsed {header: value} object to the payload (or null to skip)
//   onSubmitRow(p)  : async; create one record (throws on failure)
const BulkUpload = ({ title, accent = '#0ea5e9', templateName, templateHeaders, sampleRows = [], mapRow, onSubmitRow, onDone }) => {
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSummary(null);
    const text = await file.text();
    const { objects } = parseCSV(text);
    if (!objects.length) { setSummary({ ok: 0, fail: 0, errors: ['No data rows found in the file.'] }); return; }
    setBusy(true);
    let ok = 0, fail = 0, skipped = 0; const errors = [];
    for (let idx = 0; idx < objects.length; idx++) {
      try {
        const payload = mapRow ? mapRow(objects[idx]) : objects[idx];
        if (!payload) { skipped++; continue; }
        await onSubmitRow(payload);
        ok++;
      } catch (err) {
        fail++;
        if (errors.length < 8) errors.push(`Row ${idx + 2}: ${err?.message || 'failed'}`);
      }
    }
    setBusy(false);
    setSummary({ ok, fail, skipped, errors });
    if (fileRef.current) fileRef.current.value = '';
    onDone && onDone();
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>⬆ {title}</div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
            Columns: {templateHeaders.join(', ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={() => downloadCSV(templateName, templateHeaders, sampleRows)} style={{
            background: 'white', color: accent, border: `1px solid ${accent}`, padding: '7px 12px',
            borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}>⬇ Template</button>
          <label style={{
            background: accent, color: 'white', padding: '7px 14px', borderRadius: '7px',
            cursor: busy ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', opacity: busy ? 0.6 : 1
          }}>
            {busy ? 'Uploading...' : 'Choose CSV'}
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      {summary && (
        <div style={{ marginTop: '12px', fontSize: '13px' }}>
          <span style={{ color: '#065f46', fontWeight: '600' }}>✅ {summary.ok} added</span>
          {summary.fail > 0 && <span style={{ color: '#991b1b', fontWeight: '600', marginLeft: '14px' }}>❌ {summary.fail} failed</span>}
          {summary.skipped > 0 && <span style={{ color: '#92400e', fontWeight: '600', marginLeft: '14px' }}>⚠️ {summary.skipped} skipped (missing required column — check the header row)</span>}
          {summary.errors?.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#991b1b' }}>
              {summary.errors.map((er, i) => <li key={i}>{er}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUpload;

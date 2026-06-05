import React from 'react';
import {
  getRoleSkills, createRoleSkill, updateRoleSkill, deleteRoleSkill, seedRoleSkills,
  getRoleExpectations, upsertRoleExpectation, getAllSkillAssessments, saveSkillAssessment,
  updateSkillAssessment, getAllUserProfiles, getOrgRoles, getCourses,
  SKILL_LEVELS, ORG_LEVELS, CURRENT_CYCLE, expectedLevelFor, skillGap, slCode,
} from '../services/sharePointAPI';
import { downloadCSV } from '../utils/csv';

const ACCENT = '#0d9488';

// ---------- small shared bits ----------
const SLPill = ({ value, expected, uncertain }) => {
  const v = Number(value) || 0;
  let bg = '#e6f1fb', color = '#042c53'; // above
  if (uncertain) { bg = '#faeeda'; color = '#412402'; }
  else if (v >= expected) { bg = '#eaf3de'; color = '#173404'; }
  else if (v < expected) { bg = '#faeeda'; color = '#412402'; }
  return <span style={{ background: bg, color, padding: '2px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{slCode(v)}{uncertain ? '?' : ''}</span>;
};
const GapBadge = ({ gap }) => {
  const color = gap <= 0 ? '#3b6d11' : gap === 1 ? '#ba7517' : '#a32d2d';
  return <span style={{ color, fontWeight: 600 }}>{gap}</span>;
};
const RAG = ({ status }) => {
  const m = { green: { bg: '#eaf3de', c: '#173404', t: 'Green' }, amber: { bg: '#faeeda', c: '#412402', t: 'Amber' }, red: { bg: '#fcebeb', c: '#501313', t: 'Red' } }[status] || { bg: '#f1f5f9', c: '#374151', t: '—' };
  return <span style={{ background: m.bg, color: m.c, padding: '2px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>{m.t}</span>;
};
const card = { background: 'white', border: '0.5px solid rgba(31,31,29,0.15)', borderRadius: '12px' };
const th = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#5f5e5a', fontSize: '13px', background: '#f7f6f3', borderBottom: '0.5px solid rgba(31,31,29,0.15)', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', borderBottom: '0.5px solid rgba(31,31,29,0.1)', fontSize: '13px', color: '#1f1f1d' };
const Stat = ({ label, value }) => (
  <div style={{ background: '#f7f6f3', borderRadius: '8px', padding: '12px 14px', flex: 1, minWidth: '130px' }}>
    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#5f5e5a' }}>{label}</p>
    <p style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>{value}</p>
  </div>
);
const levelSelect = (value, onChange, extra = {}) => (
  <select value={value} onChange={onChange} style={{ padding: '5px 8px', borderRadius: '6px', border: '0.5px solid rgba(31,31,29,0.3)', fontSize: '13px', ...extra }}>
    {SKILL_LEVELS.map(l => <option key={l.v} value={l.v}>{l.code} · {l.label}</option>)}
  </select>
);

const SkillsModule = ({ accessToken, user, userProfile, managesReports }) => {
  const role = userProfile?.role;
  const canCalibrate = managesReports || role === 'Manager' || role === 'HOD';
  const isHOD = role === 'HOD';
  const isHR = role === 'HR';
  const canManage = role === 'Admin' || role === 'HR';

  const tabs = [{ id: 'me', label: 'My Skills' }];
  if (canCalibrate) tabs.push({ id: 'calibrate', label: 'Calibrate Team' });
  if (isHOD) tabs.push({ id: 'department', label: 'Department' });
  if (isHR) tabs.push({ id: 'company', label: 'Company' });
  if (canManage) tabs.push({ id: 'manage', label: 'Manage Skills' });

  const [tab, setTab] = React.useState('me');
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState('');
  const [roleSkills, setRoleSkills] = React.useState([]);
  const [expectations, setExpectations] = React.useState([]);
  const [assessments, setAssessments] = React.useState([]);
  const [profiles, setProfiles] = React.useState([]);
  const [orgRoles, setOrgRoles] = React.useState([]);
  const [courses, setCourses] = React.useState([]);

  const myEmail = (user?.username || '').toLowerCase();
  const myJobRole = userProfile?.jobRole || '';
  const myOL = userProfile?.orgLevel || 'OL2';

  const reload = React.useCallback(async () => {
    const [rs, ex, as, pr, or, cs] = await Promise.all([
      getRoleSkills(accessToken), getRoleExpectations(accessToken), getAllSkillAssessments(accessToken),
      getAllUserProfiles(accessToken), getOrgRoles(accessToken), getCourses(accessToken),
    ]);
    setRoleSkills(rs); setExpectations(ex); setAssessments(as); setProfiles(pr); setOrgRoles(or); setCourses(cs);
  }, [accessToken]);

  React.useEffect(() => { (async () => { setLoading(true); await reload(); setLoading(false); })(); }, [reload]);

  const skillsForRole = (r) => roleSkills.filter(s => (s.Role || '').toLowerCase() === (r || '').toLowerCase())
    .sort((a, b) => (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0));
  const expFor = (r, ol) => expectedLevelFor(r, ol, expectations);
  const assessmentFor = (email, skill) => assessments.find(a =>
    (a.EmployeeID || '').toLowerCase() === (email || '').toLowerCase() &&
    (a.Title || '').toLowerCase() === (skill || '').toLowerCase() &&
    (a.Cycle || CURRENT_CYCLE) === CURRENT_CYCLE);
  const olOf = (p) => p?.OrgLevel || 'OL2';

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Loading skills…</div>;

  return (
    <div style={{ padding: '28px', background: '#f1efe8', minHeight: '100vh' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ margin: '0 0 4px', color: '#1f1f1d', fontSize: '22px', fontWeight: 600 }}>People Transformation — Skills</h2>
        <p style={{ margin: 0, color: '#5f5e5a', fontSize: '14px' }}>{CURRENT_CYCLE} assessment cycle</p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setMsg(''); }} style={{
            padding: '8px 16px', borderRadius: '8px', border: '0.5px solid rgba(31,31,29,0.15)', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: tab === t.id ? '#e6f1fb' : 'white', color: tab === t.id ? '#185fa5' : '#5f5e5a',
          }}>{t.label}</button>
        ))}
      </div>

      {msg && <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '8px', background: msg.startsWith('Error') ? '#fcebeb' : '#eaf3de', color: msg.startsWith('Error') ? '#a32d2d' : '#173404', fontSize: '14px' }}>{msg}</div>}

      {tab === 'me' && <MySkills {...{ accessToken, myEmail, myJobRole, myOL, skillsForRole, expFor, assessmentFor, courses, user, setMsg, reload }} />}
      {tab === 'calibrate' && <Calibrate {...{ accessToken, myEmail, profiles, skillsForRole, expFor, assessmentFor, olOf, setMsg, reload }} />}
      {tab === 'department' && <Rollup scopeLabel={userProfile?.department || 'your department'} people={profiles.filter(p => (p.Department || '').toLowerCase() === (userProfile?.department || '').toLowerCase())} {...{ skillsForRole, expFor, assessments, assessmentFor, olOf }} />}
      {tab === 'company' && <Company {...{ profiles, assessments, roleSkills }} />}
      {tab === 'manage' && <ManageSkills {...{ accessToken, orgRoles, roleSkills, expectations, skillsForRole, expFor, setMsg, reload }} />}
    </div>
  );
};

// ===================== Employee: My Skills =====================
const MySkills = ({ accessToken, myEmail, myJobRole, myOL, skillsForRole, expFor, assessmentFor, courses, user, setMsg, reload }) => {
  const skills = skillsForRole(myJobRole);
  const expected = expFor(myJobRole, myOL);
  const [edits, setEdits] = React.useState({}); // skill -> { level, uncertain }
  const [saving, setSaving] = React.useState(false);

  const valOf = (skill) => {
    const e = edits[skill.Title];
    if (e) return e;
    const a = assessmentFor(myEmail, skill.Title);
    return { level: a ? Number(a.SelfLevel) || expected : expected, uncertain: a ? (a.SelfUncertain === true || a.SelfUncertain === 'true' || a.SelfUncertain === 'Yes') : false };
  };
  const setVal = (skill, patch) => setEdits(p => ({ ...p, [skill.Title]: { ...valOf(skill), ...patch } }));

  const anySubmitted = skills.some(s => assessmentFor(myEmail, s.Title));
  const anyReleased = skills.some(s => { const a = assessmentFor(myEmail, s.Title); return a && a.State === 'Released'; });
  const statusLabel = anyReleased ? 'Path released' : anySubmitted ? 'Submitted' : 'Not started';

  const submit = async () => {
    setSaving(true); setMsg('');
    try {
      for (const s of skills) {
        const v = valOf(s);
        const gap = skillGap(expected, v.level, v.uncertain);
        const existing = assessmentFor(myEmail, s.Title);
        const fields = {
          Title: s.Title, Role: myJobRole, EmployeeID: myEmail, OrgLevel: myOL, Cycle: CURRENT_CYCLE,
          ExpectedLevel: expected, SelfLevel: Number(v.level), SelfUncertain: !!v.uncertain, Gap: gap,
          State: existing && existing.State === 'Released' ? 'Released' : 'Submitted',
        };
        if (existing?.Id) await updateSkillAssessment(accessToken, existing.Id, fields);
        else await saveSkillAssessment(accessToken, fields);
      }
      setEdits({});
      await reload();
      setMsg('Self-assessment submitted. Your manager will calibrate and release your learning path.');
    } catch (e) { setMsg('Error saving. Please try again.'); }
    setSaving(false);
  };

  if (!myJobRole || skills.length === 0) {
    return <div style={{ ...card, padding: '32px', textAlign: 'center', color: '#888780' }}>
      No priority skills are defined for your role{myJobRole ? ` (${myJobRole})` : ''} yet. Ask HR/Admin to set them up in <strong>Manage Skills</strong>.
    </div>;
  }

  // learning path = skills below expected
  const gaps = skills.map(s => ({ s, v: valOf(s) })).filter(({ s, v }) => skillGap(expected, v.level, v.uncertain) > 0);
  const courseFor = (skillName) => courses.find(c => (c.Title || '').toLowerCase().includes((skillName.split(' ')[0] || '').toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e6f1fb', color: '#185fa5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
          {(user?.name || myEmail).split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{user?.name || myEmail.split('@')[0]}</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#5f5e5a' }}>{myJobRole} · {myOL} · {CURRENT_CYCLE}</p>
        </div>
        <span style={{ background: '#faeeda', color: '#854f0b', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', fontWeight: 600 }}>{statusLabel}</span>
      </div>
      <p style={{ fontSize: '14px', color: '#5f5e5a', marginBottom: '12px' }}>Rate yourself on each priority skill. Expected level for {myJobRole} {myOL} is <strong>{slCode(expected)}</strong>.</p>

      <div style={{ ...card, overflow: 'hidden', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Priority skill</th><th style={{ ...th, textAlign: 'center' }}>Expected</th><th style={{ ...th, textAlign: 'center' }}>Self-rating</th><th style={{ ...th, textAlign: 'center' }}>Gap</th></tr></thead>
          <tbody>
            {skills.map(s => {
              const v = valOf(s);
              const gap = skillGap(expected, v.level, v.uncertain);
              return (
                <tr key={s.Id}>
                  <td style={td}>{s.Title}{s.Category ? <span style={{ color: '#888780', fontSize: '11px', marginLeft: 6 }}>{s.Category}</span> : null}</td>
                  <td style={{ ...td, textAlign: 'center' }}><SLPill value={expected} expected={expected} /></td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {levelSelect(v.level, e => setVal(s, { level: Number(e.target.value) }))}
                      <label style={{ fontSize: 11, color: '#888780', display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                        <input type="checkbox" checked={v.uncertain} onChange={e => setVal(s, { uncertain: e.target.checked })} /> unsure
                      </label>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}><GapBadge gap={gap} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={submit} disabled={saving} style={{ background: ACCENT, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', marginBottom: '24px' }}>
        {saving ? 'Saving…' : 'Submit self-assessment'}
      </button>

      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>Your personal learning path</h3>
      <p style={{ fontSize: '13px', color: '#5f5e5a', margin: '0 0 12px' }}>{gaps.length ? `${gaps.length} priority skill${gaps.length > 1 ? 's' : ''} to develop towards ${slCode(expected)}.` : 'No gaps — you meet expectations on every priority skill. 🎉'}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {gaps.map(({ s, v }) => {
          const c = courseFor(s.Title);
          return (
            <div key={s.Id} style={{ ...card, padding: '12px 14px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{s.Title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SLPill value={v.level} expected={expected} uncertain={v.uncertain} /> → <SLPill value={expected} expected={expected} /></div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '13px', color: '#5f5e5a', lineHeight: 1.7 }}>
                <li>Attend a session on <strong>{s.Title}</strong>{c ? <> — e.g. course “{c.Title}”</> : ''}</li>
                <li>Self-study: {s.Title} fundamentals</li>
                <li>Apply {s.Title} on live work and review with your manager</li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===================== Manager: Calibrate =====================
const Calibrate = ({ accessToken, myEmail, profiles, skillsForRole, expFor, assessmentFor, olOf, setMsg, reload }) => {
  const reports = profiles.filter(p => (p.ManagerEmail || '').toLowerCase() === myEmail);
  const [sel, setSel] = React.useState('');
  const [edits, setEdits] = React.useState({}); // skill -> managerLevel
  const [note, setNote] = React.useState('');
  const emp = profiles.find(p => (p.Title || '').toLowerCase() === sel.toLowerCase());
  const empRole = emp?.JobRole || '';
  const empOL = olOf(emp);
  const skills = sel ? skillsForRole(empRole) : [];
  const expected = sel ? expFor(empRole, empOL) : 3;

  const mgrVal = (skill) => {
    if (edits[skill] != null) return edits[skill];
    const a = assessmentFor(sel, skill);
    return a && a.ManagerLevel != null && a.ManagerLevel !== '' ? Number(a.ManagerLevel) : (a ? Number(a.SelfLevel) : expected);
  };

  const release = async () => {
    setMsg('');
    try {
      for (const s of skills) {
        const a = assessmentFor(sel, s.Title);
        if (!a?.Id) continue;
        const ml = mgrVal(s.Title);
        await updateSkillAssessment(accessToken, a.Id, { ManagerLevel: ml, Gap: skillGap(expected, ml, false), State: 'Released', ManagerNote: note || a.ManagerNote || '' });
      }
      setEdits({}); setNote('');
      await reload();
      setMsg('Path released. The employee can now see their calibrated levels and learning path.');
    } catch (e) { setMsg('Error releasing. Please try again.'); }
  };

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#5f5e5a', marginBottom: '12px' }}>Review each report's self-rating, confirm or adjust the manager level, then release the path. A difference greater than one level is flagged for a conversation.</p>
      <select value={sel} onChange={e => { setSel(e.target.value); setEdits({}); setNote(''); }} style={{ padding: '8px 12px', borderRadius: '7px', border: '0.5px solid rgba(31,31,29,0.3)', fontSize: '14px', marginBottom: '16px', minWidth: '260px' }}>
        <option value="">Select a team member…</option>
        {reports.map(r => <option key={r.Id} value={r.Title}>{(r.Title || '').split('@')[0]} · {r.JobRole || '—'} · {olOf(r)}</option>)}
      </select>
      {reports.length === 0 && <p style={{ color: '#888780', fontSize: '13px' }}>No direct reports found (set their ManagerEmail in Admin → Employee Profiles).</p>}

      {sel && skills.length === 0 && <div style={{ ...card, padding: '24px', textAlign: 'center', color: '#888780' }}>No skills defined for {empRole || 'this role'}.</div>}
      {sel && skills.length > 0 && (
        <>
          <div style={{ ...card, overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Skill</th><th style={{ ...th, textAlign: 'center' }}>Expected</th><th style={{ ...th, textAlign: 'center' }}>Self</th><th style={{ ...th, textAlign: 'center' }}>Manager</th><th style={{ ...th, textAlign: 'center' }}>Gap</th></tr></thead>
              <tbody>
                {skills.map(s => {
                  const a = assessmentFor(sel, s.Title);
                  const self = a ? Number(a.SelfLevel) : null;
                  const unsure = a && (a.SelfUncertain === true || a.SelfUncertain === 'true' || a.SelfUncertain === 'Yes');
                  const ml = mgrVal(s.Title);
                  const flag = self != null && Math.abs(self - ml) > 1;
                  return (
                    <tr key={s.Id}>
                      <td style={td}>{s.Title}</td>
                      <td style={{ ...td, textAlign: 'center' }}><SLPill value={expected} expected={expected} /></td>
                      <td style={{ ...td, textAlign: 'center' }}>{self != null ? <SLPill value={self} expected={expected} uncertain={unsure} /> : <span style={{ color: '#888780' }}>—</span>}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {levelSelect(ml, e => setEdits(p => ({ ...p, [s.Title]: Number(e.target.value) })))}
                        {flag && <span title="Differs from self by more than one level" style={{ color: '#854f0b', marginLeft: 6 }}>⚠</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}><GapBadge gap={skillGap(expected, ml, false)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Calibration note (optional, saved with the release)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid rgba(31,31,29,0.3)', fontSize: '13px', marginBottom: '12px' }} />
          <button onClick={release} style={{ background: '#185fa5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Release path</button>
        </>
      )}
    </div>
  );
};

// ===================== HoD: Department roll-up =====================
const Rollup = ({ scopeLabel, people, skillsForRole, expFor, assessmentFor, olOf }) => {
  const rows = people.map(p => {
    const email = (p.Title || '').toLowerCase();
    const skills = skillsForRole(p.JobRole);
    const expected = expFor(p.JobRole, olOf(p));
    const mine = skills.map(s => assessmentFor(email, s.Title)).filter(Boolean);
    const submitted = mine.length > 0;
    const released = mine.length > 0 && mine.every(a => a.State === 'Released');
    const avgGap = mine.length ? (mine.reduce((sum, a) => sum + (Number(a.Gap) || 0), 0) / mine.length) : 0;
    const calibGaps = mine.filter(a => a.SelfLevel != null && a.ManagerLevel != null && a.ManagerLevel !== '' && Math.abs(Number(a.SelfLevel) - Number(a.ManagerLevel)) > 1).length;
    const status = !submitted ? 'red' : released ? 'green' : 'amber';
    return { p, email, expected, submitted, released, avgGap, calibGaps, status };
  });
  const assessed = rows.filter(r => r.submitted).length;
  const released = rows.filter(r => r.released).length;
  const avgGap = rows.filter(r => r.submitted).length ? (rows.reduce((s, r) => s + r.avgGap, 0) / rows.filter(r => r.submitted).length) : 0;
  const calibGaps = rows.reduce((s, r) => s + r.calibGaps, 0);

  // top skills below expectation across these people
  const skillAgg = {};
  rows.forEach(r => {
    const skills = skillsForRole(r.p.JobRole);
    skills.forEach(s => {
      const a = assessmentFor(r.email, s.Title);
      if (!a) return;
      const lvl = a.ManagerLevel != null && a.ManagerLevel !== '' ? Number(a.ManagerLevel) : Number(a.SelfLevel);
      const k = s.Title;
      (skillAgg[k] = skillAgg[k] || { sum: 0, n: 0, exp: r.expected }).sum += lvl;
      skillAgg[k].n += 1;
    });
  });
  const bars = Object.entries(skillAgg).map(([name, v]) => ({ name, avg: v.sum / v.n, pct: Math.round((v.sum / v.n) / 5 * 100) }))
    .sort((a, b) => a.avg - b.avg).slice(0, 5);

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#5f5e5a', marginBottom: '14px' }}>Skill status across <strong>{scopeLabel}</strong> · {people.length} people.</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <Stat label="Assessed" value={`${assessed} / ${people.length}`} />
        <Stat label="Paths released" value={`${released} / ${people.length}`} />
        <Stat label="Avg gap" value={avgGap.toFixed(1)} />
        <Stat label="Calibration gaps" value={calibGaps} />
      </div>

      <h3 style={{ fontSize: '14px', color: '#5f5e5a', margin: '0 0 10px' }}>Top skills below expectation</h3>
      <div style={{ ...card, padding: '12px 16px', marginBottom: '20px' }}>
        {bars.length === 0 ? <p style={{ color: '#888780', fontSize: '13px', margin: 0 }}>No assessment data yet.</p> : bars.map(b => (
          <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <div style={{ flex: 1, fontSize: 13 }}>{b.name}</div>
            <div style={{ width: 140, background: '#f1efe8', borderRadius: 999, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${b.pct}%`, height: '100%', background: b.avg < 2.5 ? '#e24b4a' : b.avg < 2.7 ? '#ef9f27' : '#97c459' }} />
            </div>
            <div style={{ width: 38, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{b.avg.toFixed(1)}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '14px', color: '#5f5e5a', margin: '0 0 10px' }}>Team members</h3>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Name</th><th style={{ ...th, textAlign: 'center' }}>OL</th><th style={{ ...th, textAlign: 'center' }}>Assessment</th><th style={{ ...th, textAlign: 'center' }}>Path</th><th style={{ ...th, textAlign: 'center' }}>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td style={{ ...td, textAlign: 'center', color: '#888780' }} colSpan={5}>No people in scope.</td></tr> :
              rows.map(r => (
                <tr key={r.email}>
                  <td style={td}>{(r.p.Title || '').split('@')[0]}</td>
                  <td style={{ ...td, textAlign: 'center', color: '#5f5e5a' }}>{olOf(r.p)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.submitted ? 'Complete' : 'Not started'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.released ? 'Released' : r.submitted ? 'In review' : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}><RAG status={r.status} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===================== HR: Company roll-up =====================
const Company = ({ profiles, assessments, roleSkills }) => {
  const depts = [...new Set(profiles.map(p => p.Department).filter(Boolean))];
  const submittedEmails = new Set(assessments.map(a => (a.EmployeeID || '').toLowerCase()));
  const releasedByEmail = {};
  assessments.forEach(a => { const e = (a.EmployeeID || '').toLowerCase(); releasedByEmail[e] = (releasedByEmail[e] ?? true) && a.State === 'Released'; });
  const total = profiles.length || 1;
  const cycleComplete = Math.round([...submittedEmails].filter(e => releasedByEmail[e]).length / total * 100);
  const pathsReleased = Math.round(Object.values(releasedByEmail).filter(Boolean).length / total * 100);

  const rows = depts.map(d => {
    const ppl = profiles.filter(p => p.Department === d);
    const emails = ppl.map(p => (p.Title || '').toLowerCase());
    const assessed = emails.filter(e => submittedEmails.has(e)).length;
    const released = emails.filter(e => releasedByEmail[e]).length;
    const aPct = ppl.length ? Math.round(assessed / ppl.length * 100) : 0;
    const pPct = ppl.length ? Math.round(released / ppl.length * 100) : 0;
    const status = aPct >= 75 ? 'green' : aPct >= 50 ? 'amber' : 'red';
    return { d, people: ppl.length, aPct, pPct, status };
  }).sort((a, b) => b.people - a.people);

  const exportCsv = () => downloadCSV(`skills-by-function-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Function', 'People', 'Assessed %', 'Paths %', 'Status'], rows.map(r => [r.d, r.people, `${r.aPct}%`, `${r.pPct}%`, r.status]));

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#5f5e5a', marginBottom: '14px' }}>Company-wide · {CURRENT_CYCLE} · {profiles.length} employees in system.</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <Stat label="Cycle complete" value={`${cycleComplete}%`} />
        <Stat label="Paths released" value={`${pathsReleased}%`} />
        <Stat label="Skill items" value={roleSkills.length} />
        <Stat label="Functions" value={depts.length} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '14px', color: '#5f5e5a', margin: 0 }}>Function-by-function status</h3>
        {rows.length > 0 && <button onClick={exportCsv} style={{ background: 'white', color: ACCENT, border: `1px solid ${ACCENT}`, padding: '7px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>⬇ Export CSV</button>}
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Function</th><th style={{ ...th, textAlign: 'center' }}>People</th><th style={{ ...th, textAlign: 'center' }}>Assessed</th><th style={{ ...th, textAlign: 'center' }}>Paths</th><th style={{ ...th, textAlign: 'center' }}>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td style={{ ...td, textAlign: 'center', color: '#888780' }} colSpan={5}>No employee profiles found.</td></tr> :
              rows.map(r => (
                <tr key={r.d}>
                  <td style={td}>{r.d}</td>
                  <td style={{ ...td, textAlign: 'center', color: '#5f5e5a' }}>{r.people}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.aPct}%</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.pPct}%</td>
                  <td style={{ ...td, textAlign: 'center' }}><RAG status={r.status} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===================== Admin/HR: Manage Skills =====================
const ManageSkills = ({ accessToken, orgRoles, roleSkills, expectations, skillsForRole, expFor, setMsg, reload }) => {
  const [selRole, setSelRole] = React.useState(orgRoles[0]?.Title || '');
  const [newSkill, setNewSkill] = React.useState('');
  const skills = selRole ? skillsForRole(selRole) : [];

  const addSkill = async () => {
    if (!newSkill.trim() || !selRole) return;
    setMsg('');
    try { await createRoleSkill(accessToken, { Title: newSkill.trim(), Role: selRole, Category: 'Core', Priority: true, SortOrder: skills.length + 1 }); setNewSkill(''); await reload(); setMsg('Skill added.'); }
    catch (e) { setMsg('Error adding skill.'); }
  };
  const removeSkill = async (id) => { setMsg(''); try { await deleteRoleSkill(accessToken, id); await reload(); } catch (e) { setMsg('Error deleting skill.'); } };
  const togglePriority = async (s) => { try { await updateRoleSkill(accessToken, s.Id, { Priority: !(s.Priority === true || s.Priority === 'true') }); await reload(); } catch (e) { setMsg('Error updating.'); } };
  const seed = async () => { setMsg(''); try { const n = await seedRoleSkills(accessToken, selRole, roleSkills); await reload(); setMsg(n ? `Seeded ${n} starter skill(s) — edit them to fit ${selRole}.` : 'Role already has those starter skills.'); } catch (e) { setMsg('Error seeding.'); } };
  const setExpected = async (ol, val) => { setMsg(''); try { await upsertRoleExpectation(accessToken, { Role: selRole, OrgLevel: ol, ExpectedLevel: Number(val) }, expectations); await reload(); } catch (e) { setMsg('Error saving expected level.'); } };

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#5f5e5a', marginBottom: '12px' }}>Define the priority skills for each role and the expected level per org level. Employees self-assess against these.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#5f5e5a' }}>Role:</label>
        <select value={selRole} onChange={e => setSelRole(e.target.value)} style={{ padding: '8px 12px', borderRadius: '7px', border: '0.5px solid rgba(31,31,29,0.3)', fontSize: '14px', minWidth: '220px' }}>
          <option value="">Select a role…</option>
          {orgRoles.map(r => <option key={r.Id} value={r.Title}>{r.Title}</option>)}
        </select>
        {selRole && <button onClick={seed} style={{ background: 'white', border: `1px solid ${ACCENT}`, color: ACCENT, padding: '7px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Seed starter skills</button>}
      </div>

      {selRole && (
        <>
          <h3 style={{ fontSize: '14px', color: '#5f5e5a', margin: '0 0 10px' }}>Expected level per org level — {selRole}</h3>
          <div style={{ ...card, padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {ORG_LEVELS.map(ol => (
              <div key={ol} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#5f5e5a' }}>{ol}</label>
                {levelSelect(expFor(selRole, ol), e => setExpected(ol, e.target.value))}
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '14px', color: '#5f5e5a', margin: '0 0 10px' }}>Priority skills — {selRole} ({skills.length})</h3>
          <div style={{ ...card, overflow: 'hidden', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Skill</th><th style={{ ...th, textAlign: 'center' }}>Priority</th><th style={{ ...th, textAlign: 'center' }}>Actions</th></tr></thead>
              <tbody>
                {skills.length === 0 ? <tr><td style={{ ...td, textAlign: 'center', color: '#888780' }} colSpan={3}>No skills yet. Add some or seed starters.</td></tr> :
                  skills.map(s => (
                    <tr key={s.Id}>
                      <td style={td}>{s.Title}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button onClick={() => togglePriority(s)} style={{ background: (s.Priority === true || s.Priority === 'true') ? '#eaf3de' : '#f1efe8', color: (s.Priority === true || s.Priority === 'true') ? '#173404' : '#888780', border: 'none', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          {(s.Priority === true || s.Priority === 'true') ? 'Priority' : 'Optional'}
                        </button>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}><button onClick={() => removeSkill(s.Id)} style={{ background: '#fcebeb', color: '#a32d2d', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Delete</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} placeholder={`New skill for ${selRole}`} style={{ flex: 1, padding: '9px 12px', borderRadius: '7px', border: '0.5px solid rgba(31,31,29,0.3)', fontSize: '14px' }} />
            <button onClick={addSkill} style={{ background: ACCENT, color: 'white', border: 'none', padding: '9px 18px', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Add skill</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SkillsModule;

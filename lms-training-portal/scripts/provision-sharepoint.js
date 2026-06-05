#!/usr/bin/env node
/*
 * One-time SharePoint provisioning for the role-based-training features.
 *
 * Creates (idempotently):
 *   - List "OrgRoles"          + column Department
 *   - List "Self Assessments"  + columns SelfRating, AssessmentState, ManagerEmail,
 *                                ManagerRating, ManagerComment, EmployeeComment,
 *                                EmployeeID, AssessmentDate, ReviewDate
 *   - List "JD Acknowledgements" + columns Role, EmployeeID, Signature, AcknowledgedDate
 *   - Columns added to existing "UserRoles":  JobRole, Department, ManagerEmail
 *   - Columns added to existing "Courses":    JobRoles, Departments, Mandatory
 *
 * Re-running is safe — anything that already exists is skipped.
 *
 * Requirements:
 *   - A Microsoft Graph access token for the target tenant with a scope that allows
 *     list/column creation: Sites.Manage.All (or Sites.FullControl.All). The app's
 *     runtime Sites.ReadWrite.All is NOT enough to CREATE lists.
 *     Easiest way to get one: https://developer.microsoft.com/graph/graph-explorer
 *     (sign in, consent to Sites.Manage.All, copy the access token).
 *
 * Usage:
 *   GRAPH_TOKEN="<token>" node scripts/provision-sharepoint.js
 *   # or
 *   node scripts/provision-sharepoint.js --token "<token>"
 *   # optional overrides (defaults match src/services/sharePointAPI.js):
 *   #   --host sarasanalytics0.sharepoint.com  --path /sites/training-library
 */

const https = require('https');

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const TOKEN = process.env.GRAPH_TOKEN || arg('token');
const SITE_HOST = arg('host') || 'sarasanalytics0.sharepoint.com';
const SITE_PATH = arg('path') || '/sites/training-library';

if (!TOKEN) {
  console.error('ERROR: no token. Pass GRAPH_TOKEN env var or --token "<token>".');
  process.exit(1);
}

// --- tiny Graph client over https (no dependencies) ---
function graph(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'graph.microsoft.com',
        path: `/v1.0${path}`,
        method,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          const parsed = raw ? JSON.parse(raw) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(Object.assign(new Error(parsed?.error?.message || `HTTP ${res.statusCode}`), { status: res.statusCode, body: parsed }));
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Column definition helpers (Graph columnDefinition shapes)
const text = (name, multiline = false) => ({ name, text: multiline ? { allowMultipleLines: true } : {} });
const number = (name) => ({ name, number: {} });
const boolean = (name) => ({ name, boolean: {} });
const dateTime = (name) => ({ name, dateTime: {} });

async function getSiteId() {
  const site = await graph('GET', `/sites/${SITE_HOST}:${SITE_PATH}`);
  return site.id;
}

async function listExists(siteId, displayName) {
  const res = await graph('GET', `/sites/${siteId}/lists?$select=id,displayName,name&$top=200`);
  return (res.value || []).find((l) => l.displayName === displayName || l.name === displayName);
}

async function ensureList(siteId, displayName, columns) {
  const existing = await listExists(siteId, displayName);
  if (existing) {
    console.log(`• list "${displayName}" already exists — ensuring columns`);
    await ensureColumns(siteId, displayName, columns);
    return existing;
  }
  console.log(`+ creating list "${displayName}"`);
  await graph('POST', `/sites/${siteId}/lists`, {
    displayName,
    list: { template: 'genericList' },
    columns,
  });
  console.log(`  ✓ created with ${columns.length} column(s)`);
}

async function ensureColumns(siteId, listName, columns) {
  const res = await graph('GET', `/sites/${siteId}/lists/${encodeURIComponent(listName)}/columns?$select=name`);
  const have = new Set((res.value || []).map((c) => c.name));
  for (const col of columns) {
    if (have.has(col.name)) {
      console.log(`  • ${listName}.${col.name} exists — skip`);
      continue;
    }
    await graph('POST', `/sites/${siteId}/lists/${encodeURIComponent(listName)}/columns`, col);
    console.log(`  ✓ added ${listName}.${col.name}`);
  }
}

(async () => {
  try {
    console.log(`Resolving site ${SITE_HOST}${SITE_PATH} ...`);
    const siteId = await getSiteId();
    console.log(`Site id: ${siteId}\n`);

    // 1. OrgRoles (Title = job-role name, exists by default)
    await ensureList(siteId, 'OrgRoles', [text('Department')]);

    // 2. Self Assessments
    await ensureList(siteId, 'Self Assessments', [
      text('EmployeeID'),
      number('SelfRating'),
      text('AssessmentState'),
      text('ManagerEmail'),
      number('ManagerRating'),
      text('ManagerComment', true),
      text('EmployeeComment', true),
      dateTime('AssessmentDate'),
      dateTime('ReviewDate'),
    ]);

    // 2b. JD Acknowledgements (signed job-description sign-offs)
    await ensureList(siteId, 'JD Acknowledgements', [
      text('Role'),
      text('EmployeeID'),
      text('Signature'),
      dateTime('AcknowledgedDate'),
    ]);

    // 3. Columns on existing UserRoles
    console.log(`• ensuring columns on "UserRoles"`);
    await ensureColumns(siteId, 'UserRoles', [text('JobRole'), text('Department'), text('ManagerEmail')]);

    // 4. Columns on existing Courses
    console.log(`• ensuring columns on "Courses"`);
    await ensureColumns(siteId, 'Courses', [text('JobRoles'), text('Departments'), boolean('Mandatory')]);

    // 5. Column on existing Employee Enrollments
    console.log(`• ensuring columns on "Employee Enrollments"`);
    await ensureColumns(siteId, 'Employee Enrollments', [dateTime('CompletedDate')]);

    console.log('\n✅ Provisioning complete.');
  } catch (e) {
    console.error(`\n❌ Failed: ${e.message}`);
    if (e.status === 403) console.error('   (403 — the token likely lacks Sites.Manage.All. Re-consent with that scope.)');
    if (e.body) console.error('   detail:', JSON.stringify(e.body.error || e.body));
    process.exit(1);
  }
})();

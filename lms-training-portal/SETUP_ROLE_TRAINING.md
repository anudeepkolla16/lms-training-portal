# Setup: Role-Based Training, Self-Assessment & Manager Review

These features read/write SharePoint lists via Microsoft Graph. The app **cannot create
lists or columns** itself — a SharePoint admin must provision the following in
`sarasanalytics0.sharepoint.com/sites/training-library` **before** the features work against
live data. Until then, the app runs on built-in mock/empty fallbacks so the UI is fully demoable.

> Two distinct "role" concepts:
> - **Access role** (`Role`: Employee / Manager / HR / Admin) — controls which dashboard a user sees.
> - **Job-role / JD** (`JobRole`, e.g. "Data Engineer") — controls which training is relevant.
> They are different columns and must not be conflated.

## Automated provisioning (recommended — one command)

Instead of clicking through the UI, run one of the provisioning scripts in `scripts/`. Both are
**idempotent** (safe to re-run; existing lists/columns are skipped).

**Option A — Node (no install beyond Node):**
```bash
# Get a Graph token with Sites.Manage.All from https://developer.microsoft.com/graph/graph-explorer
GRAPH_TOKEN="<access-token>" node scripts/provision-sharepoint.js
```
> Note: creating lists/columns needs **Sites.Manage.All** (or Sites.FullControl.All) — the app's
> runtime `Sites.ReadWrite.All` scope is enough to read/write items but **not** to create lists.

**Option B — PnP PowerShell:**
```powershell
Install-Module PnP.PowerShell -Scope CurrentUser   # first time only
./scripts/Provision-SharePoint.ps1 -SiteUrl "https://sarasanalytics0.sharepoint.com/sites/training-library"
```

Either script creates everything in the manual reference below. If you prefer to do it by hand, follow the tables.

## 1. New list: `OrgRoles` (job-role / JD taxonomy — your 22 roles × 10 departments)
| Column | Type | Notes |
|---|---|---|
| `Title` | Single line text | Job-role name (default Title column). |
| `Department` | Single line text | One of the 10 departments. |

Admins can add/delete these from **Admin Dashboard → Org Roles (JD)**.

## 2. New list: `Self Assessments` (rating + manager-review workflow)
| Column | Type | Notes |
|---|---|---|
| `Title` | Single line text | Course title. |
| `EmployeeID` | Single line text | Employee email. |
| `SelfRating` | Number | 1–5. |
| `AssessmentState` | Single line text (or Choice) | `PendingManagerReview`, `Approved`, `Remediation`, `RemediationQuizPassed`. |
| `ManagerEmail` | Single line text | Reviewer (copied from the employee profile at submit time). |
| `ManagerRating` | Number | Final rating after manager review. |
| `ManagerComment` | Multiple lines of text | Optional. |
| `EmployeeComment` | Multiple lines of text | Optional. |
| `AssessmentDate` | Date and Time | Set automatically on submit. |
| `ReviewDate` | Date and Time | Set automatically on manager action. |

## 3. Add columns to existing list: `UserRoles`
(`Title` = email and `Role` = access-role already exist.)
| Column | Type | Notes |
|---|---|---|
| `JobRole` | Single line text | The JD dimension. |
| `Department` | Single line text | Employee's department. |
| `ManagerEmail` | Single line text | Routes that employee's assessment reviews. |

Admins set these from **Admin Dashboard → Employee Profiles**.

## 3b. Add column to existing list: `Employee Enrollments`
| Column | Type | Notes |
|---|---|---|
| `CompletedDate` | Date and Time | Set automatically when a course is marked Completed; shown in the Admin "Completed" column. Optional — if absent, completion still works but no date is recorded. |

## 4. Add columns to existing list: `Courses`
| Column | Type | Notes |
|---|---|---|
| `JobRoles` | Single line text | Semicolon-delimited target job-roles, e.g. `Data Engineer;BI Analyst`. Blank = applies to all. |
| `Departments` | Single line text | Semicolon-delimited target departments. Blank = applies to all. |
| `Mandatory` | Yes/No (boolean) | When Yes, matching employees are auto-enrolled on login. |

Admins set these in the **Add / Edit Course** forms.

## Access roles & dashboard scoping

`Role` (on the `UserRoles` list) controls which dashboard a user sees and what data it shows:

| Role | Dashboard | Data shown |
|---|---|---|
| Employee | My Training | Their own courses |
| **Manager** | Manager Dashboard | **Only their direct reports** — employees whose `ManagerEmail` = the manager's email. Set `ManagerEmail` on each report's profile, or the manager sees no one. |
| **HOD** *(new)* | HOD Dashboard | **Their whole department** — employees whose `Department` matches the HOD's `Department`. |
| HR | HR Analytics | Whole organisation |
| Admin | Admin | Everything + management |

Set roles in **Admin → Employee Profiles** (the Access Role column is now an editable dropdown including **HOD**).

## Email triggers (all use the `Mail.Send` consent below)

- **Course assigned** → emails the employee when an Admin/Manager assigns a course, or when a Mandatory course is auto-assigned on login (not on self-enrol).
- **Pending review** → emails the manager when an employee self-rates ≥ 4.
- **Completion reminders** → the **📧 Send Reminders** button (Admin / HR / Manager / HOD) emails each in-scope employee a list of their incomplete/overdue courses, on demand.

## Manager email notifications (one Azure AD step)

When an employee self-rates a course **4 or 5**, the app emails the employee's manager
(from `ManagerEmail`) via Microsoft Graph so they know a review is waiting. For this to work:

1. In **Azure AD → App registrations →** this app **→ API permissions**, add the Microsoft Graph
   **delegated** permission **`Mail.Send`**, then **Grant admin consent**.
2. Users will be re-prompted to consent on next sign-in (the app already requests the scope).

The email is sent **from the signed-in employee's mailbox** (`/me/sendMail`). Sending is
best-effort — if it fails, the assessment is still saved and the manager still sees it in the
**Assessment Reviews** tab. If `Mail.Send` is not granted, only the in-app tab notification works.

## Job Descriptions (mandatory read per role)
Each job-role can have a **JD document** that every employee in that role must read & acknowledge.

- In **Admin → Org Roles (JD)**, click **📄 Create JD for all roles** to seed a JD entry per role, then paste a **document URL** for each (SharePoint/PDF link) and **Save**. (Or set a single role's URL directly.)
- Behind the scenes a JD is a mandatory document course named **`JD: <Role>`** (targeted by job-role only). It **auto-assigns** to everyone in that role once it has a URL.
- Employees see it with a **📄 Job Description** badge — **no self-assessment, no quiz**. They **Read** it, then **✅ Acknowledge & Complete**.
- JDs are excluded from the self-enroll **Browse All Courses** catalog.

## How the workflow runs
1. **Admin** adds job-roles (Org Roles tab), sets a **JD document** per role, tags courses with `JobRoles`/`Departments` + `Mandatory`, and fills employee profiles (`JobRole`/`Department`/`ManagerEmail`).
2. **Employee** signs in → mandatory matching courses **and their role's JD** are auto-enrolled (idempotent). They can also **Browse All Courses** and self-enroll.
3. **Before** starting a course the employee does a **Self-Assessment (1–5)** — "how well do you already know this?":
   - **≥ 4** (already know it) → `PendingManagerReview` → appears in the manager's **Assessment Reviews** tab. Manager **approves** → course marked **Completed** (skipped, `Approved`); or sets a rating **< 4** → employee must take the training. If the employee has **no manager**, ≥ 4 is auto-approved.
   - **< 4** (need training) → `Remediation` → employee takes the course + passes the quiz (→ `RemediationQuizPassed`, Completed).

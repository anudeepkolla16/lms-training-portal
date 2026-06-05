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
| `AssessmentState` | Single line text (or Choice) | `ChallengePending`, `ChallengePassed`, `Remediation`, `RemediationQuizPassed` (legacy: `PendingManagerReview`, `Approved`). |
| `ManagerEmail` | Single line text | Reviewer (copied from the employee profile at submit time). |
| `ManagerRating` | Number | Final rating after manager review. |
| `ManagerComment` | Multiple lines of text | Optional. |
| `EmployeeComment` | Multiple lines of text | Optional. |
| `AssessmentDate` | Date and Time | Set automatically on submit. |
| `ReviewDate` | Date and Time | Set automatically on manager action / challenge completion. |
| `ChallengeScore` | Number | Correct answers on the hard challenge quiz (4–5 ratings). |
| `ChallengeTotal` | Number | Total questions in the challenge quiz. |
| `ChallengePercent` | Number | Challenge quiz score %. |
| `ChallengeResult` | Single line text | `Pass` / `Fail`. Shown in the manager's Assessment Reviews tab. |

## 2b. New list: `JD Acknowledgements` (signed JD sign-offs)
Records each employee's signed acknowledgement of their role's job description. If this list
doesn't exist the app degrades gracefully (the JD still completes; the signature just isn't stored).
| Column | Type | Notes |
|---|---|---|
| `Title` | Single line text | JD course title (`JD: <Role>`). |
| `Role` | Single line text | The job-role. |
| `EmployeeID` | Single line text | Employee email. |
| `Signature` | Single line text | Typed full name. |
| `AcknowledgedDate` | Date and Time | Set automatically on acknowledgement. |

## 3. Add columns to existing list: `UserRoles`
(`Title` = email and `Role` = access-role already exist.)
| Column | Type | Notes |
|---|---|---|
| `JobRole` | Single line text | The JD dimension. |
| `Department` | Single line text | Employee's department. |
| `ManagerEmail` | Single line text | Routes that employee's assessment reviews. |
| `OrgLevel` | Single line text (or Choice `OL1`..`OL5`) | Seniority band — sets the expected skill level in the Skills module. |

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
| `Skills` | Single line text | Semicolon-delimited skills this course develops. Drives the Skills-module learning-path course recommendations. |
| `Mandatory` | Yes/No (boolean) | When Yes, matching employees are auto-enrolled on login. |

Admins set these in the **Add / Edit Course** forms.

## 4b. Add column to existing list: `Quiz Questions`
| Column | Type | Notes |
|---|---|---|
| `Difficulty` | Single line text (or Choice `Medium`/`Hard`) | Quiz tier. `Medium` for 1–3 self-ratings (post-course quiz), `Hard` for 4–5 (challenge quiz). Set per question in **Admin → Quizzes**. Blank/single-tier courses use whatever exists. |

## Skills module (People Transformation) — new lists

A separate **🎯 Skills** area (alongside courses) where employees self-rate on the **priority skills for their role** against an **expected level (SL1–SL5)** that varies by **Org Level (OL1–OL5)**; managers calibrate and release; HoD/HR see roll-ups. Skills are maintained by Admin/HR per role (with a "seed starter skills" helper).

### New list: `RoleSkills` (which skills matter per role)
| Column | Type | Notes |
|---|---|---|
| `Title` | Single line text | Skill name. |
| `Role` | Single line text | Job-role the skill belongs to. |
| `Category` | Single line text | Optional grouping. |
| `Priority` | Yes/No | Priority skill for the role. |
| `SortOrder` | Number | Display order. |

### New list: `RoleExpectations` (expected level per role × org level)
| Column | Type | Notes |
|---|---|---|
| `Title` | Single line text | e.g. `Recruiter OL2`. |
| `Role` | Single line text | Job-role. |
| `OrgLevel` | Single line text | `OL1`..`OL5`. |
| `ExpectedLevel` | Number | 1–5 (SL). If absent, a baseline OL→SL map is used. |

### New list: `Skill Assessments` (per employee × skill × cycle)
| Column | Type | Notes |
|---|---|---|
| `Title` | Single line text | Skill name. |
| `Role` / `EmployeeID` / `OrgLevel` / `Cycle` | Single line text | Context. |
| `ExpectedLevel` / `SelfLevel` / `ManagerLevel` / `Gap` | Number | Levels + gap. |
| `SelfUncertain` | Yes/No | Employee unsure of self-rating. |
| `State` | Single line text | `Submitted` / `Released`. |
| `ManagerNote` | Multiple lines | Calibration note. |
| `AssessmentDate` / `ReviewDate` | Date and Time | Set automatically. |

**How it runs:** Admin/HR set skills + expected levels per role (Manage Skills) and each employee's `OrgLevel` (Employee Profiles) → employee self-rates each priority skill and submits → manager calibrates the levels and **releases** the path → HoD sees department roll-up (assessed / paths / avg gap / top gaps), HR sees function-by-function status. Until the lists exist the module runs on built-in sample data (Recruiter role).

**Learning path → courses:** for each skill where the employee is below expected, the path recommends courses tagged with that skill (Courses `Skills` field; falls back to a title keyword match) and offers a one-click **“+ Add to training”** that enrols them. Tag courses with skills in **Admin → Courses** (Related Skills).

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

- In **Admin → Org Roles (JD)**, click **📄 Create JD for all roles**. This seeds a JD entry per role **with a placeholder document**, so JDs **auto-assign immediately** ("by default"). Each row then shows `⏳ Placeholder assigned — paste the real document URL`; paste the SharePoint/PDF link and **Save** to replace it (status → `✓ Real document assigned`).
- Behind the scenes a JD is a mandatory document course named **`JD: <Role>`** (targeted by job-role only). It **auto-assigns** to everyone in that role.
- Employees see it with a **📄 Job Description** badge — **no self-assessment, no quiz**. They **Read/View** it, then **✅ Acknowledge & Complete**, which requires a **typed-name signature + confirmation checkbox**. While the real document is pending, the reader shows a "document being finalised" notice instead of a broken link.
- Each acknowledgement is recorded in the **`JD Acknowledgements`** list (employee, role, signature, timestamp) — beyond the enrollment completion date. The employee's card shows `✍ Acknowledged <date>`.
- **HR Dashboard → JD Sign-offs** shows a compliance report: every employee whose role has a JD, whether they've signed (with signature + date), a compliance %, department filter, and CSV export.
- JDs are excluded from the self-enroll **Browse All Courses** catalog.

## How the workflow runs
1. **Admin** adds job-roles (Org Roles tab), sets a **JD document** per role, tags courses with `JobRoles`/`Departments` + `Mandatory`, and fills employee profiles (`JobRole`/`Department`/`ManagerEmail`).
2. **Employee** signs in → mandatory matching courses **and their role's JD** are auto-enrolled (idempotent). They can also **Browse All Courses** and self-enroll.
3. **Before** starting a course the employee does a **Self-Assessment (1–5)** — "how well do you already know this?". The rating sets the quiz difficulty and the path:
   - **4–5** (confident) → take a **HARD challenge quiz** immediately (`ChallengePending`). The score + rating are **emailed to the reporting manager** for review (pass or fail).
     - **Pass** → course marked **Completed** / skipped (`ChallengePassed`).
     - **Fail** → quiz ends → must take the full course (`Remediation`).
   - **1–3** (need training) → go straight into the **course**, then a **MEDIUM quiz** (`Remediation`).
   - Any quiz **failure** ends the quiz and sends the employee to the course (no in-quiz retry). Passing the post-course quiz completes it (`RemediationQuizPassed`).

   Quiz difficulty comes from the **`Difficulty`** column on `Quiz Questions` (`Medium` / `Hard`). Author both tiers per course; if only one tier exists it's used for everyone.

   The reporting **Manager → Assessment Reviews** tab lists each team member's self-rating and, for 4–5 raters, their challenge-quiz score + Pass/Fail and outcome (with CSV export). The manager can set a rating, add a **reason/note**, and **Approve** (marks the course complete) or **Reject** (reopens it — the employee must take the course); the employee is emailed the outcome and note either way. A **Needs action / All** filter hides rows already approved/rejected (a row counts as actioned once the manager approves/rejects it). Managers are also emailed each challenge result automatically.

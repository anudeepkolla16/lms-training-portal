# Setup: Role-Based Training, Self-Assessment & Manager Review

These features read/write SharePoint lists via Microsoft Graph. The app **cannot create
lists or columns** itself — a SharePoint admin must provision the following in
`sarasanalytics0.sharepoint.com/sites/training-library` **before** the features work against
live data. Until then, the app runs on built-in mock/empty fallbacks so the UI is fully demoable.

> Two distinct "role" concepts:
> - **Access role** (`Role`: Employee / Manager / HR / Admin) — controls which dashboard a user sees.
> - **Job-role / JD** (`JobRole`, e.g. "Data Engineer") — controls which training is relevant.
> They are different columns and must not be conflated.

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

## 4. Add columns to existing list: `Courses`
| Column | Type | Notes |
|---|---|---|
| `JobRoles` | Single line text | Semicolon-delimited target job-roles, e.g. `Data Engineer;BI Analyst`. Blank = applies to all. |
| `Departments` | Single line text | Semicolon-delimited target departments. Blank = applies to all. |
| `Mandatory` | Yes/No (boolean) | When Yes, matching employees are auto-enrolled on login. |

Admins set these in the **Add / Edit Course** forms.

## How the workflow runs
1. **Admin** adds job-roles (Org Roles tab), tags courses with `JobRoles`/`Departments` + `Mandatory`, and fills employee profiles (`JobRole`/`Department`/`ManagerEmail`).
2. **Employee** signs in → mandatory matching courses are auto-enrolled (idempotent). They can also **Browse All Courses** and self-enroll.
3. After completing a course the employee does a **Self-Assessment (1–5)**:
   - **≥ 4** → `PendingManagerReview` → appears in the manager's **Assessment Reviews** tab; manager approves or adjusts the rating (→ `Approved`).
   - **< 4** → `Remediation` → employee must redo the material and pass the quiz (→ `RemediationQuizPassed`).

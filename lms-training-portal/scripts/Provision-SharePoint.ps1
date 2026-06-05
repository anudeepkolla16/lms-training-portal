<#
  One-time SharePoint provisioning for the role-based-training features (PnP PowerShell).

  Creates idempotently: OrgRoles + Self Assessments + JD Acknowledgements lists with
  columns, and adds the new columns to the existing UserRoles and Courses lists.

  Prereqs:
    Install-Module PnP.PowerShell -Scope CurrentUser
    # An account with permission to manage lists on the site.

  Usage:
    ./Provision-SharePoint.ps1 -SiteUrl "https://sarasanalytics0.sharepoint.com/sites/training-library"
#>
param(
  [Parameter(Mandatory = $true)][string]$SiteUrl
)

Connect-PnPOnline -Url $SiteUrl -Interactive

function Ensure-List([string]$Title) {
  $list = Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
  if ($null -eq $list) {
    Write-Host "+ creating list '$Title'"
    New-PnPList -Title $Title -Template GenericList -EnableContentTypes:$false | Out-Null
  } else {
    Write-Host "• list '$Title' already exists"
  }
}

function Ensure-Field([string]$List, [string]$Name, [string]$Type) {
  $f = Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue
  if ($null -eq $f) {
    Add-PnPField -List $List -DisplayName $Name -InternalName $Name -Type $Type -AddToDefaultView | Out-Null
    Write-Host "  ✓ added $List.$Name ($Type)"
  } else {
    Write-Host "  • $List.$Name exists — skip"
  }
}

# 1. OrgRoles (Title column exists by default = job-role name)
Ensure-List "OrgRoles"
Ensure-Field "OrgRoles" "Department" "Text"

# 2. Self Assessments
Ensure-List "Self Assessments"
Ensure-Field "Self Assessments" "EmployeeID"      "Text"
Ensure-Field "Self Assessments" "SelfRating"      "Number"
Ensure-Field "Self Assessments" "AssessmentState" "Text"
Ensure-Field "Self Assessments" "ManagerEmail"    "Text"
Ensure-Field "Self Assessments" "ManagerRating"   "Number"
Ensure-Field "Self Assessments" "ManagerComment"  "Note"
Ensure-Field "Self Assessments" "EmployeeComment" "Note"
Ensure-Field "Self Assessments" "AssessmentDate"  "DateTime"
Ensure-Field "Self Assessments" "ReviewDate"      "DateTime"
Ensure-Field "Self Assessments" "ChallengeScore"   "Number"
Ensure-Field "Self Assessments" "ChallengeTotal"   "Number"
Ensure-Field "Self Assessments" "ChallengePercent" "Number"
Ensure-Field "Self Assessments" "ChallengeResult"  "Text"

# 2b. JD Acknowledgements (signed job-description sign-offs)
Ensure-List "JD Acknowledgements"
Ensure-Field "JD Acknowledgements" "Role"             "Text"
Ensure-Field "JD Acknowledgements" "EmployeeID"       "Text"
Ensure-Field "JD Acknowledgements" "Signature"        "Text"
Ensure-Field "JD Acknowledgements" "AcknowledgedDate" "DateTime"

# 3. Columns on existing UserRoles
Ensure-Field "UserRoles" "JobRole"     "Text"
Ensure-Field "UserRoles" "Department"  "Text"
Ensure-Field "UserRoles" "ManagerEmail" "Text"

# 4. Columns on existing Courses
Ensure-Field "Courses" "JobRoles"    "Text"
Ensure-Field "Courses" "Departments" "Text"
Ensure-Field "Courses" "Skills"      "Text"
Ensure-Field "Courses" "Mandatory"   "Boolean"

# 5. Column on existing Employee Enrollments
Ensure-Field "Employee Enrollments" "CompletedDate" "DateTime"

# 6. Column on existing Quiz Questions (difficulty tier: Medium / Hard)
Ensure-Field "Quiz Questions" "Difficulty" "Text"

# 7. Skills module — Org Level on UserRoles + three new lists
Ensure-Field "UserRoles" "OrgLevel" "Text"

Ensure-List "RoleSkills"
Ensure-Field "RoleSkills" "Role"      "Text"
Ensure-Field "RoleSkills" "Category"  "Text"
Ensure-Field "RoleSkills" "Priority"  "Boolean"
Ensure-Field "RoleSkills" "SortOrder" "Number"

Ensure-List "RoleExpectations"
Ensure-Field "RoleExpectations" "Role"          "Text"
Ensure-Field "RoleExpectations" "OrgLevel"      "Text"
Ensure-Field "RoleExpectations" "ExpectedLevel" "Number"

Ensure-List "Skill Assessments"
Ensure-Field "Skill Assessments" "Role"           "Text"
Ensure-Field "Skill Assessments" "EmployeeID"     "Text"
Ensure-Field "Skill Assessments" "OrgLevel"       "Text"
Ensure-Field "Skill Assessments" "Cycle"          "Text"
Ensure-Field "Skill Assessments" "ExpectedLevel"  "Number"
Ensure-Field "Skill Assessments" "SelfLevel"      "Number"
Ensure-Field "Skill Assessments" "SelfUncertain"  "Boolean"
Ensure-Field "Skill Assessments" "ManagerLevel"   "Number"
Ensure-Field "Skill Assessments" "Gap"            "Number"
Ensure-Field "Skill Assessments" "State"          "Text"
Ensure-Field "Skill Assessments" "ManagerNote"    "Note"

Write-Host "`n✅ Provisioning complete."

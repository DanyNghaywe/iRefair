# PowerShell script to update remaining files from candidate/candidates to applicant/applicants
# Run this from the iRefair root directory

$files = @(
    "src\app\(founder)\founder\matches\page.tsx",
    "src\app\(founder)\founder\candidates\[iRAIN]\page.tsx",
    "src\app\(founder)\founder\candidates\page.tsx",
    "src\app\(founder)\founder\applications\page.tsx",
    "src\app\candidate\page.tsx",
    "src\app\apply\page.tsx",
    "src\app\api\apply\route.ts",
    "src\components\founder\EmptyState.tsx",
    "src\app\referrer\portal\PortalClient.tsx",
    "src\app\referrer\page.tsx",
    "src\app\api\referrer\reschedule\route.ts",
    "src\app\api\referrer\portal\resume\route.ts",
    "src\app\api\referrer\portal\feedback\route.ts",
    "src\app\api\referrer\portal\data\route.ts",
    "src\app\page.tsx",
    "src\app\terms\page.tsx",
    "src\app\privacy\page.tsx",
    "src\app\not-found.tsx",
    "README.md"
)

# Define replacements
$replacements = @{
    # Type/Interface names
    "candidateIrain" = "applicantIrain"
    "CandidateRecord" = "ApplicantRecord"
    "candidateId" = "applicantId"
    "candidateEmail" = "applicantEmail"
    "candidateName" = "applicantName"
    "candidatePhone" = "applicantPhone"
    "findCandidateByIdentifier" = "findApplicantByIdentifier"
    "getCandidateByIrain" = "getApplicantByIrain"
    "updateCandidateFields" = "updateApplicantFields"
    "updateCandidateAdmin" = "updateApplicantAdmin"

    # Display text - Sentence case
    "Candidate" = "Applicant"
    "candidate" = "applicant"
    "Candidates" = "Applicants"
    "candidates" = "applicants"

    # Labels in UI
    '"Candidate' = '"Applicant'
    "'Candidate" = "'Applicant"
    "Active candidates" = "Active applicants"
    "Active Candidates" = "Active Applicants"

    # Comments
    "# candidate" = "# applicant"
    "# Candidate" = "# Applicant"
    "// candidate" = "// applicant"
    "// Candidate" = "// Applicant"
}

Write-Host "Starting file updates..." -ForegroundColor Green

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file

    if (Test-Path $fullPath) {
        Write-Host "Updating: $file" -ForegroundColor Yellow

        $content = Get-Content $fullPath -Raw
        $originalContent = $content

        # Apply all replacements
        foreach ($key in $replacements.Keys) {
            $content = $content -replace [regex]::Escape($key), $replacements[$key]
        }

        # Only write if content changed
        if ($content -ne $originalContent) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "  ✓ Updated" -ForegroundColor Green
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ File not found: $fullPath" -ForegroundColor Red
    }
}

Write-Host "`nAll files processed!" -ForegroundColor Green
Write-Host "Please review the changes and test the application." -ForegroundColor Cyan

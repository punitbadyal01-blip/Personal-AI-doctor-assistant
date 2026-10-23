param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction Stop).Source
$logs = Join-Path $PSScriptRoot 'test-output/local'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Start-ServiceIfNeeded([int]$Port, [string]$Directory, [string[]]$NodeArguments, [string]$Name, [string]$Probe) {
    $existing = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $existing) {
        $process = Start-Process -FilePath $node -WorkingDirectory $Directory -ArgumentList $NodeArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs "$Name.log") -RedirectStandardError (Join-Path $logs "$Name-error.log")
        $process.Id | Set-Content (Join-Path $logs "$Name.pid")
    }
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port$Probe" -UseBasicParsing -TimeoutSec 2
            if ($Name -eq 'backend') { $ready = ($response.Content | ConvertFrom-Json).status -eq 'ok' }
            else { $ready = $response.Content -match '<title>HealthClear' }
            if ($ready) { break }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw "$Name could not start on port $Port. Check test-output/local logs and whether another application uses that port. Existing processes were left running." }
    Write-Output "HealthClear $Name ready on port $Port."
}

# Override only local process networking; credentials remain in the ignored .env.
$env:HOST = '127.0.0.1'
$env:PORT = '8080'
$env:PREVIEW_PORT = '5173'
$env:HEALTHCLEAR_ALLOWED_ORIGINS = 'http://127.0.0.1:5173'
Start-ServiceIfNeeded 8080 (Join-Path $PSScriptRoot 'backend') @('--env-file-if-exists=.env', 'server.mjs') 'backend' '/health'
Start-ServiceIfNeeded 5173 $PSScriptRoot @('server.mjs') 'preview' '/'
Write-Output 'Open http://127.0.0.1:5173. Choose a fictional sample to test without credentials.'
Write-Output 'The browser connects automatically. Real AI analysis requires OPENAI_API_KEY and OPENAI_MODEL in backend/.env, followed by a backend restart.'
if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:5173' }

$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

Write-Host "Creating exec instance inside harmony-django-backend..." -ForegroundColor Yellow

$ExecBody = @{
    AttachStdout = $true
    AttachStderr = $true
    Cmd = @("python", "manage.py", "migrate")
} | ConvertTo-Json

try {
    # 1. Create Exec
    $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-backend/exec" -Headers $Headers -Method Post -ContentType "application/json" -Body $ExecBody -ErrorAction Stop
    $ExecId = $CreateResponse.Id
    Write-Host "Exec instance created: $ExecId" -ForegroundColor Green

    # 2. Start Exec (Detached)
    Write-Host "Starting exec to run migrations (detached)..." -ForegroundColor Yellow
    $StartBody = @{
        Detach = $true
        Tty = $false
    } | ConvertTo-Json

    $StartResponse = Invoke-RestMethod -Uri "$BaseUri/exec/$ExecId/start" -Headers $Headers -Method Post -ContentType "application/json" -Body $StartBody -ErrorAction Stop
    
    # 3. Poll Exec status to wait for completion
    Write-Host "Polling exec status..." -ForegroundColor Yellow
    $MaxAttempts = 30
    $Attempt = 0
    $ExitCode = -1
    $IsRunning = $true

    while ($IsRunning -and $Attempt -lt $MaxAttempts) {
        Start-Sleep -Seconds 1
        $InspectResponse = Invoke-RestMethod -Uri "$BaseUri/exec/$ExecId/json" -Headers $Headers -Method Get -ErrorAction Stop
        $IsRunning = $InspectResponse.Running
        $ExitCode = $InspectResponse.ExitCode
        $Attempt++
        Write-Host "Attempt $Attempt -- Running=$IsRunning -- ExitCode=$ExitCode" -ForegroundColor Gray
    }
    
    Write-Host "Execution completed with ExitCode: $ExitCode" -ForegroundColor Green
    if ($ExitCode -eq 0) {
        Write-Host "Migrations applied successfully on production database!" -ForegroundColor Green
    } else {
        Write-Host "Migration failed! Please review backend container state." -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to run migrations: $($_.Exception.Message)" -ForegroundColor Red
}

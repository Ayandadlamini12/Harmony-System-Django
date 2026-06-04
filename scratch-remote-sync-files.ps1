$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"
$WorkspaceRoot = "c:\Users\ayand\Local Library\Github\Harmony-System-Django"

# Files to sync
$FilesToSync = @(
    @{ Local = "frontend/src/app/patients/[id]/page.tsx"; Remote = "frontend/src/app/patients/[id]/page.tsx" },
    @{ Local = "frontend/src/app/ui-mockup/page.tsx"; Remote = "frontend/src/app/ui-mockup/page.tsx" },
    @{ Local = "frontend/src/components/patient-record-workspace.tsx"; Remote = "frontend/src/components/patient-record-workspace.tsx" },
    @{ Local = "frontend/src/components/key-notes-dialog.tsx"; Remote = "frontend/src/components/key-notes-dialog.tsx" },
    @{ Local = "frontend/src/components/patient-info-dialog.tsx"; Remote = "frontend/src/components/patient-info-dialog.tsx" },
    @{ Local = "frontend/src/components/patient-journey-panel.tsx"; Remote = "frontend/src/components/patient-journey-panel.tsx" },
    @{ Local = "backend/seed_patients.py"; Remote = "backend/seed_patients.py" }
)

Write-Host "Starting file-by-file remote sync..." -ForegroundColor Yellow

foreach ($File in $FilesToSync) {
    $LocalPath = Join-Path $WorkspaceRoot $File.Local
    if (-not (Test-Path -LiteralPath $LocalPath)) {
        Write-Error "Local file not found: $LocalPath"
        exit 1
    }
    
    $Bytes = [System.IO.File]::ReadAllBytes($LocalPath)
    $Base64 = [Convert]::ToBase64String($Bytes)
    
    $RemoteRel = $File.Remote
    $RemoteDir = [System.IO.Path]::GetDirectoryName("/data/compose/69/$RemoteRel").Replace("\", "/")
    $RemotePath = "/data/compose/69/$RemoteRel".Replace("\", "/")
    
    Write-Host "Syncing $($File.Local) ($($Bytes.Length) bytes)..." -ForegroundColor Yellow
    
    # Clean up existing container if it exists
    try {
        $DeleteUri = "$BaseUri/containers/harmony-file-sync?force=true"
        Invoke-RestMethod -Uri $DeleteUri -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
    } catch {}
    
    # Create single-file sync container
    $ShellScript = "mkdir -p `"$RemoteDir`" && printf '%s' '$Base64' | base64 -d > `"$RemotePath`" && echo 'Success'"
    $CreateBody = @{
        Image = "alpine:latest"
        Entrypoint = @("sh", "-c")
        Cmd = @($ShellScript)
        HostConfig = @{
            Binds = @("portainer_data:/data")
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/create?name=harmony-file-sync" -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody -ErrorAction Stop
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-file-sync/start" -Headers $Headers -Method Post -ErrorAction Stop
        
        # Wait
        $WaitResponse = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-file-sync/wait" -Headers $Headers -Method Post -ErrorAction Stop
        
        # Logs
        $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-file-sync/logs?stdout=true&stderr=true" -Headers $Headers -Method Get -ErrorAction Stop
        if ($Logs -like "*Success*") {
            Write-Host "Successfully synced: $RemoteRel" -ForegroundColor Green
        } else {
            Write-Host "Failed to sync $RemoteRel. Logs: $Logs" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Failed to sync $($File.Local): $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    } finally {
        try {
            Invoke-RestMethod -Uri "$BaseUri/containers/harmony-file-sync?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
        } catch {}
    }
}

Write-Host "All files synced successfully to remote server!" -ForegroundColor Green

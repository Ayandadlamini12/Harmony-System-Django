$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

# 1. Clean up existing container if it exists
Write-Host "Checking for existing harmony-git-sync container..." -ForegroundColor Yellow
try {
    $CheckUri = "$BaseUri/containers/harmony-git-sync/json"
    $ContainerInfo = Invoke-RestMethod -Uri $CheckUri -Headers $Headers -Method Get -ErrorAction Stop
    if ($ContainerInfo) {
        Write-Host "Found existing harmony-git-sync container. Removing it..." -ForegroundColor Orange
        $DeleteUri = "$BaseUri/containers/harmony-git-sync?force=true"
        Invoke-RestMethod -Uri $DeleteUri -Headers $Headers -Method Delete -ErrorAction Stop
    }
} catch {
    # Expected if container doesn't exist
    Write-Host "No existing harmony-git-sync container found (safe to proceed)." -ForegroundColor Gray
}

# 2. Create the git-sync container
Write-Host "Creating git-sync container..." -ForegroundColor Yellow
$CreateUri = "$BaseUri/containers/create?name=harmony-git-sync"
$CreateBody = @{
    Image = "alpine/git:latest"
    Entrypoint = @("sh", "-c")
    Cmd = @("git config --global --add safe.directory /data/compose/69 && git -C /data/compose/69 reset --hard && git -C /data/compose/69 pull origin master")
    HostConfig = @{
        Binds = @("portainer_data:/data")
    }
} | ConvertTo-Json -Depth 10

try {
    $CreateResponse = Invoke-RestMethod -Uri $CreateUri -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody -ErrorAction Stop
    Write-Host "Container created successfully: $($CreateResponse.Id)" -ForegroundColor Green
} catch {
    Write-Host "Failed to create container: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}

# 3. Start the container
Write-Host "Starting container..." -ForegroundColor Yellow
$StartUri = "$BaseUri/containers/harmony-git-sync/start"
try {
    Invoke-RestMethod -Uri $StartUri -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Container started." -ForegroundColor Green
} catch {
    Write-Host "Failed to start container: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Wait for the container to finish
Write-Host "Waiting for git pull to finish..." -ForegroundColor Yellow
$WaitUri = "$BaseUri/containers/harmony-git-sync/wait"
try {
    $WaitResponse = Invoke-RestMethod -Uri $WaitUri -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Container exited with status code: $($WaitResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Failed to wait for container: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Fetch logs to verify git pull succeeded
Write-Host "Fetching container logs..." -ForegroundColor Yellow
$LogsUri = "$BaseUri/containers/harmony-git-sync/logs?stdout=true&stderr=true"
try {
    $Logs = Invoke-RestMethod -Uri $LogsUri -Headers $Headers -Method Get -ErrorAction Stop
    Write-Host "GIT PULL LOGS:" -ForegroundColor Cyan
    Write-Host $Logs
} catch {
    Write-Host "Failed to fetch logs: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Delete container
Write-Host "Cleaning up container..." -ForegroundColor Yellow
$DeleteUri = "$BaseUri/containers/harmony-git-sync?force=true"
try {
    Invoke-RestMethod -Uri $DeleteUri -Headers $Headers -Method Delete -ErrorAction Stop
    Write-Host "Container cleaned up." -ForegroundColor Green
} catch {
    Write-Host "Failed to delete container: $($_.Exception.Message)" -ForegroundColor Red
}

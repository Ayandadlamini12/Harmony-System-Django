$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

# 1. Clean up existing container if it exists
try {
    $DeleteUri = "$BaseUri/containers/harmony-git-init?force=true"
    Invoke-RestMethod -Uri $DeleteUri -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
} catch {}

# 2. Create the git-init-pull container
Write-Host "Creating git-init container to initialize and sync code..." -ForegroundColor Yellow
$ShellScript = "git config --global --add safe.directory /data/compose/69 && cd /data/compose/69 && git init && git remote remove origin 2>/dev/null; git remote add origin https://github.com/Ayandadlamini12/Harmony-System-Django.git && git fetch origin master && git reset --hard origin/master && echo 'SYNC_SUCCESS'"
$CreateBody = @{
    Image = "alpine/git:latest"
    Entrypoint = @("sh", "-c")
    Cmd = @($ShellScript)
    HostConfig = @{
        Binds = @("portainer_data:/data")
    }
} | ConvertTo-Json -Depth 10

try {
    $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/create?name=harmony-git-init" -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody -ErrorAction Stop
    Write-Host "Container created: $($CreateResponse.Id)" -ForegroundColor Green
    
    # Start container
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-git-init/start" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Git initialization and reset started..." -ForegroundColor Green
    
    # Wait
    $WaitResponse = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-git-init/wait" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Container exited with status code: $($WaitResponse.StatusCode)" -ForegroundColor Green
    
    # Logs
    $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-git-init/logs?stdout=true&stderr=true" -Headers $Headers -Method Get -ErrorAction Stop
    Write-Host "SYNC LOGS:" -ForegroundColor Cyan
    Write-Host $Logs
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    try {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-git-init?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
    } catch {}
}

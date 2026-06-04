$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

# 1. Clean up existing builder container if it exists
try {
    $DeleteUri = "$BaseUri/containers/harmony-builder?force=true"
    Invoke-RestMethod -Uri $DeleteUri -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
} catch {}

# 2. Create the builder container
Write-Host "Creating builder container..." -ForegroundColor Yellow
$CreateBody = @{
    Image = "docker:cli"
    Entrypoint = @("sh", "-c")
    Cmd = @("docker build -t harmony_frontend:latest -f /data/compose/69/frontend/Dockerfile /data/compose/69/frontend")
    HostConfig = @{
        Binds = @(
            "portainer_data:/data",
            "/var/run/docker.sock:/var/run/docker.sock"
        )
    }
} | ConvertTo-Json -Depth 10

try {
    $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/create?name=harmony-builder" -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody -ErrorAction Stop
    Write-Host "Builder container created: $($CreateResponse.Id)" -ForegroundColor Green
    
    # Start container
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder/start" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Docker build started in background..." -ForegroundColor Green
    
    # Wait for completion
    Write-Host "Waiting for build to finish (this may take a few minutes)..." -ForegroundColor Yellow
    $WaitResponse = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder/wait" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Build container exited with status code: $($WaitResponse.StatusCode)" -ForegroundColor Green
    
    # Fetch logs
    $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder/logs?stdout=true&stderr=true" -Headers $Headers -Method Get -ErrorAction Stop
    Write-Host "DOCKER BUILD LOGS:" -ForegroundColor Cyan
    Write-Host $Logs
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    try {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
        Write-Host "Cleaned up builder container." -ForegroundColor Gray
    } catch {}
}

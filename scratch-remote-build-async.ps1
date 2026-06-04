$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"
$NewTag = "21856925ff3e05edf7c7d94426f3472fe0360372"
$ImageName = "ghcr.io/ayandadlamini12/harmony-mis-frontend:$NewTag"

# 1. Clean up existing builder container if it exists
try {
    $DeleteUri = "$BaseUri/containers/harmony-builder?force=true"
    Invoke-RestMethod -Uri $DeleteUri -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
} catch {}

# 2. Create the builder container
Write-Host "Creating builder container to build image: $ImageName" -ForegroundColor Yellow
$CreateBody = @{
    Image = "docker:cli"
    Entrypoint = @("sh", "-c")
    Cmd = @("docker build -t $ImageName -t harmony-frontend:latest -f /data/compose/69/frontend/Dockerfile /data/compose/69/frontend")
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
    
    # Poll for completion to avoid Cloudflare 524 timeout
    $IsRunning = $true
    $SecondsElapsed = 0
    Write-Host "Polling builder status every 15 seconds..." -ForegroundColor Yellow
    
    while ($IsRunning) {
        Start-Sleep -Seconds 15
        $SecondsElapsed += 15
        
        try {
            $Inspect = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder/json" -Headers $Headers -Method Get -ErrorAction Stop
            $State = $Inspect.State
            Write-Host "Build in progress... (Elapsed: $SecondsElapsed s, Status: $($State.Status))" -ForegroundColor Gray
            
            if ($State.Running -ne $true) {
                $IsRunning = $false
                Write-Host "Builder container exited with code: $($State.ExitCode)" -ForegroundColor Green
                
                # Fetch and print logs
                $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder/logs?stdout=true&stderr=true" -Headers $Headers -Method Get -ErrorAction Stop
                Write-Host "DOCKER BUILD LOGS:" -ForegroundColor Cyan
                Write-Host $Logs
                
                if ($State.ExitCode -ne 0) {
                    throw "Docker build failed with exit code $($State.ExitCode)"
                }
            }
        } catch {
            Write-Host "Error polling or container missing: $($_.Exception.Message)" -ForegroundColor Red
            $IsRunning = $false
        }
    }
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    try {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-builder?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
        Write-Host "Cleaned up builder container." -ForegroundColor Gray
    } catch {}
}

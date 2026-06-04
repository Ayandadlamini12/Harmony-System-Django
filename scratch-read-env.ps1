$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

# 1. Clean up existing container if it exists
try {
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-read-env?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
} catch {}

# 2. Create the reader container
$CreateBody = @{
    Image = "alpine:latest"
    Entrypoint = @("cat")
    Cmd = @("/data/compose/69/.env")
    HostConfig = @{
        Binds = @("portainer_data:/data")
    }
} | ConvertTo-Json -Depth 10

try {
    $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/create?name=harmony-read-env" -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody -ErrorAction Stop
    
    # Start container
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-read-env/start" -Headers $Headers -Method Post -ErrorAction Stop
    
    # Wait
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-read-env/wait" -Headers $Headers -Method Post -ErrorAction Stop
    
    # Logs
    $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-read-env/logs?stdout=true&stderr=true" -Headers $Headers -Method Get -ErrorAction Stop
    Write-Host "REMOTE .ENV CONTENT:" -ForegroundColor Cyan
    Write-Host $Logs
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
} finally {
    try {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-read-env?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
    } catch {}
}

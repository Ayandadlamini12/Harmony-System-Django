$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

# 1. Clean up existing container if it exists
try {
    $CheckUri = "$BaseUri/containers/harmony-ls/json"
    $ContainerInfo = Invoke-RestMethod -Uri $CheckUri -Headers $Headers -Method Get
    if ($ContainerInfo) {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-ls?force=true" -Headers $Headers -Method Delete
    }
} catch {}

# 2. Create the container
$CreateBody = @{
    Image = "alpine:latest"
    Entrypoint = @("sh", "-c")
    Cmd = @("ls -la /data/compose/69/frontend/src/components")
    HostConfig = @{
        Binds = @("portainer_data:/data")
    }
} | ConvertTo-Json -Depth 10

try {
    $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/create?name=harmony-ls" -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-ls/start" -Headers $Headers -Method Post
    
    # Wait
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-ls/wait" -Headers $Headers -Method Post
    
    # Logs
    $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-ls/logs?stdout=true&stderr=true" -Headers $Headers -Method Get
    Write-Host "FILES IN 69/frontend/src/components:" -ForegroundColor Cyan
    Write-Host $Logs
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
} finally {
    try {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-ls?force=true" -Headers $Headers -Method Delete
    } catch {}
}

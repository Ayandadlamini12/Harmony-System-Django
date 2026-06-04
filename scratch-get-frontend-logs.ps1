$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

try {
    # Get last 100 lines of logs from frontend container
    $Logs = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/logs?stdout=true&stderr=true&tail=100" -Headers $Headers -Method Get
    Write-Host "FRONTEND CONTAINER LOGS:" -ForegroundColor Cyan
    Write-Host $Logs
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}

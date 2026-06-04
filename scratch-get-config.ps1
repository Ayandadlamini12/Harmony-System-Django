$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

try {
    $ContainerInfo = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/json" -Headers $Headers -Method Get
    $ContainerInfo.Config | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to inspect container: $($_.Exception.Message)"
}

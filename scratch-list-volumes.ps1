$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

try {
    $VolumesResponse = Invoke-RestMethod -Uri "$BaseUri/volumes" -Headers $Headers -Method Get
    $VolumesResponse.Volumes | Select-Object Name, Scope, Driver | Format-Table -AutoSize
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}

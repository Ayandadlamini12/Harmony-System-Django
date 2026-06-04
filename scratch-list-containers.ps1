$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

try {
    $Containers = Invoke-RestMethod -Uri "$BaseUri/containers/json?all=true" -Headers $Headers -Method Get
    $Containers | Where-Object { $_.Names -match "harmony" } | ForEach-Object {
        [PSCustomObject]@{
            Names = ($_.Names -join ", ")
            State = $_.State
            Status = $_.Status
            Image = $_.Image
            ImageID = $_.ImageID
        }
    } | Format-Table -AutoSize
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}

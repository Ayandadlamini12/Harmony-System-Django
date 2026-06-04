$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

try {
    $Images = Invoke-RestMethod -Uri "$BaseUri/images/json" -Headers $Headers -Method Get
    $Images | ForEach-Object {
        [PSCustomObject]@{
            RepoTags = ($_.RepoTags -join ", ")
            Created = [DateTimeOffset]::FromUnixTimeSeconds($_.Created).DateTime
            Size = "$([Math]::Round($_.Size / 1MB, 2)) MB"
        }
    } | Sort-Object Created -Descending | Select-Object -First 10 | Format-Table -AutoSize
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}

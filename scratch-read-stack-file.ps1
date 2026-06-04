$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$Response = Invoke-RestMethod -Uri "https://portainer.fmtagency.online/api/stacks/69/file" -Headers $Headers -Method Get
Write-Host "STACK FILE CONTENT:" -ForegroundColor Cyan
Write-Host $Response.StackFileContent

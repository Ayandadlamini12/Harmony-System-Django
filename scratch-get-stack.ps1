$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$Response = Invoke-RestMethod -Uri "https://portainer.fmtagency.online/api/stacks/69" -Headers $Headers -Method Get
$Response | ConvertTo-Json -Depth 5
